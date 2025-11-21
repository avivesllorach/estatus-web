import { Button } from '@/components/ui/button';

interface PanelHeaderProps {
  title: string;               // "Edit Server: ARAGÓ-01" or "Add New Server"
  onDelete?: () => void;       // Delete button handler (optional - not shown in add mode)
  onCancel: () => void;        // Cancel button handler
  onSave: () => void;          // Save button handler
  isDirty?: boolean;           // Optional: show unsaved indicator (Epic 2.9)
  hasErrors?: boolean;         // Disable Save button when validation errors exist
  isLoading?: boolean;         // Show loading state on Save button
}

export function PanelHeader({
  title,
  onDelete,
  onCancel,
  onSave,
  isDirty = false,
  hasErrors = false,
  isLoading = false
}: PanelHeaderProps) {
  return (
    <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
          {isDirty && (
            <span className="flex items-center gap-1.5 text-sm text-amber-600">
              <span className="h-2 w-2 rounded-full bg-amber-600"></span>
              <span className="font-medium">Unsaved</span>
            </span>
          )}
        </div>
        <div className="flex gap-2">
          {onDelete && (
            <Button variant="destructive" size="sm" onClick={onDelete}>
              Delete
            </Button>
          )}
          <Button variant="secondary" size="sm" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={onSave}
            disabled={hasErrors || isLoading}
            className={hasErrors ? 'opacity-50 cursor-not-allowed' : ''}
          >
            {isLoading ? 'Saving...' : 'Save Server'}
          </Button>
        </div>
      </div>
    </div>
  );
}
