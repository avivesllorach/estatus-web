import { audioService } from './audioService';

interface DiskInfo {
  total: number;
  free: number;
  used: number;
  percentage: number;
  description?: string; // From hrStorageDescr (SNMP)
  index?: number; // The hrStorageIndex (SNMP)
  name?: string; // Custom disk name from configuration
}

export interface ServerData {
  id: string;
  name: string;
  ip: string;
  isOnline: boolean;
  consecutiveSuccesses: number;
  consecutiveFailures: number;
  lastChecked: string;
  lastStatusChange: string;
  diskInfo?: DiskInfo[] | null;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

interface StatusUpdate {
  serverId: string;
  name: string;
  ip: string;
  isOnline: boolean;
  previousStatus: boolean;
  timestamp: string;
}

interface DiskUpdate {
  serverId: string;
  name: string;
  diskInfo: DiskInfo[] | null;
  timestamp: string;
}

interface EventMessage {
  type: 'connected' | 'initial' | 'statusChange' | 'diskUpdate' | 'heartbeat' | 'serverAdded' | 'serverUpdated' | 'serverRemoved' | 'groupsChanged';
  message?: string;
  servers?: ServerData[];
  update?: StatusUpdate | DiskUpdate;
  server?: ServerConfig;
  serverId?: string;
  groups?: GroupConfig[];
  timestamp?: string;
}

const API_BASE_URL = '/api';

export class ApiService {
  private eventSource: EventSource | null = null;
  private reconnectionTimeout: number | null = null;
  private onStatusUpdateCallback: ((servers: ServerData[]) => void) | null = null;
  private onGroupsUpdateCallback: ((groups: GroupConfig[]) => void) | null = null;
  private onServerRemovedCallback: ((serverId: string, serverName: string) => void) | null = null;
  private onServerUpdatedCallback: ((server: ServerConfig) => void) | null = null;
  private onErrorCallback: ((error: Event) => void) | null = null;
  private servers: Map<string, ServerData> = new Map();

