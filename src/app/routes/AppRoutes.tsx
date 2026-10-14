import { Link, Navigate, Route, Routes } from 'react-router';
import { LoginPage } from '@/features/auth/pages/LoginPage';
import { HomePage } from '@/features/home/pages/HomePage';
import { AppLayout } from '@/layouts/AppLayout';
import { ProductsPage } from '@/features/products/pages/ProductsPage';
import { CommercePage } from '@/features/commerce/pages/CommercePage';
import { ProductDetailPage } from '@/features/products/pages/ProductDetailPage';

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
        <Route path="products" element={<ProductsPage />} />
        <Route path="products/:productId" element={<ProductDetailPage />} />
        <Route path="sales" element={<CommercePage key="sales" kind="sale" />} />
        <Route path="reservations" element={<CommercePage key="reservations" kind="reservation" />} />
        <Route path="stock" element={<Navigate to="/products" replace />} />



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
