import { useState } from "react";
import {
  Camera,
  Calculator,
  EyeOff,
  Eye,
  Pencil,
  Package,
  Layers,
} from "lucide-react";
import { ProductImage } from "@/features/products/components/ProductImage";
import type { ProductImageData } from "@/features/products/types/product-detail.types";
import {
  secondaryButton,
  formatMoney,
} from "@/features/commerce/utils/commerce-format";
import { MaterialCostsModal } from "@/features/operations/components/MaterialCostsModal";
import type { CatalogItem } from "../schemas/catalog.schema";
import { CatalogPhotosModal } from "./CatalogPhotosModal";
export function CatalogRecord({
  item,
  gallery,
  canEdit,
  canHide,
  canPhoto,
  onEdit,
  onVisibility,
}: {
  item: CatalogItem;
  gallery: ProductImageData[];
  canEdit: boolean;
  canHide: boolean;
  canPhoto: boolean;
  onEdit: () => void;
  onVisibility: () => void;
}) {
  const [photos, setPhotos] = useState(false);
  const [costs, setCosts] = useState(false);
  const material = item.kind === "material";
  const available = item.variants.reduce((s, v) => s + v.available, 0);
  const cover = gallery[0];
  const knownCosts = item.variants.flatMap((v) =>
    v.estimated_cost == null ? [] : [v.estimated_cost],
  );
  const variants = (
    <div className="divide-y divide-arma-border">
      {item.variants.map((v) => (
        <div key={v.id} className="py-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="break-words text-sm font-semibold">
                {[
                  v.color,
                  v.size,
                  v.width_cm && v.height_cm
                    ? `${v.width_cm} × ${v.height_cm} cm`
                    : null,
                ]
                  .filter(Boolean)
                  .join(" · ") || "Variante estándar"}
              </p>
              <p className="mt-1 break-all text-xs text-arma-muted">{v.sku}</p>
            </div>
            <span
              className={`shrink-0 rounded-arma px-2 py-1 text-sm font-semibold tabular-nums ${v.available <= 3 ? "bg-arma-red-soft text-arma-red" : v.available <= 5 ? "bg-arma-warning-soft text-arma-warning" : "bg-arma-green-soft text-arma-green"}`}
            >
              {v.available}
            </span>
          </div>
          {v.description ? (
            <p className="mt-2 break-words text-xs leading-5 text-arma-muted">
              {v.description}
            </p>
          ) : null}
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-arma-muted tabular-nums">
            {material ? (
              <>
                <span>
                  {v.physical} físicas · {v.reserved} reservadas
                </span>
                <span>
                  Costo de referencia:{" "}
                  <strong className="font-medium text-arma-text">
                    {v.estimated_cost == null
                      ? "sin registrar"
                      : formatMoney(v.estimated_cost)}
                  </strong>
                </span>
              </>
            ) : v.sale_price !== undefined ? (
              <span>Precio: {formatMoney(v.sale_price)}</span>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
  return (
    <article className="flex min-w-0 flex-col overflow-hidden rounded-arma border border-arma-border bg-arma-surface">
      {material ? (
        <>
          <button
            type="button"
            aria-label={`Ver fotografías de ${item.name}`}
            onClick={() => setPhotos(true)}
            className="relative block h-40 w-full shrink-0 overflow-hidden border-b border-arma-border focus-visible:outline-2 focus-visible:outline-arma-active"
          >
            <ProductImage
              src={cover?.url ?? null}
              background={cover?.background}
              alt={item.name}
              className="h-full w-full object-contain p-2"
            />
            <span className="absolute right-2 bottom-2 inline-flex items-center gap-1 rounded-arma border border-arma-border bg-arma-surface px-2 py-1 text-xs text-arma-icon">
              <Camera size={14} aria-hidden="true" />
              {gallery.length}
            </span>
          </button>
          <div className="flex flex-1 flex-col p-4">
            <div className="flex items-start justify-between gap-3">
              <span
                className={`rounded-arma px-2 py-1 text-xs font-medium ${item.material_type === "blank_shirt" ? "bg-arma-info-soft text-arma-info" : "bg-arma-gold-soft text-arma-gold"}`}
              >
                {item.material_type === "blank_shirt"
                  ? "Playera sin imprimir"
                  : "Transferencia DTF"}
              </span>
              <div className="flex shrink-0 gap-1">
                {" "}
                {canEdit ? (
                  <button
                    type="button"
                    onClick={onEdit}
                    aria-label={`Editar ${item.name}`}
                    className={`${secondaryButton} px-3`}
                  >
                    <Pencil size={17} strokeWidth={1.6} />
                  </button>
                ) : null}
                {canHide ? (
                  <button
                    type="button"
                    onClick={onVisibility}
                    aria-label={`${item.is_active ? "Ocultar" : "Reactivar"} ${item.name}`}
                    className={`${secondaryButton} px-3`}
                  >
                    {item.is_active ? (
                      <EyeOff size={17} strokeWidth={1.6} />
                    ) : (
                      <Eye size={17} strokeWidth={1.6} />
                    )}
                  </button>
                ) : null}
              </div>
              {!item.is_active ? (
                <span className="text-xs font-medium text-arma-muted">
                  Oculto
                </span>
              ) : null}
            </div>
            <h2 className="mt-3 break-words text-lg font-semibold">
              {item.name}
            </h2>
            <p className="mt-1 break-all text-xs text-arma-muted">
              {item.code}
            </p>
            {item.description ? (
              <p className="mt-2 line-clamp-2 break-words text-sm leading-6 text-arma-muted">
                {item.description}
              </p>
            ) : null}
            <div className="mt-4 flex items-center justify-between gap-3 border-y border-arma-border py-3">
              <p className="inline-flex items-center gap-2 text-xs text-arma-muted">
                <Package size={16} strokeWidth={1.6} />
                {item.variants.length} variantes
              </p>
              <p className="text-sm tabular-nums">
                <strong className="text-lg">{available}</strong> disponibles
              </p>
            </div>
            <p className="mt-3 text-xs leading-5 text-arma-muted">
              Costo de referencia:{" "}
              <strong className="font-medium text-arma-text">
                {knownCosts.length
                  ? Math.min(...knownCosts) === Math.max(...knownCosts)
                    ? formatMoney(knownCosts[0] ?? 0)
                    : `${formatMoney(Math.min(...knownCosts))} – ${formatMoney(Math.max(...knownCosts))}`
                  : "pendiente"}
              </strong>
              {knownCosts.length < item.variants.length
                ? ` · ${item.variants.length - knownCosts.length} variantes sin costo`
                : null}
            </p>
            <details className="mt-1">
              <summary className="flex min-h-11 cursor-pointer items-center gap-2 py-3 text-sm font-medium text-arma-active">
                <Layers size={16} strokeWidth={1.6} />
                Variantes y existencias
              </summary>
              {variants}
            </details>
            <div className="mt-auto grid grid-cols-2 gap-2 border-t border-arma-border pt-3">
              <button
                type="button"
                onClick={() => setCosts(true)}
                className={`${secondaryButton} inline-flex items-center gap-2 px-3`}
              >
                <Calculator size={16} strokeWidth={1.6} />
                Costos
              </button>
              <button
                type="button"
                onClick={() => setPhotos(true)}
                className={`${secondaryButton} inline-flex items-center gap-2 px-3`}
              >
                <Camera size={16} strokeWidth={1.6} />
                Fotografías
              </button>
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="flex flex-wrap items-start gap-4 p-4 sm:p-5">
            <div className="h-28 w-24 shrink-0">
              <ProductImage
                src={cover?.url ?? null}
                background={cover?.background}
                alt={item.name}
                className="h-full w-full rounded-arma object-contain"
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-arma-muted">
                Producto terminado · {item.code}
              </p>
              <h2 className="mt-1 break-words text-lg font-semibold">
                {item.name}
              </h2>
              <span
                className={`mt-2 inline-block rounded-arma px-2 py-1 text-xs ${item.is_active ? "bg-arma-green-soft text-arma-green" : "bg-arma-neutral-soft text-arma-neutral"}`}
              >
                {item.is_active ? "Activo" : "Oculto"}
              </span>
              <p className="mt-2 text-sm text-arma-muted">{item.description}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {canEdit ? (
                <button
                  type="button"
                  onClick={onEdit}
                  className={secondaryButton}
                >
                  Editar
                </button>
              ) : null}
              {canHide ? (
                <button
                  type="button"
                  onClick={onVisibility}
                  className={secondaryButton}
                >
                  {item.is_active ? "Ocultar" : "Reactivar"}
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => setPhotos(true)}
                className={secondaryButton}
              >
                Fotografías
              </button>
            </div>
          </div>
          <div className="border-t border-arma-border px-4 sm:px-5">
            {variants}
          </div>
        </>
      )}
      {photos ? (
        <CatalogPhotosModal
          item={item}
          gallery={gallery}
          canEdit={canPhoto}
          onClose={() => setPhotos(false)}
        />
      ) : null}
      {costs ? (
        <MaterialCostsModal item={item} onClose={() => setCosts(false)} />
      ) : null}
    </article>
  );
}
