import { Router, Request, Response } from 'express';
import * as fs from 'fs/promises';
import { CONFIG_PATHS } from '../config/file-paths';
import { ServerConfig } from '../types/server';
import { writeConfigAtomic } from '../utils/fileUtils';
import { validateServerConfig } from '../utils/validation';

interface GroupConfig {
  id: string;
  name: string;
  order: number;
  serverIds: string[];
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

const router = Router();

// GET /api/config/groups - Read dashboard-layout.json and return groups
// GET /api/config/servers - Read servers.json and return all server configs
router.get('/servers', async (req: Request, res: Response) => {
  try {
    const fileContent = await fs.readFile(CONFIG_PATHS.servers, 'utf-8');
    const servers: ServerConfig[] = JSON.parse(fileContent);

    const response: ApiResponse<ServerConfig[]> = {
      success: true,
      data: servers
    };
    res.json(response);
  } catch (error) {
    console.error('Failed to load servers:', error);
    const response: ApiResponse<never> = {
      success: false,
      error: 'Failed to load servers'
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
        error: 'Server not found'
      };
      return res.status(404).json(response);
    }

    const response: ApiResponse<ServerConfig> = {
      success: true,
      data: server
    };
    res.json(response);
  } catch (error) {
    console.error('Failed to load server:', error);
    const response: ApiResponse<never> = {
      success: false,
      error: 'Failed to load server'
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
        data: []
      };
      return res.json(response);
    }

    // Read and parse file
    const fileContent = await fs.readFile(CONFIG_PATHS.layout, 'utf-8');
    const layout = JSON.parse(fileContent);

    const response: ApiResponse<GroupConfig[]> = {
      success: true,
      data: layout.groups || []
    };
    res.json(response);
  } catch (error) {
    console.error('Failed to load groups:', error);
    const response: ApiResponse<never> = {
      success: false,
      error: 'Failed to load groups'
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
      console.warn('[Config API] Validation failed for server creation', {
        errors: validationErrors,
        timestamp: new Date().toISOString(),
      });

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
        console.warn('[Config API] Duplicate server ID detected', {
          serverId: serverData.id,
          timestamp: new Date().toISOString(),
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

    // Write updated array atomically
    await writeConfigAtomic(CONFIG_PATHS.servers, servers);

    console.info('[Config API] Server created successfully', {
      serverId: serverData.id,
      name: serverData.name,
      timestamp: new Date().toISOString(),
    });

    // Return success with new server (including generated ID)
    const response: ApiResponse<ServerConfig> = {
      success: true,
      data: serverData,
    };
    res.json(response);
  } catch (error) {
    console.error('[Config API] Server creation failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
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
      console.warn('[Config API] Validation failed for server update', {
        serverId: id,
        errors: validationErrors,
        timestamp: new Date().toISOString(),
      });

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
      console.warn('[Config API] Server not found for update', {
        serverId: id,
        timestamp: new Date().toISOString(),
      });

      const response: ApiResponse<never> = {
        success: false,
        error: `Server with ID '${id}' not found`,
      };
      return res.status(404).json(response);
    }

    // Update server in array
    servers[serverIndex] = serverData;

    // Write updated array atomically
    await writeConfigAtomic(CONFIG_PATHS.servers, servers);

    console.info('[Config API] Server updated successfully', {
      serverId: id,
      name: serverData.name,
      timestamp: new Date().toISOString(),
    });

    // Return success with updated server
    const response: ApiResponse<ServerConfig> = {
      success: true,
      data: serverData,
    };
    res.json(response);
  } catch (error) {
    console.error('[Config API] Server update failed', {
      serverId: id,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });

    const response: ApiResponse<never> = {
      success: false,
      error: 'Failed to save server configuration',
    };
    res.status(500).json(response);
  }
});

export default router;
