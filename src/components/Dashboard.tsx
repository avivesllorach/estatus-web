import { useState, useEffect } from 'react';
import { ServerContainer } from './ServerContainer';
import { apiService, ServerData, GroupConfig } from '../services/api';

export function Dashboard() {
  const [servers, setServers] = useState<ServerData[]>([]);
  const [groups, setGroups] = useState<GroupConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  /* const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting'); */

  useEffect(() => {
    const initializeData = async () => {
      try {
        // Fetch initial server data
        const initialServers = await apiService.fetchServers();
        setServers(initialServers);

        // Fetch initial groups data
        const initialGroups = await apiService.fetchGroups();
        setGroups(initialGroups);

        setLoading(false);

        // Connect to real-time updates
        apiService.connectToStatusUpdates((updatedServers) => {
          setServers(updatedServers);
        }, (updatedGroups) => {
          setGroups(updatedGroups);
        });

        /* setConnectionStatus('connected'); */
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data');
        setLoading(false);
        /* setConnectionStatus('disconnected'); */
      }
    };

    initializeData();

    // Cleanup on unmount
    return () => {
      apiService.disconnect();
    };
  }, []);

  // Create container groups from groups configuration and server data
  const createContainerGroups = (serverList: ServerData[], groupList: GroupConfig[]) => {
    if (serverList.length === 0 || groupList.length === 0) return [];

    // Create a map for fast server lookup
    const serverMap = new Map(serverList.map(server => [server.id, server]));

    // Sort groups by order, then by name for consistency
    const sortedGroups = [...groupList].sort((a, b) => a.order - b.order);

    // Create groups with their assigned servers
    return sortedGroups
      .filter(group => group.serverIds.length > 0) // Only show groups with servers
      .map(group => {
        const groupServers = group.serverIds
          .map(serverId => serverMap.get(serverId))
          .filter((server): server is ServerData => server !== undefined); // Filter out undefined servers

        return {
          servers: groupServers,
          count: groupServers.length,
          title: group.name,
        };
      })
      .filter(group => group.servers.length > 0); // Filter out groups with no valid servers
  };

  const containerGroups = createContainerGroups(servers, groups);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-300 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading servers...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-300 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 mb-4">
            <svg className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Connection Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-300 overflow-hidden flex flex-col">

      <div className="flex-1 flex flex-col gap-4 max-h-full p-4">
        {containerGroups.map((container) => (
          <div
            key={container.title}
            className="flex-1"
            style={{ flex: container.count || 1 }}
          >
            <ServerContainer
              title={container.title}
              servers={container.servers}
              serverCount={container.count}
            />
          </div>
        ))}
      </div>
    </div>
  );
}