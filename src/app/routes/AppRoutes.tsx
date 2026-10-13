import { Link, Navigate, Route, Routes } from 'react-router';
import { LoginPage } from '@/features/auth/pages/LoginPage';
import { HomePage } from '@/features/home/pages/HomePage';
import { AppLayout } from '@/layouts/AppLayout';

interface AppRoutesProps {
  isAuthenticated: boolean;
}

export function AppRoutes({ isAuthenticated }: AppRoutesProps) {
  return (
    <Routes>
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />}
      />
      <Route
        element={isAuthenticated ? <AppLayout /> : <Navigate to="/login" replace />}
      >
        <Route index element={<HomePage />} />
        <Route
          path="*"
          element={
            <section className="px-5 py-10 sm:px-8">
              <h1 className="font-arma-heading font-normal tracking-[-0.035em] text-4xl">Página no encontrada</h1>
              <Link to="/" className="mt-5 inline-block underline underline-offset-4">
                Volver al Inicio
              </Link>
            </section>
          }
        />
      </Route>
    </Routes>
  );
}
