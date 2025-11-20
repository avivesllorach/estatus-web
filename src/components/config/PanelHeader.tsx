import { Button } from '@/components/ui/button';

interface PanelHeaderProps {
  title: string;               // "Edit Server: ARAGÓ-01"
  onDelete: () => void;        // Delete button handler
  onCancel: () => void;        // Cancel button handler
  onSave: () => void;          // Save button handler
  isDirty?: boolean;           // Optional: show unsaved indicator (Epic 2.9)
  hasErrors?: boolean;         // Disable Save button when validation errors exist
}

export function PanelHeader({
  title,
  onDelete,
  onCancel,
  onSave,
  isDirty = false,
  hasErrors = false
}: PanelHeaderProps) {
  return (
    <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">
          {title}
          {isDirty && <span className="ml-2 text-sm text-gray-500">(unsaved)</span>}
        </h2>
        <div className="flex gap-2">
          <Button variant="destructive" size="sm" onClick={onDelete}>
            Delete
          </Button>
          <Button variant="secondary" size="sm" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={onSave}
            disabled={hasErrors}
            className={hasErrors ? 'opacity-50 cursor-not-allowed' : ''}
          >
            Save Server
          </Button>
        </div>
      </div>
    </div>
  );
}
