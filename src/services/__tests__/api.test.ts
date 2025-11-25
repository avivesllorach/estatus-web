import { apiService, ServerConfig, GroupConfig } from '../api';

// Mock EventSource
global.EventSource = jest.fn().mockImplementation(() => ({
  onopen: null,
  onmessage: null,
  onerror: null,
  close: jest.fn(),
}));

// Mock fetch
global.fetch = jest.fn();

const mockFetch = global.fetch as jest.MockedFunction<typeof global.fetch>;

// Mock audioService to prevent sound during tests
jest.mock('../audioService', () => ({
  playOnlineSound: jest.fn(),
  playOfflineSound: jest.fn(),
}));

describe('ApiService SSE Configuration Events', () => {
  let mockEventSource: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockEventSource = {
      onopen: null,
      onmessage: null,
      onerror: null,
      close: jest.fn(),
    };
    (global.EventSource as jest.Mock).mockReturnValue(mockEventSource);
  });

  describe('SSE Event Handling', () => {
    let serversCallback: any;
    let groupsCallback: any;

    beforeEach(() => {
      apiService.connectToStatusUpdates(
        (servers) => {
          serversCallback = servers;
        },
        (groups) => {
          groupsCallback = groups;
        }
      );
    });

    it('should handle serverAdded events', async () => {
      const serverAddedEvent = {
        type: 'serverAdded',
        server: {
          id: 'server-003',
          name: 'New Server',
          ip: '192.168.1.15',
          dns: 'new-server.local',
          consecutiveSuccesses: 0,
          consecutiveFailures: 0,
        },
        timestamp: '2025-11-17T10:30:00.000Z',
      };

      // Simulate SSE message
      mockEventSource.onmessage({ data: JSON.stringify(serverAddedEvent) });

      expect(serversCallback).toHaveLength(1);
      expect(serversCallback[0]).toMatchObject({
        id: 'server-003',
        name: 'New Server',
        ip: '192.168.1.15',
        isOnline: false, // New servers start as offline
      });
    });

    it('should handle serverUpdated events', async () => {
      // First add a server
      const serverAddedEvent = {
        type: 'serverAdded',
        server: {
          id: 'server-001',
          name: 'Original Server',
          ip: '192.168.1.10',
          dns: 'original.local',
          consecutiveSuccesses: 3,
          consecutiveFailures: 0,
        },
        timestamp: '2025-11-17T10:30:00.000Z',
      };

      mockEventSource.onmessage({ data: JSON.stringify(serverAddedEvent) });

      // Then update the server
      const serverUpdatedEvent = {
        type: 'serverUpdated',
        server: {
          id: 'server-001',
          name: 'Updated Server',
          ip: '192.168.1.11',
          dns: 'updated.local',
          consecutiveSuccesses: 3,
          consecutiveFailures: 0,
        },
        timestamp: '2025-11-17T10:31:00.000Z',
      };

      mockEventSource.onmessage({ data: JSON.stringify(serverUpdatedEvent) });

      expect(serversCallback[1]).toMatchObject({
        id: 'server-001',
        name: 'Updated Server',
        ip: '192.168.1.11',
      });
    });

    it('should handle serverRemoved events', async () => {
      // First add servers
      const servers = [
        {
          id: 'server-001',
          name: 'Server 1',
          ip: '192.168.1.10',
        },
        {
          id: 'server-002',
          name: 'Server 2',
          ip: '192.168.1.11',
        },
      ];

      servers.forEach((server) => {
        const event = {
          type: 'serverAdded',
          server,
          timestamp: '2025-11-17T10:30:00.000Z',
        };
        mockEventSource.onmessage({ data: JSON.stringify(event) });
      });

      // Then remove one server
      const serverRemovedEvent = {
        type: 'serverRemoved',
        serverId: 'server-002',
        timestamp: '2025-11-17T10:31:00.000Z',
      };

      mockEventSource.onmessage({ data: JSON.stringify(serverRemovedEvent) });

      expect(serversCallback[2]).toHaveLength(1);
      expect(serversCallback[2][0]).toMatchObject({
        id: 'server-001',
        name: 'Server 1',
      });
    });

    it('should handle groupsChanged events', async () => {
      const groupsChangedEvent = {
        type: 'groupsChanged',
        groups: [
          {
            id: 'group-1',
            name: 'Updated Group 1',
            order: 1,
            serverIds: ['server-001', 'server-002'],
          },
          {
            id: 'group-2',
            name: 'Updated Group 2',
            order: 2,
            serverIds: ['server-003'],
          },
        ],
        timestamp: '2025-11-17T10:30:00.000Z',
      };

      mockEventSource.onmessage({ data: JSON.stringify(groupsChangedEvent) });

      expect(groupsCallback).toHaveLength(2);
      expect(groupsCallback[0]).toMatchObject({
        id: 'group-1',
        name: 'Updated Group 1',
        serverIds: ['server-001', 'server-002'],
      });
      expect(groupsCallback[1]).toMatchObject({
        id: 'group-2',
        name: 'Updated Group 2',
        serverIds: ['server-003'],
      });
    });

    it('should maintain statusChange events functionality', async () => {
      // First add a server
      const serverAddedEvent = {
        type: 'serverAdded',
        server: {
          id: 'server-001',
          name: 'Test Server',
          ip: '192.168.1.10',
        },
        timestamp: '2025-11-17T10:30:00.000Z',
      };

      mockEventSource.onmessage({ data: JSON.stringify(serverAddedEvent) });

      // Then send status change
      const statusChangeEvent = {
        type: 'statusChange',
        update: {
          serverId: 'server-001',
          name: 'Test Server',
          ip: '192.168.1.10',
          isOnline: true,
          previousStatus: false,
          timestamp: '2025-11-17T10:31:00.000Z',
        },
        timestamp: '2025-11-17T10:31:00.000Z',
      };

      mockEventSource.onmessage({ data: JSON.stringify(statusChangeEvent) });

      expect(serversCallback[1]).toMatchObject({
        id: 'server-001',
        name: 'Test Server',
        isOnline: true,
        lastStatusChange: '2025-11-17T10:31:00.000Z',
      });
    });

    it('should maintain diskUpdate events functionality', async () => {
      // First add a server
      const serverAddedEvent = {
        type: 'serverAdded',
        server: {
          id: 'server-001',
          name: 'Test Server',
          ip: '192.168.1.10',
        },
        timestamp: '2025-11-17T10:30:00.000Z',
      };

      mockEventSource.onmessage({ data: JSON.stringify(serverAddedEvent) });

      // Then send disk update
      const diskUpdateEvent = {
        type: 'diskUpdate',
        update: {
          serverId: 'server-001',
          name: 'Test Server',
          diskInfo: [
            {
              total: 1000,
              free: 500,
              used: 500,
              percentage: 50,
              description: 'C: Drive',
              index: 1,
            },
          ],
          timestamp: '2025-11-17T10:31:00.000Z',
        },
        timestamp: '2025-11-17T10:31:00.000Z',
      };

      mockEventSource.onmessage({ data: JSON.stringify(diskUpdateEvent) });

      expect(serversCallback[1]).toMatchObject({
        id: 'server-001',
        diskInfo: [
          {
            total: 1000,
            free: 500,
            used: 500,
            percentage: 50,
            description: 'C: Drive',
            index: 1,
          },
        ],
      });
    });

    it('should handle rapid sequential events', async () => {
      const events = [
        {
          type: 'serverAdded',
          server: {
            id: 'server-001',
            name: 'Server 1',
            ip: '192.168.1.10',
          },
        },
        {
          type: 'serverAdded',
          server: {
            id: 'server-002',
            name: 'Server 2',
            ip: '192.168.1.11',
          },
        },
        {
          type: 'groupsChanged',
          groups: [
            {
              id: 'group-1',
              name: 'Group 1',
              order: 1,
              serverIds: ['server-001', 'server-002'],
            },
          ],
        },
        {
          type: 'serverUpdated',
          server: {
            id: 'server-001',
            name: 'Updated Server 1',
            ip: '192.168.1.10',
          },
        },
        {
          type: 'statusChange',
          update: {
            serverId: 'server-001',
            isOnline: true,
            timestamp: '2025-11-17T10:31:00.000Z',
          },
        },
      ];

      events.forEach((event) => {
        mockEventSource.onmessage({ data: JSON.stringify(event) });
      });

      // Should have received all server updates
      expect(serversCallback).toHaveLength(5);

      // Final state should have both servers
      const finalServers = serversCallback[4];
      expect(finalServers).toHaveLength(2);

      // Server 1 should be online and updated
      const server1 = finalServers.find((s: any) => s.id === 'server-001');
      expect(server1).toMatchObject({
        name: 'Updated Server 1',
        isOnline: true,
      });

      // Server 2 should exist
      const server2 = finalServers.find((s: any) => s.id === 'server-002');
      expect(server2).toMatchObject({
        name: 'Server 2',
      });
    });

    it('should handle invalid event data gracefully', () => {
      const invalidEvents = [
        { type: 'serverAdded', server: null },
        { type: 'serverUpdated', server: null },
        { type: 'serverRemoved', serverId: null },
        { type: 'groupsChanged', groups: null },
        { type: 'unknownEvent', data: 'test' },
      ];

      const originalConsoleError = console.error;
      console.error = jest.fn();

      invalidEvents.forEach((event) => {
        // Should not throw errors for invalid event data
        expect(() => {
          mockEventSource.onmessage({ data: JSON.stringify(event) });
        }).not.toThrow();
      });

      console.error = originalConsoleError;
    });
  });

  describe('API Methods', () => {
    it('should fetch groups successfully', async () => {
      const mockGroups: GroupConfig[] = [
        {
          id: 'group-1',
          name: 'Test Group',
          order: 1,
          serverIds: ['server-001'],
        },
      ];

      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({
          success: true,
          data: mockGroups,
        }),
      } as Response);

      const result = await apiService.fetchGroups();

      expect(result).toEqual(mockGroups);
      expect(mockFetch).toHaveBeenCalledWith('/api/config/groups');
    });

    it('should handle fetch groups error', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({
          success: false,
          error: 'Failed to fetch groups',
        }),
      } as Response);

      await expect(apiService.fetchGroups()).rejects.toThrow('Failed to fetch groups');
    });
  });

  describe('Connection Management', () => {
    it('should close existing EventSource before creating new one', () => {
      const firstEventSource = { close: jest.fn() };
      const secondEventSource = { close: jest.fn() };

      (global.EventSource as jest.Mock)
        .mockReturnValueOnce(firstEventSource as any)
        .mockReturnValueOnce(secondEventSource as any);

      // First connection
      apiService.connectToStatusUpdates(jest.fn());
      expect(firstEventSource.close).not.toHaveBeenCalled();

      // Second connection (should close the first)
      apiService.connectToStatusUpdates(jest.fn());
      expect(firstEventSource.close).toHaveBeenCalled();
    });

    it('should clean up callbacks on disconnect', () => {
      const serversCallback = jest.fn();
      const groupsCallback = jest.fn();

      apiService.connectToStatusUpdates(serversCallback, groupsCallback);
      apiService.disconnect();

      // Should close EventSource
      expect(mockEventSource.close).toHaveBeenCalled();
    });
  });
});