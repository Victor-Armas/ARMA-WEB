import { useId, useState } from "react";
import { Trash2, Upload } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { ProductGallery } from "@/features/products/components/ProductGallery";
import type { ProductImageData } from "@/features/products/types/product-detail.types";
import {
  imageBackgroundLabels,
  type ImageBackground,
} from "@/types/image-background";
import { notify } from "@/lib/notify";
import { secondaryButton } from "@/features/commerce/utils/commerce-format";
import type { CatalogItem } from "../schemas/catalog.schema";
import { useCatalogMutations } from "../hooks/useCatalog";
import { catalogError } from "../services/catalog.service";
export function CatalogPhotosModal({
  item,
  gallery,
  canEdit,
  onClose,
}: {
  item: CatalogItem;
  gallery: ProductImageData[];
  canEdit: boolean;
  onClose: () => void;
}) {
  const [selectedId, setSelectedId] = useState(gallery[0]?.id ?? null);
  const [confirm, setConfirm] = useState(false);
  const selected = gallery.find((i) => i.id === selectedId) ?? gallery[0];
  const mutation = useCatalogMutations();
  const busy = mutation.photo.isPending || mutation.imageAction.isPending;
  const id = useId();
  async function upload(file: File) {
    const toast = notify.loading("Subiendo fotografía…");
    try {
      await mutation.photo.mutateAsync({ kind: item.kind, id: item.id, file });
      notify.success("Fotografía agregada", { id: toast });
    } catch (error: unknown) {
      notify.error(catalogError(error), { id: toast });
    }
  }
  async function action(
    action: "remove" | "background",
    background?: ImageBackground,
  ) {
    if (!selected) return;
    const toast = notify.loading(
      action === "remove" ? "Quitando fotografía…" : "Guardando fondo…",
    );
    try {
      await mutation.imageAction.mutateAsync({
        kind: item.kind,
        id: item.id,
        imageId: selected.id,
        action,
        background,
      });
      setConfirm(false);
      notify.success(
        action === "remove" ? "Fotografía quitada" : "Fondo guardado",
        { id: toast },
      );
    } catch (error: unknown) {
      notify.error(catalogError(error), { id: toast });
    }
  }
  return (
    <Modal
      title={`Fotografías · ${item.name}`}
      wide
      onClose={onClose}
      busy={busy}
    >
      <div className="grid items-start gap-6 sm:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <div>
          {gallery.length ? (
            <ProductGallery
              compact
              images={gallery}
              name={item.name}
              activeId={selected?.id ?? null}
              onSelectImage={(value) => {
                setSelectedId(value);
                setConfirm(false);
              }}
            />
          ) : (
            <p className="rounded-arma bg-arma-neutral-soft p-6 text-sm text-arma-neutral">
              Todavía no tiene fotografías.
            </p>
          )}
        </div>
        <div className="space-y-5">
          {selected ? (
            <fieldset disabled={busy || !canEdit} className="space-y-3">
              <legend className="mb-2 text-sm font-semibold">
                Fondo de esta fotografía
              </legend>
              <div className="flex flex-wrap gap-2">
                {(["white", "gray", "black"] as const).map((color) => (
                  <button
                    key={color}
                    type="button"
                    aria-label={`Fondo ${imageBackgroundLabels[color].toLowerCase()}`}
                    aria-pressed={(selected.background ?? "white") === color}
                    onClick={() => void action("background", color)}
                    className={`${secondaryButton} inline-flex items-center gap-2 px-3 ${(selected.background ?? "white") === color ? "border-arma-active ring-1 ring-arma-active" : ""}`}
                  >
                    <span
                      aria-hidden="true"
                      className={`size-4 rounded-arma border border-arma-border ${color === "black" ? "bg-arma-text" : color === "gray" ? "bg-arma-muted" : "bg-arma-surface"}`}
                    />
                    {imageBackgroundLabels[color]}
                  </button>
                ))}
              </div>
              <p className="text-xs leading-5 text-arma-muted">
                El fondo se guarda para visualizar PNG transparentes. No
                modifica el archivo de imagen.
              </p>
            </fieldset>
          ) : null}
          {canEdit && item.is_active ? (
            <div className="border-t border-arma-border pt-4">
              <label
                htmlFor={id}
                className="mb-3 flex items-center gap-2 text-sm font-semibold"
              >
                <Upload size={17} strokeWidth={1.6} />
                Agregar fotografía
              </label>
              <input
                id={id}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                disabled={busy}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void upload(file);
                  e.target.value = "";
                }}
                className="w-full min-w-0 text-sm file:mr-2 file:min-h-11 file:rounded-arma file:border file:border-arma-border file:bg-arma-primary-soft file:px-3"
              />
              <p className="mt-2 text-xs text-arma-muted">
                PNG, JPG o WebP · máximo 5 MB.
              </p>
            </div>
          ) : null}
          {selected && canEdit ? (
            <div className="border-t border-arma-border pt-4">
              {confirm ? (
                <div className="space-y-3">
                  <p className="text-sm leading-6">
                    ¿Quitar la fotografía seleccionada del catálogo?
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className={`${secondaryButton} border-arma-red text-arma-red`}
                      disabled={busy}
                      onClick={() => void action("remove")}
                    >
                      Confirmar eliminación
                    </button>
                    <button
                      type="button"
                      className={secondaryButton}
                      disabled={busy}
                      onClick={() => setConfirm(false)}
                    >
                      Conservar
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setConfirm(true)}
                  className={`${secondaryButton} inline-flex items-center gap-2 text-arma-red`}
                >
                  <Trash2 size={17} strokeWidth={1.6} />
                  Eliminar fotografía
                </button>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </Modal>
  );
}
