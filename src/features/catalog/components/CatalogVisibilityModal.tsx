import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import {
  primaryButton,
  secondaryButton,
} from "@/features/commerce/utils/commerce-format";
import { catalogError } from "../services/catalog.service";
import type { CatalogItem, CatalogKind } from "../schemas/catalog.schema";
import { useCatalogMutations } from "../hooks/useCatalog";
export function CatalogVisibilityModal({
  kind,
  item,
  onClose,
}: {
  kind: CatalogKind;
  item: CatalogItem;
  onClose: () => void;
}) {
  const [error, setError] = useState("");
  const mutation = useCatalogMutations();
  const verb = item.is_active ? "Ocultar" : "Reactivar";
  async function save() {
    setError("");
    try {
      await mutation.active.mutateAsync({
        kind,
        id: item.id,
        active: !item.is_active,
      });
      onClose();
    } catch (failure: unknown) {
      setError(catalogError(failure));
    }
  }
  return (
    <Modal
      title={`${verb} ${kind === "product" ? "producto" : "insumo"}`}
      busy={mutation.active.isPending}
      onClose={onClose}
    >
      <p className="font-semibold">{item.name}</p>
      <p className="mt-3 text-sm leading-6 text-arma-muted">
        {item.is_active
          ? kind === "product"
            ? "Dejará de aparecer en Productos y no se podrá vender ni apartar. Los apartados existentes y su historial se conservan."
            : "Se ocultará de los insumos activos. Sus existencias y su historial se conservan."
          : "Volverá a aparecer entre los registros activos."}
      </p>
      {error ? (
        <p role="alert" className="mt-4 text-sm text-arma-red">
          {error}
        </p>
      ) : null}
      <div className="mt-6 flex gap-3">
        <button
          type="button"
          disabled={mutation.active.isPending}
          onClick={() => void save()}
          className={primaryButton}
        >
          {mutation.active.isPending ? "Guardando…" : verb}
        </button>
        <button
          type="button"
          disabled={mutation.active.isPending}
          onClick={onClose}
          className={secondaryButton}
        >
          Cancelar
        </button>
      </div>
    </Modal>
  );
}
