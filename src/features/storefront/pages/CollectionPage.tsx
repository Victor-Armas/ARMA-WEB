import { CollectionTicker } from "../components/CollectionTicker";
import { CollectionClosing } from "../components/CollectionClosing";
import { usePublicCollection } from "../hooks/usePublicCollection";
import { PublicProductCard } from "../components/PublicProductCard";
import { CollectionHero } from "../components/CollectionHero";
import { CollectionDesigns } from "../components/CollectionDesigns";
import { StorefrontFeedback } from "../components/StorefrontFeedback";
import { CollectionLoader } from "../components/CollectionLoader";
import { CatalogImageGate } from "../components/CatalogImageGate";

export function CollectionPage() {
  const query = usePublicCollection();
  return (
    <>
      <title>ARMA · No sigas el molde</title>
      <meta
        name="description"
        content="Descubre los diseños de ARMA. Playeras, fotografías, tallas, colores y precios. Encuentra tu forma de llevar ARMA."
      />
      {query.isPending ? (
        <CollectionLoader />
      ) : query.isError ? (
        <StorefrontFeedback error onRetry={() => void query.refetch()} />
      ) : !query.data.total ? (
        <StorefrontFeedback />
      ) : (
        <CatalogImageGate products={query.data.items}>
          {(products) => (
            <>
              <CollectionHero
                products={query.data.featured_ids.flatMap((id) =>
                  products.filter((p) => p.id === id),
                )}
                settings={query.data.settings}
              />
              <CollectionTicker
                products={query.data.featured_ids.flatMap((id) =>
                  products.filter((p) => p.id === id),
                )}
              />
              <CollectionDesigns
                products={query.data.featured_ids.flatMap((id) =>
                  products.filter((p) => p.id === id),
                )}
              />
              {query.data.offer_ids.length > 0 && (
                <section
                  id="ofertas"
                  className="bg-arma-paper px-5 pb-16 pt-5 text-arma-ink sm:px-8 lg:px-12"
                >
                  <div className="mx-auto mb-7 max-w-[1440px]">
                    <h2 className="max-w-full break-words font-arma-display text-5xl font-semibold uppercase">
                      {query.data.settings.offers_title}
                    </h2>
                    <p className="text-sm text-arma-neutral">
                      Precios especiales por tiempo limitado
                    </p>
                  </div>
                  <div className="mx-auto grid max-w-[1440px] gap-x-6 gap-y-9 sm:grid-cols-2 lg:grid-cols-4">
                    {query.data.offer_ids
                      .flatMap((id) => products.filter((p) => p.id === id))
                      .map((product) => (
                        <div key={product.id}>
                          <p className="mb-3 inline-block rounded-arma bg-arma-green px-3 py-2 text-xs font-semibold text-white">
                            {product.promotion?.label}
                          </p>
                          <PublicProductCard product={product} />
                        </div>
                      ))}
                  </div>
                </section>
              )}
              <CollectionClosing />
            </>
          )}
        </CatalogImageGate>
      )}
    </>
  );
}
