import { m, useReducedMotion } from "motion/react";
import { Link } from "react-router";
import { ArrowUpRight } from "lucide-react";
import { ProductImage } from "@/features/products/components/ProductImage";
import type { StorefrontProduct } from "../schemas/storefront.schema";
import { publicSizes } from "../utils/storefront-format";
import { PublicProductPrice } from "./PublicProductPrice";
import { collectionTones } from "../utils/collection-theme";
export function CollectionDesigns({
  products,
}: {
  products: StorefrontProduct[];
}) {
  const reduce = useReducedMotion();
  return (
    <section
      id="disenos"
      aria-labelledby="disenos-titulo"
      className="scroll-mt-8 bg-arma-paper px-5 py-14 text-arma-ink sm:px-8 sm:py-20 lg:px-12"
    >
      <div className="mx-auto max-w-[1440px]">
        <div className="mb-8 max-w-3xl sm:mb-12">
          <h2
            id="disenos-titulo"
            className="font-arma-display text-[clamp(3.5rem,7vw,6rem)] font-semibold uppercase leading-[0.9] tracking-[-0.025em]"
          >
            Encuentra
            <br />
            tu forma.
          </h2>
          <p className="mt-5 max-w-md text-sm leading-6 text-arma-neutral sm:text-base">
            Mira el diseño. Acércate a los detalles. Elige el que se siente más
            tuyo.
          </p>
        </div>
        <div className="grid gap-5 md:grid-cols-12 lg:gap-7">
          {products.slice(0, 4).map((product, index) => {
            const tone = collectionTones[index % collectionTones.length],
              photo = product.photos[0];
            return (
              <m.article
                key={product.id}
                initial={{
                  opacity: 1,
                  transform: reduce ? "none" : "translateY(35px)",
                }}
                whileInView={{ transform: "translateY(0px)" }}
                viewport={{ once: true, amount: 0.15 }}
                transition={{
                  duration: reduce ? 0 : 0.65,
                  ease: [0.23, 1, 0.32, 1],
                }}
                className={`min-w-0 overflow-hidden rounded-arma ${tone.surface} ${index === 0 || index === 3 ? "md:col-span-7" : "md:col-span-5"}`}
              >
                <Link
                  to={`/coleccion/producto/${product.id}`}
                  aria-label={`Ver ${product.name}`}
                  className="group flex h-full flex-col p-4 sm:p-6 lg:p-7"
                >
                  <div className="mb-5 flex min-w-0 items-start justify-between gap-4">
                    <h3 className="min-w-0 break-words font-arma-display text-[clamp(2.6rem,5vw,4.3rem)] font-semibold uppercase leading-[0.95] tracking-[-0.02em]">
                      {product.name.replace(/^ARMA\s+/i, "")}
                    </h3>
                    <ArrowUpRight
                      size={30}
                      strokeWidth={1.5}
                      aria-hidden="true"
                      className="mt-1 shrink-0 transition-transform duration-300 ease-arma-out group-hover:-translate-y-1 group-hover:translate-x-1 motion-reduce:transform-none"
                    />
                  </div>
                  <div className="relative overflow-hidden rounded-arma bg-white">
                    <ProductImage
                      src={photo?.url ?? null}
                      alt={photo?.alt ?? product.name}
                      background={photo?.background}
                      width={800}
                      height={1000}
                      className="aspect-[4/4.3] w-full object-cover transition-transform duration-500 ease-arma-out group-hover:scale-[1.04] motion-reduce:transform-none"
                    />
                  </div>
                  <div className="mt-auto flex flex-wrap items-end justify-between gap-4 pt-5">
                    <div>
                      <p className="text-sm font-semibold">
                        <PublicProductPrice variants={product.variants} />
                      </p>
                      <p className="mt-2 text-xs leading-5">
                        Tallas {publicSizes(product.variants).join(" / ")}
                      </p>
                    </div>
                    <span
                      className={`inline-flex min-h-11 items-center gap-3 rounded-arma px-4 py-3 text-xs font-semibold ${tone.button}`}
                    >
                      Ver diseño
                      <ArrowUpRight size={17} aria-hidden="true" />
                    </span>
                  </div>
                </Link>
              </m.article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
