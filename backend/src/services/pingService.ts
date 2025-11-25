import * as ping from 'ping';
import { ServerConfig, ServerStatus, PingResult, StatusUpdate, DiskUpdate } from '../types/server';
import { PING_DELAY, PING_TIMEOUT, CONSECUTIVE_THRESHOLD, SNMP_INTERVAL } from '../config/constants';
import { SnmpService } from './snmpService';
import { NetAppService } from './netappService';
import { EventEmitter } from 'events';

export class PingService extends EventEmitter {
  private serverStatusMap = new Map<string, ServerStatus>();
  private pingPromises = new Map<string, Promise<void>>();
  private snmpIntervals = new Map<string, NodeJS.Timeout>();
  private isRunning = false;

  constructor(private servers: ServerConfig[]) {
    super();
    this.initializeServers();
  }

  private initializeServers(): void {
    this.servers.forEach(server => {
      const initialStatus: ServerStatus = {
        id: server.id,
        name: server.name,
        ip: server.ip,
        isOnline: false, // Start as offline until first successful ping
        consecutiveSuccesses: 0,
        consecutiveFailures: 0,
        lastChecked: new Date(),
        lastStatusChange: new Date(),
        diskInfo: null
      };
      this.serverStatusMap.set(server.id, initialStatus);
    });
  }

