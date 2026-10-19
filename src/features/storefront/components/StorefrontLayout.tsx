import { useEffect, type ReactNode } from "react";
import { usePublicAppearance } from "@/features/collection-appearance/hooks/usePublicAppearance";
import {
  DEFAULT_APPEARANCE,
  type CollectionAppearance,
} from "@/features/collection-appearance/schemas/appearance.schema";
import { appearanceStyle } from "@/features/collection-appearance/utils/appearance";
import { SeasonalDecoration } from "@/features/collection-appearance/components/SeasonalDecoration";
import { Link, NavLink, Outlet, useLocation } from "react-router";
import { ArrowUpRight } from "lucide-react";
import { CollectionLogo } from "@/features/collection-appearance/components/CollectionLogo";

export function StorefrontLayout() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  const theme = usePublicAppearance();
  return (
    <StorefrontFrame
      appearance={theme.data?.appearance ?? DEFAULT_APPEARANCE}
      artworkUrl={theme.data?.artworkUrl ?? null}
      backgroundUrl={theme.data?.backgroundUrl ?? null}
      logoUrl={theme.data?.logoUrl ?? null}
    >
      <Outlet />
    </StorefrontFrame>
  );
}
export function StorefrontFrame({
  appearance,
  artworkUrl,
  backgroundUrl = null,
  logoUrl = null,
  children,
}: {
  appearance: CollectionAppearance;
  artworkUrl: string | null;
  backgroundUrl?: string | null;
  logoUrl?: string | null;
  children: ReactNode;
}) {
  return (
    <div
      style={appearanceStyle(appearance, backgroundUrl)}
      className="min-h-dvh bg-arma-paper text-arma-text [--color-arma-muted:var(--color-arma-neutral)] caret-arma-active selection:bg-arma-green selection:text-white [&_button]:touch-manipulation [&_a]:touch-manipulation [&_:focus-visible]:outline-2 [&_:focus-visible]:outline-offset-4 [&_:focus-visible]:outline-arma-active"
    >
      <a
        href="#contenido-publico"
        className="sr-only z-50 rounded-arma bg-arma-text px-5 py-3 text-white focus:fixed focus:top-3 focus:left-3 focus:not-sr-only"
      >
        Ir al contenido
      </a>
      <header className="relative z-30 border-b border-white/15 bg-arma-ink px-5 text-[color:var(--collection-on-ink)] sm:px-8 lg:px-12">
        <div className="mx-auto flex min-h-18 max-w-[1440px] items-center justify-between gap-3 sm:min-h-20">
          <Link
            to="/coleccion"
            aria-label="ARMA · Inicio de la colección"
            className="shrink-0"
          >
            <CollectionLogo url={logoUrl} />
          </Link>
          <nav
            aria-label="Catálogo público"
            className="flex items-center gap-3 text-xs min-[380px]:text-sm sm:gap-8"
          >
            <NavLink
              end
              to="/coleccion"
              className={({ isActive }) =>
                `inline-flex min-h-11 items-center border-b ${isActive ? "border-arma-acid font-semibold text-[color:var(--collection-accent-on-ink)]" : "border-transparent text-[color:var(--collection-on-ink)]"}`
              }
            >
              Inicio
            </NavLink>
            <NavLink
              to="/coleccion/catalogo"
              className={({ isActive }) =>
                `inline-flex min-h-11 items-center gap-2 border-b ${isActive ? "border-arma-acid font-semibold text-[color:var(--collection-accent-on-ink)]" : "border-transparent"}`
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
        {appearance.artwork_position !== "bottom" && (
          <SeasonalDecoration appearance={appearance} artworkUrl={artworkUrl} />
        )}
        {children}
        {appearance.artwork_position !== "top" && (
          <SeasonalDecoration appearance={appearance} artworkUrl={artworkUrl} />
        )}
      </main>
      <footer className="bg-arma-ink px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-10 text-[color:var(--collection-on-ink)] sm:px-8 lg:px-12">
        <div className="mx-auto max-w-[1440px]">
          <div className="flex flex-wrap items-center justify-between gap-6 pb-8">
            <CollectionLogo url={logoUrl} footer />
            <Link
              to="/coleccion/catalogo"
              className="inline-flex min-h-11 items-center gap-5 text-sm font-semibold text-[color:var(--collection-accent-on-ink)]"
            >
              Explorar la colección
              <ArrowUpRight size={20} aria-hidden="true" />
            </Link>
          </div>
          <div className="flex flex-wrap items-start justify-between gap-x-8 gap-y-4 border-t border-white/20 py-6">
            <p className="max-w-lg text-xs leading-6 text-[color:var(--collection-on-ink)]">
              Catálogo totalmente informativo. Sin compras ni pagos en línea.
              <br />
              Confirma precio y disponibilidad con quien te compartió este
              enlace.
            </p>
            <p className="text-xs leading-6 text-[color:var(--collection-on-ink)]">
              © {new Date().getFullYear()} ARMA
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
