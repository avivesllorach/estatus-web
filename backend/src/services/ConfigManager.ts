import { EventEmitter } from 'events';
import { promises as fs } from 'fs';
import { ServerConfig } from '../types/server';
import { CONFIG_PATHS } from '../config/file-paths';
import { readConfigFile } from '../utils/fileUtils';

interface GroupConfig {
  id: string;
  name: string;
  order: number;
  serverIds: string[];
}

interface ConfigReloadResult {
  success: boolean;
  error?: string;
  reloadTime: number;
  timestamp: Date;
}

export class ConfigManager extends EventEmitter {
  private currentServers: ServerConfig[] = [];
  private currentGroups: GroupConfig[] = [];
  private lastKnownServers: ServerConfig[] = [];
  private lastKnownGroups: GroupConfig[] = [];

  constructor() {
    super();
    console.log('🔧 ConfigManager initialized');
  }

  /**
   * Load initial server configuration
   * Used during application startup
   */
  public async loadInitialServers(): Promise<ServerConfig[]> {
    try {
      const startTime = Date.now();
      this.currentServers = await readConfigFile<ServerConfig[]>(CONFIG_PATHS.servers);
      this.lastKnownServers = [...this.currentServers];

      const loadTime = Date.now() - startTime;
      console.log(`📂 Loaded ${this.currentServers.length} servers from ${CONFIG_PATHS.servers} (${loadTime}ms)`);

      return this.currentServers;
    } catch (error) {
      const errorMsg = `Failed to load initial servers configuration: ${error instanceof Error ? error.message : 'Unknown error'}`;
      console.error(`❌ ${errorMsg}`);

      // Emit error event for listeners
      this.emit('config-error', { type: 'servers', error: errorMsg });
      throw new Error(errorMsg);
    }
  }

  /**
   * Load initial group configuration
   * Used during application startup
   */
  public async loadInitialGroups(): Promise<GroupConfig[]> {
    try {
      const startTime = Date.now();
      const layoutData = await readConfigFile<{ groups: GroupConfig[] }>(CONFIG_PATHS.layout);
      this.currentGroups = layoutData.groups || [];
      this.lastKnownGroups = [...this.currentGroups];

      const loadTime = Date.now() - startTime;
      console.log(`📂 Loaded ${this.currentGroups.length} groups from ${CONFIG_PATHS.layout} (${loadTime}ms)`);

      return this.currentGroups;
    } catch (error) {
      const errorMsg = `Failed to load initial groups configuration: ${error instanceof Error ? error.message : 'Unknown error'}`;
      console.error(`❌ ${errorMsg}`);

      // Emit error event for listeners
      this.emit('config-error', { type: 'groups', error: errorMsg });
      throw new Error(errorMsg);
    }
  }

  /**
   * Reload server configuration from file
   * Emits 'servers-changed' event if configuration has changed
   */
  public async reloadServers(): Promise<ConfigReloadResult> {
    const startTime = Date.now();

    try {
      console.log(`🔄 Reloading servers configuration from ${CONFIG_PATHS.servers}...`);

      const newServers = await readConfigFile<ServerConfig[]>(CONFIG_PATHS.servers);
      const hasChanges = this.hasServersChanged(this.currentServers, newServers);

      // Update configuration
      this.lastKnownServers = [...this.currentServers];
      this.currentServers = newServers;

      const reloadTime = Date.now() - startTime;

      if (hasChanges) {
        console.log(`✅ Servers configuration reloaded with ${newServers.length} servers (${reloadTime}ms) - Changes detected`);

        // Emit change event with delta information
        const delta = this.calculateServerDelta(this.lastKnownServers, newServers);
        this.emit('servers-changed', {
          servers: newServers,
          delta,
          timestamp: new Date()
        });

        // Also emit specific events for different change types
        if (delta.added.length > 0) {
          this.emit('servers-added', delta.added);
        }
        if (delta.removed.length > 0) {
          this.emit('servers-removed', delta.removed);
        }
        if (delta.updated.length > 0) {
          this.emit('servers-updated', delta.updated);
        }
      } else {
        console.log(`ℹ️  Servers configuration reloaded but no changes detected (${reloadTime}ms)`);
      }

      return {
        success: true,
        reloadTime,
        timestamp: new Date()
      };

    } catch (error) {
      const errorMsg = `Failed to reload servers configuration: ${error instanceof Error ? error.message : 'Unknown error'}`;
      console.error(`❌ ${errorMsg}`);

      // Emit error event
      this.emit('config-error', {
        type: 'servers',
        error: errorMsg,
        timestamp: new Date()
      });

      return {
        success: false,
        error: errorMsg,
        reloadTime: Date.now() - startTime,
        timestamp: new Date()
      };
    }
  }

