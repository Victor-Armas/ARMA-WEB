import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Modal } from "@/components/ui/Modal";
import { FormField } from "@/features/commerce/components/FormField";
import {
  fieldClass,
  primaryButton,
  secondaryButton,
  formatMoney,
  formatDateTime,
} from "@/features/commerce/utils/commerce-format";
import { commerceError } from "@/features/commerce/services/commerce.service";
import type { ProductVariant } from "@/features/products/schemas/product.schema";
import { notify } from "@/lib/notify";
import {
  personalPriceSchema,
  type PersonalPriceInput,
  type PersonalPriceValues,
} from "../schemas/personal-price.schema";
import { usePersonalPrice } from "../hooks/usePersonalPrice";
export function PersonalPriceModal({
  variant,
  productName,
  onClose,
}: {
  variant: ProductVariant;
  productName: string;
  onClose: () => void;
}) {
  const form = useForm<PersonalPriceInput, unknown, PersonalPriceValues>({
    resolver: zodResolver(personalPriceSchema),
    defaultValues: {
      price: String(variant.seller_price ?? variant.sale_price),
    },
  });
  const price = useWatch({ control: form.control, name: "price" });
  const [gain, setGain] = useState("100");
  const [lotId, setLotId] = useState(variant.consignment_lots[0]?.id ?? "");
  const [error, setError] = useState("");
  const mutation = usePersonalPrice();
  const busy = mutation.isPending || form.formState.isSubmitting;
  const lot = variant.consignment_lots.find((item) => item.id === lotId);
  const validGain = /^\d+(\.\d{1,2})?$/.test(gain) && Number(gain) >= 0;
  const calculated =
    lot && validGain
      ? Math.round((lot.unit_price + Number(gain)) * 100) / 100
      : null;
  async function save(value: number | null) {
    setError("");
    try {
      await mutation.mutateAsync({ variantId: variant.id, price: value });
      notify.success("Configuración guardada");
      onClose();
    } catch (failure: unknown) {
      const message = commerceError(failure);
      setError(message);
      notify.error(message);
    }
  }
  return (
    <Modal title="Configurar mi precio" wide busy={busy} onClose={onClose}>
      <p className="font-semibold">
        {productName} · {variant.color} · {variant.size}
      </p>
      <p className="mt-2 text-sm text-arma-muted">
        Precio de referencia ARMA: {formatMoney(variant.sale_price)} por pieza.
      </p>
      <form
        onSubmit={form.handleSubmit((values) => save(values.price))}
        className="mt-5 space-y-5"
      >
        <fieldset disabled={busy} className="space-y-5">
          <FormField
            label="Mi precio habitual por pieza (MXN)"
            error={form.formState.errors.price?.message}
          >
            {(id, err) => (
              <input
                id={id}
                aria-describedby={err}
                inputMode="decimal"
                {...form.register("price")}
                className={fieldClass}
              />
            )}
          </FormField>
          <p className="text-sm leading-6 text-arma-muted">
            Se guarda un precio fijo para esta variante, solo en tu cuenta.
            Aparecerá en Mi inventario y Catálogo, y se usará al iniciar una
            venta o apartado. Podrás negociar otro importe en cada operación.
          </p>
          {variant.consignment_lots.length ? (
            <details className="border-y border-arma-border py-2">
              <summary className="min-h-11 cursor-pointer py-3 text-sm font-semibold text-arma-active">
                Calcular con mi ganancia por pieza
              </summary>
              <div className="space-y-4 py-4">
                <div>
                  <label
                    htmlFor="price-calculator-lot"
                    className="mb-2 block text-sm font-medium"
                  >
                    Entrega para el cálculo
                  </label>
                  <select
                    id="price-calculator-lot"
                    value={lotId}
                    onChange={(e) => setLotId(e.target.value)}
                    className={`${fieldClass} w-full`}
                  >
                    {variant.consignment_lots.map((item, index) => (
                      <option key={item.id} value={item.id}>
                        Entrega {index + 1} · ARMA{" "}
                        {formatMoney(item.unit_price)} ·{" "}
                        {formatDateTime(item.created_at)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label
                    htmlFor="desired-gain"
                    className="mb-2 block text-sm font-medium"
                  >
                    Ganancia deseada por pieza (MXN)
                  </label>
                  <input
                    id="desired-gain"
                    value={gain}
                    onChange={(e) => setGain(e.target.value)}
                    inputMode="decimal"
                    className={fieldClass}
                  />
                </div>
                <p className="text-sm font-semibold text-arma-info">
                  Precio calculado:{" "}
                  {calculated === null
                    ? "escribe una ganancia válida"
                    : formatMoney(calculated)}
                </p>
                <button
                  type="button"
                  disabled={calculated === null || calculated > 999999}
                  className={secondaryButton}
                  onClick={() => {
                    if (calculated !== null) {
                      form.setValue("price", calculated.toFixed(2), {
                        shouldDirty: true,
                        shouldValidate: true,
                      });
                    }
                  }}
                >
                  Usar precio calculado
                </button>
                <p className="text-xs leading-5 text-arma-muted">
                  Este cálculo usa una sola entrega. Al guardar, el precio será
                  fijo; tu ganancia cambiará si usas otra entrega con un importe
                  diferente para ARMA.
                </p>
              </div>
            </details>
          ) : null}
          {variant.consignment_lots.length &&
          /^\d+(\.\d{1,2})?$/.test(price) ? (
            <div className="rounded-arma bg-arma-green-soft p-4 text-arma-green">
              <h3 className="text-sm font-semibold">
                Ganancia antes de gastos con este precio
              </h3>
              <dl className="mt-3 space-y-3">
                {variant.consignment_lots.map((item, index) => (
                  <div
                    key={item.id}
                    className="flex flex-wrap justify-between gap-2 text-sm"
                  >
                    <dt>
                      Entrega {index + 1} · ARMA {formatMoney(item.unit_price)}
                    </dt>
                    <dd className="font-semibold tabular-nums">
                      {formatMoney(Number(price) - item.unit_price)} por pieza
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          ) : null}
        </fieldset>
        {error ? (
          <p role="alert" className="text-sm text-arma-red">
            {error}
          </p>
        ) : null}
        <div className="flex flex-wrap gap-3">
          <button type="submit" disabled={busy} className={primaryButton}>
            {busy ? "Guardando…" : "Guardar mi precio"}
          </button>
          {variant.seller_price !== null ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => void save(null)}
              className={secondaryButton}
            >
              Usar referencia ARMA
            </button>
          ) : null}
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            className={secondaryButton}
          >
            Cancelar
          </button>
        </div>
      </form>
    </Modal>
  );
}
