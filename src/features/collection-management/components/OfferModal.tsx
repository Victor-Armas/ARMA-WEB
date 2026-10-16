import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Modal } from "@/components/ui/Modal";
import {
  offerFormSchema,
  type OfferForm,
  type CollectionOffer,
  type CollectionAdmin,
} from "../schemas/collection.schema";
import { CollectionField, fieldClass, primaryClass } from "./CollectionFields";
export function OfferModal({
  offer,
  products,
  existing,
  busy,
  onClose,
  onSave,
}: {
  offer: CollectionOffer | null;
  products: CollectionAdmin["products"];
  existing: CollectionOffer[];
  busy: boolean;
  onClose: () => void;
  onSave: (payload: OfferForm) => Promise<void>;
}) {
  const form = useForm<OfferForm>({
    resolver: zodResolver(offerFormSchema),
    defaultValues: {
      product_id: offer?.product_id ?? "",
      label: offer?.label ?? "Precio especial",
      price: offer?.price ?? undefined,
      starts_on: offer?.starts_on ?? "",
      ends_on: offer?.ends_on ?? "",
      is_active: offer?.is_active ?? true,
    },
  });
  const selectedId = useWatch({ control: form.control, name: "product_id" });
  const product = products.find((p) => p.id === selectedId);
  return (
    <Modal
      title={offer ? "Editar oferta" : "Nueva oferta"}
      onClose={onClose}
      busy={busy}
    >
      <form
        onSubmit={form.handleSubmit(async (values) => {
          if (
            product?.base_price === null ||
            !product ||
            values.price >= product.base_price
          ) {
            form.setError("price", {
              message:
                "El precio debe ser menor que el precio base de todas las variantes.",
            });
            return;
          }
          await onSave(values);
        })}
      >
        <fieldset disabled={busy} className="space-y-5">
          <CollectionField
            label="Modelo"
            error={form.formState.errors.product_id?.message}
          >
            <select
              className={fieldClass}
              disabled={Boolean(offer)}
              {...form.register("product_id")}
            >
              <option value="">Seleccionar modelo</option>
              {products
                .filter(
                  (p) =>
                    p.is_active &&
                    p.currency_count === 1 &&
                    p.base_price !== null &&
                    (p.id === offer?.product_id ||
                      !existing.some((o) => o.product_id === p.id)),
                )
                .map((p) => (
                  <option value={p.id} key={p.id}>
                    {p.name}
                  </option>
                ))}
            </select>
          </CollectionField>
          {product && (
            <p className="rounded-arma bg-arma-primary-soft px-4 py-3 text-sm">
              Precio base desde{" "}
              <strong>
                {new Intl.NumberFormat("es-MX", {
                  style: "currency",
                  currency: product.currency ?? "MXN",
                }).format(product.base_price ?? 0)}
              </strong>
              . El precio base del producto se conserva.
            </p>
          )}
          <CollectionField
            label="Nombre de la promoción"
            error={form.formState.errors.label?.message}
          >
            <input
              className={fieldClass}
              maxLength={60}
              {...form.register("label")}
            />
          </CollectionField>
          <CollectionField
            label="Precio promocional por pieza"
            error={form.formState.errors.price?.message}
          >
            <input
              type="number"
              inputMode="decimal"
              min="0.01"
              max="1000000"
              step="0.01"
              className={fieldClass}
              {...form.register("price", { valueAsNumber: true })}
            />
          </CollectionField>
          <div className="grid gap-4 sm:grid-cols-2">
            <CollectionField
              label="Inicio (opcional)"
              error={form.formState.errors.starts_on?.message}
            >
              <input
                type="date"
                className={fieldClass}
                {...form.register("starts_on")}
              />
            </CollectionField>
            <CollectionField
              label="Fin (opcional)"
              error={form.formState.errors.ends_on?.message}
            >
              <input
                type="date"
                className={fieldClass}
                {...form.register("ends_on")}
              />
            </CollectionField>
          </div>
          <p className="text-xs leading-5 text-arma-muted">
            Horario de Monterrey. El día de fin se incluye completo. Sin fechas,
            la oferta dura hasta que la pauses.
          </p>
          <label className="flex min-h-11 items-center gap-3 text-sm">
            <input
              type="checkbox"
              className="size-5 accent-arma-green"
              {...form.register("is_active")}
            />
            Oferta habilitada
          </label>
          <button type="submit" className={`${primaryClass} w-full`}>
            {busy ? "Guardando…" : "Guardar oferta"}
          </button>
        </fieldset>
      </form>
    </Modal>
  );
}