  async fetchServers(): Promise<ServerData[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/servers`);
      const result: ApiResponse<ServerData[]> = await response.json();
      
      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to fetch servers');
      }

      // Update local servers map
      result.data.forEach(server => {
        this.servers.set(server.id, server);
      });

      return result.data;
    } catch (error) {
      console.error('Error fetching servers:', error);
      throw error;
    }
  }

  async fetchServerById(id: string): Promise<ServerData> {
    try {
      const response = await fetch(`${API_BASE_URL}/servers/${id}`);
      const result: ApiResponse<ServerData> = await response.json();
      
      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to fetch server');
      }

      return result.data;
    } catch (error) {
      console.error(`Error fetching server ${id}:`, error);
      throw error;
    }
  }

  connectToStatusUpdates(
    onUpdate: (servers: ServerData[]) => void,
    onGroupsUpdate?: (groups: GroupConfig[]) => void,
    onServerRemoved?: (serverId: string, serverName: string) => void,
    onServerUpdated?: (server: ServerConfig) => void,
    onError?: (error: Event) => void
  ): void {
    // Clear any pending reconnection timeout to prevent memory leaks
    if (this.reconnectionTimeout) {
      clearTimeout(this.reconnectionTimeout);
      this.reconnectionTimeout = null;
    }

    this.onStatusUpdateCallback = onUpdate;
    this.onGroupsUpdateCallback = onGroupsUpdate || null;
    this.onServerRemovedCallback = onServerRemoved || null;
    this.onServerUpdatedCallback = onServerUpdated || null;
    this.onErrorCallback = onError || null;

    // Close existing connection
    if (this.eventSource) {
      this.eventSource.close();
    }

    // Create new EventSource connection
    this.eventSource = new EventSource(`${API_BASE_URL}/events`);

    this.eventSource.onopen = () => {
      console.log('Connected to server status stream');
    };

    this.eventSource.onmessage = (event) => {
      try {
        const message: EventMessage = JSON.parse(event.data);
        this.handleEventMessage(message);
      } catch (error) {
        console.error('Error parsing SSE message:', error);
      }
    };

    this.eventSource.onerror = (error) => {
      console.error('SSE connection error:', error);

      // Call error callback if provided
      if (this.onErrorCallback) {
        this.onErrorCallback(error);
      }

      // Only attempt to reconnect if we still have callbacks (component hasn't unmounted)
      if (this.onStatusUpdateCallback) {
        // Store the reconnection timeout so it can be cleared on disconnect
        this.reconnectionTimeout = setTimeout(() => {
          // Double-check that we still have callbacks before reconnecting
          if (this.onStatusUpdateCallback) {
            console.log('Attempting to reconnect to status stream...');
            this.connectToStatusUpdates(
              this.onStatusUpdateCallback,
              this.onGroupsUpdateCallback || undefined,
              this.onServerRemovedCallback || undefined,
              this.onServerUpdatedCallback || undefined,
              this.onErrorCallback || undefined
            );
          }
        }, 5000);
      }
    };
  }

  private handleEventMessage(message: EventMessage): void {
    switch (message.type) {
      case 'connected':
        console.log('SSE:', message.message);
        break;

      case 'initial':
        if (message.servers) {
          // Update local servers map
          message.servers.forEach(server => {
            this.servers.set(server.id, server);
          });
          
          // Notify callback with initial data
          if (this.onStatusUpdateCallback) {
            this.onStatusUpdateCallback(Array.from(this.servers.values()));
          }
        }
        break;

      case 'statusChange':
        if (message.update) {
          // Update specific server in local map
          const existingServer = this.servers.get((message.update as StatusUpdate).serverId);
          if (existingServer) {
            const statusUpdate = message.update as StatusUpdate;
            existingServer.isOnline = statusUpdate.isOnline;
            existingServer.lastStatusChange = statusUpdate.timestamp;
            this.servers.set(statusUpdate.serverId, existingServer);

            // Play notification sound based on status change
            if (statusUpdate.isOnline) {
              audioService.playOnlineSound();
            } else {
              audioService.playOfflineSound();
            }

            // Notify callback with updated data
            if (this.onStatusUpdateCallback) {
              this.onStatusUpdateCallback(Array.from(this.servers.values()));
            }

            console.log(`Status update: ${statusUpdate.name} is now ${statusUpdate.isOnline ? 'ONLINE' : 'OFFLINE'}`);
          }
        }
        break;

      case 'diskUpdate':
        if (message.update) {
          // Update specific server's disk info in local map
          const existingServer = this.servers.get((message.update as DiskUpdate).serverId);
          if (existingServer) {
            const diskUpdate = message.update as DiskUpdate;
            existingServer.diskInfo = diskUpdate.diskInfo;
            this.servers.set(diskUpdate.serverId, existingServer);

            // Notify callback with updated data
            if (this.onStatusUpdateCallback) {
              this.onStatusUpdateCallback(Array.from(this.servers.values()));
            }

            console.log(`Disk update: ${diskUpdate.name} disk info updated`);
          }
        }
        break;

      case 'serverAdded':
        if (message.server) {
          // Convert ServerConfig to ServerData and add to local map
          const newServer: ServerData = {
            id: message.server.id,
            name: message.server.name,
            ip: message.server.ip,
            isOnline: false, // New servers start as offline until monitoring starts
            consecutiveSuccesses: message.server.consecutiveSuccesses || 0,
            consecutiveFailures: message.server.consecutiveFailures || 0,
            lastChecked: new Date().toISOString(),
            lastStatusChange: new Date().toISOString(),
            diskInfo: null,
          };
          this.servers.set(message.server.id, newServer);

          // Notify callback with updated data
          if (this.onStatusUpdateCallback) {
            this.onStatusUpdateCallback(Array.from(this.servers.values()));
          }

          console.log(`Server added: ${newServer.name} (${newServer.ip})`);
        }
        break;

      case 'serverUpdated':
        if (message.server) {
          // Update existing server in local map
          const existingServer = this.servers.get(message.server.id);
          if (existingServer) {
            existingServer.name = message.server.name;
            existingServer.ip = message.server.ip;
            this.servers.set(message.server.id, existingServer);

            // Notify callback with updated data
            if (this.onStatusUpdateCallback) {
              this.onStatusUpdateCallback(Array.from(this.servers.values()));
            }

            // Notify specific server updated callback for conflict detection
            if (this.onServerUpdatedCallback) {
              this.onServerUpdatedCallback(message.server);
            }

            console.log(`Server updated: ${existingServer.name} (${existingServer.ip})`);
          }
        }
        break;

      case 'serverRemoved':
        if (message.serverId) {
          // Remove server from local map
          const removedServer = this.servers.get(message.serverId);
          if (removedServer) {
            this.servers.delete(message.serverId);

            // Notify callback with updated data
            if (this.onStatusUpdateCallback) {
              this.onStatusUpdateCallback(Array.from(this.servers.values()));
            }

            // Notify specific server removed callback for conflict detection
            if (this.onServerRemovedCallback) {
              this.onServerRemovedCallback(message.serverId, removedServer.name);
            }

            console.log(`Server removed: ${removedServer.name} (${message.serverId})`);
          }
        }
        break;

      case 'groupsChanged':
        if (message.groups) {
          // Notify groups callback with updated data
          if (this.onGroupsUpdateCallback) {
            this.onGroupsUpdateCallback(message.groups);
          }

          console.log('Groups configuration changed:', message.groups);
        }
        break;

      case 'heartbeat':
        // Keep-alive message, no action needed
        break;

      default:
        console.log('Unknown SSE message type:', message.type);
    }
  }

  disconnect(): void {
    // Clear any pending reconnection timeout to prevent memory leaks
    if (this.reconnectionTimeout) {
      clearTimeout(this.reconnectionTimeout);
      this.reconnectionTimeout = null;
    }

    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    this.onStatusUpdateCallback = null;
    this.onGroupsUpdateCallback = null;
    this.onServerRemovedCallback = null;
    this.onServerUpdatedCallback = null;
    this.onErrorCallback = null;
    console.log('Disconnected from server status stream');
  }

  getServers(): ServerData[] {
    return Array.from(this.servers.values());
  }

  async fetchGroups(): Promise<GroupConfig[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/config/groups`);
      const result: ApiResponse<GroupConfig[]> = await response.json();

      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to fetch groups');
      }

