import { CatalogImageGate } from "../components/CatalogImageGate";
import { CollectionLoader } from "../components/CollectionLoader";
import { ShareCatalogLink } from "../components/ShareCatalogLink";
import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Link, useParams } from "react-router";
import { z } from "zod";
import { ProductGallery } from "@/features/products/components/ProductGallery";
import { useStorefront } from "../hooks/useStorefront";
import { StorefrontFeedback } from "../components/StorefrontFeedback";
import { PublicProductPrice } from "../components/PublicProductPrice";
import type { StorefrontProduct } from "../schemas/storefront.schema";

export function PublicProductPage() {
  const { id } = useParams();
  if (!z.uuid().safeParse(id).success || !id) return <MissingProduct />;
  return <PublicProductContent key={id} id={id} />;
}
function MissingProduct() {
  return (
    <section className="mx-auto max-w-3xl px-5 py-20">
      <title>Modelo no disponible · ARMA</title>
      <h1 className="font-arma-heading text-4xl">
        Este modelo ya no está disponible.
      </h1>
      <Link
        to="/coleccion/catalogo"
        className="mt-6 inline-flex min-h-11 items-center gap-2 text-sm underline underline-offset-4"
      >
        <ArrowLeft size={18} aria-hidden="true" />
        Volver al catálogo
      </Link>
    </section>
  );
}
function PublicProductContent({ id }: { id: string }) {
  const query = useStorefront(undefined, id);
  if (query.isPending)
    return (
      <div className="mx-auto max-w-6xl px-5">
        <CollectionLoader />
      </div>
    );
  if (query.isError)
    return <StorefrontFeedback error onRetry={() => void query.refetch()} />;
  const product = query.data.items[0];
  if (!product) return <MissingProduct />;
  return (
    <CatalogImageGate products={query.data.items}>
      {(products) =>
        products[0] ? (
          <ProductPresentation product={products[0]} />
        ) : (
          <MissingProduct />
        )
      }
    </CatalogImageGate>
  );
}
function ProductPresentation({ product }: { product: StorefrontProduct }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = product.variants.find((v) => v.id === selectedId);
  return (
    <div className="mx-auto max-w-[1440px] px-5 pt-6 sm:px-8 sm:pt-10 lg:px-12">
      <title>{product.name} · ARMA</title>
      <meta
        name="description"
        content={
          product.description ??
          `Explora las fotografías, tallas, colores y precios de ${product.name}.`
        }
      />
      <Link
        to="/coleccion/catalogo"
        className="mb-6 inline-flex min-h-11 items-center gap-2 text-sm underline underline-offset-4"
      >
        <ArrowLeft size={18} aria-hidden="true" />
        Catálogo completo
      </Link>
      <div className="grid items-start gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:gap-14">
        <ProductGallery name={product.name} images={product.photos} />
        <section className="min-w-0 lg:sticky lg:top-8">
          <h1 className="break-words font-arma-display text-6xl font-semibold uppercase leading-none tracking-[-0.02em] sm:text-7xl">
            {product.name}
          </h1>
          <p className="mt-5 text-2xl font-semibold text-arma-active">
            <PublicProductPrice
              variants={selected ? [selected] : product.variants}
            />
          </p>
          {product.description ? (
            <p className="mt-6 whitespace-pre-line text-base leading-7 text-arma-neutral">
              {product.description}
            </p>
          ) : null}
          <fieldset className="mt-8 border-t border-arma-text/20 pt-6">
            <legend className="pr-3 text-sm font-semibold">
              Tallas y colores
            </legend>
            <div className="mt-3 flex flex-wrap gap-3">
              {product.variants.map((variant) => (
                <button
                  key={variant.id}
                  type="button"
                  aria-pressed={selectedId === variant.id}
                  onClick={() => setSelectedId(variant.id)}
                  className={`min-h-12 rounded-arma border px-4 py-3 text-sm ${selectedId === variant.id ? "border-arma-green bg-arma-green text-white" : "border-arma-text/20 bg-white"}`}
                >
                  {variant.size} · {variant.color}
                </button>
              ))}
            </div>
          </fieldset>
          {selected?.description ? (
            <p className="mt-4 text-sm leading-6 text-arma-neutral">
              {selected.description}
            </p>
          ) : null}
          <div className="mt-5">
            <ShareCatalogLink
              title={`${product.name} · ARMA`}
              label="Compartir este modelo"
            />
          </div>
          <div className="mt-8 rounded-arma bg-arma-primary-soft p-5">
            <h2 className="text-sm font-semibold">¿Te gustó este modelo?</h2>
            <p className="mt-2 text-sm leading-6 text-arma-neutral">
              Compártelo con la persona que te envió el catálogo para confirmar
              tu talla, color y disponibilidad.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
