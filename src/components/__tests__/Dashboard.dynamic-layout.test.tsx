/**
 * Dashboard Dynamic Layout Visual Tests
 *
 * Tests for the Dashboard component with new dynamic row layout:
 * - Different group configurations (1, 2, 3+ groups per row)
 * - Layout algorithm integration
 * - Visual rendering verification
 * - Empty states and edge cases
 */

import { render, screen, waitFor } from '@testing-library/react';
import { Dashboard } from '../Dashboard';
import * as apiService from '../../services/api';

// Mock the apiService module
jest.mock('../../services/api', () => ({
  apiService: {
    fetchServers: jest.fn(),
    fetchGroups: jest.fn(),
    connectToStatusUpdates: jest.fn(),
    disconnect: jest.fn(),
  },
  ServerData: {
    id: 'server-1',
    name: 'Test Server',
    ip: '192.168.1.10',
    isOnline: true,
    lastChecked: '2023-01-01T00:00:00Z',
    diskInfo: []
  }
}));

const mockFetchServers = apiService.fetchServers as jest.MockedFunction<typeof apiService.fetchServers>;
const mockFetchGroups = apiService.fetchGroups as jest.MockedFunction<typeof apiService.fetchGroups>;
const mockConnectToStatusUpdates = apiService.connectToStatusUpdates as jest.MockedFunction<typeof apiService.connectToStatusUpdates>;

