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
  return (
    <div className={`bg-[#888b8d] border-2 border-[#888b8d] rounded-lg p-2 dashboard-layout-change ${servers.length > 0 ? 'server-container-enter' : ''}`}>
      <h3 className="text-lg font-bold text-white mb-2 text-center">
        {title}
      </h3>
      <div className={`grid gap-2 transition-all duration-500 ease-in-out server-card-enter`} style={{
        gridTemplateColumns: `repeat(${serverCount || 1}, 1fr)`
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
    </div>
  );
}