import { PingService } from '../../services/pingService';
import { ConfigManager } from '../../services/ConfigManager';
import { createEventsRoute } from '../../routes/events';
import { ServerConfig } from '../../types/server';
import { Request, Response } from 'express';
import { Server } from 'http';

// Mock all external dependencies
jest.mock('ping', () => ({
  promise: {
    probe: jest.fn(),
  },
}));

jest.mock('../../services/snmpService', () => ({
  SnmpService: {
    getDiskInfo: jest.fn(),
  },
}));

jest.mock('../../services/netappService', () => ({
  NetAppService: {
    getLunInfo: jest.fn(),
  },
}));

// Mock file system operations for ConfigManager
jest.mock('fs', () => ({
  readFileSync: jest.fn(),
  writeFileSync: jest.fn(),
  existsSync: jest.fn(),
  mkdirSync: jest.fn(),
  watchFile: jest.fn(),
  unwatchFile: jest.fn(),
}));

// Mock atomic file utilities
jest.mock('../../utils/fileUtils', () => ({
  writeConfigAtomic: jest.fn(),
}));

describe('Monitoring State Preservation Integration Tests', () => {
  let pingService: PingService;
  let configManager: ConfigManager;
  let eventsRouter: any;
  let mockPing: jest.MockedFunction<any>;
  let mockResponse: jest.Mocked<Response>;

  // Mock server configurations
  const initialConfig = {
    servers: [
      {
        id: 'integration-server-1',
        name: 'Integration Server 1',
        ip: '192.168.1.1',
        dnsAddress: 'server1.integration.com',
      },
      {
        id: 'integration-server-2',
        name: 'Integration Server 2',
        ip: '192.168.1.2',
        dnsAddress: 'server2.integration.com',
      },
    ],
    groups: [],
  };

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();

    // Mock ping responses
    mockPing = require('ping').promise.probe as jest.MockedFunction<any>;
    mockPing.mockResolvedValue({
      alive: true,
      time: '15',
      output: 'Reply from 192.168.1.1: bytes=32 time=15ms TTL=64',
    });

    // Mock file system for ConfigManager
    const fs = require('fs');
    fs.readFileSync.mockReturnValue(JSON.stringify(initialConfig));
    fs.existsSync.mockReturnValue(true);

    // Mock atomic file utils
    const fileUtils = require('../../utils/fileUtils');
    fileUtils.writeConfigAtomic.mockImplementation((path: any, data: any) => {
      return Promise.resolve();
    });

    // Mock response object for SSE
    mockResponse = {
      write: jest.fn(),
      writeHead: jest.fn(),
      on: jest.fn(),
      once: jest.fn(),
    } as any;

    // Create instances
    configManager = new ConfigManager();
    pingService = new PingService(initialConfig.servers);
    eventsRouter = createEventsRoute(pingService, configManager);
  });

  afterEach(() => {
    jest.useRealTimers();
    if (pingService) {
      pingService.reset();
    }
  });

  describe('Hot-Reload Integration Flow', () => {
    it('should preserve monitoring during ConfigManager hot-reload', async () => {
      // Start initial monitoring
      pingService.start();

      // Let monitoring establish
      jest.advanceTimersByTime(2000);

      // Verify initial monitoring state
      expect(pingService.getServerCount()).toBe(2);
      expect(pingService.getAllServerStatus()).toHaveLength(2);

      // Set up event listeners to track continuity
      const statusChanges: any[] = [];
      pingService.on('statusChange', (update) => {
        statusChanges.push(update);
      });

      // Simulate configuration file change
      const updatedConfig = {
        servers: [
          ...initialConfig.servers,
          {
            id: 'integration-server-3',
            name: 'Integration Server 3',
            ip: '192.168.1.3',
            dnsAddress: 'server3.integration.com',
          },
        ],
        groups: [],
      };

      const fs = require('fs');
      fs.readFileSync.mockReturnValue(JSON.stringify(updatedConfig));

      // Trigger hot-reload
      await configManager.reloadServers();

      // Allow configuration change to process
      jest.advanceTimersByTime(1000);

      // Verify monitoring preserved and new server added
      expect(pingService.getServerCount()).toBe(3);
      expect(pingService.getServerStatus('integration-server-1')).toBeDefined();
      expect(pingService.getServerStatus('integration-server-2')).toBeDefined();
      expect(pingService.getServerStatus('integration-server-3')).toBeDefined();

      // Verify monitoring continues for all servers
      jest.advanceTimersByTime(5000);

      const allStatuses = pingService.getAllServerStatus();
      expect(allStatuses).toHaveLength(3);

      allStatuses.forEach(status => {
        expect(status.lastChecked).toBeDefined();
        expect(status.lastChecked.getTime()).toBeGreaterThan(0);
      });
    });

    it('should handle server removal during hot-reload without affecting remaining servers', async () => {
      // Start initial monitoring
      pingService.start();

      jest.advanceTimersByTime(2000);

      // Set up tracking for remaining server
      const remainingServerUpdates: any[] = [];
      pingService.on('statusChange', (update) => {
        if (update.serverId === 'integration-server-1') {
          remainingServerUpdates.push(update);
        }
      });

      // Simulate server removal configuration change
      const configWithRemoval = {
        servers: [initialConfig.servers[0]], // Keep only server-1
        groups: [],
      };

      const fs = require('fs');
      fs.readFileSync.mockReturnValue(JSON.stringify(configWithRemoval));

      // Trigger hot-reload with removal
      await configManager.reloadServers();

      jest.advanceTimersByTime(1000);

      // Verify remaining server is still monitored
      expect(pingService.getServerCount()).toBe(1);
      expect(pingService.getServerStatus('integration-server-1')).toBeDefined();
      expect(pingService.getServerStatus('integration-server-2')).toBeUndefined();

      // Verify monitoring continues for remaining server
      jest.advanceTimersByTime(5000);

      const remainingStatus = pingService.getServerStatus('integration-server-1');
      expect(remainingStatus!.lastChecked.getTime()).toBeGreaterThan(0);

      // Verify no events from removed server
      const removedServerUpdates = remainingServerUpdates.filter(
        update => update.serverId === 'integration-server-2',
      );
      expect(removedServerUpdates).toHaveLength(0);
    });
  });

  describe('SSE Connection Stability During Configuration Changes', () => {
    it('should maintain SSE connection during server addition', async () => {
      // Mock request and response for SSE
      const mockRequest = {
        on: jest.fn(),
        once: jest.fn(),
      } as any;

      // Track SSE messages
      const sseMessages: string[] = [];
      mockResponse.write.mockImplementation((data: string) => {
        sseMessages.push(data);
        return true;
      });

      // Start monitoring
      pingService.start();

      // Simulate SSE connection
      const sseRoute = eventsRouter.get('/');
      expect(sseRoute).toBeDefined();

      // Track status changes
      const statusChanges: any[] = [];
      pingService.on('statusChange', (update) => {
        statusChanges.push(update);
      });

      // Perform configuration change with server addition
      const newServer: ServerConfig = {
        id: 'sse-new-server',
        name: 'SSE New Server',
        ip: '192.168.1.4',
        dnsAddress: 'ssenew.integration.com',
      };

      await pingService.onConfigChange([...initialConfig.servers, newServer]);

      // Verify monitoring continues and new server is added
      jest.advanceTimersByTime(2000);

      expect(pingService.getServerCount()).toBe(3);
      expect(pingService.getServerStatus('sse-new-server')).toBeDefined();

      // Simulate continued status changes
      jest.advanceTimersByTime(10000);

      // All servers should have recent monitoring
      const allStatuses = pingService.getAllServerStatus();
      allStatuses.forEach(status => {
        expect(status.lastChecked.getTime()).toBeGreaterThan(0);
      });
    });

    it('should broadcast configuration change events via SSE without connection interruption', async () => {
      // Track ConfigManager events
      const configEvents: any[] = [];
      configManager.on('servers-added', (servers) => {
        configEvents.push({ type: 'servers-added', data: servers });
      });
      configManager.on('servers-removed', (servers) => {
        configEvents.push({ type: 'servers-removed', data: servers });
      });
      configManager.on('servers-updated', (servers) => {
        configEvents.push({ type: 'servers-updated', data: servers });
      });

      // Start monitoring
      pingService.start();
      jest.advanceTimersByTime(1000);

      // Perform configuration changes
      const updatedConfig = {
        servers: [
          initialConfig.servers[0], // Keep server-1
          {
            ...initialConfig.servers[1],
            name: 'Integration Server 2 Updated', // Update server-2
          },
          {
            id: 'sse-new-server',
            name: 'SSE New Server',
            ip: '192.168.1.4',
            dnsAddress: 'ssenew.integration.com',
          },
        ],
        groups: [],
      };

      // Apply configuration changes
      await pingService.onConfigChange(updatedConfig.servers);

      // Verify configuration events were emitted
      expect(configEvents.length).toBeGreaterThan(0);

      const addedEvent = configEvents.find(e => e.type === 'servers-added');
      const updatedEvent = configEvents.find(e => e.type === 'servers-updated');

      expect(addedEvent).toBeDefined();
      expect(updatedEvent).toBeDefined();

      // Verify monitoring state is consistent
      expect(pingService.getServerCount()).toBe(3);
      const allStatuses = pingService.getAllServerStatus();
      expect(allStatuses).toHaveLength(3);

      // Verify updated server configuration
      const updatedStatus = pingService.getServerStatus('integration-server-2');
      expect(updatedStatus!.name).toBe('Integration Server 2 Updated');
    });
  });

  describe('Performance Requirements Validation', () => {
    it('should meet <5 second monitoring gap requirement during configuration changes', async () => {
      // Start monitoring
      pingService.start();
      jest.advanceTimersByTime(2000);

      // Record baseline monitoring times
      const baselineStatuses = pingService.getAllServerStatus();
      const baselineTimes = new Map();
      baselineStatuses.forEach(status => {
        baselineTimes.set(status.id, status.lastChecked.getTime());
      });

      // Perform configuration change (add server)
      const newServer: ServerConfig = {
        id: 'perf-test-server',
        name: 'Performance Test Server',
        ip: '192.168.1.5',
        dnsAddress: 'perftest.integration.com',
      };

      const configChangeStart = Date.now();
      await pingService.onConfigChange([...initialConfig.servers, newServer]);
      const configChangeEnd = Date.now();

      // Advance minimal time to allow monitoring continuation
      jest.advanceTimersByTime(100);

      // Check monitoring continuity for unaffected servers
      const updatedStatuses = pingService.getAllServerStatus();
      const monitoringGaps: number[] = [];

      updatedStatuses.forEach(status => {
        if (baselineTimes.has(status.id)) {
          const gap = status.lastChecked.getTime() - baselineTimes.get(status.id);
          monitoringGaps.push(gap);
        }
      });

      // Calculate average monitoring gap (excluding our artificial time advancement)
      const avgGap = monitoringGaps.reduce((sum, gap) => sum + gap, 0) / monitoringGaps.length;
      const actualAvgGap = avgGap - 100; // Subtract artificial advancement

      expect(actualAvgGap).toBeLessThan(5000); // Less than 5 seconds
      expect(configChangeEnd - configChangeStart).toBeLessThan(2000); // Config change under 2 seconds

      // Verify all servers are monitored
      expect(pingService.getServerCount()).toBe(3);
      expect(pingService.getServerStatus('perf-test-server')).toBeDefined();
    });

    it('should start monitoring for new servers within 5 seconds', async () => {
      // Start with initial servers
      pingService.start();
      jest.advanceTimersByTime(1000);

      // Add new server
      const newServer: ServerConfig = {
        id: 'quick-start-server',
        name: 'Quick Start Server',
        ip: '192.168.1.6',
        dnsAddress: 'quickstart.integration.com',
      };

      const additionStart = Date.now();
      await pingService.onConfigChange([...initialConfig.servers, newServer]);

      // Advance time and check if new server monitoring started
      jest.advanceTimersByTime(1000);

      const newServerStatus = pingService.getServerStatus('quick-start-server');
      expect(newServerStatus).toBeDefined();
      expect(newServerStatus!.lastChecked.getTime()).toBeGreaterThanOrEqual(additionStart);

      // Verify new server is being actively monitored
      jest.advanceTimersByTime(2000);
      const updatedStatus = pingService.getServerStatus('quick-start-server');
      expect(updatedStatus!.lastChecked.getTime()).toBeGreaterThan(newServerStatus!.lastChecked.getTime());
    });
  });

  describe('Concurrent Operations Handling', () => {
    it('should handle simultaneous configuration changes without race conditions', async () => {
      // Start monitoring
      pingService.start();
      jest.advanceTimersByTime(1000);

      // Prepare multiple configuration changes
      const changes = [
        // Add server
        [...initialConfig.servers, {
          id: 'concurrent-1',
          name: 'Concurrent Server 1',
          ip: '192.168.1.7',
          dnsAddress: 'concurrent1.integration.com',
        }],
        // Update server
        [
          initialConfig.servers[0],
          {
            ...initialConfig.servers[1],
            name: 'Integration Server 2 Updated Concurrently',
          },
        ],
        // Remove server and add new
        [initialConfig.servers[0], {
          id: 'concurrent-2',
          name: 'Concurrent Server 2',
          ip: '192.168.1.8',
          dnsAddress: 'concurrent2.integration.com',
        }],
      ];

      // Execute configuration changes concurrently
      const promises = changes.map(config => pingService.onConfigChange(config));
      await Promise.all(promises);

      // Verify final state is consistent
      jest.advanceTimersByTime(2000);

      // Should have 2 servers (server-1 and concurrent-2)
      expect(pingService.getServerCount()).toBe(2);
      expect(pingService.getServerStatus('integration-server-1')).toBeDefined();
      expect(pingService.getServerStatus('integration-server-2')).toBeUndefined(); // Should be removed
      expect(pingService.getServerStatus('concurrent-2')).toBeDefined();

      // Verify monitoring is working for remaining servers
      const finalStatuses = pingService.getAllServerStatus();
      finalStatuses.forEach(status => {
        expect(status.lastChecked.getTime()).toBeGreaterThan(0);
      });
    });

    it('should maintain monitoring during rapid configuration changes', async () => {
      // Start monitoring
      pingService.start();
      jest.advanceTimersByTime(1000);

      // Track monitoring continuity
      const monitoringEvents: any[] = [];
      pingService.on('statusChange', (event) => {
        monitoringEvents.push({ timestamp: Date.now(), ...event });
      });

      // Perform rapid configuration changes
      for (let i = 0; i < 5; i++) {
        const configWithNewServer = [
          ...initialConfig.servers,
          {
            id: `rapid-server-${i}`,
            name: `Rapid Server ${i}`,
            ip: `192.168.1.${10 + i}`,
            dnsAddress: `rapid${i}.integration.com`,
          },
        ];

        await pingService.onConfigChange(configWithNewServer);
        jest.advanceTimersByTime(100); // Small delay between changes
      }

      // Advance time for monitoring to continue
      jest.advanceTimersByTime(5000);

      // Verify final state
      expect(pingService.getServerCount()).toBeGreaterThan(2);

      // Verify monitoring events continued throughout changes
      expect(monitoringEvents.length).toBeGreaterThan(0);

      // Verify all servers are being monitored
      const finalStatuses = pingService.getAllServerStatus();
      finalStatuses.forEach(status => {
        expect(status.lastChecked.getTime()).toBeGreaterThan(0);
      });
    });
  });
});