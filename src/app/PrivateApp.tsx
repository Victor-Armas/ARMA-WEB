import { useAuthSession } from "@/features/auth/hooks/useAuthSession";
import { AccountGate } from "@/features/auth/components/AccountGate";
import { AppRoutes } from "./routes/AppRoutes";
export default function PrivateApp() {
  const { session, isLoading } = useAuthSession();
  if (isLoading)
    return (
      <main className="flex min-h-dvh items-center justify-center">
        <p role="status" className="text-arma-neutral">
          Comprobando sesión…
        </p>
      </main>
    );
  return (
    <AccountGate>
      <AppRoutes isAuthenticated={Boolean(session)} />
    </AccountGate>
  );
}
