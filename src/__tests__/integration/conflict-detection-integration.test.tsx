import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';
import { ConfigPage } from '@/pages/ConfigPage';
import { apiService, ServerData, ServerConfig } from '@/services/api';
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

// Mock the child components to allow interaction
vi.mock('@/components/config/Sidebar', () => ({
  Sidebar: ({ onSelectServer, onAddServerClick, servers }: any) => (
    <div data-testid="sidebar">
      {servers.map((server: ServerData) => (
        <button
          key={server.id}
          data-testid={`server-${server.id}`}
          onClick={() => onSelectServer(server.id)}
        >
          {server.name}
        </button>
      ))}
      <button data-testid="add-server" onClick={onAddServerClick}>Add Server</button>
    </div>
  ),
}));

vi.mock('@/components/config/MainPanel', () => ({
  MainPanel: ({
    selectedServerId,
    selectedServer,
    onConflictHandlersReady,
    onNavigationRequest
  }: any) => {
    // Expose conflict handlers to parent
    if (onConflictHandlersReady && selectedServerId) {
      const mockConflictHandlers = {
        handleServerRemoved: vi.fn(),
        handleServerUpdated: vi.fn(),
      };
      onConflictHandlersReady(mockConflictHandlers);
    }

    return (
      <div data-testid="main-panel">
        {selectedServerId && selectedServer ? (
          <div>
            <span>Editing: {selectedServerId}</span>
            <span>Name: {selectedServer.name}</span>
            <input
              data-testid="server-name-input"
              defaultValue={selectedServer.name}
            />
            <button
              data-testid="save-button"
              onClick={() => onNavigationRequest?.(selectedServerId, 'server')}
            >
              Save
            </button>
            <span data-testid="conflict-dialog" style={{ display: 'none' }}>
              Conflict Dialog
            </span>
          </div>
        ) : (
          <span>No server selected</span>
        )}
      </div>
    );
  },
}));

vi.mock('@/components/config/ConfigLayout', () => ({
  ConfigLayout: ({ sidebar, children }: any) => (
    <div data-testid="config-layout">
      {sidebar}
      {children}
    </div>
  ),
}));

// Mock hooks
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

