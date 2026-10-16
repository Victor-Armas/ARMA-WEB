import { useState } from "react";
import { Link } from "react-router";
import { Pause, Play, ArrowUpRight } from "lucide-react";
import type { StorefrontProduct } from "../schemas/storefront.schema";
export function CollectionTicker({
  products,
}: {
  products: StorefrontProduct[];
}) {
  const [paused, setPaused] = useState(false);
  if (!products.length) return null;
  return (
    <section
      aria-label="Explora los modelos"
      className="relative overflow-hidden bg-arma-ink py-5 text-arma-acid sm:py-7"
    >
      <div className="pr-16">
        <div
          style={{ animationPlayState: paused ? "paused" : undefined }}
          className={`flex w-max motion-safe:animate-arma-ticker motion-reduce:max-w-full motion-reduce:flex-wrap ${paused ? "[animation-play-state:paused]" : ""} [@media(hover:hover)]:hover:[animation-play-state:paused] focus-within:[animation-play-state:paused]`}
        >
          {[0, 1].map((copy) => (
            <div
              key={copy}
              aria-hidden={copy === 1 ? true : undefined}
              className={`flex shrink-0 items-center gap-8 pr-8 sm:gap-12 sm:pr-12 ${copy === 1 ? "motion-reduce:hidden" : "motion-reduce:flex-wrap motion-reduce:gap-5 motion-reduce:px-5"}`}
            >
              {products.map((product) => (
                <Link
                  key={product.id}
                  tabIndex={copy === 1 ? -1 : 0}
                  to={`/coleccion/producto/${product.id}`}
                  className="flex items-center gap-8 whitespace-nowrap font-arma-display text-4xl font-semibold uppercase leading-none sm:gap-12 sm:text-6xl"
                >
                  {product.name}
                  <ArrowUpRight
                    size={32}
                    strokeWidth={1.5}
                    aria-hidden="true"
                  />
                </Link>
              ))}
            </div>
          ))}
        </div>
      </div>
      <button
        type="button"
        onClick={() => setPaused((v) => !v)}
        aria-label={paused ? "Reanudar movimiento" : "Pausar movimiento"}
        aria-pressed={paused}
        className="absolute right-3 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-arma border border-arma-acid/50 bg-arma-ink motion-reduce:hidden"
      >
        {paused ? (
          <Play size={17} aria-hidden="true" />
        ) : (
          <Pause size={17} aria-hidden="true" />
        )}
      </button>
    </section>
  );
}