      return result.data;
    } catch (error) {
      console.error('Error fetching groups:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const apiService = new ApiService();

/**
 * Config API for server configuration management
 */
export interface ServerConfig {
  id: string;
  name: string;
  ip: string;
  dns: string;
  consecutiveSuccesses?: number;
  consecutiveFailures?: number;
  snmpConfig?: {
    enabled: boolean;
    community: string;
    storageIndexes: number[];
    diskNames: string[];
  };
  netappConfig?: {
    enabled: boolean;
    apiType: 'rest' | 'zapi';
    username: string;
    password: string;
    luns: Array<{ name: string; path: string }>;
  };
}

export interface GroupConfig {
  id: string;
  name: string;
  order: number;
  serverIds: string[];
}

export const configApi = {
  /**
   * Create new server configuration
   */
  async createServer(data: ServerConfig): Promise<ServerConfig> {
    try {
      const response = await fetch(`${API_BASE_URL}/config/servers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result: ApiResponse<ServerConfig> = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to create server');
      }

      if (!result.data) {
        throw new Error('Server creation succeeded but no data returned');
      }

      return result.data;
    } catch (error) {
      console.error('Error creating server:', error);
      throw error;
    }
  },

  /**
   * Update existing server configuration
   */
  async updateServer(id: string, data: ServerConfig): Promise<ServerConfig> {
    try {
      const response = await fetch(`${API_BASE_URL}/config/servers/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result: ApiResponse<ServerConfig> = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to update server');
      }

      if (!result.data) {
        throw new Error('Server update succeeded but no data returned');
      }

      return result.data;
    } catch (error) {
      console.error(`Error updating server ${id}:`, error);
      throw error;
    }
  },

  /**
   * Delete server configuration
   */
  async deleteServer(id: string): Promise<string> {
    try {
      const response = await fetch(`${API_BASE_URL}/config/servers/${id}`, {
        method: 'DELETE',
      });

      const result: ApiResponse<{ deletedId: string }> = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to delete server');
      }

      if (!result.data?.deletedId) {
        throw new Error('Server deletion succeeded but no deleted ID returned');
      }

      return result.data.deletedId;
    } catch (error) {
      console.error(`Error deleting server ${id}:`, error);
      throw error;
    }
  },

  /**
   * Create new group configuration
   */
  async createGroup(data: Omit<GroupConfig, 'id'>): Promise<GroupConfig> {
    try {
      const response = await fetch(`${API_BASE_URL}/config/groups`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result: ApiResponse<GroupConfig> = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to create group');
      }

      if (!result.data) {
        throw new Error('Group creation succeeded but no data returned');
      }

      return result.data;
    } catch (error) {
      console.error('Error creating group:', error);
      throw error;
    }
  },

  /**
   * Update existing group configuration
   */
  async updateGroup(id: string, data: GroupConfig): Promise<GroupConfig> {
    try {
      const response = await fetch(`${API_BASE_URL}/config/groups/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result: ApiResponse<GroupConfig> = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to update group');
      }

      if (!result.data) {
        throw new Error('Group update succeeded but no data returned');
      }

      return result.data;
    } catch (error) {
      console.error(`Error updating group ${id}:`, error);
      throw error;
    }
  },

  /**
   * Delete group configuration with server reassignment
   */
  async deleteGroup(id: string, reassignStrategy: 'unassign' | 'default' = 'unassign'): Promise<{ deletedId: string; reassignedServers: string[] }> {
    try {
      const url = new URL(`${API_BASE_URL}/config/groups/${id}`, window.location.origin);
      url.searchParams.set('reassign', reassignStrategy);

      const response = await fetch(url.toString(), {
        method: 'DELETE',
      });

      const result: ApiResponse<{ deletedId: string; reassignedServers: string[] }> = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to delete group');
      }

      if (!result.data) {
        throw new Error('Group deletion succeeded but no data returned');
      }

      return result.data;
    } catch (error) {
      console.error(`Error deleting group ${id}:`, error);
      throw error;
    }
  },
};
