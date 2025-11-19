import { forwardRef } from 'react';
import { cn } from '@/lib/utils';
import { GroupConfig } from '@/types/group';

interface GroupListItemProps {
  group: GroupConfig;
  isActive: boolean;
  onClick: () => void;
}

export const GroupListItem = forwardRef<HTMLDivElement, GroupListItemProps>(
  ({ group, isActive, onClick }, ref) => {
    const serverCount = group.serverIds.length;
    const countText = serverCount === 1 ? '1 server' : `${serverCount} servers`;

    const handleKeyDown = (event: React.KeyboardEvent) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        onClick();
      }
    };

    return (
      <div
        ref={ref}
        role="listitem"
        aria-current={isActive ? "true" : undefined}
        aria-label={`Group ${group.name}, ${countText}`}
        tabIndex={0}
        className={cn(
          "p-3 cursor-pointer transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset",
          isActive
            ? "bg-blue-50" // Active state
            : "hover:bg-gray-100" // Hover state
        )}
        onClick={onClick}
        onKeyDown={handleKeyDown}
      >
        <div className={cn(
          "text-sm font-semibold",
          isActive ? "text-blue-600" : "text-gray-900"
        )}>
          {group.name}
        </div>
        <div className={cn(
          "text-xs",
          isActive ? "text-blue-500" : "text-gray-600"
        )}>
          {countText}
        </div>
      </div>
    );
  }
);

GroupListItem.displayName = 'GroupListItem';
