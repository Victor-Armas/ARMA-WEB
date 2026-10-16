import { useEffect } from "react";
import { createPortal } from "react-dom";
import armaLogo from "@/assets/arma-logo.webp";

export function CollectionLoader({
  done = 0,
  total = 0,
}: {
  done?: number;
  total?: number;
}) {
  useEffect(() => {
    const previous = document.body.style.overflow;
    const root = document.getElementById("root");
    const previousInert = root?.inert ?? false;
    document.body.style.overflow = "hidden";
    if (root) root.inert = true;
    return () => {
      document.body.style.overflow = previous;
      if (root) root.inert = previousInert;
    };
  }, []);
  return createPortal(
    <div
      data-catalog-loader
      className="fixed inset-0 z-[10000] flex min-h-dvh flex-col items-center justify-center bg-arma-ink px-6 text-white"
    >
      <div className="w-full max-w-64 text-center">
        <img
          src={armaLogo}
          alt="ARMA"
          width={800}
          height={285}
          className="mx-auto h-auto w-56 brightness-0 invert motion-safe:animate-arma-loading"
        />
        <div
          role="progressbar"
          aria-label="Preparando fotografías"
          aria-valuemin={0}
          aria-valuemax={total || 100}
          aria-valuenow={total ? done : undefined}
          className="mt-9 h-0.5 overflow-hidden bg-white/20"
        >
          <div
            className={`h-full origin-left bg-arma-acid ${total ? "transition-transform duration-200 ease-arma-out motion-reduce:transition-none" : "motion-safe:animate-arma-loading-line"}`}
            style={total ? { transform: `scaleX(${done / total})` } : undefined}
          />
        </div>
        <p
          role="status"
          aria-live="polite"
          className="mt-5 text-sm font-medium"
        >
          {total ? "Preparando las fotografías" : "Abriendo la colección"}
        </p>
        <p className="mt-2 text-xs text-white/80">
          {total
            ? `${done} de ${total} imágenes listas`
            : "Tu próxima playera está por aquí."}
        </p>
      </div>
    </div>,
    document.body,
  );
}
