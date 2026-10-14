import { useId, type ReactNode } from 'react';
interface FormFieldProps { label: string; error?: string; children: (id: string, errorId: string | undefined) => ReactNode; }
export function FormField({label, error, children}: FormFieldProps) {
  const id = useId();
  const errorId = error ? `${id}-error` : undefined;
  return <div><label htmlFor={id} className="mb-2 block text-sm font-medium">{label}</label>{children(id, errorId)}{error ? <p id={errorId} role="alert" className="mt-2 text-xs text-arma-red">{error}</p> : null}</div>;
}