  /**
   * Reload group configuration from file
   * Emits 'groups-changed' event if configuration has changed
   */
  public async reloadGroups(): Promise<ConfigReloadResult> {
    const startTime = Date.now();

    try {
      console.log(`🔄 Reloading groups configuration from ${CONFIG_PATHS.layout}...`);

      const layoutData = await readConfigFile<{ groups: GroupConfig[] }>(CONFIG_PATHS.layout);
      const newGroups = layoutData.groups || [];
      const hasChanges = this.hasGroupsChanged(this.currentGroups, newGroups);

      // Update configuration
      this.lastKnownGroups = [...this.currentGroups];
      this.currentGroups = newGroups;

      const reloadTime = Date.now() - startTime;

      if (hasChanges) {
        console.log(`✅ Groups configuration reloaded with ${newGroups.length} groups (${reloadTime}ms) - Changes detected`);

        // Emit change event
        this.emit('groups-changed', {
          groups: newGroups,
          timestamp: new Date()
        });
      } else {
        console.log(`ℹ️  Groups configuration reloaded but no changes detected (${reloadTime}ms)`);
      }

      return {
        success: true,
        reloadTime,
        timestamp: new Date()
      };

    } catch (error) {
      const errorMsg = `Failed to reload groups configuration: ${error instanceof Error ? error.message : 'Unknown error'}`;
      console.error(`❌ ${errorMsg}`);

      // Emit error event
      this.emit('config-error', {
        type: 'groups',
        error: errorMsg,
        timestamp: new Date()
      });

      return {
        success: false,
        error: errorMsg,
        reloadTime: Date.now() - startTime,
        timestamp: new Date()
      };
    }
  }

  /**
   * Reload both server and group configurations
   */
  public async reloadAll(): Promise<{
    servers: ConfigReloadResult;
    groups: ConfigReloadResult;
  }> {
    console.log(`🔄 Starting full configuration reload...`);
    const startTime = Date.now();

    // Run reloads in parallel for performance
    const [serversResult, groupsResult] = await Promise.all([
      this.reloadServers(),
      this.reloadGroups()
    ]);

    const totalTime = Date.now() - startTime;
    console.log(`🏁 Full configuration reload completed in ${totalTime}ms`);

    // Check if both reloads meet the 2-second performance requirement
    if (totalTime > 2000) {
      console.warn(`⚠️  Configuration reload exceeded 2-second requirement: ${totalTime}ms`);
    }

    return {
      servers: serversResult,
      groups: groupsResult
    };
  }

  /**
   * Get current server configuration
   */
  public getCurrentServers(): ServerConfig[] {
    return [...this.currentServers];
  }

  /**
   * Get current group configuration
   */
  public getCurrentGroups(): GroupConfig[] {
    return [...this.currentGroups];
  }

  /**
   * Check if server configuration has changed
   */
  private hasServersChanged(oldServers: ServerConfig[], newServers: ServerConfig[]): boolean {
    // Quick length check
    if (oldServers.length !== newServers.length) return true;

    // Create maps for efficient comparison
    const oldServerMap = new Map(oldServers.map(s => [s.id, s]));
    const newServerMap = new Map(newServers.map(s => [s.id, s]));

    // Check for added/removed servers
    if (oldServerMap.size !== newServerMap.size) return true;

    // Check for changes in existing servers
    for (const [id, newServer] of newServerMap) {
      const oldServer = oldServerMap.get(id);
      if (!oldServer) return true; // Server was added

      // Optimized field-by-field comparison instead of JSON.stringify
      if (oldServer.name !== newServer.name) return true;
      if (oldServer.ip !== newServer.ip) return true;
      if (oldServer.dnsAddress !== newServer.dnsAddress) return true;

      // Compare SNMP configuration
      if (oldServer.snmp?.enabled !== newServer.snmp?.enabled) return true;
      if (JSON.stringify(oldServer.snmp?.disks || []) !== JSON.stringify(newServer.snmp?.disks || [])) return true;

      // Compare NetApp configuration
      if (oldServer.netapp?.enabled !== newServer.netapp?.enabled) return true;
      if (oldServer.netapp?.apiType !== newServer.netapp?.apiType) return true;
      if (oldServer.netapp?.username !== newServer.netapp?.username) return true;
      if (oldServer.netapp?.password !== newServer.netapp?.password) return true;
      if (JSON.stringify(oldServer.netapp?.luns || []) !== JSON.stringify(newServer.netapp?.luns || [])) return true;
    }

    return false;
  }

  /**
   * Check if group configuration has changed
   */
  private hasGroupsChanged(oldGroups: GroupConfig[], newGroups: GroupConfig[]): boolean {
    // Quick length check
    if (oldGroups.length !== newGroups.length) return true;

    // Optimized field-by-field comparison instead of JSON.stringify
    const oldGroupMap = new Map(oldGroups.map(g => [g.id, g]));
    const newGroupMap = new Map(newGroups.map(g => [g.id, g]));

    for (const [id, newGroup] of newGroupMap) {
      const oldGroup = oldGroupMap.get(id);
      if (!oldGroup) return true; // Group was added

      if (oldGroup.name !== newGroup.name) return true;
      if (JSON.stringify(oldGroup.serverIds || []) !== JSON.stringify(newGroup.serverIds || [])) return true;
      if (oldGroup.order !== newGroup.order) return true;
    }

    return false;
  }

  /**
   * Calculate delta between old and new server configurations
   */
  private calculateServerDelta(oldServers: ServerConfig[], newServers: ServerConfig[]) {
    const oldServerMap = new Map(oldServers.map(s => [s.id, s]));
    const newServerMap = new Map(newServers.map(s => [s.id, s]));

    const added: ServerConfig[] = [];
    const removed: ServerConfig[] = [];
    const updated: ServerConfig[] = [];

    // Find added and updated servers
    for (const [id, newServer] of newServerMap) {
      const oldServer = oldServerMap.get(id);
      if (!oldServer) {
        added.push(newServer);
      } else if (JSON.stringify(oldServer) !== JSON.stringify(newServer)) {
        updated.push(newServer);
      }
    }

    // Find removed servers
    for (const [id, oldServer] of oldServerMap) {
      if (!newServerMap.has(id)) {
        removed.push(oldServer);
      }
    }

    return { added, removed, updated };
  }
}