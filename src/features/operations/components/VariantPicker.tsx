import { ProductImage } from "@/features/products/components/ProductImage";
import { useState, useId } from "react";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import {
  fieldClass,
  formatMoney,
  secondaryButton,
} from "@/features/commerce/utils/commerce-format";
import { useWorkshopOptions } from "../hooks/useOperations";
import type { VariantOption } from "../schemas/operations.schema";
export function VariantPicker({
  kind,
  value,
  onChange,
  disabled = false,
  recipeOnly = false,
  sellerDelivery = false,
  showCost = true,
}: {
  kind: "material" | "product";
  value: VariantOption | null;
  onChange: (value: VariantOption) => void;
  disabled?: boolean;
  recipeOnly?: boolean;
  sellerDelivery?: boolean;
  showCost?: boolean;
}) {
  const [search, setSearch] = useState("");
  const id = useId();
  const query = useWorkshopOptions(
    sellerDelivery
      ? "seller_product"
      : recipeOnly && kind === "product"
        ? "ready_product"
        : kind,
    useDebouncedValue(search.trim()),
  );
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block text-sm font-medium">
        {kind === "material"
          ? "Buscar insumo por nombre, SKU o descripción"
          : "Buscar producto y variante"}
      </label>
      <input
        id={id}
        type="search"
        maxLength={120}
        value={search}
        disabled={disabled}
        onChange={(e) => setSearch(e.target.value)}
        className={fieldClass}
      />
      <label htmlFor={id + "-variant"} className="block text-sm font-medium">
        {kind === "material" ? "Variante del insumo" : "Producto terminado"}
      </label>
      <select
        id={id + "-variant"}
        value={value?.id ?? ""}
        disabled={disabled || query.isPending || query.isError}
        onChange={(e) => {
          const found = query.data?.find((v) => v.id === e.target.value);
          if (found) onChange(found);
        }}
        className={fieldClass}
      >
        <option value="">Selecciona una variante</option>
        {value && !query.data?.some((v) => v.id === value.id) ? (
          <option value={value.id}>{value.label}</option>
        ) : null}
        {query.data?.map((v) => (
          <option key={v.id} value={v.id}>
            {v.label}
          </option>
        ))}
      </select>
      {query.isPending ? (
        <p role="status" className="text-sm text-arma-muted">
          Cargando variantes…
        </p>
      ) : query.isError ? (
        <div role="alert">
          <p className="text-sm text-arma-red">
            No pudimos cargar las variantes.
          </p>
          <button
            type="button"
            onClick={() => void query.refetch()}
            className={secondaryButton}
          >
            Reintentar
          </button>
        </div>
      ) : query.data?.length === 0 ? (
        <p className="text-sm text-arma-muted">
          No hay variantes activas. Créala primero en{" "}
          {kind === "material" ? "Materia prima" : "Gestión de productos"}.
        </p>
      ) : (
        <p className="text-xs text-arma-muted">
          Hasta 100 coincidencias. Usa el buscador para encontrar otras
          variantes.
        </p>
      )}
      {value ? (
        <div className="flex gap-4 border-t border-arma-border pt-3 text-sm">
          <div className="h-28 w-24 shrink-0">
            <ProductImage
              src={value.photo_url ?? null}
              background={value.photo?.background}
              alt={value.label}
              className="h-full w-full rounded-arma object-contain"
            />
          </div>
          <div className="min-w-0">
            <p className="font-medium break-words">{value.label}</p>
            <p className="mt-1 text-arma-muted break-words">
              {value.description}
            </p>
            <p className="mt-2 tabular-nums">
              {value.available} disponibles{" "}
              {showCost
                ? `· Costo de inventario: ${value.cost === null ? "sin registrar" : formatMoney(value.cost)}`
                : ""}
            </p>
            {sellerDelivery ? (
              <p className="mt-3 font-semibold text-arma-info">
                Precio de catálogo:{" "}
                {value.catalog_price === null
                  ? "sin registrar"
                  : `${formatMoney(value.catalog_price)} por pieza`}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
