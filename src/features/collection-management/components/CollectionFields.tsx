import { cloneElement, useId, type ReactElement } from "react";
export const fieldClass =
  "mt-2 min-h-11 w-full min-w-0 rounded-arma border border-arma-border bg-arma-surface px-3 py-2 text-base sm:text-sm text-arma-text outline-offset-2 focus-visible:outline-2 focus-visible:outline-arma-active disabled:opacity-50";
export const primaryClass =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-arma bg-arma-green px-5 py-3 text-sm font-semibold text-white hover:brightness-95 disabled:opacity-50";
export const secondaryClass =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-arma border border-arma-border bg-arma-surface px-4 py-2 text-sm font-medium hover:bg-arma-background disabled:opacity-50";
export function CollectionField({
  label,
  children,
  error,
}: {
  label: string;
  children: ReactElement<{
    id?: string;
    "aria-describedby"?: string;
    "aria-invalid"?: boolean;
  }>;
  error?: string;
}) {
  const id = useId();
  return (
    <div className="block min-w-0 text-sm font-medium">
      <label htmlFor={id}>{label}</label>
      {cloneElement(children, {
        id,
        "aria-describedby": error ? `${id}-error` : undefined,
        "aria-invalid": Boolean(error),
      })}
      {error && (
        <span
          id={`${id}-error`}
          role="alert"
          className="mt-1 block text-sm text-red-700"
        >
          {error}
        </span>
      )}
    </div>
  );
}