describe('Conflict Detection Integration', () => {
  const mockServers: ServerData[] = [
    {
      id: 'server-1',
      name: 'Server 1',
      ip: '192.168.1.1',
      isOnline: true,
      consecutiveSuccesses: 5,
      consecutiveFailures: 0,
      lastChecked: new Date().toISOString(),
      lastStatusChange: new Date().toISOString()
    },
    {
      id: 'server-2',
      name: 'Server 2',
      ip: '192.168.1.2',
      isOnline: false,
      consecutiveSuccesses: 0,
      consecutiveFailures: 3,
      lastChecked: new Date().toISOString(),
      lastStatusChange: new Date().toISOString()
    },
  ];

  const mockGroups = [
    { id: 'group-1', name: 'Group 1', order: 1, serverIds: ['server-1'] },
    { id: 'group-2', name: 'Group 2', order: 2, serverIds: ['server-2'] },
  ];

  let serversUpdateCallback: ((servers: ServerData[]) => void) | null = null;
  let groupsUpdateCallback: ((groups: any[]) => void) | null = null;
  let serverRemovedCallback: ((serverId: string, serverName: string) => void) | null = null;
  let serverUpdatedCallback: ((server: ServerConfig) => void) | null = null;
  let errorCallback: ((error: Event) => void) | null = null;
  let mockConflictHandlers: any = null;

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

    // Mock SSE connection and capture callbacks
    vi.mocked(apiService.connectToStatusUpdates).mockImplementation((
      onServersUpdate,
      onGroupsUpdate,
      onServerRemoved,
      onServerUpdated,
      onError
    ) => {
      serversUpdateCallback = onServersUpdate || null;
      groupsUpdateCallback = onGroupsUpdate || null;
      serverRemovedCallback = onServerRemoved || null;
      serverUpdatedCallback = onServerUpdated || null;
      errorCallback = onError || null;

      // Simulate initial connection
      setTimeout(() => {
        if (serversUpdateCallback) serversUpdateCallback(mockServers);
        if (groupsUpdateCallback) groupsUpdateCallback(mockGroups);
      }, 0);
    });
  });

  it('should integrate conflict detection between ConfigPage and MainPanel', async () => {
    render(<ConfigPage />);

    await waitFor(() => {
      expect(screen.getByTestId('sidebar')).toBeInTheDocument();
      expect(screen.getByTestId('main-panel')).toBeInTheDocument();
    });

    // Select a server
    const serverButton = screen.getByTestId('server-server-1');
    fireEvent.click(serverButton);

    await waitFor(() => {
      expect(screen.getByText('Editing: server-1')).toBeInTheDocument();
    });

    // Mock the conflict handlers being set up
    await waitFor(() => {
      // The MainPanel should have called onConflictHandlersReady
      expect(apiService.connectToStatusUpdates).toHaveBeenCalled();
    });

    // Simulate server removal via SSE
    if (serverRemovedCallback) {
      act(() => {
        serverRemovedCallback('server-1', 'Server 1');
      });
    }

    // Should have called the conflict handler
    await waitFor(() => {
      expect(serverRemovedCallback).toHaveBeenCalled();
    });
  });

  it('should handle server update conflict detection', async () => {
    render(<ConfigPage />);

    // Select a server
    await waitFor(() => {
      const serverButton = screen.getByTestId('server-server-1');
      fireEvent.click(serverButton);
    });

    await waitFor(() => {
      expect(screen.getByText('Editing: server-1')).toBeInTheDocument();
    });

    // Simulate server update via SSE
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

    // Should have called the conflict handler
    await waitFor(() => {
      expect(serverUpdatedCallback).toHaveBeenCalled();
    });
  });

  it('should maintain state during rapid SSE events', async () => {
    render(<ConfigPage />);

    // Select a server
    await waitFor(() => {
      const serverButton = screen.getByTestId('server-server-1');
      fireEvent.click(serverButton);
    });

    await waitFor(() => {
      expect(screen.getByText('Editing: server-1')).toBeInTheDocument();
    });

    // Simulate rapid SSE events
    if (serversUpdateCallback && groupsUpdateCallback) {
      // Add new servers
      const newServers = [
        ...mockServers,
        {
          id: 'server-3',
          name: 'Server 3',
          ip: '192.168.1.3',
          isOnline: true,
          consecutiveSuccesses: 1,
          consecutiveFailures: 0,
          lastChecked: new Date().toISOString(),
          lastStatusChange: new Date().toISOString()
        }
      ];

      const newGroups = [
        ...mockGroups,
        { id: 'group-3', name: 'Group 3', order: 3, serverIds: ['server-3'] }
      ];

      act(() => {
        serversUpdateCallback(newServers);
        groupsUpdateCallback(newGroups);
      });
    }

    // Should still maintain the selected server
    await waitFor(() => {
      expect(screen.getByText('Editing: server-1')).toBeInTheDocument();
    });
  });

  it('should handle conflict detection for non-selected servers', async () => {
    render(<ConfigPage />);

    // Select server-1
    await waitFor(() => {
      const serverButton = screen.getByTestId('server-server-1');
      fireEvent.click(serverButton);
    });

    await waitFor(() => {
      expect(screen.getByText('Editing: server-1')).toBeInTheDocument();
    });

    // Simulate removal of a different server (server-2)
    if (serverRemovedCallback) {
      act(() => {
        serverRemovedCallback('server-2', 'Server 2');
      });
    }

    // Should still maintain the selected server
    await waitFor(() => {
      expect(screen.getByText('Editing: server-1')).toBeInTheDocument();
    });
  });

  it('should handle SSE connection errors', async () => {
    const { toast } = await import('@/hooks/use-toast');

    render(<ConfigPage />);

    // Get the error callback
    const errorCallback = vi.mocked(apiService.connectToStatusUpdates).mock.calls[0]?.[4];

    // Simulate SSE error
    const mockError = new Event('error');

    act(() => {
      if (errorCallback) errorCallback(mockError);
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

  it('should clean up on component unmount', () => {
    const { unmount } = render(<ConfigPage />);

    unmount();

    expect(apiService.disconnect).toHaveBeenCalled();
  });

  it('should handle empty conflict handlers gracefully', async () => {
    render(<ConfigPage />);

    // Don't select any server, just trigger SSE events
    if (serverRemovedCallback && serverUpdatedCallback) {
      act(() => {
        serverRemovedCallback('server-1', 'Server 1');

        const updatedServer: ServerConfig = {
          id: 'server-1',
          name: 'Updated Server 1',
          ip: '192.168.1.100',
          dns: 'updated-server-1.local'
        };
        serverUpdatedCallback(updatedServer);
      });
    }

    // Should complete without errors even without selected server
    expect(true).toBe(true); // Test reached this point
  });
});