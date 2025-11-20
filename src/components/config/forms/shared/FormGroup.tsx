import { ReactElement, cloneElement } from 'react';
import { Label } from "@/components/ui/label";

interface FormGroupProps {
  label: string;
  required?: boolean;
  children: ReactElement; // Must be single input element
  error?: string | null;
  helperText?: string;
  htmlFor?: string;
}

export function FormGroup({
  label,
  required = false,
  children,
  error,
  helperText,
  htmlFor
}: FormGroupProps) {
  const errorId = htmlFor ? `${htmlFor}-error` : undefined;

  // Clone child input to add aria attributes
  const enhancedChild = cloneElement(children, {
    'aria-invalid': error ? 'true' : 'false',
    'aria-describedby': error && errorId ? errorId : undefined,
    className: `${children.props.className || ''} ${error ? 'border-red-600 focus:ring-red-600' : ''}`.trim()
  });

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={htmlFor} className="text-sm font-semibold text-gray-900">
        {label}
        {required && <span className="text-red-600 ml-1">*</span>}
      </Label>
      {enhancedChild}
      {helperText && !error && (
        <p className="text-xs text-gray-600">{helperText}</p>
      )}
      {error && (
        <p id={errorId} className="text-xs text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