  public async pingServer(ip: string): Promise<PingResult> {
    try {
      const response = await ping.promise.probe(ip, {
        timeout: PING_TIMEOUT / 1000, // ping library expects seconds
        min_reply: 1
      });

      const success = response.alive;
      const responseTime = response.time === 'unknown' ? undefined : parseFloat(String(response.time));

      return {
        success,
        responseTime,
        error: success ? undefined : 'Host unreachable'
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown ping error';
      return {
        success: false,
        error: errorMsg
      };
    }
  }

  private async checkServerStatus(serverId: string): Promise<void> {
    const serverStatus = this.serverStatusMap.get(serverId);
    const serverConfig = this.servers.find(s => s.id === serverId);
    if (!serverStatus || !serverConfig) return;

    const pingResult = await this.pingServer(serverConfig.dnsAddress);
    const currentTime = new Date();
    const previousStatus = serverStatus.isOnline;

    // Update last checked time
    serverStatus.lastChecked = currentTime;

    if (pingResult.success) {
      // Successful ping
      serverStatus.consecutiveSuccesses++;
      serverStatus.consecutiveFailures = 0;

      // Check if server should change from offline to online
      if (!serverStatus.isOnline && serverStatus.consecutiveSuccesses >= CONSECUTIVE_THRESHOLD) {
        serverStatus.isOnline = true;
        serverStatus.lastStatusChange = currentTime;
        console.log(`🟢 ${serverStatus.name} (${serverConfig.dnsAddress} -> ${serverStatus.ip}) is now ONLINE`);
        this.emitStatusChange(serverStatus, previousStatus);
      }
    } else {
      // Failed ping
      serverStatus.consecutiveFailures++;
      serverStatus.consecutiveSuccesses = 0;

      // Check if server should change from online to offline
      if (serverStatus.isOnline && serverStatus.consecutiveFailures >= CONSECUTIVE_THRESHOLD) {
        serverStatus.isOnline = false;
        serverStatus.lastStatusChange = currentTime;
        console.log(`🔴 ${serverStatus.name} (${serverConfig.dnsAddress} -> ${serverStatus.ip}) is now OFFLINE`);
        this.emitStatusChange(serverStatus, previousStatus);
      }
    }

    // Update the status in the map
    this.serverStatusMap.set(serverId, serverStatus);
  }

  private async checkDiskStatus(serverId: string): Promise<void> {
    const serverStatus = this.serverStatusMap.get(serverId);
    const serverConfig = this.servers.find(s => s.id === serverId);

    if (!serverStatus || !serverConfig || !serverConfig.snmp?.enabled) {
      return;
    }

    try {
      const previousDiskInfo = serverStatus.diskInfo;
      const snmpResult = await SnmpService.getDiskInfo(serverConfig.dnsAddress, serverConfig.snmp);

      if (snmpResult.success && snmpResult.diskInfo) {
        // Update server status with real disk information
        serverStatus.diskInfo = snmpResult.diskInfo;
        this.serverStatusMap.set(serverId, serverStatus);

        // Check if disk info has changed and emit update
        const diskInfoChanged = this.hasDiskInfoChanged(previousDiskInfo, snmpResult.diskInfo);
        if (diskInfoChanged) {
          console.log(`💾 ${serverStatus.name}: Disk info changed, emitting update (${snmpResult.diskInfo.length} disks)`);
          this.emitDiskUpdate(serverStatus);
        } else {
          console.log(`💾 ${serverStatus.name}: Updated disk info (${snmpResult.diskInfo.length} disks)`);
        }
      } else {
        console.log(`⚠️  ${serverStatus.name}: SNMP disk query failed - ${snmpResult.error}`);
        // Keep existing disk info or set to null if first attempt
        if (!serverStatus.diskInfo) {
          serverStatus.diskInfo = null;
          this.serverStatusMap.set(serverId, serverStatus);
          // Emit update for null disk info on servers that should have disk info
          this.emitDiskUpdate(serverStatus);
        }
      }
    } catch (error) {
      console.error(`Error checking disk status for ${serverStatus.name}:`, error);
      // Don't affect ping monitoring - just log the error
    }
  }

  private async checkLunStatus(serverId: string): Promise<void> {
    const serverStatus = this.serverStatusMap.get(serverId);
    const serverConfig = this.servers.find(s => s.id === serverId);

    if (!serverStatus || !serverConfig || !serverConfig.netapp?.enabled) {
      return;
    }

    try {
      const previousDiskInfo = serverStatus.diskInfo;
      const netappResult = await NetAppService.getLunInfo(serverConfig.dnsAddress, serverConfig.netapp);

      if (netappResult.success && netappResult.diskInfo) {
        // Update server status with LUN disk information
        serverStatus.diskInfo = netappResult.diskInfo;
        this.serverStatusMap.set(serverId, serverStatus);

        // Check if disk info has changed and emit update
        const diskInfoChanged = this.hasDiskInfoChanged(previousDiskInfo, netappResult.diskInfo);
        if (diskInfoChanged) {
          console.log(`🗄️ ${serverStatus.name}: LUN info changed, emitting update (${netappResult.diskInfo.length} LUNs)`);
          this.emitDiskUpdate(serverStatus);
        } else {
          console.log(`🗄️ ${serverStatus.name}: Updated LUN info (${netappResult.diskInfo.length} LUNs)`);
        }
      } else {
        console.log(`⚠️  ${serverStatus.name}: NetApp LUN query failed - ${netappResult.error}`);
        // Keep existing disk info or set to null if first attempt
        if (!serverStatus.diskInfo) {
          serverStatus.diskInfo = null;
          this.serverStatusMap.set(serverId, serverStatus);
          // Emit update for null disk info on servers that should have disk info
          this.emitDiskUpdate(serverStatus);
        }
      }
    } catch (error) {
      console.error(`Error checking LUN status for ${serverStatus.name}:`, error);
      // Don't affect ping monitoring - just log the error
    }
  }

  private emitStatusChange(serverStatus: ServerStatus, previousStatus: boolean): void {
    const statusUpdate: StatusUpdate = {
      serverId: serverStatus.id,
      name: serverStatus.name,
      ip: serverStatus.ip,
      isOnline: serverStatus.isOnline,
      previousStatus,
      timestamp: new Date()
    };

    this.emit('statusChange', statusUpdate);
  }

  private emitDiskUpdate(serverStatus: ServerStatus): void {
    const diskUpdate: DiskUpdate = {
      serverId: serverStatus.id,
      name: serverStatus.name,
      diskInfo: serverStatus.diskInfo || null,
      timestamp: new Date()
    };

    this.emit('diskUpdate', diskUpdate);
  }

  private hasDiskInfoChanged(previousDiskInfo: any, newDiskInfo: any): boolean {
    // If one is null and the other isn't, it changed
    if (!previousDiskInfo && newDiskInfo) return true;
    if (previousDiskInfo && !newDiskInfo) return true;
    if (!previousDiskInfo && !newDiskInfo) return false;

    // If array lengths are different, it changed
    if (previousDiskInfo.length !== newDiskInfo.length) return true;

    // Compare each disk's percentage (the key metric we care about)
    for (let i = 0; i < previousDiskInfo.length; i++) {
      const prev = previousDiskInfo[i];
      const curr = newDiskInfo[i];

      // Check if percentage, total, used, or free changed
      if (prev.percentage !== curr.percentage ||
        prev.total !== curr.total ||
        prev.used !== curr.used ||
        prev.free !== curr.free) {
        return true;
      }
    }

    return false;
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async continuousPing(serverId: string): Promise<void> {
    const server = this.servers.find(s => s.id === serverId);
    if (!server) return;

    while (this.isRunning) {
      try {
        await this.checkServerStatus(serverId);

        // Small delay between pings to prevent overwhelming
        if (this.isRunning) {
          await this.sleep(PING_DELAY);
        }
      } catch (error) {
        console.error(`Error pinging ${server.name}:`, error);
        await this.sleep(PING_DELAY * 5); // Longer delay on error
      }
    }
  }

  private showInitialStatus(): void {
    console.log('\n📊 Initial Server Status:');
    console.log('='.repeat(50));

    const servers = this.getAllServerStatus();
    const onlineCount = servers.filter(s => s.isOnline).length;
    const offlineCount = servers.length - onlineCount;

    servers.forEach(server => {
      const status = server.isOnline ? '🟢 ONLINE ' : '🔴 OFFLINE';
      console.log(`${status} ${server.name} (${server.ip})`);
    });

    console.log('='.repeat(50));
    console.log(`📈 Summary: ${onlineCount} online, ${offlineCount} offline\n`);
  }

  public start(): void {
    if (this.isRunning) {
      console.log('Ping service is already running');
      return;
    }

    console.log(`🚀 Starting monitoring service for ${this.servers.length} servers...`);
    this.isRunning = true;

    // Show initial status (all start as offline)
    this.showInitialStatus();

    // Start continuous pinging for each server
    this.servers.forEach(server => {
      const pingPromise = this.continuousPing(server.id);
      this.pingPromises.set(server.id, pingPromise);

      // Start SNMP disk monitoring if enabled
      if (server.snmp?.enabled) {
        // Support both new disks format and legacy storageIndexes format
        const diskCount = server.snmp.disks?.length || server.snmp.storageIndexes?.length || 0;
        console.log(`📊 Starting SNMP monitoring for ${server.name} (${diskCount} disks)`);

        // Initial disk check
        this.checkDiskStatus(server.id);

        // Set up recurring SNMP checks every minute
        const snmpInterval = setInterval(() => {
          this.checkDiskStatus(server.id);
        }, SNMP_INTERVAL);

        this.snmpIntervals.set(server.id, snmpInterval);
      }

      // Start NetApp LUN monitoring if enabled
      if (server.netapp?.enabled) {
        const lunCount = server.netapp.luns?.length || 0;
        console.log(`🗄️ Starting NetApp LUN monitoring for ${server.name} (${lunCount} LUNs)`);

        // Initial LUN check
        this.checkLunStatus(server.id);

        // Set up recurring LUN checks every minute
        const lunInterval = setInterval(() => {
          this.checkLunStatus(server.id);
        }, SNMP_INTERVAL);

        this.snmpIntervals.set(server.id + '_lun', lunInterval);
      }
    });

    const snmpEnabledCount = this.servers.filter(s => s.snmp?.enabled).length;
    const netappEnabledCount = this.servers.filter(s => s.netapp?.enabled).length;
    console.log(`⚡ Continuous pinging started (${PING_DELAY / 1000}s delay between pings)`);
    console.log(`💾 SNMP disk monitoring started for ${snmpEnabledCount} servers (${SNMP_INTERVAL / 1000}s interval)`);
    console.log(`🗄️ NetApp LUN monitoring started for ${netappEnabledCount} servers (${SNMP_INTERVAL / 1000}s interval)`);
    console.log('📡 Status changes will be shown below:\n');
  }

  public stop(): void {
    if (!this.isRunning) {
      console.log('Monitoring service is not running');
      return;
    }

    console.log('Stopping monitoring service...');
    this.isRunning = false;

    // Clear all SNMP intervals
    this.snmpIntervals.forEach(interval => {
      clearInterval(interval);
    });
    this.snmpIntervals.clear();

    // Wait for all continuous ping loops to finish
    Promise.all(Array.from(this.pingPromises.values()))
      .then(() => {
        console.log('All monitoring loops stopped');
      })
      .catch((error) => {
        console.error('Error stopping monitoring loops:', error);
      });

    this.pingPromises.clear();
    console.log('Monitoring service stopped');
  }

  /**
   * Reset the ping service state for testing
   * Stops all monitoring, clears all intervals, and resets internal state
   *
   * Usage in tests:
   * afterEach(() => {
   *   pingService.reset();
   * });
   */
  public reset(): void {
    // Stop monitoring if running
    if (this.isRunning) {
      this.isRunning = false;
    }

    // Clear all ping promises
    this.pingPromises.clear();

    // Clear all SNMP/LUN monitoring intervals
    this.snmpIntervals.forEach(interval => {
      clearInterval(interval);
    });
    this.snmpIntervals.clear();

    // Clear server status map
    this.serverStatusMap.clear();

    // Remove all event listeners
    this.removeAllListeners();

    console.log('[TEST] PingService reset complete');
  }

  public getAllServerStatus(): ServerStatus[] {
    return Array.from(this.serverStatusMap.values());
  }

  public getServerStatus(serverId: string): ServerStatus | undefined {
    return this.serverStatusMap.get(serverId);
  }

  public getServerCount(): number {
    return this.serverStatusMap.size;
  }

  public getOnlineCount(): number {
    return Array.from(this.serverStatusMap.values()).filter(server => server.isOnline).length;
  }

  /**
   * Add new servers to monitor - part of hot-reload functionality
   * Preserves existing monitoring for unchanged servers
   */
  public async addServers(newServers: ServerConfig[]): Promise<void> {
    console.log(`🔧 Adding ${newServers.length} new servers to monitoring...`);

    // Update the servers array with new servers
    this.servers = [...this.servers, ...newServers];

    // Initialize server status for new servers
    newServers.forEach(server => {
      const initialStatus: ServerStatus = {
        id: server.id,
        name: server.name,
        ip: server.ip,
        isOnline: false, // Start as offline until first successful ping
        consecutiveSuccesses: 0,
        consecutiveFailures: 0,
        lastChecked: new Date(),
        lastStatusChange: new Date(),
        diskInfo: null
      };
      this.serverStatusMap.set(server.id, initialStatus);
    });

    // Start monitoring for new servers only
    newServers.forEach(server => {
      const pingPromise = this.continuousPing(server.id);
      this.pingPromises.set(server.id, pingPromise);

      // Start SNMP disk monitoring if enabled
      if (server.snmp?.enabled) {
        const diskCount = server.snmp.disks?.length || server.snmp.storageIndexes?.length || 0;
        console.log(`📊 Starting SNMP monitoring for ${server.name} (${diskCount} disks)`);

        // Initial disk check
        this.checkDiskStatus(server.id);

        // Set up recurring SNMP checks
        const snmpInterval = setInterval(() => {
          this.checkDiskStatus(server.id);
        }, SNMP_INTERVAL);

        this.snmpIntervals.set(server.id, snmpInterval);
      }

      // Start NetApp LUN monitoring if enabled
      if (server.netapp?.enabled) {
        const lunCount = server.netapp.luns?.length || 0;
        console.log(`🗄️ Starting NetApp LUN monitoring for ${server.name} (${lunCount} LUNs)`);

        // Initial LUN check
        this.checkLunStatus(server.id);

        // Set up recurring LUN checks
        const lunInterval = setInterval(() => {
          this.checkLunStatus(server.id);
        }, SNMP_INTERVAL);

        this.snmpIntervals.set(server.id + '_lun', lunInterval);
      }
    });

    console.log(`✅ Successfully added ${newServers.length} servers to monitoring`);
  }

  /**
   * Remove servers from monitoring - part of hot-reload functionality
   * Preserves existing monitoring for remaining servers
   */
  public async removeServers(serverIdsToRemove: string[]): Promise<void> {
    console.log(`🔧 Removing ${serverIdsToRemove.length} servers from monitoring...`);

    // Stop monitoring for removed servers
    serverIdsToRemove.forEach(serverId => {
      // Clear ping promise
      const pingPromise = this.pingPromises.get(serverId);
      if (pingPromise) {
        // Note: We can't directly cancel a Promise, but the continuousPing loop
        // will check isRunning flag and exit naturally
        this.pingPromises.delete(serverId);
      }

      // Clear SNMP intervals
      const snmpInterval = this.snmpIntervals.get(serverId);
      if (snmpInterval) {
        clearInterval(snmpInterval);
        this.snmpIntervals.delete(serverId);
      }

      // Clear NetApp LUN intervals
      const lunInterval = this.snmpIntervals.get(serverId + '_lun');
      if (lunInterval) {
        clearInterval(lunInterval);
        this.snmpIntervals.delete(serverId + '_lun');
      }

      // Remove from server status map
      this.serverStatusMap.delete(serverId);

      console.log(`🛑 Stopped monitoring server ${serverId}`);
    });

    // Update servers array to remove removed servers
    this.servers = this.servers.filter(server => !serverIdsToRemove.includes(server.id));

    console.log(`✅ Successfully removed ${serverIdsToRemove.length} servers from monitoring`);
  }

  /**
   * Update existing servers configuration - part of hot-reload functionality
   * Handles modified server configurations (IP changes, credential changes, etc.)
   */
  public async updateServers(updatedServers: ServerConfig[]): Promise<void> {
    console.log(`🔧 Updating ${updatedServers.length} servers configuration...`);

    // For each updated server, we need to restart monitoring with new config
    updatedServers.forEach(updatedServer => {
      const existingServerIndex = this.servers.findIndex(s => s.id === updatedServer.id);
      if (existingServerIndex !== -1) {
        // Stop old monitoring first
        this.stopMonitoringForServer(updatedServer.id);

        // Update server configuration
        this.servers[existingServerIndex] = updatedServer;

        // Reset server status (forces re-evaluation)
        const existingStatus = this.serverStatusMap.get(updatedServer.id);
        if (existingStatus) {
          existingStatus.ip = updatedServer.ip;
          existingStatus.name = updatedServer.name;
          // Reset counters to force immediate re-evaluation
          existingStatus.consecutiveSuccesses = 0;
          existingStatus.consecutiveFailures = 0;
          existingStatus.lastStatusChange = new Date();
        } else {
          // Create new status if not found (shouldn't happen but defensive)
          const initialStatus: ServerStatus = {
            id: updatedServer.id,
            name: updatedServer.name,
            ip: updatedServer.ip,
            isOnline: false,
            consecutiveSuccesses: 0,
            consecutiveFailures: 0,
            lastChecked: new Date(),
            lastStatusChange: new Date(),
            diskInfo: null
          };
          this.serverStatusMap.set(updatedServer.id, initialStatus);
        }

        // Start new monitoring with updated configuration
        this.startMonitoringForServer(updatedServer);

        console.log(`🔄 Updated monitoring for server ${updatedServer.name}`);
      }
    });

    console.log(`✅ Successfully updated ${updatedServers.length} servers configuration`);
  }

  /**
   * Stop monitoring for a specific server - helper method
   */
  private stopMonitoringForServer(serverId: string): void {
    // Clear ping promise
    this.pingPromises.delete(serverId);

    // Clear SNMP intervals
    const snmpInterval = this.snmpIntervals.get(serverId);
    if (snmpInterval) {
      clearInterval(snmpInterval);
      this.snmpIntervals.delete(serverId);
    }

    // Clear NetApp LUN intervals
    const lunInterval = this.snmpIntervals.get(serverId + '_lun');
    if (lunInterval) {
      clearInterval(lunInterval);
      this.snmpIntervals.delete(serverId + '_lun');
    }
  }

  /**
   * Start monitoring for a specific server - helper method
   */
  private startMonitoringForServer(server: ServerConfig): void {
    // Start continuous ping
    const pingPromise = this.continuousPing(server.id);
    this.pingPromises.set(server.id, pingPromise);

    // Start SNMP monitoring if enabled
    if (server.snmp?.enabled) {
      const diskCount = server.snmp.disks?.length || server.snmp.storageIndexes?.length || 0;
      console.log(`📊 Starting SNMP monitoring for ${server.name} (${diskCount} disks)`);

      // Initial disk check
      this.checkDiskStatus(server.id);

      // Set up recurring SNMP checks
      const snmpInterval = setInterval(() => {
        this.checkDiskStatus(server.id);
      }, SNMP_INTERVAL);

      this.snmpIntervals.set(server.id, snmpInterval);
    }

    // Start NetApp LUN monitoring if enabled
    if (server.netapp?.enabled) {
      const lunCount = server.netapp.luns?.length || 0;
      console.log(`🗄️ Starting NetApp LUN monitoring for ${server.name} (${lunCount} LUNs)`);

      // Initial LUN check
      this.checkLunStatus(server.id);

      // Set up recurring LUN checks
      const lunInterval = setInterval(() => {
        this.checkLunStatus(server.id);
      }, SNMP_INTERVAL);

      this.snmpIntervals.set(server.id + '_lun', lunInterval);
    }
  }

  /**
   * Handle configuration changes from ConfigManager
   * This is the main integration point for hot-reload functionality
   */
  public async onConfigChange(newServers: ServerConfig[]): Promise<void> {
    console.log(`🔄 Processing configuration change for ${newServers.length} servers...`);

    try {
      const currentServerMap = new Map(this.servers.map(s => [s.id, s]));
      const newServerMap = new Map(newServers.map(s => [s.id, s]));

      const added = newServers.filter(s => !currentServerMap.has(s.id));
      const removed = this.servers.filter(s => !newServerMap.has(s.id));
      const updated = newServers.filter(s => {
        const current = currentServerMap.get(s.id);
        return current && JSON.stringify(current) !== JSON.stringify(s);
      });

      console.log(`📊 Configuration delta: +${added.length} added, -${removed.length} removed, ~${updated.length} updated`);

      // Process removals first (stop monitoring)
      if (removed.length > 0) {
        await this.removeServers(removed.map(s => s.id));
      }

      // Process updates (restart monitoring with new config)
      if (updated.length > 0) {
        await this.updateServers(updated);
      }

      // Process additions (start new monitoring)
      if (added.length > 0) {
        await this.addServers(added);
      }

      console.log(`✅ Configuration change processed successfully`);

    } catch (error) {
      console.error(`❌ Error processing configuration change:`, error);
      throw error;
    }
  }
}