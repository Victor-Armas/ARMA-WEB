import "@fontsource/barlow-condensed/latin-600.css";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { LazyMotion, domAnimation, MotionConfig } from "motion/react";
import { StorefrontFrame } from "@/features/storefront/components/StorefrontLayout";
import { CollectionContent } from "@/features/storefront/pages/CollectionPage";
import { useCollectionPreview } from "../hooks/useAppearanceAdmin";
import type { CollectionAppearance } from "@/features/collection-appearance/schemas/appearance.schema";
export function AppearancePreview({
  appearance,
  artworkUrl,
  backgroundUrl = null,
  logoUrl = null,
  device,
}: {
  appearance: CollectionAppearance;
  artworkUrl: string | null;
  backgroundUrl?: string | null;
  logoUrl?: string | null;
  device: "desktop" | "mobile";
}) {
  const query = useCollectionPreview();
  const [body, setBody] = useState<HTMLElement | null>(null);
  const [available, setAvailable] = useState(0);
  const container = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLIFrameElement>(null);
  const attachFrame = useCallback((node: HTMLIFrameElement | null) => {
    frame.current = node;
    const doc = node?.contentDocument;
    if (doc?.body) {
      doc.documentElement.lang = "es";
      doc.body.style.margin = "0";
      setBody(doc.body);
    }
  }, []);
  const width = device === "mobile" ? 390 : 1280;
  const scale = available ? Math.min(1, available / width) : 0.5;
  useEffect(() => {
    const element = container.current;
    if (!element) return;
    const observer = new ResizeObserver((entries) =>
      setAvailable(entries[0].contentRect.width),
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (!body) return;
    const doc = body.ownerDocument;
    function syncStyles() {
      doc.head
        .querySelectorAll("[data-preview-style]")
        .forEach((n) => n.remove());
      document.head
        .querySelectorAll('style,link[rel="stylesheet"]')
        .forEach((node) => {
          const clone = node.cloneNode(true);
          if (clone instanceof Element)
            clone.setAttribute("data-preview-style", "");
          doc.head.appendChild(clone);
        });
    }
    syncStyles();
    const observer = new MutationObserver(syncStyles);
    observer.observe(document.head, { childList: true });
    return () => observer.disconnect();
  }, [body]);
  return (
    <div
      ref={container}
      className="min-w-0 overflow-hidden rounded-arma border border-arma-border bg-arma-neutral-soft"
    >
      <div
        className="mx-auto overflow-hidden"
        style={{ width: width * scale, height: Math.min(700, 900 * scale) }}
      >
        <iframe
          ref={attachFrame}
          title={`Vista previa de la colección en ${device === "mobile" ? "teléfono" : "escritorio"}`}
          sandbox="allow-same-origin"
          src="about:blank"
          onLoad={(event) => attachFrame(event.currentTarget)}
          style={{
            width,
            height: Math.min(1100, 700 / scale),
            transform: `scale(${scale})`,
            transformOrigin: "top left",
            border: 0,
          }}
        />
      </div>
      {body &&
        createPortal(
          <div
            onClickCapture={(e) => {
              if (
                "closest" in e.target &&
                typeof e.target.closest === "function" &&
                e.target.closest("a")
              ) {
                e.preventDefault();
                e.stopPropagation();
              }
            }}
          >
            <LazyMotion features={domAnimation} strict>
              <MotionConfig reducedMotion="user">
                <StorefrontFrame
                  appearance={appearance}
                  artworkUrl={artworkUrl}
                  backgroundUrl={backgroundUrl}
                  logoUrl={logoUrl}
                >
                  <CollectionContent query={query} />
                </StorefrontFrame>
              </MotionConfig>
            </LazyMotion>
          </div>,
          body,
        )}
    </div>
  );
}
