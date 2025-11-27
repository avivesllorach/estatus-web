import { ReactNode } from 'react';
import { Link } from 'react-router-dom';

interface ConfigLayoutProps {
  sidebar: ReactNode;
  children: ReactNode;
}

export function ConfigLayout({ sidebar, children }: ConfigLayoutProps) {
  return (
    <div className="flex h-screen bg-gray-50">
      {/* Left Sidebar - 280px fixed width */}
      <aside className="w-[280px] flex-shrink-0 bg-white border-r border-gray-300 flex flex-col">
        {sidebar}
      </aside>

      {/* Right Main Panel - Flexible width */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Page Header - fixed height */}
        <header className="flex-shrink-0 bg-white border-b border-gray-200 p-6">
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">Configuration</h1>
          <Link
            to="/"
            className="text-sm text-primary hover:underline"
          >
            Back to Dashboard
          </Link>
        </header>

        {/* Main content area - scrollable */}
        <div className="flex-1 overflow-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
