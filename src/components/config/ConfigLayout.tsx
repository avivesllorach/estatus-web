import { ReactNode } from 'react';
import { Link } from 'react-router-dom';

interface ConfigLayoutProps {
  sidebar: ReactNode;
  children: ReactNode;
}

export function ConfigLayout({ sidebar, children }: ConfigLayoutProps) {
  return (
    <div className="flex h-screen">
      {/* Left Sidebar - 280px fixed width */}
      <aside className="w-[280px] flex-shrink-0 bg-white border-r border-gray-300">
        {sidebar}
      </aside>

      {/* Right Main Panel - Flexible width */}
      <main className="flex-1 bg-[#fafafa] min-h-screen flex flex-col">
        {/* Page Header */}
        <header className="p-6 mb-6">
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">Configuration</h1>
          <Link
            to="/"
            className="text-sm text-primary hover:underline"
          >
            Back to Dashboard
          </Link>
        </header>

        {/* Main content area */}
        <div className="flex-1 px-6 pb-6">
          {children}
        </div>
      </main>
    </div>
  );
}
