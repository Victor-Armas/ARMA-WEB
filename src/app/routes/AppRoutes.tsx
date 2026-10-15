import { SellersPage } from "@/features/sellers/pages/SellersPage";
import { RecipesPage } from "@/features/operations/pages/RecipesPage";
import { ProductionPage } from "@/features/operations/pages/ProductionPage";
import { MaterialEntriesPage } from "@/features/operations/pages/MaterialEntriesPage";
import { CatalogManagementPage } from "@/features/catalog/pages/CatalogManagementPage";
import { PermissionGate } from "@/features/access/components/PermissionGate";
import { TeamPage } from "@/features/access/pages/TeamPage";
import { MaterialsPage } from "@/features/materials/pages/MaterialsPage";
import { Link, Navigate, Route, Routes } from "react-router";
import { LoginPage } from "@/features/auth/pages/LoginPage";
import { HomePage } from "@/features/home/pages/HomePage";
import { AppLayout } from "@/layouts/AppLayout";
import { ProductsPage } from "@/features/products/pages/ProductsPage";
import { ReservationsPage } from "@/features/commerce/pages/ReservationsPage";
import { CommercePage } from "@/features/commerce/pages/CommercePage";
import { ProductDetailPage } from "@/features/products/pages/ProductDetailPage";

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
        element={
          isAuthenticated ? <AppLayout /> : <Navigate to="/login" replace />
        }
      >
        <Route index element={<HomePage />} />
        <Route
          path="sellers"
          element={
            <PermissionGate permission="consignments.read">
              <SellersPage />
            </PermissionGate>
          }
        />
        <Route
          path="products"
          element={
            <PermissionGate permission="products.read">
              <ProductsPage />
            </PermissionGate>
          }
        />
        <Route
          path="products/:productId"
          element={
            <PermissionGate permission="products.read">
              <ProductDetailPage />
            </PermissionGate>
          }
        />
        <Route
          path="sales"
          element={
            <PermissionGate permission="sales.read">
              <CommercePage key="sales" kind="sale" />
            </PermissionGate>
          }
        />
        <Route
          path="reservations"
          element={
            <PermissionGate permission="reservations.read">
              <ReservationsPage />
            </PermissionGate>
          }
        />
        <Route
          path="materials"
          element={
            <PermissionGate permission="materials.read">
              <MaterialsPage />
            </PermissionGate>
          }
        />
        <Route
          path="product-management"
          element={
            <PermissionGate permission="products.manage">
              <CatalogManagementPage kind="product" />
            </PermissionGate>
          }
        />
        <Route
          path="team"
          element={
            <PermissionGate permission="team.read">
              <TeamPage />
            </PermissionGate>
          }
        />
        <Route
          path="recipes"
          element={
            <PermissionGate permission="production.read">
              <RecipesPage />
            </PermissionGate>
          }
        />
        <Route
          path="production"
          element={
            <PermissionGate permission="production.read">
              <ProductionPage />
            </PermissionGate>
          }
        />
        <Route
          path="materials/entries"
          element={
            <PermissionGate permission="materials.read">
              <MaterialEntriesPage />
            </PermissionGate>
          }
        />
        <Route path="stock" element={<Navigate to="/products" replace />} />

        <Route
          path="*"
          element={
            <section className="px-5 py-10 sm:px-8">
              <h1 className="font-arma-heading font-normal tracking-[-0.035em] text-4xl">
                Página no encontrada
              </h1>
              <Link
                to="/"
                className="mt-5 inline-block underline underline-offset-4"
              >
                Volver al Inicio
              </Link>
            </section>
          }
        />
      </Route>
    </Routes>
  );
}
