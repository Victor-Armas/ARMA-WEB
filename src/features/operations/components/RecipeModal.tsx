import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { ProductImage } from "@/features/products/components/ProductImage";
import { secondaryButton } from "@/features/commerce/utils/commerce-format";
import { useWorkshopRecipe } from "../hooks/useOperations";
import type { VariantOption } from "../schemas/operations.schema";
import { RecipeEditor } from "./RecipeEditor";
export function RecipeModal({
  variant,
  onClose,
}: {
  variant: VariantOption;
  onClose: () => void;
}) {
  const query = useWorkshopRecipe(variant.id);
  const [busy, setBusy] = useState(false);
  return (
    <Modal title="Receta del producto" wide busy={busy} onClose={onClose}>
      <div className="mb-5 flex items-center gap-4 border-b border-arma-border pb-5">
        <div className="h-28 w-24 shrink-0">
          <ProductImage
            src={variant.photo_url ?? null}
            background={variant.photo?.background}
            alt={variant.label}
            className="h-full w-full rounded-arma object-contain"
          />
        </div>
        <div className="min-w-0">
          <p className="break-words text-lg font-semibold">{variant.label}</p>
          <p className="mt-2 break-words text-sm leading-6 text-arma-muted">
            {variant.description}
          </p>
        </div>
      </div>
      {query.isPending ? (
        <p role="status" className="py-6 text-sm">
          Cargando receta…
        </p>
      ) : query.isError || !query.data ? (
        <div role="alert">
          <p>No pudimos cargar la receta.</p>
          <button
            type="button"
            className={secondaryButton}
            onClick={() => void query.refetch()}
          >
            Reintentar
          </button>
        </div>
      ) : (
        <RecipeEditor
          variantId={variant.id}
          recipe={query.data}
          onSaved={onClose}
          onBusyChange={setBusy}
        />
      )}
    </Modal>
  );
}
