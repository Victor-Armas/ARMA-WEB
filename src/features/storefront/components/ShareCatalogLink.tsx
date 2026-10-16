import { useState } from "react";
import { Share2 } from "lucide-react";

export function ShareCatalogLink({
  title,
  label = "Compartir catálogo",
}: {
  title: string;
  label?: string;
}) {
  const [status, setStatus] = useState<"idle" | "copied" | "manual">("idle");
  const [busy, setBusy] = useState(false);
  async function share() {
    setBusy(true);
    try {
      const url = window.location.href;
      if (navigator.share) {
        await navigator.share({ title, url });
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(url);
        setStatus("copied");
      } else setStatus("manual");
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError"))
        setStatus("manual");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div>
      <button
        type="button"
        disabled={busy}
        onClick={() => void share()}
        className="inline-flex min-h-11 items-center gap-2 rounded-arma text-sm font-medium underline underline-offset-4 disabled:opacity-50"
      >
        <Share2 size={17} strokeWidth={1.5} aria-hidden="true" />
        {label}
      </button>
      {status === "copied" ? (
        <p role="status" className="mt-1 text-xs text-arma-green">
          Enlace copiado. Ya puedes compartirlo.
        </p>
      ) : null}
      {status === "manual" ? (
        <label className="mt-2 block text-xs">
          Copia este enlace
          <input
            readOnly
            value={window.location.href}
            onFocus={(event) => event.target.select()}
            className="mt-1 min-h-11 w-full rounded-arma border border-arma-text/20 bg-white px-3 text-base"
          />
        </label>
      ) : null}
    </div>
  );
}
