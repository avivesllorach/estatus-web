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
  type: 'connected' | 'initial' | 'statusChange' | 'diskUpdate' | 'heartbeat';
  message?: string;
  servers?: ServerData[];
  update?: StatusUpdate | DiskUpdate;
  timestamp?: string;
}

const API_BASE_URL = '/api';

export class ApiService {
  private eventSource: EventSource | null = null;
  private onStatusUpdateCallback: ((servers: ServerData[]) => void) | null = null;
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

  connectToStatusUpdates(onUpdate: (servers: ServerData[]) => void): void {
    this.onStatusUpdateCallback = onUpdate;

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
      
      // Attempt to reconnect after 5 seconds
      setTimeout(() => {
        if (this.onStatusUpdateCallback) {
          console.log('Attempting to reconnect to status stream...');
          this.connectToStatusUpdates(this.onStatusUpdateCallback);
        }
      }, 5000);
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

      case 'heartbeat':
        // Keep-alive message, no action needed
        break;

      default:
        console.log('Unknown SSE message type:', message.type);
    }
  }

  disconnect(): void {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    this.onStatusUpdateCallback = null;
    console.log('Disconnected from server status stream');
  }

  getServers(): ServerData[] {
    return Array.from(this.servers.values());
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
};
