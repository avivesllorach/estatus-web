import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { ServerListItem } from './ServerListItem';
import { GroupListItem } from './GroupListItem';
import { ServerData } from '@/services/api';
import { GroupConfig } from '@/types/group';
import { useRef, useState } from 'react';

interface SidebarProps {
  servers: ServerData[];
  groups: GroupConfig[];
  isLoading: boolean;
  error?: string | null;
  selectedServerId: string | null;
  selectedGroupId: string | null;
  onSelectServer: (id: string) => void;
  onSelectGroup: (id: string) => void;
  onAddServerClick?: () => void;
  onAddGroupClick?: () => void;
}

export function Sidebar({
  servers,
  groups,
  isLoading,
  error,
  selectedServerId,
  selectedGroupId,
  onSelectServer,
  onSelectGroup,
  onAddServerClick,
  onAddGroupClick
}: SidebarProps) {
  const [focusedServerIndex, setFocusedServerIndex] = useState<number>(0);
  const [focusedGroupIndex, setFocusedGroupIndex] = useState<number>(0);
  const serverRefs = useRef<(HTMLDivElement | null)[]>([]);
  const groupRefs = useRef<(HTMLDivElement | null)[]>([]);

  const handleServerKeyDown = (event: React.KeyboardEvent) => {
    if (servers.length === 0) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      const nextIndex = Math.min(focusedServerIndex + 1, servers.length - 1);
      setFocusedServerIndex(nextIndex);
      serverRefs.current[nextIndex]?.focus();
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      const prevIndex = Math.max(focusedServerIndex - 1, 0);
      setFocusedServerIndex(prevIndex);
      serverRefs.current[prevIndex]?.focus();
    }
  };

  const handleGroupKeyDown = (event: React.KeyboardEvent) => {
    if (groups.length === 0) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      const nextIndex = Math.min(focusedGroupIndex + 1, groups.length - 1);
      setFocusedGroupIndex(nextIndex);
      groupRefs.current[nextIndex]?.focus();
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      const prevIndex = Math.max(focusedGroupIndex - 1, 0);
      setFocusedGroupIndex(prevIndex);
      groupRefs.current[prevIndex]?.focus();
    }
  };
  return (
    <div className="flex flex-col h-full">
      {/* SERVERS Section */}
      <div className="flex flex-col flex-shrink-0">
        <div className="px-4 py-3">
          <h3 className="text-xs font-semibold text-gray-600 uppercase mb-2">
            SERVERS
          </h3>

          {/* Add Server button */}
          <Button
            variant="secondary"
            size="sm"
            className="w-full mb-3"
            onClick={onAddServerClick}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Server
          </Button>
        </div>

        {error ? (
          <div className="px-4 py-6 text-sm text-red-600 text-center">
            {error}
          </div>
        ) : isLoading ? (
          <div className="px-4 py-6 text-sm text-gray-500 text-center">
            Loading servers...
          </div>
        ) : servers.length === 0 ? (
          <div className="px-4 py-6 text-sm text-gray-500 text-center">
            No servers configured yet
          </div>
        ) : (
          <div className="px-4">
            <ScrollArea className="h-64 scroll-area-smooth">
              <div
                className="flex flex-col gap-2 sidebar-section"
                role="list"
                aria-label="Server list"
                onKeyDown={handleServerKeyDown}
              >
                {servers.map((server, index) => (
                  <ServerListItem
                    key={server.id}
                    ref={(el) => (serverRefs.current[index] = el)}
                    server={{ id: server.id, name: server.name, ip: server.ip }}
                    isActive={selectedServerId === server.id}
                    onClick={() => onSelectServer(server.id)}
                  />
                ))}
              </div>
            </ScrollArea>
          </div>
        )}
      </div>

      {/* GROUPS Section - takes remaining space */}
      <div className="flex flex-col flex-1 min-h-0 mt-6">
        <div className="px-4 py-3">
          <h3 className="text-xs font-semibold text-gray-600 uppercase mb-2">
            GROUPS
          </h3>

          {/* Add Group button */}
          <Button
            variant="secondary"
            size="sm"
            className="w-full mb-3"
            onClick={onAddGroupClick}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Group
          </Button>
        </div>

        {groups.length === 0 ? (
          <div className="px-4 py-6 text-sm text-gray-500 text-center">
            No groups created yet.
          </div>
        ) : (
          <div className="px-4 flex-1 min-h-0">
            <ScrollArea className="h-full scroll-area-smooth">
              <div
                className="flex flex-col gap-2 sidebar-section"
                role="list"
                aria-label="Group list"
                onKeyDown={handleGroupKeyDown}
              >
                {groups.map((group, index) => (
                  <GroupListItem
                    key={group.id}
                    ref={(el) => (groupRefs.current[index] = el)}
                    group={group}
                    isActive={selectedGroupId === group.id}
                    onClick={() => onSelectGroup(group.id)}
                  />
                ))}
              </div>
            </ScrollArea>
          </div>
        )}
      </div>
    </div>
  );
}
