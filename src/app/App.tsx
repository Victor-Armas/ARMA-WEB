import { useAuthSession } from '@/features/auth/hooks/useAuthSession';
import { AppRoutes } from './routes/AppRoutes';

export function App() {
  const { session, isLoading } = useAuthSession();

  if (isLoading) {
    return (
      <main className="flex min-h-dvh items-center justify-center">
        <p role="status" className="text-arma-muted">
          Comprobando sesión…
        </p>
      </main>
    );
  }

  return <AppRoutes isAuthenticated={Boolean(session)} />;
}