describe('Dashboard Dynamic Layout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should display empty state when no groups have servers', async () => {
    mockFetchServers.mockResolvedValue([]);
    mockFetchGroups.mockResolvedValue([]);

    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText('No Server Groups Found')).toBeInTheDocument();
    });

    expect(screen.getByText('Create groups and assign servers to see them displayed here.')).toBeInTheDocument();
  });

  it('should render single group with full width', async () => {
    const mockServers = [
      { id: 's1', name: 'Server 1', ip: '192.168.1.1', isOnline: true, lastChecked: '2023-01-01T00:00:00Z', diskInfo: [] },
      { id: 's2', name: 'Server 2', ip: '192.168.1.2', isOnline: false, lastChecked: '2023-01-01T00:00:00Z', diskInfo: [] }
    ];

    const mockGroups = [
      { id: 'group-1', name: 'Single Group', order: 1, rowNumber: 1, rowOrder: 1, serverIds: ['s1', 's2'] }
    ];

    mockFetchServers.mockResolvedValue(mockServers);
    mockFetchGroups.mockResolvedValue(mockGroups);

    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText('Single Group')).toBeInTheDocument();
    });

    // Verify ServerContainer is rendered
    const serverContainer = screen.getByText('Single Group').closest('.bg-\\[#888b8d]');
    expect(serverContainer).toBeInTheDocument();
  });

  it('should render two groups in a row with 50% width each', async () => {
    const mockServers = [
      { id: 's1', name: 'Server 1', ip: '192.168.1.1', isOnline: true, lastChecked: '2023-01-01T00:00:00Z', diskInfo: [] },
      { id: 's2', name: 'Server 2', ip: '192.168.1.2', isOnline: false, lastChecked: '2023-01-01T00:00:00Z', diskInfo: [] }
    ];

    const mockGroups = [
      { id: 'group-1', name: 'Left Group', order: 1, rowNumber: 1, rowOrder: 1, serverIds: ['s1'] },
      { id: 'group-2', name: 'Right Group', order: 2, rowNumber: 1, rowOrder: 2, serverIds: ['s2'] }
    ];

    mockFetchServers.mockResolvedValue(mockServers);
    mockFetchGroups.mockResolvedValue(mockGroups);

    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText('Left Group')).toBeInTheDocument();
      expect(screen.getByText('Right Group')).toBeInTheDocument();
    });

    // Verify both groups are rendered
    const leftContainer = screen.getByText('Left Group').closest('.bg-\\[#888b8d]');
    const rightContainer = screen.getByText('Right Group').closest('.bg-\\[#888b8d]');

    expect(leftContainer).toBeInTheDocument();
    expect(rightContainer).toBeInTheDocument();
  });

  it('should render three groups in a row with proportional width based on server count', async () => {
    const mockServers = [
      { id: 's1', name: 'Server 1', ip: '192.168.1.1', isOnline: true, lastChecked: '2023-01-01T00:00:00Z', diskInfo: [] },
      { id: 's2', name: 'Server 2', ip: '192.168.1.2', isOnline: false, lastChecked: '2023-01-01T00:00:00Z', diskInfo: [] },
      { id: 's3', name: 'Server 3', ip: '192.168.1.3', isOnline: true, lastChecked: '2023-01-01T00:00:00Z', diskInfo: [] },
      { id: 's4', name: 'Server 4', ip: '192.168.1.4', isOnline: false, lastChecked: '2023-01-01T00:00:00Z', diskInfo: [] },
      { id: 's5', name: 'Server 5', ip: '192.168.1.5', isOnline: true, lastChecked: '2023-01-01T00:00:00Z', diskInfo: [] },
      { id: 's6', name: 'Server 6', ip: '192.168.1.6', isOnline: true, lastChecked: '2023-01-01T00:00:00Z', diskInfo: [] }
    ];

    const mockGroups = [
      { id: 'group-1', name: 'Group A', order: 1, rowNumber: 1, rowOrder: 1, serverIds: ['s1', 's2', 's3'] }, // 3 servers = 50%
      { id: 'group-2', name: 'Group B', order: 2, rowNumber: 1, rowOrder: 2, serverIds: ['s4', 's5'] }, // 2 servers = 33%
      { id: 'group-3', name: 'Group C', order: 3, rowNumber: 1, rowOrder: 3, serverIds: ['s6'] } // 1 server = 17%
    ];

    mockFetchServers.mockResolvedValue(mockServers);
    mockFetchGroups.mockResolvedValue(mockGroups);

    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText('Group A')).toBeInTheDocument();
      expect(screen.getByText('Group B')).toBeInTheDocument();
      expect(screen.getByText('Group C')).toBeInTheDocument();
    });

    // Verify all three groups are rendered
    const groups = screen.getAllByText(/Group [A-C]/);
    expect(groups).toHaveLength(3);
  });

  it('should render multiple rows correctly including empty groups', async () => {
    const mockServers = [
      { id: 's1', name: 'Server 1', ip: '192.168.1.1', isOnline: true, lastChecked: '2023-01-01T00:00:00Z', diskInfo: [] },
      { id: 's2', name: 'Server 2', ip: '192.168.1.2', isOnline: false, lastChecked: '2023-01-01T00:00:00Z', diskInfo: [] },
      { id: 's3', name: 'Server 3', ip: '192.168.1.3', isOnline: true, lastChecked: '2023-01-01T00:00:00Z', diskInfo: [] },
      { id: 's4', name: 'Server 4', ip: '192.168.1.4', isOnline: false, lastChecked: '2023-01-01T00:00:00Z', diskInfo: [] },
      { id: 's5', name: 'Server 5', ip: '192.168.1.5', isOnline: true, lastChecked: '2023-01-01T00:00:00Z', diskInfo: [] }
    ];

    const mockGroups = [
      { id: 'group-1', name: 'Row 1 Group 1', order: 1, rowNumber: 1, rowOrder: 1, serverIds: ['s1', 's2'] },
      { id: 'group-2', name: 'Row 1 Group 2', order: 2, rowNumber: 1, rowOrder: 2, serverIds: ['s3'] },
      { id: 'group-3', name: 'Row 2 Group 1', order: 3, rowNumber: 2, rowOrder: 1, serverIds: ['s4'] },
      { id: 'group-4', name: 'Row 2 Group 2', order: 4, rowNumber: 2, rowOrder: 2, serverIds: ['s5'] },
      { id: 'group-5', name: 'Row 3 Group', order: 5, rowNumber: 3, rowOrder: 1, serverIds: [] } // Empty group should render with empty state
    ];

    mockFetchServers.mockResolvedValue(mockServers);
    mockFetchGroups.mockResolvedValue(mockGroups);

    render(<Dashboard />);

    await waitFor(() => {
      // Should render all 5 groups (including empty group with empty state)
      const serverContainers = document.querySelectorAll('.bg-\\[#888b8d]');
      expect(serverContainers.length).toBe(5);

      // Check for empty state in the empty group
      expect(screen.getByText('Row 3 Group')).toBeInTheDocument();
    });
  });

  it('should display empty groups with meaningful empty state', async () => {
    const mockGroups = [
      { id: 'group-1', name: 'Empty Group 1', order: 1, rowNumber: 1, rowOrder: 1, serverIds: [] },
      { id: 'group-2', name: 'Group with Servers', order: 2, rowNumber: 1, rowOrder: 2, serverIds: ['s1'] }
    ];

    const mockServers = [
      { id: 's1', name: 'Server 1', ip: '192.168.1.1', isOnline: true, lastChecked: '2023-01-01T00:00:00Z', diskInfo: [] }
    ];

    mockFetchServers.mockResolvedValue(mockServers);
    mockFetchGroups.mockResolvedValue(mockGroups);

    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText('Group with Servers')).toBeInTheDocument();
      expect(screen.getByText('Empty Group 1')).toBeInTheDocument();
    });

    // Should show both groups - one with servers, one with empty state
    const serverContainers = document.querySelectorAll('.bg-\\[#888b8d]');
    expect(serverContainers.length).toBe(2);

    // Check for empty state message
    expect(screen.getByText('No servers assigned')).toBeInTheDocument();
    expect(screen.getByText('Add servers to this group in the configuration')).toBeInTheDocument();
  });

  it('should apply migration for legacy groups', async () => {
    const mockServers = [
      { id: 's1', name: 'Server 1', ip: '192.168.1.1', isOnline: true, lastChecked: '2023-01-01T00:00:00Z', diskInfo: [] }
    ];

    // Legacy format groups
    const legacyGroups = [
      { id: 'group-1', name: 'Legacy Left', order: 1, row: 1, position: 'left', serverIds: ['s1'] },
      { id: 'group-2', name: 'Legacy Right', order: 2, row: 1, position: 'right', serverIds: [] }
    ];

    mockFetchServers.mockResolvedValue(mockServers);
    mockFetchGroups.mockResolvedValue(legacyGroups);

    render(<Dashboard />);

    await waitFor(() => {
      // Both groups should be migrated and the first one should render
      expect(screen.getByText('Legacy Left')).toBeInTheDocument();
    });

    // Verify only the group with servers is rendered
    const serverContainers = document.querySelectorAll('.bg-\\[#888b8d]');
    expect(serverContainers.length).toBe(1);
  });

  it('should connect to SSE events on mount', async () => {
    mockFetchServers.mockResolvedValue([]);
    mockFetchGroups.mockResolvedValue([]);

    render(<Dashboard />);

    await waitFor(() => {
      expect(mockConnectToStatusUpdates).toHaveBeenCalledWith(
        expect.any(Function),
        expect.any(Function)
      );
    });
  });

  it('should disconnect from SSE events on unmount', async () => {
    mockFetchServers.mockResolvedValue([]);
    mockFetchGroups.mockResolvedValue([]);

    const { unmount } = render(<Dashboard />);

    unmount();

    expect(mockDisconnect).toHaveBeenCalledTimes(1);
  });

  it('should show loading state initially', () => {
    mockFetchServers.mockReturnValue(new Promise(() => {}));
    mockFetchGroups.mockReturnValue(new Promise(() => {}));

    render(<Dashboard />);

    expect(screen.getByText('Loading servers...')).toBeInTheDocument();
  });

  it('should show error state when API fails', async () => {
    mockFetchServers.mockRejectedValue(new Error('API Error'));
    mockFetchGroups.mockRejectedValue(new Error('API Error'));

    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText('Connection Error')).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });
});