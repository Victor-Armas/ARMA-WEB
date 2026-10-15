import { useEffect, useId, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
export function Modal({
  title,
  children,
  onClose,
  busy = false,
  wide = false,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  busy?: boolean;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    dialog.showModal();
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      dialog.close();
      document.body.style.overflow = previous;
    };
  }, []);
  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-busy={busy}
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onClose();
      }}
      className={`m-auto max-h-[90dvh] w-[calc(100%-2rem)] rounded-arma border border-arma-border bg-arma-surface p-0 text-arma-text shadow-xl [&::backdrop]:bg-black/40 ${wide ? "max-w-3xl" : "max-w-lg"}`}
    >
      <div className="flex items-center justify-between gap-4 border-b border-arma-border px-5 py-4 sm:px-6">
        <h2 id={titleId} className="font-arma-heading text-2xl">
          {title}
        </h2>
        <button
          type="button"
          aria-label="Cerrar"
          disabled={busy}
          onClick={onClose}
          className="flex size-11 shrink-0 items-center justify-center rounded-arma text-arma-muted focus-visible:outline-2 focus-visible:outline-arma-active disabled:opacity-40"
        >
          <X size={20} />
        </button>
      </div>
      <div className="p-5 sm:p-6">{children}</div>
    </dialog>
  );
}
