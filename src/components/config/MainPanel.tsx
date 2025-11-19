import { ReactNode } from 'react';
import { EmptyState } from './EmptyState';

interface MainPanelProps {
  selectedServerId: string | null;
  selectedGroupId: string | null;
  children?: ReactNode;
}

export function MainPanel({
  selectedServerId,
  selectedGroupId,
  children
}: MainPanelProps) {
  const isNothingSelected = selectedServerId === null && selectedGroupId === null;

  return (
    <div className="bg-[#fafafa] flex-1 p-6 flex flex-col">
      {isNothingSelected ? (
        <EmptyState />
      ) : (
        children
      )}
    </div>
  );
}
