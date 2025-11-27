import { DeviceCard } from './DeviceCard';

interface DiskInfo {
  total: number;
  free: number;
  used: number;
  percentage: number;
}

interface ServerData {
  id: string;
  name: string;
  ip: string;
  isOnline: boolean;
  diskInfo?: DiskInfo[] | null;
}

interface ServerContainerProps {
  title: string;
  servers: ServerData[];
  serverCount: number;
}

export function ServerContainer({ title, servers, serverCount }: ServerContainerProps) {
  const hasServers = servers.length > 0;

  return (
    <div className={`bg-[#888b8d] border-2 border-[#888b8d] rounded-lg p-2 dashboard-layout-change ${hasServers ? 'server-container-enter' : ''}`}>
      <h3 className="text-lg font-bold text-white mb-2 text-center">
        {title}
      </h3>

      {hasServers ? (
        <div className={`grid gap-2 transition-all duration-500 ease-in-out server-card-enter`} style={{
          gridTemplateColumns: `repeat(${serverCount}, 1fr)`
        }}>
          {servers.map((server) => (
            <DeviceCard
              key={server.id}
              name={server.name}
              ip={server.ip}
              isOnline={server.isOnline}
              diskInfo={server.diskInfo}
            />
          ))}
        </div>
      ) : (
        // Empty state for groups with no servers
        <div className="flex items-center justify-center h-24 text-white text-opacity-60 text-sm italic">
          <div className="text-center">
            <div className="mb-1">No servers assigned</div>
            <div className="text-xs text-white text-opacity-40">
              Add servers to this group in the configuration
            </div>
          </div>
        </div>
      )}
    </div>
  );
}