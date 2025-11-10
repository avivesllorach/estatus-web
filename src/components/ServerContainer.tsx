import { DeviceCard } from './DeviceCard';

interface DiskInfo {
  total: number;
  free: number;
  used: number;
  percentage: number;
}

interface ServerData {
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
    <div className="bg-[#888b8d] border-2 border-[#888b8d] rounded-lg p-2">
      <h3 className="text-lg font-bold text-white mb-2 text-center">
        {title}
      </h3>
      <div className={`grid gap-2`} style={{ gridTemplateColumns: `repeat(${serverCount}, 1fr)` }}>
        {servers.map((server, index) => (
          <DeviceCard
            key={`${server.ip}-${index}`}
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