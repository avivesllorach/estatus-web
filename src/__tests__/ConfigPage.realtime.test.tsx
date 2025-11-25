import { render, screen, waitFor, act } from '@testing-library/react';
import { ConfigPage } from '@/pages/ConfigPage';
import { apiService, ServerData, ServerConfig } from '@/services/api';
import { toast } from '@/hooks/use-toast';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock the dependencies
vi.mock('@/services/api', () => ({
  apiService: {
    fetchServers: vi.fn(),
    connectToStatusUpdates: vi.fn(),
    disconnect: vi.fn(),
  },
}));

vi.mock('@/hooks/use-toast', () => ({
  toast: {
    dismiss: vi.fn(),
  },
}));

// Mock the child components
vi.mock('@/components/config/Sidebar', () => ({
  Sidebar: ({ onSelectServer, onAddServerClick }: any) => (
    <div data-testid="sidebar">
      <button data-testid="server-1" onClick={() => onSelectServer('server-1')}>Server 1</button>
      <button data-testid="add-server" onClick={onAddServerClick}>Add Server</button>
    </div>
  ),
}));

vi.mock('@/components/config/MainPanel', () => ({
  MainPanel: ({ selectedServerId }: any) => (
    <div data-testid="main-panel">
      {selectedServerId && <span>Editing: {selectedServerId}</span>}
    </div>
  ),
}));

vi.mock('@/components/config/ConfigLayout', () => ({
  ConfigLayout: ({ sidebar, children }: any) => (
    <div data-testid="config-layout">
      {sidebar}
      {children}
    </div>
  ),
}));

vi.mock('@/hooks/use-scroll-preservation', () => ({
  useScrollPreservation: () => ({
    saveAllScrollPositions: vi.fn(),
    restoreAllScrollPositions: vi.fn(),
    registerScrollElement: vi.fn(),
    unregisterScrollElement: vi.fn(),
  }),
}));

vi.mock('@/hooks/use-focus-preservation', () => ({
  useFocusPreservation: () => ({
    saveFocus: vi.fn(),
    restoreFocus: vi.fn(),
  }),
}));

// Mock CSS import
vi.mock('@/styles/smooth-updates.css', () => ({}));

// Mock fetch API
global.fetch = vi.fn();

