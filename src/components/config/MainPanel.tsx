import { ReactNode } from 'react';

interface MainPanelProps {
  children?: ReactNode;
}

export function MainPanel({ children }: MainPanelProps) {
  return (
    <div className="bg-[#fafafa] flex-1 p-6">
      {children}
    </div>
  );
}
