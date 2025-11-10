interface StatusIndicatorProps {
  isOnline: boolean;
}

export function StatusIndicator({ isOnline }: StatusIndicatorProps) {
  return (
    <div className="flex items-center justify-center">
      <div className={`w-3 h-3 rounded-full ${
        isOnline ? 'bg-green-400' : 'bg-red-400'
      }`}></div>
    </div>
  );
}