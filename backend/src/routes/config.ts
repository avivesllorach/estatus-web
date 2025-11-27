import { Router, Request, Response, NextFunction } from 'express';
import * as fs from 'fs/promises';
import { CONFIG_PATHS } from '../config/file-paths';
import { ServerConfig } from '../types/server';
import { writeConfigAtomic } from '../utils/fileUtils';
import { validateServerConfig, validateGroupConfig } from '../utils/validation';
import { ConfigManager } from '../services/ConfigManager';
import { createLogger, generateChangeSummary } from '../utils/logger';
import { detectServerChanges, detectGroupChanges } from '../utils/changeDetector';
import { migrateLegacyGroups } from '../utils/groupMigration';

interface GroupConfig {
  id: string;
  name: string;
  order: number;                    // DEPRECATED, for backward compatibility
  row?: number;                     // 1-4 (which row the group belongs to) - DEPRECATED, use rowNumber
  position?: 'left' | 'right';     // 'left' or 'right' position within the row - DEPRECATED, use rowOrder
  serverIds: string[];

  // New flexible layout properties
  rowNumber?: number;               // Which row the group belongs to (1, 2, 3, ...)
  rowOrder?: number;                // Position within the row (1, 2, 3, ...) - determines left-to-right order
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

const router = Router();

// Create logger instance for config operations
const logger = createLogger('Config API');

// GET /api/config/groups - Read dashboard-layout.json and return groups
// GET /api/config/servers - Read servers.json and return all server configs
router.get('/servers', async (req: Request, res: Response) => {
  try {
    const fileContent = await fs.readFile(CONFIG_PATHS.servers, 'utf-8');
    const servers: ServerConfig[] = JSON.parse(fileContent);

    const response: ApiResponse<ServerConfig[]> = {
      success: true,
      data: servers,
    };
    res.json(response);
  } catch (error) {
    logger.error('Failed to load servers', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    const response: ApiResponse<never> = {
      success: false,
      error: 'Failed to load servers',
    };
    res.status(500).json(response);
  }
});

// GET /api/config/servers/:id - Read servers.json and return specific server config
router.get('/servers/:id', async (req: Request, res: Response) => {
  try {
    const serverId = req.params.id;
    const fileContent = await fs.readFile(CONFIG_PATHS.servers, 'utf-8');
    const servers: ServerConfig[] = JSON.parse(fileContent);

    const server = servers.find(s => s.id === serverId);

    if (!server) {
      const response: ApiResponse<never> = {
        success: false,
        error: 'Server not found',
      };
      return res.status(404).json(response);
    }

    const response: ApiResponse<ServerConfig> = {
      success: true,
      data: server,
    };
    res.json(response);
  } catch (error) {
    logger.error('Failed to load server', {
      serverId: req.params.id,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    const response: ApiResponse<never> = {
      success: false,
      error: 'Failed to load server',
    };
    res.status(500).json(response);
  }
});

// GET /api/config/groups - Read dashboard-layout.json and return groups
router.get('/groups', async (req: Request, res: Response) => {
  try {
    // Check if file exists
    try {
      await fs.access(CONFIG_PATHS.layout);
    } catch {
      // File doesn't exist yet (normal for fresh install)
      const response: ApiResponse<GroupConfig[]> = {
        success: true,
        data: [],
      };
      return res.json(response);
    }

    // Read and parse file
    const fileContent = await fs.readFile(CONFIG_PATHS.layout, 'utf-8');
    const layout = JSON.parse(fileContent);
    let groups = layout.groups || [];

    // Apply migration for legacy groups (row/position -> rowNumber/rowOrder)
    if (groups.length > 0) {
      groups = migrateLegacyGroups(groups);

      // If migration occurred, update the file with new format
      const needsMigration = groups.some((group, index) => {
        const original = layout.groups[index];
        return (
          original.rowNumber !== group.rowNumber ||
          original.rowOrder !== group.rowOrder
        );
      });

      if (needsMigration) {
        layout.groups = groups;
        await writeConfigAtomic(CONFIG_PATHS.layout, layout);
        logger.info('Migrated groups to new rowNumber/rowOrder format', {
          groupCount: groups.length
        });
      }
    }

    const response: ApiResponse<GroupConfig[]> = {
      success: true,
      data: groups,
    };
    res.json(response);
  } catch (error) {
    logger.error('Failed to load groups', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    const response: ApiResponse<never> = {
      success: false,
      error: 'Failed to load groups',
    };
    res.status(500).json(response);
  }
});

/**
 * POST /api/config/groups
 * Create new group configuration
 *
 * Request body: Omit<GroupConfig, 'id'>
 * Response: ApiResponse<GroupConfig>
 *
 * Status codes:
 * - 201: Created successfully
 * - 400: Validation error
 * - 500: Server error
 */
router.post('/groups', async (req: Request, res: Response) => {
  const groupData = req.body as Omit<GroupConfig, 'id'>;

  logger.info('POST /api/config/groups - Received group data:', {
    groupData,
    hasRowNumber: !!groupData.rowNumber,
    hasRowOrder: !!groupData.rowOrder,
    rowNumber: groupData.rowNumber,
    rowOrder: groupData.rowOrder
  });

  try {
    // Validate request data
    const tempGroupData: GroupConfig = {
      ...groupData,
      id: 'temp-id', // Temporary ID for validation (will be replaced)
      // Add backward compatibility fields
      order: groupData.order || 1, // Default order for backward compatibility
    };

    const validationErrors = validateGroupConfig(tempGroupData);
    if (validationErrors) {
      logger.logValidationFailure('GROUP', 'create', validationErrors, groupData);

      const response: ApiResponse<any> = {
        success: false,
        error: 'Validation failed',
        data: validationErrors,
      };
      return res.status(400).json(response);
    }

    // Read current dashboard-layout.json
    let layout: { groups: GroupConfig[] };
    try {
      const fileContent = await fs.readFile(CONFIG_PATHS.layout, 'utf-8');
      layout = JSON.parse(fileContent);

      // Ensure groups array exists
      if (!layout.groups || !Array.isArray(layout.groups)) {
        layout.groups = [];
      }
    } catch (error) {
      // File doesn't exist or is invalid, create new layout
      layout = { groups: [] };
    }

    // Check for group name uniqueness (case-insensitive)
    const existingGroupWithSameName = layout.groups.find(
      (g) => g.name.toLowerCase() === groupData.name.toLowerCase().trim(),
    );

    if (existingGroupWithSameName) {
      const response: ApiResponse<never> = {
        success: false,
        error: `Group name '${groupData.name.trim()}' already exists. Please choose a different name.`,
      };
      return res.status(400).json(response);
    }

    // Generate unique group ID
    const maxId = layout.groups.reduce((max, group) => {
      const match = group.id.match(/^group-(\d+)$/);
      if (match) {
        const num = parseInt(match[1], 10);
        return num > max ? num : max;
      }
      return max;
    }, 0);

    const newGroupId = `group-${maxId + 1}`;

    // Sanitize and create group data
    const sanitizedGroupData: GroupConfig = {
      id: newGroupId,
      name: groupData.name.trim(),
      order: Math.max(1, Math.min(100, Number(groupData.order))), // Clamp between 1-100
      row: groupData.row ? Math.max(1, Math.min(4, Number(groupData.row))) : undefined, // Clamp between 1-4
      position: groupData.position && ['left', 'right'].includes(groupData.position) ? groupData.position : undefined,
      serverIds: Array.isArray(groupData.serverIds) ? [...new Set(groupData.serverIds)] : [], // Remove duplicates
      // Add new layout fields
      rowNumber: groupData.rowNumber ? Math.max(1, Math.min(100, Number(groupData.rowNumber))) : 1,
      rowOrder: groupData.rowOrder ? Math.max(1, Math.min(100, Number(groupData.rowOrder))) : 1,
    };

    
    // Add group to array
    layout.groups.push(sanitizedGroupData);

    // Log before file write operation
    logger.logFileOperation('WRITE', CONFIG_PATHS.layout, {
      success: true,
      beforeState: layout,
    });

    // Write updated layout atomically
    await writeConfigAtomic(CONFIG_PATHS.layout, layout);

    // Log successful file write
    logger.logFileOperation('WRITE', CONFIG_PATHS.layout, {
      success: true,
      afterState: layout,
    });

    // Trigger hot-reload after successful file write
    const configManager = (req as any).configManager as ConfigManager;
    if (configManager) {
      try {
        logger.debug('Triggering hot-reload after group creation');
        await configManager.reloadGroups();
        logger.debug('Hot-reload completed successfully after group creation');
      } catch (reloadError) {
        logger.error('Failed to trigger hot-reload after group creation', {
          groupId: newGroupId,
          error: reloadError instanceof Error ? reloadError.message : 'Unknown error',
        });
        // Don't fail the request, just log the error
      }
    }

    // Log successful group creation
    logger.logConfigChange('ADDED', 'GROUP', newGroupId, sanitizedGroupData.name);

    // Return success with created group
    const response: ApiResponse<GroupConfig> = {
      success: true,
      data: sanitizedGroupData,
    };
    res.status(201).json(response);
  } catch (error) {
    logger.error('Group creation failed', {
      groupName: groupData.name,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });

    const response: ApiResponse<never> = {
      success: false,
      error: 'Failed to create group',
    };
    res.status(500).json(response);
  }
});

/**
 * PUT /api/config/groups/:id
 * Update existing group configuration
 *
 * Request body: GroupConfig
 * Response: ApiResponse<GroupConfig>
 *
 * Status codes:
 * - 200: Success
 * - 400: Validation error or ID mismatch
 * - 404: Group not found
 * - 500: Server error
 */
router.put('/groups/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const groupData = req.body as GroupConfig;

  try {
    // Validate request data
    const validationErrors = validateGroupConfig(groupData);
    if (validationErrors) {
      logger.logValidationFailure('GROUP', 'update', validationErrors, groupData);

      const response: ApiResponse<any> = {
        success: false,
        error: 'Validation failed',
        data: validationErrors, // validationErrors as data field
      };
      return res.status(400).json(response);
    }

    // Ensure ID in body matches URL parameter
    if (groupData.id !== id) {
      const response: ApiResponse<never> = {
        success: false,
        error: 'Group ID in body must match URL parameter',
      };
      return res.status(400).json(response);
    }

    // Read current dashboard-layout.json
    let layout: { groups: GroupConfig[] };
    try {
      const fileContent = await fs.readFile(CONFIG_PATHS.layout, 'utf-8');
      layout = JSON.parse(fileContent);

      // Ensure groups array exists
      if (!layout.groups || !Array.isArray(layout.groups)) {
        layout.groups = [];
      }
    } catch (error) {
      // File doesn't exist or is invalid, create new layout
      layout = { groups: [] };
    }

    // Find group by ID
    const groupIndex = layout.groups.findIndex((g) => g.id === id);
    if (groupIndex === -1) {
      logger.warn('Group not found for update', {
        groupId: id,
      });

      const response: ApiResponse<never> = {
        success: false,
        error: `Group with ID '${id}' not found`,
      };
      return res.status(404).json(response);
    }

    // Detect changes for logging
    const originalGroup = layout.groups[groupIndex];

    // Check for group name uniqueness (case-insensitive)
    const existingGroupWithSameName = layout.groups.find(
      (g) => g.id !== id && g.name.toLowerCase() === groupData.name.toLowerCase().trim(),
    );

    if (existingGroupWithSameName) {
      const response: ApiResponse<never> = {
        success: false,
        error: `Group name '${groupData.name.trim()}' already exists. Please choose a different name.`,
      };
      return res.status(400).json(response);
    }

    // Sanitize group data
    const sanitizedGroupData: GroupConfig = {
      id: groupData.id,
      name: groupData.name.trim(),
      order: Math.max(1, Math.min(100, Number(groupData.order))), // Clamp between 1-100
      row: groupData.row ? Math.max(1, Math.min(4, Number(groupData.row))) : undefined, // Clamp between 1-4
      position: groupData.position && ['left', 'right'].includes(groupData.position) ? groupData.position : undefined,
      serverIds: Array.isArray(groupData.serverIds) ? [...new Set(groupData.serverIds)] : [], // Remove duplicates
      // Add new layout fields
      rowNumber: groupData.rowNumber ? Math.max(1, Math.min(100, Number(groupData.rowNumber))) : 1,
      rowOrder: groupData.rowOrder ? Math.max(1, Math.min(100, Number(groupData.rowOrder))) : 1,
    };

    // Detect changes after sanitization
    const detectedChanges = detectGroupChanges(originalGroup, sanitizedGroupData);

    // Update group in array
    layout.groups[groupIndex] = sanitizedGroupData;

    // Log before file write operation
    logger.logFileOperation('WRITE', CONFIG_PATHS.layout, {
      success: true,
      beforeState: layout,
    });

    // Write updated layout atomically
    await writeConfigAtomic(CONFIG_PATHS.layout, layout);

    // Log successful file write
    logger.logFileOperation('WRITE', CONFIG_PATHS.layout, {
      success: true,
      afterState: layout,
    });

    // Trigger hot-reload after successful file write
    const configManager = (req as any).configManager as ConfigManager;
    if (configManager) {
      try {
        logger.debug('Triggering hot-reload after group update');
        await configManager.reloadGroups();
        logger.debug('Hot-reload completed successfully after group update');
      } catch (reloadError) {
        logger.error('Failed to trigger hot-reload after group update', {
          groupId: id,
          error: reloadError instanceof Error ? reloadError.message : 'Unknown error',
        });
        // Don't fail the request, just log the error
      }
    }

    // Log successful group update with changes
    logger.logConfigChange('UPDATED', 'GROUP', id, sanitizedGroupData.name, detectedChanges);

    // Return success with updated group
    const response: ApiResponse<GroupConfig> = {
      success: true,
      data: sanitizedGroupData,
    };
    res.json(response);
  } catch (error) {
    logger.error('Group update failed', {
      groupId: id,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });

    const response: ApiResponse<never> = {
      success: false,
      error: 'Failed to save group configuration',
    };
    res.status(500).json(response);
  }
});

/**
 * DELETE /api/config/groups/:id
 * Delete group configuration with server reassignment options
 *
 * Query params:
 * - reassign: "unassign" | "default" - Strategy for handling assigned servers
 *
 * Response: ApiResponse<{ deletedId: string, reassignedServers: string[] }>
 *
 * Status codes:
 * - 200: Success
 * - 400: Invalid reassign strategy
 * - 404: Group not found
 * - 500: Server error
 *
 * Side effects:
 * - Removes group from dashboard-layout.json
 * - Handles server reassignment according to selected strategy
 * - Emits groups-changed event for real-time updates
 */
router.delete('/groups/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const reassignStrategy = req.query.reassign as 'unassign' | 'default' | undefined;

  try {
    // Validate reassign strategy
    if (reassignStrategy && !['unassign', 'default'].includes(reassignStrategy)) {
      const response: ApiResponse<never> = {
        success: false,
        error: 'Invalid reassign strategy. Must be "unassign" or "default"',
      };
      return res.status(400).json(response);
    }

    // Read current dashboard-layout.json
    let layout: { groups: GroupConfig[] };
    try {
      const fileContent = await fs.readFile(CONFIG_PATHS.layout, 'utf-8');
      layout = JSON.parse(fileContent);

      // Ensure groups array exists
      if (!layout.groups || !Array.isArray(layout.groups)) {
        layout.groups = [];
      }
    } catch (error) {
      // File doesn't exist or is invalid
      logger.warn('Layout file not found for group deletion', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      const response: ApiResponse<never> = {
        success: false,
        error: 'No groups found to delete',
      };
      return res.status(404).json(response);
    }

    // Find group by ID
    const groupIndex = layout.groups.findIndex((g) => g.id === id);
    if (groupIndex === -1) {
      logger.warn('Group not found for deletion', {
        groupId: id,
      });

      const response: ApiResponse<never> = {
        success: false,
        error: `Group with ID '${id}' not found`,
      };
      return res.status(404).json(response);
    }

    const deletedGroup = layout.groups[groupIndex];
    const serverIdsToReassign = deletedGroup.serverIds || [];

    // Apply server reassignment strategy
    let reassignedServers: string[] = [];
    if (serverIdsToReassign.length > 0) {
      if (reassignStrategy === 'unassign') {
        // Strategy: "unassign" - servers become unassigned (removed from all groups)
        logger.info('Unassigning servers from deleted group', {
          groupId: id,
          serverCount: serverIdsToReassign.length,
          strategy: 'unassign',
          serverIds: serverIdsToReassign,
        });

        // No action needed - servers will be removed when we delete the group
        reassignedServers = serverIdsToReassign;

      } else if (reassignStrategy === 'default') {
        // Strategy: "default" - move servers to the first available group
        const otherGroups = layout.groups.filter(g => g.id !== id);

        if (otherGroups.length === 0) {
          // No other groups exist, fall back to unassign
          logger.warn('No other groups available for reassignment, using unassign strategy', {
            groupId: id,
            serverCount: serverIdsToReassign.length,
          });
          reassignedServers = serverIdsToReassign;
        } else {
          // Find the group with the lowest order value (first in display)
          const targetGroup = otherGroups.reduce((prev, current) =>
            (prev.order < current.order) ? prev : current,
          );

          // Add servers to the target group (avoid duplicates)
          const existingServerIds = new Set(targetGroup.serverIds || []);
          const newServerIds = serverIdsToReassign.filter(id => !existingServerIds.has(id));
          targetGroup.serverIds = [...(targetGroup.serverIds || []), ...newServerIds];

          reassignedServers = serverIdsToReassign; // All servers were reassigned

          logger.info('Servers reassigned to default group', {
            groupId: id,
            targetGroupId: targetGroup.id,
            targetGroupName: targetGroup.name,
            reassignedCount: newServerIds.length,
            totalServers: serverIdsToReassign.length,
            reassignedServers: newServerIds,
          });
        }
      } else {
        // No strategy specified, default to unassign
        reassignedServers = serverIdsToReassign;
      }
    }

    // Remove the group from array
    layout.groups = layout.groups.filter(g => g.id !== id);

    // Log before file write operation
    logger.logFileOperation('WRITE', CONFIG_PATHS.layout, {
      success: true,
      beforeState: layout,
    });

    // Write updated layout atomically
    await writeConfigAtomic(CONFIG_PATHS.layout, layout);

    // Log successful file write
    logger.logFileOperation('WRITE', CONFIG_PATHS.layout, {
      success: true,
      afterState: layout,
    });

    // Log successful group deletion
    logger.logConfigChange('DELETED', 'GROUP', id, deletedGroup.name);

    // Trigger ConfigManager groups-changed event for real-time updates
    const configManager = (req as any).configManager as ConfigManager;
    if (configManager) {
      try {
        logger.debug('Triggering groups-changed event after group deletion');
        await configManager.reloadGroups();
        logger.debug('Groups-changed event completed successfully after group deletion');
      } catch (reloadError) {
        logger.error('Failed to trigger groups-changed event after group deletion', {
          groupId: id,
          error: reloadError instanceof Error ? reloadError.message : 'Unknown error',
        });
        // Don't fail the request, just log the error
      }
    }

    // Return success with deletion details
    const response: ApiResponse<{ deletedId: string; reassignedServers: string[] }> = {
      success: true,
      data: {
        deletedId: id,
        reassignedServers,
      },
    };
    res.json(response);
  } catch (error) {
    logger.error('Group deletion failed', {
      groupId: id,
      reassignStrategy,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });

    const response: ApiResponse<never> = {
      success: false,
      error: 'Failed to delete group',
    };
    res.status(500).json(response);
  }
});

/**
 * POST /api/config/servers
 * Create new server configuration
 *
 * Request body: ServerConfig (without id - will be generated)
 * Response: ApiResponse<ServerConfig>
 *
 * Status codes:
 * - 200: Success
 * - 400: Validation error
 * - 409: Duplicate server ID
 * - 500: Server error
 */
router.post('/servers', async (req: Request, res: Response) => {
  const serverData = req.body as ServerConfig;

  try {
    // Validate request data
    const validationErrors = validateServerConfig(serverData);
    if (validationErrors) {
      logger.logValidationFailure('SERVER', 'create', validationErrors, serverData);

      const response: ApiResponse<any> = {
        success: false,
        error: 'Validation failed',
        data: validationErrors,
      };
      return res.status(400).json(response);
    }

    // Read current servers.json
    const fileContent = await fs.readFile(CONFIG_PATHS.servers, 'utf-8');
    const servers: ServerConfig[] = JSON.parse(fileContent);

    // Check for duplicate Server ID (if user provided an ID)
    if (serverData.id) {
      const isDuplicate = servers.some(s => s.id === serverData.id);
      if (isDuplicate) {
        logger.warn('Duplicate server ID detected', {
          serverId: serverData.id,
          serverName: serverData.name,
        });

        const response: ApiResponse<any> = {
          success: false,
          error: 'Server ID already exists',
          data: { id: 'This server ID is already in use' },
        };
        return res.status(409).json(response);
      }
    } else {
      // Generate unique server ID if not provided
      // Format: server-### (zero-padded, e.g., server-001, server-025)
      const existingIds = servers.map(s => s.id);
      let newId = '';
      let counter = 1;

      while (true) {
        newId = `server-${String(counter).padStart(3, '0')}`;
        if (!existingIds.includes(newId)) {
          break;
        }
        counter++;
      }

      serverData.id = newId;
    }

    // Append new server to array
    servers.push(serverData);

    // Log before file write operation
    logger.logFileOperation('WRITE', CONFIG_PATHS.servers, {
      success: true,
      beforeState: servers,
    });

    // Write updated array atomically
    await writeConfigAtomic(CONFIG_PATHS.servers, servers);

    // Log successful file write
    logger.logFileOperation('WRITE', CONFIG_PATHS.servers, {
      success: true,
      afterState: servers,
    });

    // Trigger hot-reload after successful file write
    const configManager = (req as any).configManager as ConfigManager;
    if (configManager) {
      try {
        logger.debug('Triggering hot-reload after server creation');
        await configManager.reloadServers();
        logger.debug('Hot-reload completed successfully after server creation');
      } catch (reloadError) {
        logger.error('Failed to trigger hot-reload after server creation', {
          serverId: serverData.id,
          error: reloadError instanceof Error ? reloadError.message : 'Unknown error',
        });
        // Don't fail the request, just log the error
      }
    }

    // Log successful server creation
    logger.logConfigChange('ADDED', 'SERVER', serverData.id, serverData.name);

    // Return success with new server (including generated ID)
    const response: ApiResponse<ServerConfig> = {
      success: true,
      data: serverData,
    };
    res.json(response);
  } catch (error) {
    logger.error('Server creation failed', {
      serverName: serverData.name,
      serverId: serverData.id,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });

    const response: ApiResponse<never> = {
      success: false,
      error: 'Failed to create server configuration',
    };
    res.status(500).json(response);
  }
});

/**
 * PUT /api/config/servers/:id
 * Update existing server configuration
 *
 * Request body: ServerConfig
 * Response: ApiResponse<ServerConfig>
 *
 * Status codes:
 * - 200: Success
 * - 400: Validation error
 * - 404: Server not found
 * - 500: Server error
 */
router.put('/servers/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const serverData = req.body as ServerConfig;

  try {
    // Validate request data
    const validationErrors = validateServerConfig(serverData);
    if (validationErrors) {
      logger.logValidationFailure('SERVER', 'update', validationErrors, serverData);

      const response: ApiResponse<any> = {
        success: false,
        error: 'Validation failed',
        data: validationErrors, // validationErrors as data field
      };
      return res.status(400).json(response);
    }

    // Ensure ID in body matches URL parameter
    if (serverData.id !== id) {
      const response: ApiResponse<never> = {
        success: false,
        error: 'Server ID in body must match URL parameter',
      };
      return res.status(400).json(response);
    }

    // Read current servers.json
    const fileContent = await fs.readFile(CONFIG_PATHS.servers, 'utf-8');
    const servers: ServerConfig[] = JSON.parse(fileContent);

    // Find server by ID
    const serverIndex = servers.findIndex((s) => s.id === id);
    if (serverIndex === -1) {
      logger.warn('Server not found for update', {
        serverId: id,
      });

      const response: ApiResponse<never> = {
        success: false,
        error: `Server with ID '${id}' not found`,
      };
      return res.status(404).json(response);
    }

    // Detect changes for logging
    const originalServer = servers[serverIndex];
    const detectedChanges = detectServerChanges(originalServer, serverData);

    // Update server in array
    servers[serverIndex] = serverData;

    // Log before file write operation
    logger.logFileOperation('WRITE', CONFIG_PATHS.servers, {
      success: true,
      beforeState: servers,
    });

    // Write updated array atomically
    await writeConfigAtomic(CONFIG_PATHS.servers, servers);

    // Log successful file write
    logger.logFileOperation('WRITE', CONFIG_PATHS.servers, {
      success: true,
      afterState: servers,
    });

    // Trigger hot-reload after successful file write
    const configManager = (req as any).configManager as ConfigManager;
    if (configManager) {
      try {
        logger.debug('Triggering hot-reload after server update');
        await configManager.reloadServers();
        logger.debug('Hot-reload completed successfully after server update');
      } catch (reloadError) {
        logger.error('Failed to trigger hot-reload after server update', {
          serverId: id,
          error: reloadError instanceof Error ? reloadError.message : 'Unknown error',
        });
        // Don't fail the request, just log the error
      }
    }

    // Log successful server update with changes
    logger.logConfigChange('UPDATED', 'SERVER', id, serverData.name, detectedChanges);

    // Return success with updated server
    const response: ApiResponse<ServerConfig> = {
      success: true,
      data: serverData,
    };
    res.json(response);
  } catch (error) {
    logger.error('Server update failed', {
      serverId: id,
      serverName: serverData.name,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });

    const response: ApiResponse<never> = {
      success: false,
      error: 'Failed to save server configuration',
    };
    res.status(500).json(response);
  }
});

/**
 * DELETE /api/config/servers/:id
 * Delete server configuration
 *
 * Response: ApiResponse<{ deletedId: string }>
 *
 * Status codes:
 * - 200: Success
 * - 404: Server not found
 * - 500: Server error
 *
 * Side effects:
 * - Removes server from servers.json
 * - Removes serverId from all groups in dashboard-layout.json (referential integrity)
 */
router.delete('/servers/:id', async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    // Read current servers.json
    const serversContent = await fs.readFile(CONFIG_PATHS.servers, 'utf-8');
    let servers: ServerConfig[] = JSON.parse(serversContent);

    // Find server by ID
    const serverIndex = servers.findIndex(s => s.id === id);
    if (serverIndex === -1) {
      logger.warn('Server not found for deletion', {
        serverId: id,
      });

      const response: ApiResponse<never> = {
        success: false,
        error: `Server with ID '${id}' not found`,
      };
      return res.status(404).json(response);
    }

    const deletedServer = servers[serverIndex];

    // Remove server from array
    servers = servers.filter(s => s.id !== id);

    // Log before file write operation
    logger.logFileOperation('WRITE', CONFIG_PATHS.servers, {
      success: true,
      beforeState: servers,
    });

    // Write updated servers.json atomically
    await writeConfigAtomic(CONFIG_PATHS.servers, servers);

    // Log successful file write
    logger.logFileOperation('WRITE', CONFIG_PATHS.servers, {
      success: true,
      afterState: servers,
    });

    // Trigger hot-reload after successful file write
    const configManager = (req as any).configManager as ConfigManager;
    if (configManager) {
      try {
        logger.debug('Triggering hot-reload after server deletion');
        await configManager.reloadServers();
        logger.debug('Hot-reload completed successfully after server deletion');
      } catch (reloadError) {
        logger.error('Failed to trigger hot-reload after server deletion', {
          serverId: id,
          error: reloadError instanceof Error ? reloadError.message : 'Unknown error',
        });
        // Don't fail the request, just log the error
      }
    }

    // Log successful server deletion
    logger.logConfigChange('DELETED', 'SERVER', id, deletedServer.name);

    // Clean up group references (referential integrity)
    // Remove serverId from all groups in dashboard-layout.json
    try {
      // Check if dashboard-layout.json exists
      await fs.access(CONFIG_PATHS.layout);

      // Read and parse layout file
      const layoutContent = await fs.readFile(CONFIG_PATHS.layout, 'utf-8');
      const layout = JSON.parse(layoutContent);

      if (layout.groups && Array.isArray(layout.groups)) {
        // Remove deleted server ID from all groups
        const affectedGroups: string[] = [];
        layout.groups = layout.groups.map((group: GroupConfig) => {
          const originalLength = group.serverIds.length;
          group.serverIds = group.serverIds.filter((sid: string) => sid !== id);

          if (group.serverIds.length < originalLength) {
            affectedGroups.push(group.id);
          }

          return group;
        });

        // Log before layout file write
        logger.logFileOperation('WRITE', CONFIG_PATHS.layout, {
          success: true,
          beforeState: layout,
        });

        // Write updated layout atomically
        await writeConfigAtomic(CONFIG_PATHS.layout, layout);

        // Log successful layout file write
        logger.logFileOperation('WRITE', CONFIG_PATHS.layout, {
          success: true,
          afterState: layout,
        });

        if (affectedGroups.length > 0) {
          logger.info('Server removed from groups', {
            serverId: id,
            serverName: deletedServer.name,
            affectedGroups,
            affectedGroupCount: affectedGroups.length,
          });
        }
      }
    } catch (error) {
      // dashboard-layout.json might not exist yet (Epic 3 not implemented)
      // This is not a fatal error - just log a warning
      logger.warn('Could not clean up group references (file may not exist)', {
        serverId: id,
        serverName: deletedServer.name,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    // Return success with deleted ID
    const response: ApiResponse<{ deletedId: string }> = {
      success: true,
      data: { deletedId: id },
    };
    res.json(response);
  } catch (error) {
    logger.error('Server deletion failed', {
      serverId: id,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });

    const response: ApiResponse<never> = {
      success: false,
      error: 'Failed to delete server',
    };
    res.status(500).json(response);
  }
});

/**
 * Create config routes with ConfigManager integration using middleware pattern
 * @param configManager - ConfigManager instance for hot-reload functionality
 * @returns Express router with config endpoints
 */
export function createConfigRoutes(configManager: ConfigManager): Router {
  // Add middleware to attach configManager to all requests
  router.use((req: Request, res: Response, next: NextFunction) => {
    (req as any).configManager = configManager;
    next();
  });

  return router;
}

export default router; // Keep default export for backward compatibility
