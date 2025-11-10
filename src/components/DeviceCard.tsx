interface DiskInfo {
  total: number;
  free: number;
  used: number;
  percentage: number;
  name?: string;
}

interface DeviceCardProps {
  name: string;
  ip: string;
  isOnline: boolean;
  diskInfo?: DiskInfo[] | null;
  isDummy?: boolean;
}

export function DeviceCard({ name, ip, isOnline, diskInfo, isDummy }: DeviceCardProps) {
  // Filter out null/undefined disk info and limit to 3 disks
  // Only show disk info if server is online
  const actualDisks = (isOnline && diskInfo?.slice(0, 3)) || [];
  const hasDiskInfo = actualDisks.length > 0;

  return (
    <div className={`group relative overflow-hidden rounded-lg border p-3 shadow-sm h-[140px] ${isOnline
      ? 'bg-green-200 border-green-400'
      : 'bg-red-200 border-red-400 animate-glow-pulse-red-fast'
      } ${isDummy ? 'ring-2 ring-blue-200 ring-opacity-50' : ''
      }`}>
      <div className="flex flex-col h-full justify-center">
        {/* Server Info */}
        <div className={`text-center ${hasDiskInfo ? 'mb-3' : ''}`}>
          <div className={`text-sm font-semibold leading-tight ${isOnline ? 'text-green-900' : 'text-red-900'
            }`}>
            {name}
            {isDummy && (
              <span className="ml-1 px-1 py-0.5 text-xs bg-blue-100 text-blue-800 rounded">
                TEST
              </span>
            )}
          </div>
          <div className={`text-xs font-mono leading-tight ${isOnline ? 'text-green-700' : 'text-red-700'
            }`}>{ip}</div>
        </div>

        {/* Disk Info - Only show if disks exist */}
        {hasDiskInfo && (
          <div className="flex flex-col justify-center space-y-1">
            {actualDisks.map((disk, index) => (
              <div key={index} className="h-6 flex items-center justify-center">
                <div className={`rounded px-2 py-1 text-xs w-full text-center ${!isOnline
                  ? 'bg-red-100 border border-red-300 text-red-800 animate-glow-pulse-red-fast'
                  : disk.percentage >= 90
                    ? 'bg-red-100 border border-red-300 text-red-800 animate-glow-pulse-red-fast'
                    : disk.percentage >= 80
                      ? 'bg-orange-100 border border-orange-300 text-orange-800 animate-glow-pulse-orange-slow'
                      : 'bg-gray-100 border border-gray-300 text-gray-800'
                  }`}>
                  {disk.name || `D${index + 1}`}: <span className="font-medium">{disk.percentage}%</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
