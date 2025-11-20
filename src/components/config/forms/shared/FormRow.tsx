import { ReactNode } from 'react';

interface FormRowProps {
  children: ReactNode;
}

export function FormRow({ children }: FormRowProps) {
  return (
    <div className="grid grid-cols-2 gap-4 mb-4">
      {children}
    </div>
  );
}
