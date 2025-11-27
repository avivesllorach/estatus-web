import { PingService } from '../../services/pingService';
import { ServerConfig } from '../../types/server';

// Mock all dependencies
jest.mock('ping');
jest.mock('../../services/snmpService');
jest.mock('../../services/netappService');

describe('PingService Delta Configuration Tests', () => {
  let pingService: PingService;

  beforeEach(() => {
    jest.useFakeTimers();

    // Mock ping library
    const mockPing = require('ping');
    mockPing.promise.probe.mockResolvedValue({
      alive: true,
      time: 10,
    });

    // Mock SNMP service
    const mockSnmpService = require('../../services/snmpService');
    mockSnmpService.SnmpService.getDiskInfo.mockResolvedValue({
      success: true,
      diskInfo: [],
    });

    // Mock NetApp service
    const mockNetappService = require('../../services/netappService');
    mockNetappService.NetAppService.getLunInfo.mockResolvedValue({
      success: true,
      diskInfo: [],
    });
  });

  afterEach(() => {
    jest.useRealTimers();
    if (pingService) {
      pingService.reset();
    }
  });

  const initialServers: ServerConfig[] = [
    {
      id: 'server-1',
      name: 'Server 1',
      ip: '192.168.1.1',
      dnsAddress: 'server1.example.com',
    },
    {
      id: 'server-2',
      name: 'Server 2',
      ip: '192.168.1.2',
      dnsAddress: 'server2.example.com',
    },
  ];

  it('should add new servers without interrupting existing monitoring', async () => {
    pingService = new PingService(initialServers);
    pingService.start();

    // Let initial monitoring start
    jest.advanceTimersByTime(1000);

    // Verify initial state
    expect(pingService.getServerCount()).toBe(2);

    // Add new server
    const newServer: ServerConfig = {
      id: 'server-3',
      name: 'Server 3',
      ip: '192.168.1.3',
      dnsAddress: 'server3.example.com',
    };

    await pingService.onConfigChange([...initialServers, newServer]);

    // Verify new server was added
    expect(pingService.getServerCount()).toBe(3);
    expect(pingService.getServerStatus('server-3')).toBeDefined();

    // Advance time and verify all servers are being monitored
    jest.advanceTimersByTime(2000);

    const allStatuses = pingService.getAllServerStatus();
    expect(allStatuses).toHaveLength(3);

    allStatuses.forEach(status => {
      expect(status.lastChecked.getTime()).toBeGreaterThan(0);
    });
  });

  it('should remove servers without affecting remaining monitoring', async () => {
    pingService = new PingService(initialServers);
    pingService.start();

    // Let monitoring establish
    jest.advanceTimersByTime(1000);

    // Remove server-2
    await pingService.onConfigChange([initialServers[0]]);

    // Verify server was removed
    expect(pingService.getServerCount()).toBe(1);
    expect(pingService.getServerStatus('server-1')).toBeDefined();
    expect(pingService.getServerStatus('server-2')).toBeUndefined();

    // Advance time and verify remaining server is still monitored
    jest.advanceTimersByTime(2000);

    const remainingStatus = pingService.getServerStatus('server-1');
    expect(remainingStatus!.lastChecked.getTime()).toBeGreaterThan(0);
  });

  it('should update server configurations without full restart', async () => {
    pingService = new PingService(initialServers);
    pingService.start();

    jest.advanceTimersByTime(1000);

    // Update server-2 configuration
    const updatedServers: ServerConfig[] = [
      initialServers[0],
      {
        ...initialServers[1],
        name: 'Server 2 Updated',
        ip: '192.168.1.20',
      },
    ];

    await pingService.onConfigChange(updatedServers);

    // Verify server count remains the same
    expect(pingService.getServerCount()).toBe(2);

    // Verify updated configuration
    const updatedStatus = pingService.getServerStatus('server-2');
    expect(updatedStatus).toBeDefined();
    expect(updatedStatus!.name).toBe('Server 2 Updated');
    expect(updatedStatus!.ip).toBe('192.168.1.20');

    // Advance time and verify monitoring continues
    jest.advanceTimersByTime(2000);

    const allStatuses = pingService.getAllServerStatus();
    expect(allStatuses).toHaveLength(2);

    allStatuses.forEach(status => {
      expect(status.lastChecked.getTime()).toBeGreaterThan(0);
    });
  });

  it('should maintain monitoring continuity during rapid configuration changes', async () => {
    pingService = new PingService([initialServers[0]]);
    pingService.start();

    jest.advanceTimersByTime(1000);

    // Track monitoring events
    const monitoringEvents: any[] = [];
    pingService.on('statusChange', (event) => {
      monitoringEvents.push({ timestamp: Date.now(), event });
    });

    // Perform rapid configuration changes
    for (let i = 0; i < 3; i++) {
      const configWithNewServer = [
        initialServers[0],
        {
          id: `rapid-server-${i}`,
          name: `Rapid Server ${i}`,
          ip: `192.168.1.${10 + i}`,
          dnsAddress: `rapid${i}.example.com`,
        },
      ];

      await pingService.onConfigChange(configWithNewServer);
      jest.advanceTimersByTime(100); // Small delay between changes
    }

    // Advance time for monitoring to continue
    jest.advanceTimersByTime(3000);

    // Verify monitoring continued throughout changes
    expect(monitoringEvents.length).toBeGreaterThan(0);

    // Verify all servers are being monitored
    const finalStatuses = pingService.getAllServerStatus();
    finalStatuses.forEach(status => {
      expect(status.lastChecked.getTime()).toBeGreaterThan(0);
    });
  });

  it('should handle concurrent configuration changes without errors', async () => {
    pingService = new PingService(initialServers);
    pingService.start();

    jest.advanceTimersByTime(1000);

    // Prepare multiple configuration changes
    const changes = [
      [...initialServers, {
        id: 'concurrent-1',
        name: 'Concurrent Server 1',
        ip: '192.168.1.3',
        dnsAddress: 'concurrent1.example.com',
      }],
      [...initialServers, {
        id: 'concurrent-2',
        name: 'Concurrent Server 2',
        ip: '192.168.1.4',
        dnsAddress: 'concurrent2.example.com',
      }],
    ];

    // Execute changes concurrently
    await Promise.all(changes.map(config => pingService.onConfigChange(config)));

    // Advance time for processing
    jest.advanceTimersByTime(2000);

    // Verify final state is consistent
    const finalStatuses = pingService.getAllServerStatus();
    finalStatuses.forEach(status => {
      expect(status.lastChecked.getTime()).toBeGreaterThan(0);
    });

    // Should have at least the original servers
    expect(pingService.getServerCount()).toBeGreaterThanOrEqual(2);
  });
});