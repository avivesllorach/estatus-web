import { render, screen, waitFor } from '@testing-library/react';
import { Dashboard } from '../Dashboard';
import { apiService, ServerData, GroupConfig } from '../../services/api';

// Mock the apiService
jest.mock('../../services/api', () => ({
  apiService: {
    fetchServers: jest.fn(),
    fetchGroups: jest.fn(),
    connectToStatusUpdates: jest.fn(),
    disconnect: jest.fn(),
  },
  ServerData: {},
  GroupConfig: {},
}));

// Mock audioService to prevent sound during tests
jest.mock('../../services/audioService', () => ({
  playOnlineSound: jest.fn(),
  playOfflineSound: jest.fn(),
}));

const mockApiService = apiService as jest.Mocked<typeof apiService>;

// Mock DeviceCard and ServerContainer components
jest.mock('../DeviceCard', () => {
  return function MockDeviceCard({ name, ip, isOnline }: any) {
    return (
      <div data-testid="device-card" data-name={name} data-ip={ip} data-online={isOnline}>
        {name} - {ip} - {isOnline ? 'Online' : 'Offline'}
      </div>
    );
  };
});

jest.mock('../ServerContainer', () => {
  return function MockServerContainer({ title, servers }: any) {
    return (
      <div data-testid="server-container" data-title={title}>
        <h3>{title}</h3>
        {servers.map((server: any) => (
          <div key={server.id} data-testid="server-card">{server.name}</div>
        ))}
      </div>
    );
  };
});

