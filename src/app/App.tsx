import { CollectionLoader } from "@/features/storefront/components/CollectionLoader";
import { lazy, Suspense } from "react";
import { Route, Routes, useLocation } from "react-router";
import { LegalPage } from "@/features/legal/pages/LegalPage";
const PrivateApp = lazy(() => import("./PrivateApp"));
const StorefrontRoutes = lazy(
  () => import("@/features/storefront/StorefrontRoutes"),
);

export function App() {
  const { pathname } = useLocation();
  if (pathname.startsWith("/legal/"))
    return (
      <Routes>
        <Route path="/legal/:document" element={<LegalPage />} />
      </Routes>
    );
  const isCollection =
    pathname === "/coleccion" || pathname.startsWith("/coleccion/");
  return (
    <Suspense
      fallback={
        isCollection ? (
          <CollectionLoader />
        ) : (
          <main className="flex min-h-dvh items-center justify-center">
            <p role="status" className="text-arma-neutral">
              Abriendo ARMA…
            </p>
          </main>
        )
      }
    >
      {isCollection ? <StorefrontRoutes /> : <PrivateApp />}
    </Suspense>
  );
}
