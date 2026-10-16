import "@fontsource/barlow-condensed/latin-600.css";
import { LazyMotion, domAnimation, MotionConfig } from "motion/react";
import { Navigate, Route, Routes } from "react-router";
import { StorefrontLayout } from "./components/StorefrontLayout";
import { CollectionPage } from "./pages/CollectionPage";
import { PublicCatalogPage } from "./pages/PublicCatalogPage";
import { PublicProductPage } from "./pages/PublicProductPage";

export default function StorefrontRoutes() {
  return (
    <LazyMotion features={domAnimation} strict>
      <MotionConfig reducedMotion="user">
        <Routes>
          <Route path="/coleccion" element={<StorefrontLayout />}>
            <Route index element={<CollectionPage />} />
            <Route path="catalogo" element={<PublicCatalogPage />} />
            <Route path="producto/:id" element={<PublicProductPage />} />
            <Route
              path="*"
              element={<Navigate to="/coleccion/catalogo" replace />}
            />
          </Route>
        </Routes>
      </MotionConfig>
    </LazyMotion>
  );
}
