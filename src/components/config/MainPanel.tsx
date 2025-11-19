import { ReactNode } from 'react';
import { EmptyState } from './EmptyState';
import { PanelHeader } from './PanelHeader';

interface MainPanelProps {
  selectedServerId: string | null;
  selectedGroupId: string | null;
  selectedServerName?: string | null;
  children?: ReactNode;
}

export function MainPanel({
  selectedServerId,
  selectedGroupId,
  selectedServerName
}: MainPanelProps) {

  // Server edit form view
  if (selectedServerId && selectedServerName) {
    return (
      <div className="flex-1 bg-gray-50 flex flex-col">
        <PanelHeader
          title={`Edit Server: ${selectedServerName}`}
          onDelete={() => {}}
          onCancel={() => {}}
          onSave={() => {}}
        />
        <div className="flex-1 overflow-y-auto p-6">
          {/* Form sections will be added in Story 2.2 */}
          <div className="text-gray-600">Server form coming soon...</div>
        </div>
      </div>
    );
  }

  // Group edit form view (Epic 3)
  if (selectedGroupId) {
    return (
      <div className="bg-[#fafafa] flex-1 p-6 flex flex-col">
        <EmptyState message="Group editing coming soon" />
      </div>
    );
  }

  // Empty state when nothing selected
  return (
    <div className="bg-[#fafafa] flex-1 p-6 flex flex-col">
      <EmptyState />
    </div>
  );
}
