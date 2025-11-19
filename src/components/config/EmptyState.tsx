import { FileQuestion } from 'lucide-react'

interface EmptyStateProps {
  message?: string
  secondaryMessage?: string
}

export function EmptyState({
  message = "Select a server or group from the list to edit",
  secondaryMessage = "Or click '+ Add Server' to create a new monitored server"
}: EmptyStateProps) {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="flex flex-col items-center gap-4 max-w-md px-6 text-center">
        {/* Icon */}
        <FileQuestion className="h-12 w-12 text-gray-400" />

        {/* Primary Message */}
        <p className="text-sm text-gray-600">
          {message}
        </p>

        {/* Secondary Message */}
        <p className="text-sm text-gray-500">
          {secondaryMessage}
        </p>
      </div>
    </div>
  )
}
