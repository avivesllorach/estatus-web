import { useState, useEffect } from 'react';
import { ServerContainer } from './ServerContainer';
import { apiService, ServerData } from '../services/api';

export function Dashboard() {
  const [servers, setServers] = useState<ServerData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  /* const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting'); */

  useEffect(() => {
    const initializeData = async () => {
      try {
        // Fetch initial server data
        const initialServers = await apiService.fetchServers();
        setServers(initialServers);
        setLoading(false);

        // Connect to real-time updates
        apiService.connectToStatusUpdates((updatedServers) => {
          setServers(updatedServers);
          /* setConnectionStatus('connected'); */
        });

        /* setConnectionStatus('connected'); */
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load servers');
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

  // Create container groupings from server data: Row 1: 6,2,1,1 | Row 2: 7,2,1 | Row 3: 3,3,4 | Row 4: 4,2,2,2
  const createContainerGroups = (serverList: ServerData[]) => {
    if (serverList.length === 0) return [];

    return [
      // Row 1
      [
        { servers: serverList.slice(0, 4), count: 4, title: "ARAGÓ" },
        { servers: serverList.slice(4, 7), count: 3, title: "PROVENÇA" },
        { servers: serverList.slice(7, 9), count: 2, title: "DATASTORE ARAGÓ" },
        { servers: serverList.slice(9, 11), count: 2, title: "DATASTORE PROVENÇA" },
      ],
      // Row 2
      [
        { servers: serverList.slice(11, 14), count: 3, title: "VIRTUAL CAMPUS" },
        { servers: serverList.slice(14, 21), count: 7, title: "VIRTUAL CAMPUS - AULAS" },
      ],
      // Row 3
      [
        { servers: serverList.slice(21, 24), count: 3, title: "ATLAS" },
        { servers: serverList.slice(24, 25), count: 1, title: "INTEGRADOR" },
        { servers: serverList.slice(25, 27), count: 2, title: "BI" },
        { servers: serverList.slice(27, 31), count: 4, title: "IRENE" },

      ],
      // Row 4
      [
        { servers: serverList.slice(31, 35), count: 4, title: "AD" },
        { servers: serverList.slice(35, 37), count: 2, title: "COMMVAULT" },
        { servers: serverList.slice(37, 39), count: 2, title: "RADIUS" },
        { servers: serverList.slice(39, 40), count: 1, title: "CAS" },
        { servers: serverList.slice(40, 41), count: 1, title: "LDAP" },
        { servers: serverList.slice(41, 42), count: 1, title: "SMTP" },
      ],
    ];
  };

  const containerGroups = createContainerGroups(servers);

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
        {containerGroups.map((row, rowIndex) => (
          <div key={rowIndex} className="flex gap-4 flex-1">
            {row.map((container, containerIndex) => (
              <div
                key={containerIndex}
                className="flex-1"
                style={{ flex: container.count }}
              >
                <ServerContainer
                  title={container.title}
                  servers={container.servers}
                  serverCount={container.count}
                />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}