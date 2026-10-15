import { Route, Routes, useLocation } from "react-router";
import { LegalPage } from "@/features/legal/pages/LegalPage";
import { useAuthSession } from "@/features/auth/hooks/useAuthSession";
import { AccountGate } from "@/features/auth/components/AccountGate";
import { AppRoutes } from "./routes/AppRoutes";

export function App() {
  const { session, isLoading } = useAuthSession();

  const location = useLocation();
  if (location.pathname.startsWith("/legal/")) {
    return (
      <Routes>
        <Route path="/legal/:document" element={<LegalPage />} />
      </Routes>
    );
  }

  if (isLoading) {
    return (
      <main className="flex min-h-dvh items-center justify-center">
        <p role="status" className="text-arma-muted">
          Comprobando sesión…
        </p>
      </main>
    );
  }

  return (
    <AccountGate>
      <AppRoutes isAuthenticated={Boolean(session)} />
    </AccountGate>
  );
}