describe('Dashboard Component', () => {
  const mockServers: ServerData[] = [
    {
      id: 'server-001',
      name: 'Test Server 1',
      ip: '192.168.1.10',
      isOnline: true,
      consecutiveSuccesses: 3,
      consecutiveFailures: 0,
      lastChecked: '2025-11-17T10:30:00.000Z',
      lastStatusChange: '2025-11-17T10:30:00.000Z',
      diskInfo: null,
    },
    {
      id: 'server-002',
      name: 'Test Server 2',
      ip: '192.168.1.11',
      isOnline: false,
      consecutiveSuccesses: 0,
      consecutiveFailures: 3,
      lastChecked: '2025-11-17T10:30:00.000Z',
      lastStatusChange: '2025-11-17T10:30:00.000Z',
      diskInfo: null,
    },
  ];

  const mockGroups: GroupConfig[] = [
    {
      id: 'group-1',
      name: 'Test Group 1',
      order: 1,
      serverIds: ['server-001'],
    },
    {
      id: 'group-2',
      name: 'Test Group 2',
      order: 2,
      serverIds: ['server-002'],
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Initial Data Loading', () => {
    it('should show loading state initially', () => {
      mockApiService.fetchServers.mockResolvedValue([]);
      mockApiService.fetchGroups.mockResolvedValue([]);

      render(<Dashboard />);

      expect(screen.getByText('Loading servers...')).toBeInTheDocument();
    });

    it('should load and display servers and groups', async () => {
      mockApiService.fetchServers.mockResolvedValue(mockServers);
      mockApiService.fetchGroups.mockResolvedValue(mockGroups);

      render(<Dashboard />);

      await waitFor(() => {
        expect(screen.getByTestId('server-container')).toBeInTheDocument();
      });

      expect(screen.getByTestId('server-container')).toHaveAttribute('data-title', 'Test Group 1');
      expect(screen.getAllByTestId('server-card')).toHaveLength(2);
    });

    it('should handle empty server and group lists', async () => {
      mockApiService.fetchServers.mockResolvedValue([]);
      mockApiService.fetchGroups.mockResolvedValue([]);

      render(<Dashboard />);

      await waitFor(() => {
        expect(screen.queryByText('Loading servers...')).not.toBeInTheDocument();
      });

      expect(screen.queryByTestId('server-container')).not.toBeInTheDocument();
    });

    it('should display error state when data loading fails', async () => {
      mockApiService.fetchServers.mockRejectedValue(new Error('Network error'));
      mockApiService.fetchGroups.mockRejectedValue(new Error('Network error'));

      render(<Dashboard />);

      await waitFor(() => {
        expect(screen.getByText('Connection Error')).toBeInTheDocument();
      });

      expect(screen.getByText('Network error')).toBeInTheDocument();
    });
  });

  describe('SSE Connection', () => {
    it('should connect to SSE updates on mount', async () => {
      mockApiService.fetchServers.mockResolvedValue(mockServers);
      mockApiService.fetchGroups.mockResolvedValue(mockGroups);

      render(<Dashboard />);

      await waitFor(() => {
        expect(mockApiService.connectToStatusUpdates).toHaveBeenCalled();
      });

      expect(mockApiService.connectToStatusUpdates).toHaveBeenCalledWith(
        expect.any(Function), // servers callback
        expect.any(Function)  // groups callback
      );
    });

    it('should disconnect SSE on unmount', async () => {
      mockApiService.fetchServers.mockResolvedValue(mockServers);
      mockApiService.fetchGroups.mockResolvedValue(mockGroups);

      const { unmount } = render(<Dashboard />);

      await waitFor(() => {
        expect(mockApiService.connectToStatusUpdates).toHaveBeenCalled();
      });

      unmount();

      expect(mockApiService.disconnect).toHaveBeenCalled();
    });
  });

  describe('Group-based Layout', () => {
    it('should organize servers by groups', async () => {
      mockApiService.fetchServers.mockResolvedValue(mockServers);
      mockApiService.fetchGroups.mockResolvedValue(mockGroups);

      render(<Dashboard />);

      await waitFor(() => {
        expect(screen.getByTestId('server-container')).toBeInTheDocument();
      });

      // Should show both groups
      expect(screen.getByTestId('server-container')).toHaveAttribute('data-title', 'Test Group 1');

      // Should display servers in correct groups
      const serverCards = screen.getAllByTestId('server-card');
      expect(serverCards).toHaveLength(2);
      expect(serverCards[0]).toHaveTextContent('Test Server 1');
      expect(serverCards[1]).toHaveTextContent('Test Server 2');
    });

    it('should handle groups with no servers', async () => {
      const groupsWithEmpty = [
        ...mockGroups,
        {
          id: 'group-3',
          name: 'Empty Group',
          order: 3,
          serverIds: [], // No servers
        },
      ];

      mockApiService.fetchServers.mockResolvedValue(mockServers);
      mockApiService.fetchGroups.mockResolvedValue(groupsWithEmpty);

      render(<Dashboard />);

      await waitFor(() => {
        expect(screen.getByTestId('server-container')).toBeInTheDocument();
      });

      // Should only show groups with servers
      expect(screen.getAllByTestId('server-container')).toHaveLength(2);
    });

    it('should handle unassigned servers', async () => {
      const unassignedServer: ServerData = {
        id: 'server-003',
        name: 'Unassigned Server',
        ip: '192.168.1.12',
        isOnline: true,
        consecutiveSuccesses: 3,
        consecutiveFailures: 0,
        lastChecked: '2025-11-17T10:30:00.000Z',
        lastStatusChange: '2025-11-17T10:30:00.000Z',
        diskInfo: null,
      };

      mockApiService.fetchServers.mockResolvedValue([...mockServers, unassignedServer]);
      mockApiService.fetchGroups.mockResolvedValue(mockGroups);

      render(<Dashboard />);

      await waitFor(() => {
        expect(screen.getByTestId('server-container')).toBeInTheDocument();
      });

      // Should only show servers assigned to groups
      const serverCards = screen.getAllByTestId('server-card');
      expect(serverCards).toHaveLength(2); // Unassigned server should not appear
    });
  });

  describe('Real-time Updates', () => {
    let mockServersCallback: (servers: ServerData[]) => void;
    let mockGroupsCallback: (groups: GroupConfig[]) => void;

    beforeEach(() => {
      mockApiService.fetchServers.mockResolvedValue(mockServers);
      mockApiService.fetchGroups.mockResolvedValue(mockGroups);

      mockApiService.connectToStatusUpdates.mockImplementation((serversCallback, groupsCallback) => {
        mockServersCallback = serversCallback as any;
        mockGroupsCallback = groupsCallback as any;
      });
    });

    it('should handle server updates via SSE', async () => {
      render(<Dashboard />);

      await waitFor(() => {
        expect(mockApiService.connectToStatusUpdates).toHaveBeenCalled();
      });

      // Simulate server update
      const updatedServers: ServerData[] = [
        {
          ...mockServers[0],
          name: 'Updated Server Name',
          isOnline: false,
        },
        ...mockServers.slice(1),
      ];

      mockServersCallback(updatedServers);

      await waitFor(() => {
        expect(screen.getByText('Updated Server Name')).toBeInTheDocument();
      });
    });

    it('should handle group reorganization via SSE', async () => {
      render(<Dashboard />);

      await waitFor(() => {
        expect(screen.getByTestId('server-container')).toBeInTheDocument();
      });

      // Simulate groups change - move server 2 to group 1
      const updatedGroups: GroupConfig[] = [
        {
          id: 'group-1',
          name: 'Combined Group',
          order: 1,
          serverIds: ['server-001', 'server-002'],
        },
      ];

      mockGroupsCallback(updatedGroups);

      await waitFor(() => {
        expect(screen.getByTestId('server-container')).toHaveAttribute('data-title', 'Combined Group');
      });
    });

    it('should handle simultaneous server and group updates', async () => {
      render(<Dashboard />);

      await waitFor(() => {
        expect(screen.getByTestId('server-container')).toBeInTheDocument();
      });

      // Simulate both types of updates
      const updatedServers: ServerData[] = [
        {
          ...mockServers[0],
          name: 'Updated Server 1',
        },
        {
          ...mockServers[1],
          name: 'Updated Server 2',
        },
      ];

      const updatedGroups: GroupConfig[] = [
        {
          id: 'group-1',
          name: 'Updated Group 1',
          order: 1,
          serverIds: ['server-001', 'server-002'],
        },
      ];

      // Send updates in sequence
      mockServersCallback(updatedServers);
      mockGroupsCallback(updatedGroups);

      await waitFor(() => {
        expect(screen.getByText('Updated Server 1')).toBeInTheDocument();
        expect(screen.getByText('Updated Server 2')).toBeInTheDocument();
        expect(screen.getByTestId('server-container')).toHaveAttribute('data-title', 'Updated Group 1');
      });
    });
  });
});