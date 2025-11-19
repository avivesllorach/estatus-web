import { useState, useEffect } from 'react';
import { ConfigLayout } from '../components/config/ConfigLayout';
import { Sidebar } from '../components/config/Sidebar';
import { MainPanel } from '../components/config/MainPanel';
import { apiService, ServerData } from '../services/api';
import { GroupConfig } from '../types/group';

export function ConfigPage() {
  const [servers, setServers] = useState<ServerData[]>([]);
  const [groups, setGroups] = useState<GroupConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedServerId, setSelectedServerId] = useState<string | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);

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

  const handleSelectServer = (id: string) => {
    setSelectedServerId(id);
    setSelectedGroupId(null); // Clear group selection
  };

  const handleSelectGroup = (id: string) => {
    setSelectedGroupId(id);
    setSelectedServerId(null); // Clear server selection
  };

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
        />
      }
    >
      <MainPanel>
        <p className="text-gray-600">Select a server or group from the sidebar to configure.</p>
      </MainPanel>
    </ConfigLayout>
  );
}
