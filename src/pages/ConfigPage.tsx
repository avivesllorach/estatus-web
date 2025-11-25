import { useState, useEffect, useRef } from 'react';
import { ConfigLayout } from '../components/config/ConfigLayout';
import { Sidebar } from '../components/config/Sidebar';
import { MainPanel } from '../components/config/MainPanel';
import { apiService, ServerData, ServerConfig } from '../services/api';
import { GroupConfig } from '../types/group';
import { useScrollPreservation } from '@/hooks/use-scroll-preservation';
import { useFocusPreservation } from '@/hooks/use-focus-preservation';
import { useToast } from '@/hooks/use-toast';
import { useConflictDetection } from '@/hooks/use-conflict-detection';
import '@/styles/smooth-updates.css';

export function ConfigPage() {
  const [servers, setServers] = useState<ServerData[]>([]);
  const [groups, setGroups] = useState<GroupConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedServerId, setSelectedServerId] = useState<string | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [selectedServerConfig, setSelectedServerConfig] = useState<ServerConfig | null>(null);

  // Ref to track if we should bypass navigation check (for completing pending navigation)
  const bypassNavigationCheck = useRef(false);

  const { toast } = useToast();

  // Hooks for smooth user experience during updates
  const {
    registerScrollElement,
    unregisterScrollElement,
    saveAllScrollPositions,
    restoreAllScrollPositions
  } = useScrollPreservation();

  const { saveFocus, restoreFocus } = useFocusPreservation();

  // SSE error handler
  const handleSSEError = (error: Event) => {
    toast({
      variant: 'destructive',
      title: 'Connection Error',
      description: 'Lost real-time connection to server. Attempting to reconnect...',
      duration: 5000
    });
  };

  // State to store MainPanel conflict detection handlers
  const [conflictHandlers, setConflictHandlers] = useState<{
    handleServerRemoved: (serverId: string, serverName: string) => void;
    handleServerUpdated: (server: ServerConfig) => void;
  } | null>(null);

  const fetchGroups = async () => {
    try {
      const groupsData = await fetch('/api/config/groups')
        .then(res => res.json())
        .then(data => data.success ? data.data : []);
      setGroups(groupsData);
    } catch (error) {
      console.error('Failed to fetch groups:', error);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Fetch servers and groups in parallel
        const [serversData, groupsData] = await Promise.all([
          apiService.fetchServers(),
          fetch('/api/config/groups')
            .then(res => res.json())
            .then(data => data.success ? data.data : [])
        ]);

        setServers(serversData);
        setGroups(groupsData);
      } catch (error) {
        console.error('Failed to load configuration data:', error);
        setError('Failed to load configuration data. Please refresh the page to try again.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();

    // Connect to SSE for real-time updates
    apiService.connectToStatusUpdates(
      (updatedServers) => {
        // Save current focus and scroll positions before update
        saveFocus();
        saveAllScrollPositions();

        // Update servers
        setServers(updatedServers);

        // Restore focus and scroll positions after update
        setTimeout(() => {
          restoreFocus();
          restoreAllScrollPositions();
        }, 16);
      },
      (updatedGroups) => {
        // Save current focus and scroll positions before update
        saveFocus();
        saveAllScrollPositions();

        // Update groups
        setGroups(updatedGroups);

        // Restore focus and scroll positions after update
        setTimeout(() => {
          restoreFocus();
          restoreAllScrollPositions();
        }, 16);
      },
      (serverId, serverName) => {
        // Handle server removed - call MainPanel conflict detection if available
        if (conflictHandlers) {
          conflictHandlers.handleServerRemoved(serverId, serverName);
        }

        // Also handle the basic state update
        if (selectedServerId === serverId) {
          setSelectedServerId(null);
          setSelectedServerConfig(null);
        }
      },
      (server) => {
        // Handle server updated - call MainPanel conflict detection if available
        if (conflictHandlers) {
          conflictHandlers.handleServerUpdated(server);
        }

        // Also handle the basic state update
        if (selectedServerId === server.id && selectedServerConfig) {
          setSelectedServerConfig(server);
        }
      },
      handleSSEError
    );

    // Cleanup SSE connection on unmount
    return () => {
      apiService.disconnect();
    };
  }, []);

  // Fetch server config when server is selected
  useEffect(() => {
    const fetchServerConfig = async () => {
      if (!selectedServerId) {
        setSelectedServerConfig(null);
        return;
      }

      try {
        const response = await fetch(`/api/config/servers/${selectedServerId}`);
        const data = await response.json();

        if (data.success && data.data) {
          // Convert backend dnsAddress to frontend dns field
          const config: ServerConfig = {
            ...data.data,
            dns: data.data.dnsAddress
          };
          setSelectedServerConfig(config);
        }
      } catch (error) {
        console.error('Failed to load server config:', error);
      }
    };

    fetchServerConfig();
  }, [selectedServerId]);

  // Navigation request handler - called from MainPanel when navigation should proceed
  const handleNavigationRequest = (targetId: string, type: 'server' | 'group' | 'add-server') => {
    bypassNavigationCheck.current = true;

    if (type === 'server') {
      handleSelectServer(targetId);
    } else if (type === 'group') {
      handleSelectGroup(targetId);
    } else if (type === 'add-server') {
      handleAddServerClick();
    }

    // Reset bypass flag after navigation
    setTimeout(() => {
      bypassNavigationCheck.current = false;
    }, 100);
  };

  
  const handleSelectServer = (id: string) => {
    setSelectedServerId(id);
    setSelectedGroupId(null); // Clear group selection
  };

  const handleSelectGroup = (id: string) => {
    setSelectedGroupId(id);
    setSelectedServerId(null); // Clear server selection
  };

  const handleAddServerClick = () => {
    // Clear selections and trigger "add mode" in MainPanel
    setSelectedServerId('__ADD_MODE__'); // Special flag to indicate add mode
    setSelectedGroupId(null);
    setSelectedServerConfig(null);
  };

  const handleAddGroupClick = () => {
    // Future implementation for Epic 3
    setSelectedGroupId('__ADD_MODE__');
    setSelectedServerId(null);
  };

  // Get selected server name
  const selectedServer = servers.find(s => s.id === selectedServerId);
  const selectedServerName = selectedServer?.name || null;

  return (
    <ConfigLayout
      sidebar={
        <Sidebar
          servers={servers}
          groups={groups}
          isLoading={isLoading}
          error={error}
          selectedServerId={selectedServerId}
          selectedGroupId={selectedGroupId}
          onSelectServer={handleSelectServer}
          onSelectGroup={handleSelectGroup}
          onAddServerClick={handleAddServerClick}
          onAddGroupClick={handleAddGroupClick}
        />
      }
    >
      <MainPanel
        selectedServerId={selectedServerId}
        selectedGroupId={selectedGroupId}
        selectedServerName={selectedServerName}
        selectedServer={selectedServerConfig}
        selectedGroup={groups.find(g => g.id === selectedGroupId) || null}
        servers={servers}
        groups={groups}
        onNavigationRequest={handleNavigationRequest}
        onGroupsRefresh={fetchGroups}
        onConflictHandlersReady={setConflictHandlers}
      >
        <p className="text-gray-600">Select a server or group from the sidebar to configure.</p>
      </MainPanel>
    </ConfigLayout>
  );
}
