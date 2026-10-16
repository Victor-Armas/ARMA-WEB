import { useState } from "react";
import { ExternalLink, Plus, RefreshCw, Pencil, Tag } from "lucide-react";
import { Link } from "react-router";
import { useAppAccess } from "@/features/access/hooks/useAppAccess";
import { ProductImage } from "@/features/products/components/ProductImage";
import {
  canManageCollection,
  type CollectionOffer,
} from "../schemas/collection.schema";
import { useCollectionAdmin } from "../hooks/useCollectionAdmin";
import { FeaturedEditor } from "../components/FeaturedEditor";
import { OfferModal } from "../components/OfferModal";
import { primaryClass, secondaryClass } from "../components/CollectionFields";
function offerStatus(
  offer: CollectionOffer,
  active: boolean,
  base: number | null,
) {
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Monterrey",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  if (!active) return "Modelo oculto";
  if (!offer.is_active) return "Pausada";
  if (base === null || offer.price >= base) return "Revisar precio";
  if (offer.ends_on && offer.ends_on < today) return "Finalizada";
  if (offer.starts_on && offer.starts_on > today) return "Programada";
  return "Activa";
}
export function CollectionManagementPage() {
  const access = useAppAccess();
  const allowed = canManageCollection(access.data);
  const { query, configuration, offer } = useCollectionAdmin(allowed);
  const [tab, setTab] = useState<"cover" | "offers">("cover");
  const [editing, setEditing] = useState<CollectionOffer | null | undefined>(
    undefined,
  );
  if (access.isPending)
    return (
      <p className="p-8" role="status">
        Verificando acceso…
      </p>
    );
  if (access.isError)
    return (
      <div className="p-8" role="alert">
        No pudimos verificar tus permisos.
        <button
          className={secondaryClass}
          onClick={() => void access.refetch()}
        >
          Reintentar
        </button>
      </div>
    );
  if (!allowed)
    return (
      <section className="p-8">
        <h1 className="font-arma-heading text-3xl">Acceso restringido</h1>
        <p className="mt-3">
          Solo propietario y administrador pueden gestionar la colección.
        </p>
        <Link to="/inicio" className="mt-4 inline-block underline">
          Volver al inicio
        </Link>
      </section>
    );
  const data = query.data;
  const busy = configuration.isPending || offer.isPending;
  return (
    <section className="mx-auto max-w-[1560px] px-5 py-7 sm:px-8 sm:py-9">
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div>
          <h1 className="font-arma-heading text-4xl tracking-[-0.03em]">
            Colección pública
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-arma-muted">
            Tu escaparate, a tu manera. Elige qué modelos destacar y cuándo
            ofrecer un precio especial.
          </p>
        </div>
        <a
          href="/coleccion"
          target="_blank"
          rel="noreferrer"
          className={secondaryClass}
        >
          Ver colección
          <ExternalLink size={17} />
        </a>
      </div>
      <div className="my-7 flex items-center justify-between gap-3 border-b border-arma-border">
        <div
          role="tablist"
          aria-label="Administrar colección"
          className="flex gap-5"
        >
          {(
            [
              ["cover", "Portada"],
              ["offers", "Ofertas"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              role="tab"
              aria-selected={tab === id}
              aria-controls={`panel-${id}`}
              id={`tab-${id}`}
              onClick={() => setTab(id)}
              className={`min-h-13 border-b-2 px-1 text-sm ${tab === id ? "border-arma-green font-semibold text-arma-green" : "border-transparent text-arma-muted"}`}
            >
              {label}
            </button>
          ))}
        </div>
        <button
          type="button"
          aria-label="Actualizar colección"
          disabled={busy || query.isFetching}
          onClick={() => void query.refetch()}
          className={secondaryClass}
        >
          <RefreshCw size={16} />
          <span className="hidden sm:inline">Actualizar</span>
        </button>
      </div>
      {query.isPending ? (
        <p role="status">Cargando tu colección…</p>
      ) : query.isError ? (
        <div role="alert">
          <p>No pudimos cargar la configuración.</p>
          <button
            className={`${secondaryClass} mt-4`}
            onClick={() => void query.refetch()}
          >
            Reintentar
          </button>
        </div>
      ) : (
        data && (
          <div
            role="tabpanel"
            id={`panel-${tab}`}
            aria-labelledby={`tab-${tab}`}
          >
            {tab === "cover" ? (
              <FeaturedEditor
                key={data.settings.updated_at}
                data={data}
                busy={busy}
                onSave={(payload) =>
                  configuration.mutate({
                    payload,
                    revision: data.settings.updated_at,
                  })
                }
              />
            ) : (
              <>
                <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h2 className="font-arma-heading text-2xl">
                      Precios especiales
                    </h2>
                    <p className="mt-2 max-w-xl text-sm leading-6 text-arma-muted">
                      Se muestran en la colección, el catálogo y el detalle. Las
                      ventas registradas y los acuerdos con vendedores conservan
                      sus importes.
                    </p>
                  </div>
                  <button
                    type="button"
                    className={primaryClass}
                    onClick={() => setEditing(null)}
                  >
                    <Plus size={18} />
                    Nueva oferta
                  </button>
                </div>
                {!data.offers.length ? (
                  <div className="flex flex-col items-start gap-4 rounded-arma bg-arma-primary-soft p-7 sm:p-10">
                    <Tag size={30} strokeWidth={1.4} />
                    <h3 className="font-arma-heading text-2xl">
                      Tu próxima oferta empieza aquí
                    </h3>
                    <p className="max-w-md text-sm leading-6 text-arma-text">
                      Elige un modelo, define su precio especial y decide si
                      quieres programar una vigencia.
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-5 lg:grid-cols-2">
                    {data.offers.map((item) => {
                      const product = data.products.find(
                        (p) => p.id === item.product_id,
                      );
                      const image = product?.images[0];
                      const status = offerStatus(
                        item,
                        product?.is_active ?? false,
                        product?.base_price ?? null,
                      );
                      return (
                        <article
                          key={item.product_id}
                          className="flex min-w-0 gap-4 rounded-arma border border-arma-border bg-arma-surface p-4 sm:p-5"
                        >
                          <ProductImage
                            src={
                              image
                                ? (data.urls.get(image.storage_path)?.url ??
                                  null)
                                : null
                            }
                            alt={product?.name ?? "Producto"}
                            background={image?.background_color}
                            className="h-32 w-24 shrink-0 rounded-arma object-contain sm:h-40 sm:w-32"
                          />
                          <div className="min-w-0 flex-1">
                            <span
                              className={`inline-block rounded-arma px-2 py-1 text-xs font-semibold ${status === "Activa" ? "bg-arma-primary-soft text-arma-green" : "bg-arma-background text-arma-text"}`}
                            >
                              {status}
                            </span>
                            <h3 className="mt-2 break-words text-lg font-semibold">
                              {product?.name ?? "Modelo no disponible"}
                            </h3>
                            <p className="mt-1 text-xs text-arma-muted">
                              {item.label}
                            </p>
                            <p className="mt-3 text-xl font-semibold tabular-nums">
                              {new Intl.NumberFormat("es-MX", {
                                style: "currency",
                                currency: product?.currency ?? "MXN",
                              }).format(item.price)}
                              <span className="ml-2 text-xs font-normal text-arma-muted">
                                por pieza
                              </span>
                            </p>
                            <p className="mt-2 text-xs leading-5 text-arma-muted">
                              {item.starts_on
                                ? `Desde ${item.starts_on}`
                                : "Inicio inmediato"}{" "}
                              ·{" "}
                              {item.ends_on
                                ? `hasta ${item.ends_on}`
                                : "sin fecha de fin"}
                            </p>
                            <button
                              type="button"
                              onClick={() => setEditing(item)}
                              className={`${secondaryClass} mt-3`}
                            >
                              <Pencil size={15} />
                              Editar oferta
                            </button>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        )
      )}
      {editing !== undefined && data && (
        <OfferModal
          offer={editing}
          products={data.products}
          existing={data.offers}
          busy={busy}
          onClose={() => setEditing(undefined)}
          onSave={async (payload) => {
            try {
              await offer.mutateAsync({
                payload,
                revision: editing?.updated_at ?? null,
              });
              setEditing(undefined);
            } catch {
              /* La mutación muestra el error y conserva el formulario. */
            }
          }}
        />
      )}
    </section>
  );
}
