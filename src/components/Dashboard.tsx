import { useState, useEffect } from 'react';
import { ServerContainer } from './ServerContainer';
import { apiService, ServerData, GroupConfig } from '../services/api';
import { createDynamicRowLayout, migrateLegacyGroups, calculateRowGridClasses, generateProportionalGridTemplateColumns } from '../utils/layoutUtils';

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

  // Create dynamic row layout with flexible sizing
  const createDynamicLayout = (serverList: ServerData[], groupList: GroupConfig[]) => {
    if (serverList.length === 0 || groupList.length === 0) {
      return {
        layout: { rows: [], totalRows: 0, groupsPerRow: [], maxGroupsPerRow: 0 },
        serverData: []
      };
    }

    // Create a map for fast server lookup
    const serverMap = new Map(serverList.map(server => [server.id, server]));

    // Migrate legacy groups to new format (if any)
    const migratedGroups = migrateLegacyGroups(groupList);

    // Include ALL groups (even those with no servers) to support empty states
    // Groups with no servers should still appear with proportional sizing
    const allGroups = migratedGroups;

    if (allGroups.length === 0) {
      return {
        layout: { rows: [], totalRows: 0, groupsPerRow: [], maxGroupsPerRow: 0 },
        serverData: []
      };
    }

    // Create dynamic layout with all groups (proportional width handles zero servers)
    const layout = createDynamicRowLayout(allGroups);

    // Attach server data to each group
    const serverData = layout.rows.map(row => ({
      rowNumber: row.rowNumber,
      groups: row.groups.map(group => {
        const groupServers = group.serverIds
          .map(serverId => serverMap.get(serverId))
          .filter((server): server is ServerData => server !== undefined);

        return {
          group: {
            id: group.id,
            name: group.name,
            order: group.order,
            serverIds: group.serverIds,
            rowNumber: group.rowNumber,
            rowOrder: group.rowOrder
          },
          servers: groupServers,
          serverCount: groupServers.length,
          width: group._width
        };
      })
    }));

    return { layout, serverData };
  };

  const { layout, serverData } = createDynamicLayout(servers, groups);

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
      <div className="flex-1 flex flex-col gap-4 max-h-full p-4 overflow-y-auto">
        {serverData.length === 0 ? (
          // Empty state when no groups have servers
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="text-gray-500 mb-4">
                <svg className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Server Groups Found</h3>
              <p className="text-gray-600 mb-4">
                {groups.length === 0
                  ? "Create groups and assign servers to see them displayed here."
                  : "Assign servers to groups to see them displayed here."
                }
              </p>
              <p className="text-sm text-gray-500">
                Visit the configuration page to manage groups and server assignments.
              </p>
            </div>
          </div>
        ) : (
          // Render dynamic rows
          serverData.map((rowData) => {
            const groupCount = rowData.groups.length;
            const gridClasses = calculateRowGridClasses(groupCount);

            // Generate proportional grid template columns using the calculated widths
            const proportionalGridTemplate = generateProportionalGridTemplateColumns(rowData.groups.map(g => ({
              ...g.group,
              _width: g.width || '0%'
            } as any)));

            return (
              <div
                key={rowData.rowNumber}
                className="flex-shrink-0"
                style={{
                  display: 'grid',
                  gridTemplateColumns: proportionalGridTemplate,
                  gap: '1rem',
                  minHeight: '200px'
                }}
              >
                {rowData.groups.map((groupData, groupIndex) => (
                  <div
                    key={groupData.group.id}
                    className="min-h-0"
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      height: '100%'
                    }}
                  >
                    <ServerContainer
                      title={groupData.group.name}
                      servers={groupData.servers}
                      serverCount={groupData.serverCount}
                    />
                  </div>
                ))}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}