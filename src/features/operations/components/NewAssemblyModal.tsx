import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { secondaryButton } from "@/features/commerce/utils/commerce-format";
import { useWorkshopRecipe, useWorkshopVariant } from "../hooks/useOperations";
import type { VariantOption } from "../schemas/operations.schema";
import { VariantPicker } from "./VariantPicker";
import { AssemblyForm } from "./AssemblyForm";
function AssemblyRecipe({
  variant,
  onClose,
  onBusy,
}: {
  variant: VariantOption;
  onClose: () => void;
  onBusy: (busy: boolean) => void;
}) {
  const query = useWorkshopRecipe(variant.id);
  return query.isPending ? (
    <p role="status" className="mt-5 text-sm">
      Cargando insumos…
    </p>
  ) : query.isError ? (
    <div role="alert" className="mt-5">
      <p>No pudimos cargar los insumos.</p>
      <button className={secondaryButton} onClick={() => void query.refetch()}>
        Reintentar
      </button>
    </div>
  ) : query.data?.recipe ? (
    <div className="mt-5 border-t border-arma-border pt-5">
      <AssemblyForm
        variantId={variant.id}
        recipe={query.data}
        onStarted={onClose}
        onBusyChange={onBusy}
      />
    </div>
  ) : (
    <p className="mt-5 text-sm text-arma-warning">
      Esta variante todavía no tiene una receta configurada.
    </p>
  );
}
export function NewAssemblyModal({
  initialId,
  onClose,
}: {
  initialId?: string;
  onClose: () => void;
}) {
  const [variant, setVariant] = useState<VariantOption | null>(null);
  const selected = useWorkshopVariant(initialId);
  const current = variant ?? selected.data ?? null;
  const [busy, setBusy] = useState(false);
  return (
    <Modal title="Nuevo armado" wide busy={busy} onClose={onClose}>
      <p className="mb-5 text-sm leading-6 text-arma-muted">
        Selecciona una receta configurada y la cantidad que vas a producir. Los
        insumos se reservan al iniciar.
      </p>
      <VariantPicker
        kind="product"
        recipeOnly
        value={current}
        onChange={setVariant}
        disabled={busy}
      />
      {current ? (
        <AssemblyRecipe
          key={current.id}
          variant={current}
          onClose={onClose}
          onBusy={setBusy}
        />
      ) : null}
    </Modal>
  );
}
