import { LegalLinks } from "@/features/legal/components/LegalLinks";
import { useAccessSync } from "@/features/access/hooks/useAccessSync";
import { Outlet } from "react-router";
import background from "@/assets/login-background.png";
import { AppHeader } from "@/components/layout/AppHeader";
import { AppSidebar } from "@/components/layout/AppSidebar";

export function AppLayout() {
  useAccessSync();
  return (
    <div className="relative isolate min-h-dvh bg-arma-background pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] desktop:grid desktop:grid-cols-[240px_minmax(0,1fr)] desktop:grid-rows-[auto_1fr] desktop:items-start">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10"
      >
        <img
          src={background}
          alt=""
          className="absolute inset-0 h-full w-full object-cover object-top"
        />
        <div className="absolute inset-0 bg-linear-to-b from-arma-photo-top via-arma-photo-middle via-55% to-arma-photo-bottom" />
      </div>
      <a
        href="#main-content"
        className="fixed top-4 left-4 z-30 -translate-y-[200%] rounded-arma bg-arma-surface px-4 py-3 text-arma-text outline-offset-4 focus:translate-y-0 focus-visible:outline-2 focus-visible:outline-arma-active"
      >
        Ir al contenido
      </a>
      <AppSidebar />
      <AppHeader />
      <main
        id="main-content"
        tabIndex={-1}
        className="min-w-0 pb-28 focus:outline-none desktop:col-start-2 desktop:row-start-2 desktop:pb-8"
      >
        <Outlet />
        <footer className="mx-5 mt-8 border-t border-arma-border pt-4 sm:mx-8">
          <LegalLinks />
        </footer>
      </main>
    </div>
  );
}
