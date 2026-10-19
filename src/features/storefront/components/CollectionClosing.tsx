import { m, useReducedMotion } from "motion/react";
import { Link } from "react-router";
import { ArrowUpRight } from "lucide-react";
export function CollectionClosing() {
  const reduce = useReducedMotion();
  return (
    <section className="overflow-hidden bg-arma-coral px-5 py-14 text-[color:var(--collection-on-coral)] sm:px-8 sm:py-20 lg:px-12">
      <div className="mx-auto max-w-[1440px]">
        <m.h2
          initial={{ transform: reduce ? "none" : "translateY(24px)" }}
          whileInView={{ transform: "translateY(0px)" }}
          viewport={{ once: true }}
          transition={{ duration: reduce ? 0 : 0.65, ease: [0.23, 1, 0.32, 1] }}
          className="max-w-4xl font-arma-display text-[clamp(3.5rem,8vw,7rem)] font-semibold uppercase leading-[0.9] tracking-[-0.025em]"
        >
          El siguiente
          <br />
          lo eliges tú.
        </m.h2>
        <div className="mt-7 flex flex-wrap items-center gap-x-12 gap-y-6">
          <p className="max-w-sm text-sm leading-6 sm:text-base">
            Todos los diseños, todas sus fotos.
            <br />
            Tu próxima playera está en el catálogo.
          </p>
          <Link
            to="/coleccion/catalogo"
            className="group inline-flex min-h-14 items-center justify-between gap-12 rounded-arma bg-arma-ink px-6 py-4 text-sm font-semibold text-[color:var(--collection-on-ink)]"
          >
            Catálogo completo
            <ArrowUpRight
              size={25}
              aria-hidden="true"
              className="transition-transform duration-200 ease-arma-out group-hover:-translate-y-1 group-hover:translate-x-1 motion-reduce:transform-none"
            />
          </Link>
        </div>
      </div>
    </section>
  );
}
