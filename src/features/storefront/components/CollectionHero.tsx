import { useRef, useState } from "react";
import {
  AnimatePresence,
  m,
  useReducedMotion,
  useScroll,
  useTransform,
} from "motion/react";
import { ArrowUpRight, ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "react-router";
import { CollectionSlide } from "./CollectionSlide";
import { ProductImage } from "@/features/products/components/ProductImage";
import type { StorefrontProduct } from "../schemas/storefront.schema";
import { PublicProductPrice } from "./PublicProductPrice";
const ease: [number, number, number, number] = [0.23, 1, 0.32, 1];
export function CollectionHero({
  products,
  settings,
}: {
  products: StorefrontProduct[];
  settings: {
    headline_1: string;
    headline_2: string;
    headline_3: string;
    intro: string;
  };
}) {
  const [index, setIndex] = useState(0),
    [direction, setDirection] = useState(1),
    [animateChange, setAnimateChange] = useState(true);
  const reduce = useReducedMotion();
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  const posterTransform = useTransform(
    scrollYProgress,
    [0, 1],
    ["translateY(0px) rotate(3deg)", "translateY(32px) rotate(-2deg)"],
  );
  const selection = products.slice(0, 4),
    active = index < selection.length ? index : 0,
    product = selection[active],
    next = selection[(active + 1) % selection.length];
  if (!product) return null;
  function select(value: number, animate = true) {
    setDirection(value > active ? 1 : -1);
    setAnimateChange(animate);
    setIndex((value + selection.length) % selection.length);
  }
  return (
    <section
      ref={ref}
      aria-label="Descubre ARMA"
      className="relative isolate overflow-hidden bg-arma-electric text-white"
    >
      <div className="mx-auto grid max-w-[1600px] gap-8 px-5 pb-8 pt-9 sm:px-8 sm:pt-12 lg:min-h-[min(780px,calc(100dvh-80px))] lg:grid-cols-[0.95fr_1.05fr] lg:items-center lg:gap-10 lg:px-12 lg:py-12">
        <div className="relative z-10 min-w-0 lg:py-5">
          <m.h1
            initial={{
              opacity: 0,
              transform: reduce ? "none" : "translateY(24px)",
            }}
            animate={{ opacity: 1, transform: "translateY(0px)" }}
            transition={{ duration: reduce ? 0.15 : 0.65, ease }}
            className="break-words font-arma-display text-[clamp(3.8rem,7.8vw,7.5rem)] font-semibold uppercase leading-[0.87] tracking-[-0.025em]"
          >
            <span className="block">{settings.headline_1}</span>
            <span className="block">{settings.headline_2}</span>
            <span className="mt-2 block text-arma-acid">
              {settings.headline_3}
            </span>
          </m.h1>
          <m.div
            initial={{
              opacity: 0,
              transform: reduce ? "none" : "translateY(18px)",
            }}
            animate={{ opacity: 1, transform: "translateY(0px)" }}
            transition={{
              duration: reduce ? 0.15 : 0.6,
              delay: reduce ? 0 : 0.12,
              ease,
            }}
          >
            <p className="mt-6 max-w-sm whitespace-pre-line break-words text-sm leading-6 text-white sm:text-base">
              {settings.intro}
            </p>
            <Link
              to="/coleccion/catalogo"
              className="group mt-6 inline-flex min-h-13 items-center justify-between gap-10 rounded-arma bg-arma-acid px-5 py-4 text-sm font-semibold text-arma-ink transition-transform duration-150 ease-arma-out active:scale-[0.98] motion-reduce:transform-none"
            >
              Explorar catálogo
              <ArrowUpRight
                size={23}
                aria-hidden="true"
                className="transition-transform duration-200 ease-arma-out group-hover:-translate-y-1 group-hover:translate-x-1 motion-reduce:transform-none"
              />
            </Link>
          </m.div>
        </div>
        <div className="relative min-w-0 pb-2 pt-3 sm:px-6 lg:mx-auto lg:w-full lg:max-w-[540px] lg:py-5 lg:pl-10 lg:pr-5">
          <div
            aria-hidden="true"
            className="absolute inset-x-5 bottom-6 top-6 rotate-[-5deg] rounded-arma bg-arma-acid sm:inset-x-10 lg:inset-x-12"
          />
          <m.div
            style={{ transform: reduce ? "none" : posterTransform }}
            className="relative rounded-arma bg-white p-2 text-arma-ink shadow-[0_18px_35px_rgb(0_0_0/18%)] sm:p-3 lg:mx-auto lg:max-w-[440px]"
          >
            <div className="relative aspect-[4/4.35] overflow-hidden rounded-arma bg-white sm:aspect-[5/4.7] lg:aspect-[4/4.3]">
              <AnimatePresence initial={false} mode="sync" custom={direction}>
                <CollectionSlide
                  key={product.id}
                  product={product}
                  direction={direction}
                  reduce={Boolean(reduce)}
                  duration={reduce ? 0.15 : animateChange ? 0.5 : 0}
                  canDrag={selection.length > 1}
                  onMove={(offset) => select(active + offset)}
                />
              </AnimatePresence>
            </div>
            <div className="flex min-w-0 items-center justify-between gap-3 px-2 pb-2 pt-4 sm:px-3">
              <div className="min-w-0" aria-live="polite" aria-atomic="true">
                <p className="break-words font-arma-display text-2xl font-semibold uppercase leading-none sm:text-3xl">
                  {product.name}
                </p>
                <p className="mt-2 text-xs font-semibold sm:text-sm">
                  <PublicProductPrice variants={product.variants} />
                </p>
              </div>
              <div className="flex shrink-0 gap-1">
                <button
                  type="button"
                  disabled={selection.length < 2}
                  onClick={(e) => select(active - 1, e.detail > 0)}
                  aria-label="Modelo anterior"
                  className="flex size-11 items-center justify-center rounded-arma border border-black/20 hover:bg-arma-acid disabled:opacity-40"
                >
                  <ChevronLeft size={21} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  disabled={selection.length < 2}
                  onClick={(e) => select(active + 1, e.detail > 0)}
                  aria-label="Modelo siguiente"
                  className="flex size-11 items-center justify-center rounded-arma border border-black/20 hover:bg-arma-acid disabled:opacity-40"
                >
                  <ChevronRight size={21} aria-hidden="true" />
                </button>
              </div>
            </div>
          </m.div>
          {next && next.id !== product.id && (
            <Link
              to={`/coleccion/producto/${next.id}`}
              aria-label={`Ver también ${next.name}`}
              className="absolute -left-3 bottom-28 z-10 hidden w-[27%] rotate-[-9deg] rounded-arma bg-arma-coral p-2 shadow-[0_12px_24px_rgb(0_0_0/18%)] transition-transform duration-300 ease-arma-out hover:rotate-0 lg:block"
            >
              <ProductImage
                src={next.photos[0]?.url ?? null}
                alt={next.photos[0]?.alt ?? next.name}
                background={next.photos[0]?.background}
                className="aspect-[4/5] w-full rounded-arma object-cover"
              />
              <span className="flex items-center justify-between gap-2 px-1 pb-1 pt-2 text-xs font-semibold text-arma-ink">
                {next.name.replace(/^ARMA\s+/i, "")}
                <ArrowUpRight size={15} aria-hidden="true" />
              </span>
            </Link>
          )}
        </div>
      </div>
      <div className="relative mt-4 border-t border-white/25 px-5 sm:px-8 lg:mt-0 lg:px-12">
        <div
          className="mx-auto grid max-w-[1504px] grid-cols-2 gap-x-5 lg:grid-cols-4"
          aria-label="Elegir un diseño"
        >
          {selection.map((item, i) => (
            <button
              key={item.id}
              type="button"
              aria-pressed={i === active}
              onClick={(e) => select(i, e.detail > 0)}
              className={`group flex min-h-19 min-w-0 items-center justify-between gap-3 border-b-2 py-4 text-left transition-colors ${i === active ? "border-arma-acid text-arma-acid" : "border-transparent text-white hover:text-arma-acid"}`}
            >
              <span className="truncate font-arma-display text-2xl font-semibold uppercase tracking-wide sm:text-3xl">
                {item.name.replace(/^ARMA\s+/i, "")}
              </span>
              <ArrowUpRight
                size={21}
                aria-hidden="true"
                className="shrink-0 transition-transform duration-200 ease-arma-out group-hover:-translate-y-0.5 group-hover:translate-x-0.5 motion-reduce:transform-none"
              />
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
