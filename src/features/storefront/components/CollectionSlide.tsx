import { useSwipeNavigation } from "../hooks/useSwipeNavigation";
import { m, useIsPresent } from "motion/react";
import { Link } from "react-router";
import { ProductImage } from "@/features/products/components/ProductImage";
import type { StorefrontProduct } from "../schemas/storefront.schema";
const ease: [number, number, number, number] = [0.23, 1, 0.32, 1];
export function CollectionSlide({
  product,
  direction,
  reduce,
  duration,
  canDrag,
  onMove,
}: {
  product: StorefrontProduct;
  direction: number;
  reduce: boolean;
  duration: number;
  canDrag: boolean;
  onMove: (offset: number) => void;
}) {
  const isPresent = useIsPresent();
  const swipe = useSwipeNavigation(canDrag && isPresent, onMove);
  const photo = product.photos[0];
  return (
    <m.div
      initial={{
        opacity: 0,
        transform: reduce
          ? "none"
          : `translateX(${direction * 6}%) scale(0.98)`,
      }}
      animate={{ opacity: 1, transform: "translateX(0%) scale(1)" }}
      exit={{
        opacity: 0,
        transition: { duration: reduce ? 0.1 : 0.18 },
      }}
      transition={{ duration, ease }}
      {...swipe}
      aria-hidden={!isPresent}
      style={{
        touchAction: "pan-y",
        pointerEvents: isPresent ? "auto" : "none",
      }}
      className="absolute inset-0 cursor-grab active:cursor-grabbing"
    >
      <Link
        to={`/coleccion/producto/${product.id}`}
        aria-label={`Descubrir ${product.name}`}
        draggable={false}
        className="block h-full w-full"
      >
        <ProductImage
          draggable={false}
          src={photo?.url ?? null}
          background={photo?.background}
          alt={photo?.alt ?? product.name}
          loading="eager"
          fetchPriority="high"
          width={800}
          height={1000}
          className="h-full w-full select-none object-contain [-webkit-user-drag:none]"
        />
      </Link>
    </m.div>
  );
}
