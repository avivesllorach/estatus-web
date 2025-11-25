import { cn } from '@/lib/utils';
import { forwardRef } from 'react';

interface ServerListItemProps {
  server: {
    id: string;
    name: string;
    ip: string;
  };
  isActive: boolean;
  onClick?: () => void;
}

export const ServerListItem = forwardRef<HTMLDivElement, ServerListItemProps>(
  ({ server, isActive, onClick }, ref) => {
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if ((event.key === 'Enter' || event.key === ' ') && onClick) {
      event.preventDefault();
      onClick();
    }
  };

    return (
      <div
        ref={ref}
        className={cn(
          "p-3 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset",
          "server-list-item focus-ring-stable", // Smooth update classes
          isActive
            ? "bg-blue-50" // Active state - blue background
            : "hover:bg-gray-100" // Hover state for non-active items
        )}
        onClick={onClick}
        onKeyDown={handleKeyDown}
        role="listitem"
        aria-current={isActive ? "true" : undefined}
        aria-label={`Server ${server.name} at ${server.ip}`}
        tabIndex={0}
      >
        <div className={cn(
          "text-sm font-semibold preserve-selection",
          isActive ? "text-blue-600" : "text-gray-900"
        )}>
          {server.name}
        </div>
        <div className={cn(
          "text-xs font-mono preserve-selection",
          isActive ? "text-blue-500" : "text-gray-600"
        )}>
          {server.ip}
        </div>
      </div>
    );
  }
);

ServerListItem.displayName = 'ServerListItem';
