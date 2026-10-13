import { useId, type ComponentProps, type ReactNode } from 'react';

type InputProps = Omit<ComponentProps<'input'>, 'className'> & {
  label: string;
  leadingIcon?: ReactNode;
  trailingAction?: ReactNode;
  error?: string;
};

export function Input({
  label, leadingIcon, trailingAction, error, id, ...inputProps
}: InputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const errorId = `${inputId}-error`;

  return (
    <div>
      <label htmlFor={inputId} className="sr-only">{label}</label>
      <div className={`flex min-h-[62px] items-center rounded-[18px] border bg-white/70 px-5 transition focus-within:ring-2 focus-within:ring-arma-primary/30 ${error ? 'border-arma-danger' : 'border-arma-border'}`}>
        {leadingIcon ? <span className="shrink-0 text-arma-icon" aria-hidden="true">{leadingIcon}</span> : null}
        <input
          {...inputProps}
          id={inputId}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
          className="mx-4 min-w-0 flex-1 bg-transparent py-4 text-base text-arma-text outline-none placeholder:text-[#9C9894] disabled:opacity-60"
        />
        {trailingAction}
      </div>
      {error ? <p id={errorId} role="alert" className="mt-2 text-sm text-arma-danger">{error}</p> : null}
    </div>
  );
}
