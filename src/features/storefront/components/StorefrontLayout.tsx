import { useEffect } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router";
import { ArrowUpRight } from "lucide-react";
import armaLogo from "@/assets/arma-logo.webp";

export function StorefrontLayout() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return (
    <div className="min-h-dvh bg-arma-paper text-arma-text [--color-arma-muted:var(--color-arma-neutral)] caret-arma-active selection:bg-arma-green selection:text-white [&_button]:touch-manipulation [&_a]:touch-manipulation [&_:focus-visible]:outline-2 [&_:focus-visible]:outline-offset-4 [&_:focus-visible]:outline-arma-active">
      <a
        href="#contenido-publico"
        className="sr-only z-50 rounded-arma bg-arma-text px-5 py-3 text-white focus:fixed focus:top-3 focus:left-3 focus:not-sr-only"
      >
        Ir al contenido
      </a>
      <header className="relative z-30 border-b border-white/15 bg-arma-ink px-5 text-white sm:px-8 lg:px-12">
        <div className="mx-auto flex min-h-18 max-w-[1440px] items-center justify-between gap-3 sm:min-h-20">
          <Link
            to="/coleccion"
            aria-label="ARMA · Inicio de la colección"
            className="shrink-0"
          >
            <img
              src={armaLogo}
              alt="ARMA"
              width={118}
              height={42}
              className="h-auto w-20 brightness-0 invert min-[380px]:w-24 sm:w-32"
            />
          </Link>
          <nav
            aria-label="Catálogo público"
            className="flex items-center gap-3 text-xs min-[380px]:text-sm sm:gap-8"
          >
            <NavLink
              end
              to="/coleccion"
              className={({ isActive }) =>
                `inline-flex min-h-11 items-center border-b ${isActive ? "border-arma-acid font-semibold text-arma-acid" : "border-transparent text-white"}`
              }
            >
              Inicio
            </NavLink>
            <NavLink
              to="/coleccion/catalogo"
              className={({ isActive }) =>
                `inline-flex min-h-11 items-center gap-2 border-b ${isActive ? "border-arma-acid font-semibold text-arma-acid" : "border-transparent"}`
              }
            >
              Catálogo completo
              <ArrowUpRight
                size={16}
                aria-hidden="true"
                className="hidden sm:block"
              />
            </NavLink>
          </nav>
        </div>
      </header>
      <main id="contenido-publico" tabIndex={-1}>
        <Outlet />
      </main>
      <footer className="bg-arma-ink px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-10 text-white sm:px-8 lg:px-12">
        <div className="mx-auto max-w-[1440px]">
          <div className="flex flex-wrap items-center justify-between gap-6 pb-8">
            <img
              src={armaLogo}
              alt="ARMA"
              width={140}
              height={50}
              className="w-32 brightness-0 invert sm:w-40"
            />
            <Link
              to="/coleccion/catalogo"
              className="inline-flex min-h-11 items-center gap-5 text-sm font-semibold text-arma-acid"
            >
              Explorar la colección
              <ArrowUpRight size={20} aria-hidden="true" />
            </Link>
          </div>
          <div className="flex flex-wrap items-start justify-between gap-x-8 gap-y-4 border-t border-white/20 py-6">
            <p className="max-w-lg text-xs leading-6 text-white">
              Catálogo totalmente informativo. Sin compras ni pagos en línea.
              <br />
              Confirma precio y disponibilidad con quien te compartió este
              enlace.
            </p>
            <p className="text-xs leading-6 text-white">
              © {new Date().getFullYear()} ARMA
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
