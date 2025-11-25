import { PingService } from '../../services/pingService';
import { ServerConfig } from '../../types/server';

// Mock dependencies
jest.mock('ping');

jest.mock('../../services/snmpService', () => ({
  SnmpService: {
    getDiskInfo: jest.fn()
  }
}));

jest.mock('../../services/netappService', () => ({
  NetAppService: {
    getLunInfo: jest.fn()
  }
}));

describe('PingService Monitoring State Preservation', () => {
  let pingService: PingService;
  let mockPing: jest.MockedFunction<typeof import('ping').promise.probe>;
  let mockSnmpService: jest.MockedFunction<any>;
  let mockNetappService: jest.MockedFunction<any>;

  beforeEach(() => {
    jest.useFakeTimers();
    mockPing = require('ping').promise.probe as jest.MockedFunction<any>;
    mockSnmpService = require('../../services/snmpService').SnmpService.getDiskInfo as jest.MockedFunction<any>;
    mockNetappService = require('../../services/netappService').NetAppService.getLunInfo as jest.MockedFunction<any>;

    // Default successful ping response
    mockPing.mockResolvedValue({
      alive: true,
      time: 10,
      output: 'Reply from 192.168.1.1: bytes=32 time=10ms TTL=64'
    });

    // Default successful SNMP response
    mockSnmpService.mockResolvedValue({
      success: true,
      diskInfo: [
        { id: '1', name: 'C:', total: 1000, used: 500, free: 500, percentage: 50 }
      ]
    });

    // Default successful NetApp response
    mockNetappService.mockResolvedValue({
      success: true,
      diskInfo: [
        { id: 'lun1', name: 'vol1_lun1', total: 2000, used: 1000, free: 1000, percentage: 50 }
      ]
    });
  });

  afterEach(() => {
    jest.useRealTimers();
    if (pingService) {
      pingService.reset();
    }
  });

  describe('Delta-Based Configuration Changes', () => {
    const initialServers: ServerConfig[] = [
      {
        id: 'server-1',
        name: 'Server 1',
        ip: '192.168.1.1',
        dnsAddress: 'server1.example.com'
      },
      {
        id: 'server-2',
        name: 'Server 2',
        ip: '192.168.1.2',
        dnsAddress: 'server2.example.com'
      }
    ];

    it('should maintain monitoring for unchanged servers during configuration update', async () => {
      pingService = new PingService(initialServers);
      pingService.start();

      // Let initial monitoring start
      jest.advanceTimersByTime(1000);

      // Monitor for status changes
      const statusChangeSpy = jest.fn();
      pingService.on('statusChange', statusChangeSpy);

      // Configuration change: server-1 unchanged, server-2 updated, server-3 added
      const updatedServers: ServerConfig[] = [
        ...initialServers.slice(0, 1), // server-1 unchanged
        {
          ...initialServers[1],
          name: 'Server 2 Updated' // server-2 updated
        },
        {
          id: 'server-3',
          name: 'Server 3',
          ip: '192.168.1.3',
          dnsAddress: 'server3.example.com'
        }
      ];

      // Process configuration change
      await pingService.onConfigChange(updatedServers);

      // Verify monitoring continuity - advance timers
      jest.advanceTimersByTime(5000);

      // All servers (including unchanged server-1) should continue monitoring
      expect(pingService.getServerCount()).toBe(3);

      const server1Status = pingService.getServerStatus('server-1');
      expect(server1Status).toBeDefined();
      expect(server1Status!.lastChecked).toBeDefined();

      // New server should start monitoring
      const server3Status = pingService.getServerStatus('server-3');
      expect(server3Status).toBeDefined();
      expect(server3Status!.name).toBe('Server 3');
    });

    it('should handle server addition without interrupting existing monitoring', async () => {
      pingService = new PingService(initialServers);
      pingService.start();

      // Let initial monitoring start
      jest.advanceTimersByTime(1000);

      // Add new server
      const newServer: ServerConfig = {
        id: 'server-3',
        name: 'Server 3',
        ip: '192.168.1.3',
        dnsAddress: 'server3.example.com'
      };

      await pingService.onConfigChange([...initialServers, newServer]);

      // Verify all servers are being monitored
      expect(pingService.getServerCount()).toBe(3);
      expect(pingService.getServerStatus('server-1')).toBeDefined();
      expect(pingService.getServerStatus('server-2')).toBeDefined();
      expect(pingService.getServerStatus('server-3')).toBeDefined();

      // Advance timers and verify monitoring continuity
      jest.advanceTimersByTime(10000);

      const allStatuses = pingService.getAllServerStatus();
      allStatuses.forEach(status => {
        expect(status.lastChecked).toBeDefined();
        expect(status.lastChecked.getTime()).toBeGreaterThan(0);
      });
    });

    it('should handle server removal without affecting remaining servers', async () => {
      pingService = new PingService(initialServers);
      pingService.start();

      // Let initial monitoring start
      jest.advanceTimersByTime(1000);

      // Remove server-2
      await pingService.onConfigChange([initialServers[0]]);

      // Verify remaining server is still monitored
      expect(pingService.getServerCount()).toBe(1);
      expect(pingService.getServerStatus('server-1')).toBeDefined();
      expect(pingService.getServerStatus('server-2')).toBeUndefined();

      // Advance timers and verify continued monitoring
      jest.advanceTimersByTime(10000);

      const remainingStatus = pingService.getServerStatus('server-1');
      expect(remainingStatus!.lastChecked.getTime()).toBeGreaterThan(0);
    });

    it('should handle server modification without full restart', async () => {
      pingService = new PingService(initialServers);
      pingService.start();

      // Let initial monitoring start
      jest.advanceTimersByTime(1000);

      // Modify server configuration
      const modifiedServers: ServerConfig[] = [
        initialServers[0],
        {
          ...initialServers[1],
          name: 'Server 2 Modified',
          ip: '192.168.1.20' // Changed IP
        }
      ];

      await pingService.onConfigChange(modifiedServers);

      // Verify server count remains the same
      expect(pingService.getServerCount()).toBe(2);

      // Verify updated server configuration
      const updatedStatus = pingService.getServerStatus('server-2');
      expect(updatedStatus).toBeDefined();
      expect(updatedStatus!.name).toBe('Server 2 Modified');
      expect(updatedStatus!.ip).toBe('192.168.1.20');

      // Monitoring should continue for both servers
      jest.advanceTimersByTime(10000);

      const allStatuses = pingService.getAllServerStatus();
      expect(allStatuses).toHaveLength(2);
      allStatuses.forEach(status => {
        expect(status.lastChecked.getTime()).toBeGreaterThan(0);
      });
    });
  });

  describe('Monitoring Continuity Performance', () => {
    const testServers: ServerConfig[] = [
      {
        id: 'perf-server-1',
        name: 'Performance Server 1',
        ip: '192.168.1.1',
        dnsAddress: 'perf1.example.com'
      },
      {
        id: 'perf-server-2',
        name: 'Performance Server 2',
        ip: '192.168.1.2',
        dnsAddress: 'perf2.example.com'
      }
    ];

    it('should maintain monitoring gaps under 5 seconds for unaffected servers', async () => {
      pingService = new PingService(testServers);
      pingService.start();

      // Let monitoring establish
      jest.advanceTimersByTime(2000);

      // Record last check time for unaffected server
      const initialCheckTime = pingService.getServerStatus('perf-server-1')!.lastChecked;

      // Add new server (should not affect perf-server-1)
      const newServer: ServerConfig = {
        id: 'perf-server-3',
        name: 'Performance Server 3',
        ip: '192.168.1.3',
        dnsAddress: 'perf3.example.com'
      };

      const configChangeStart = Date.now();
      await pingService.onConfigChange([...testServers, newServer]);
      const configChangeEnd = Date.now();

      // Advance time slightly to allow monitoring to continue
      jest.advanceTimersByTime(1000);

      const finalCheckTime = pingService.getServerStatus('perf-server-1')!.lastChecked;

      // Calculate monitoring gap (should be < 5 seconds)
      const monitoringGap = finalCheckTime.getTime() - initialCheckTime.getTime();

      // Account for our artificial time advancement
      const actualGap = monitoringGap - 1000; // Subtract the 1 second we advanced

      expect(actualGap).toBeLessThan(5000); // Less than 5 seconds
      expect(configChangeEnd - configChangeStart).toBeLessThan(1000); // Config change should be fast
    });

    it('should start monitoring for new servers within 5 seconds', async () => {
      pingService = new PingService([testServers[0]]);
      pingService.start();

      // Let initial monitoring establish
      jest.advanceTimersByTime(1000);

      // Add new server
      const newServer: ServerConfig = {
        id: 'new-perf-server',
        name: 'New Performance Server',
        ip: '192.168.1.3',
        dnsAddress: 'newperf.example.com'
      };

      const additionStart = Date.now();
      await pingService.onConfigChange([testServers[0], newServer]);

      // Advance time to allow first ping
      jest.advanceTimersByTime(1000);

      const newServerStatus = pingService.getServerStatus('new-perf-server');
      expect(newServerStatus).toBeDefined();
      expect(newServerStatus!.lastChecked.getTime()).toBeGreaterThan(additionStart);
    });

    it('should stop monitoring for removed servers within 1 second', async () => {
      pingService = new PingService(testServers);
      pingService.start();

      // Let monitoring establish
      jest.advanceTimersByTime(1000);

      // Set up spy to detect status change events
      const statusChangeSpy = jest.fn();
      pingService.on('statusChange', statusChangeSpy);

      // Remove server
      const removalStart = Date.now();
      await pingService.onConfigChange([testServers[0]]);

      // Advance time and verify no events from removed server
      jest.advanceTimersByTime(2000);

      // Removed server should not emit events
      const removedServerEvents = statusChangeSpy.mock.calls.filter(
        call => call[0].serverId === 'perf-server-2'
      );
      expect(removedServerEvents).toHaveLength(0);

      // Server should no longer be in status map
      expect(pingService.getServerStatus('perf-server-2')).toBeUndefined();
    });
  });

  describe('SNMP and NetApp Monitoring Preservation', () => {
    const serversWithMonitoring: ServerConfig[] = [
      {
        id: 'snmp-server',
        name: 'SNMP Server',
        ip: '192.168.1.1',
        dnsAddress: 'snmp.example.com',
        snmp: {
          enabled: true,
          storageIndexes: [1],
          disks: [
            { index: 1, name: 'C Drive' }
          ]
        }
      },
      {
        id: 'netapp-server',
        name: 'NetApp Server',
        ip: '192.168.1.2',
        dnsAddress: 'netapp.example.com',
        netapp: {
          enabled: true,
          system: 'netapp',
          username: 'admin',
          password: 'password',
          luns: [
            { id: 'lun1', description: 'Test LUN' }
          ]
        }
      }
    ];

    it('should preserve SNMP monitoring during configuration changes', async () => {
      pingService = new PingService(serversWithMonitoring);
      pingService.start();

      // Let monitoring establish
      jest.advanceTimersByTime(1000);

      // Initial SNMP check
      expect(mockSnmpService).toHaveBeenCalledWith('snmp.example.com', serversWithMonitoring[0].snmp);

      // Add new server while preserving SNMP monitoring
      const newServer: ServerConfig = {
        id: 'new-server',
        name: 'New Server',
        ip: '192.168.1.3',
        dnsAddress: 'new.example.com'
      };

      await pingService.onConfigChange([...serversWithMonitoring, newServer]);

      // Advance time for SNMP intervals
      jest.advanceTimersByTime(65000); // SNMP interval is 60 seconds

      // Verify SNMP monitoring continued for original server
      expect(mockSnmpService).toHaveBeenCalledTimes(2); // Initial + after interval

      // Verify SNMP monitoring started for any new SNMP-enabled servers
      expect(pingService.getServerStatus('snmp-server')).toBeDefined();
      expect(pingService.getServerStatus('new-server')).toBeDefined();
    });

    it('should preserve NetApp monitoring during configuration changes', async () => {
      pingService = new PingService(serversWithMonitoring);
      pingService.start();

      // Let monitoring establish
      jest.advanceTimersByTime(1000);

      // Initial NetApp check
      expect(mockNetappService).toHaveBeenCalledWith('netapp.example.com', serversWithMonitoring[1].netapp);

      // Remove one server, keep the other
      await pingService.onConfigChange([serversWithMonitoring[1]]);

      // Advance time for NetApp intervals
      jest.advanceTimersByTime(65000);

      // Verify NetApp monitoring continued for remaining server
      expect(mockNetappService).toHaveBeenCalledTimes(2); // Initial + after interval

      expect(pingService.getServerStatus('netapp-server')).toBeDefined();
      expect(pingService.getServerStatus('snmp-server')).toBeUndefined(); // Removed
    });
  });

  describe('Error Isolation and Recovery', () => {
    it('should isolate monitoring errors to individual servers', async () => {
      const servers: ServerConfig[] = [
        {
          id: 'healthy-server',
          name: 'Healthy Server',
          ip: '192.168.1.1',
          dnsAddress: 'healthy.example.com'
        },
        {
          id: 'failing-server',
          name: 'Failing Server',
          ip: '192.168.1.2',
          dnsAddress: 'failing.example.com'
        }
      ];

      // Configure ping to fail for one server
      mockPing.mockImplementation((address) => {
        if (address === 'failing.example.com') {
          return Promise.resolve({
            alive: false,
            time: 0,
            output: 'Request timeout'
          });
        }
        return Promise.resolve({
          alive: true,
          time: 10,
          output: 'Reply from 192.168.1.1'
        });
      });

      pingService = new PingService(servers);
      pingService.start();

      // Advance time to allow pings
      jest.advanceTimersByTime(5000);

      // Both servers should have status (one online, one offline)
      const healthyStatus = pingService.getServerStatus('healthy-server');
      const failingStatus = pingService.getServerStatus('failing-server');

      expect(healthyStatus).toBeDefined();
      expect(failingStatus).toBeDefined();

      // Configure change should not be affected by failing server
      const newServer: ServerConfig = {
        id: 'new-server',
        name: 'New Server',
        ip: '192.168.1.3',
        dnsAddress: 'new.example.com'
      };

      await expect(pingService.onConfigChange([...servers, newServer])).resolves.not.toThrow();

      // All servers should still be monitored
      expect(pingService.getServerCount()).toBe(3);
    });

    it('should handle configuration change errors without crashing monitoring', async () => {
      const servers: ServerConfig[] = [
        {
          id: 'server-1',
          name: 'Server 1',
          ip: '192.168.1.1',
          dnsAddress: 'server1.example.com'
        }
      ];

      pingService = new PingService(servers);
      pingService.start();

      jest.advanceTimersByTime(1000);

      // Simulate a configuration change error
      const originalConsoleError = console.error;
      console.error = jest.fn();

      // Create invalid configuration that might cause issues
      const invalidServers = [
        {
          id: '', // Invalid empty ID
          name: 'Invalid Server',
          ip: '192.168.1.2',
          dnsAddress: 'invalid.example.com'
        }
      ];

      // The service should handle errors gracefully
      await pingService.onConfigChange(invalidServers).catch(error => {
        expect(error).toBeDefined();
      });

      // Original server should still be monitored
      expect(pingService.getServerStatus('server-1')).toBeDefined();

      console.error = originalConsoleError;
    });
  });

  describe('Memory Management and Cleanup', () => {
    it('should properly clean up intervals and promises when servers are removed', async () => {
      const servers: ServerConfig[] = [
        {
          id: 'cleanup-server',
          name: 'Cleanup Server',
          ip: '192.168.1.1',
          dnsAddress: 'cleanup.example.com'
        }
      ];

      pingService = new PingService(servers);
      pingService.start();

      jest.advanceTimersByTime(1000);

      // Remove server
      await pingService.onConfigChange([]);

      // Server should be completely removed
      expect(pingService.getServerCount()).toBe(0);
      expect(pingService.getServerStatus('cleanup-server')).toBeUndefined();

      // Advance time and verify no memory leaks or errors
      jest.advanceTimersByTime(10000);

      // Should still be no servers
      expect(pingService.getServerCount()).toBe(0);
    });

    it('should handle multiple rapid configuration changes without memory leaks', async () => {
      const servers: ServerConfig[] = [
        {
          id: 'rapid-server',
          name: 'Rapid Server',
          ip: '192.168.1.1',
          dnsAddress: 'rapid.example.com'
        }
      ];

      pingService = new PingService(servers);
      pingService.start();

      jest.advanceTimersByTime(1000);

      // Perform multiple rapid configuration changes
      const changes = [
        [...servers],
        [], // Remove all
        [...servers, { // Add with new server
          id: 'rapid-server-2',
          name: 'Rapid Server 2',
          ip: '192.168.1.2',
          dnsAddress: 'rapid2.example.com'
        }],
        [servers[0]], // Remove new server
        [] // Remove original
      ];

      for (const config of changes) {
        await pingService.onConfigChange(config);
        jest.advanceTimersByTime(100); // Small delay between changes
      }

      // Final state should be clean
      expect(pingService.getServerCount()).toBe(0);

      // Advance more time to verify no lingering operations
      jest.advanceTimersByTime(5000);
      expect(pingService.getServerCount()).toBe(0);
    });
  });
});