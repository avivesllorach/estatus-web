import { useState, useEffect } from 'react';
import { ConfigLayout } from '../components/config/ConfigLayout';
import { Sidebar } from '../components/config/Sidebar';
import { MainPanel } from '../components/config/MainPanel';
import { apiService, ServerData } from '../services/api';
import { GroupConfig } from '../types/group';
import { ServerConfig } from '../types/server';

export function ConfigPage() {
  const [servers, setServers] = useState<ServerData[]>([]);
  const [groups, setGroups] = useState<GroupConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedServerId, setSelectedServerId] = useState<string | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [selectedServerConfig, setSelectedServerConfig] = useState<ServerConfig | null>(null);

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
      >
        <p className="text-gray-600">Select a server or group from the sidebar to configure.</p>
      </MainPanel>
    </ConfigLayout>
  );
}