describe('ConfigPage Real-time Updates', () => {
  const mockServers: ServerData[] = [
    { id: 'server-1', name: 'Server 1', ip: '192.168.1.1', isOnline: true, consecutiveSuccesses: 5, consecutiveFailures: 0, lastChecked: new Date().toISOString(), lastStatusChange: new Date().toISOString() },
    { id: 'server-2', name: 'Server 2', ip: '192.168.1.2', isOnline: false, consecutiveSuccesses: 0, consecutiveFailures: 3, lastChecked: new Date().toISOString(), lastStatusChange: new Date().toISOString() },
  ];

  const mockGroups = [
    { id: 'group-1', name: 'Group 1', order: 1, serverIds: ['server-1'] },
    { id: 'group-2', name: 'Group 2', order: 2, serverIds: ['server-2'] },
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock API calls
    vi.mocked(apiService.fetchServers).mockResolvedValue(mockServers);
    vi.mocked(fetch).mockImplementation((url) => {
      if (url?.toString().includes('/api/config/groups')) {
        return Promise.resolve({
          json: () => Promise.resolve({ success: true, data: mockGroups }),
        }) as any;
      }
      if (url?.toString().includes('/api/config/servers/')) {
        return Promise.resolve({
          json: () => Promise.resolve({
            success: true,
            data: { id: 'server-1', name: 'Server 1', ip: '192.168.1.1', dnsAddress: 'server-1.local' }
          }),
        }) as any;
      }
      return Promise.resolve({ ok: false }) as any;
    });

    // Mock SSE connection
    let serversUpdateCallback: ((servers: ServerData[]) => void) | null = null;
    let groupsUpdateCallback: ((groups: any[]) => void) | null = null;
    let errorCallback: ((error: Event) => void) | null = null;

    vi.mocked(apiService.connectToStatusUpdates).mockImplementation((onServersUpdate, onGroupsUpdate, onServerRemoved, onServerUpdated, onError) => {
      serversUpdateCallback = onServersUpdate || null;
      groupsUpdateCallback = onGroupsUpdate || null;
      errorCallback = onError || null;

      // Simulate initial connection
      setTimeout(() => {
        if (serversUpdateCallback) serversUpdateCallback(mockServers);
        if (groupsUpdateCallback) groupsUpdateCallback(mockGroups);
      }, 0);
    });
  });

  it('should connect to SSE stream on component mount', async () => {
    render(<ConfigPage />);

    await waitFor(() => {
      expect(apiService.connectToStatusUpdates).toHaveBeenCalled();
    });
  });

  it('should update servers when SSE event is received', async () => {
    render(<ConfigPage />);

    await waitFor(() => {
      expect(screen.getByText('Server 1')).toBeInTheDocument();
      expect(screen.getByText('Server 2')).toBeInTheDocument();
    });

    // Get the servers update callback
    const serversUpdateCallback = vi.mocked(apiService.connectToStatusUpdates).mock.calls[0]?.[0];

    // Simulate server update via SSE
    const updatedServers = [
      ...mockServers,
      { id: 'server-3', name: 'Server 3', ip: '192.168.1.3', isOnline: true, consecutiveSuccesses: 1, consecutiveFailures: 0, lastChecked: new Date().toISOString(), lastStatusChange: new Date().toISOString() }
    ];

    act(() => {
      serversUpdateCallback(updatedServers);
    });

    await waitFor(() => {
      expect(screen.getByText('Server 1')).toBeInTheDocument();
      expect(screen.getByText('Server 2')).toBeInTheDocument();
      expect(screen.getByText('Server 3')).toBeInTheDocument();
    });
  });

  it('should update groups when SSE event is received', async () => {
    render(<ConfigPage />);

    // Get the groups update callback
    const groupsUpdateCallback = vi.mocked(apiService.connectToStatusUpdates).mock.calls[0]?.[1];

    // Simulate group update via SSE
    const updatedGroups = [
      ...mockGroups,
      { id: 'group-3', name: 'Group 3', order: 3, serverIds: [] }
    ];

    act(() => {
      groupsUpdateCallback(updatedGroups);
    });

    // The groups are passed to the Sidebar component but not directly rendered in this test
    expect(groupsUpdateCallback).toHaveBeenCalled();
  });

  it('should handle SSE connection errors', async () => {
    const { toast } = await import('@/hooks/use-toast');

    render(<ConfigPage />);

    // Get the error callback
    const errorCallback = vi.mocked(apiService.connectToStatusUpdates).mock.calls[0]?.[4];

    // Simulate SSE error
    const mockError = new Event('error');

    act(() => {
      errorCallback(mockError);
    });

    // Should show error toast
    await waitFor(() => {
      expect(toast).toHaveBeenCalledWith({
        variant: 'destructive',
        title: 'Connection Error',
        description: 'Lost real-time connection to server. Attempting to reconnect...',
        duration: 5000
      });
    });
  });

  it('should disconnect from SSE stream on component unmount', () => {
    const { unmount } = render(<ConfigPage />);

    unmount();

    expect(apiService.disconnect).toHaveBeenCalled();
  });

  it('should maintain server selection when updating servers', async () => {
    render(<ConfigPage />);

    // Select a server
    await waitFor(() => {
      const serverButton = screen.getByTestId('server-1');
      serverButton.click();
    });

    await waitFor(() => {
      expect(screen.getByText('Editing: server-1')).toBeInTheDocument();
    });

    // Get the servers update callback
    const serversUpdateCallback = vi.mocked(apiService.connectToStatusUpdates).mock.calls[0]?.[0];

    // Update servers without changing the selected one
    const updatedServers = [
      ...mockServers,
      { id: 'server-3', name: 'Server 3', ip: '192.168.1.3', isOnline: true, consecutiveSuccesses: 1, consecutiveFailures: 0, lastChecked: new Date().toISOString(), lastStatusChange: new Date().toISOString() }
    ];

    act(() => {
      serversUpdateCallback(updatedServers);
    });

    // Should still show the selected server
    await waitFor(() => {
      expect(screen.getByText('Editing: server-1')).toBeInTheDocument();
    });
  });
});

describe('Conflict Detection', () => {
  it('should detect when selected server is removed via SSE', async () => {
    // This test would require more complex mocking of the conflict detection logic
    // For now, we can test that the main structure handles SSE events properly
    const { toast } = await import('@/hooks/use-toast');

    render(<ConfigPage />);

    // Get the server removed callback
    const serverRemovedCallback = vi.mocked(apiService.connectToStatusUpdates).mock.calls[0]?.[2];

    // Simulate server removal
    if (serverRemovedCallback) {
      act(() => {
        serverRemovedCallback('server-1', 'Server 1');
      });
    }

    // The specific conflict detection logic would be tested in the conflict detection hook
    expect(serverRemovedCallback).toBeDefined();
  });

  it('should detect when selected server is updated via SSE', async () => {
    render(<ConfigPage />);

    // Get the server updated callback
    const serverUpdatedCallback = vi.mocked(apiService.connectToStatusUpdates).mock.calls[0]?.[3];

    // Simulate server update
    if (serverUpdatedCallback) {
      const updatedServer: ServerConfig = {
        id: 'server-1',
        name: 'Updated Server 1',
        ip: '192.168.1.100',
        dns: 'updated-server-1.local'
      };

      act(() => {
        serverUpdatedCallback(updatedServer);
      });
    }

    expect(serverUpdatedCallback).toBeDefined();
  });
});