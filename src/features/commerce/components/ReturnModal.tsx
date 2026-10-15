import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Modal } from "@/components/ui/Modal";
import { useOperation } from "@/features/operations/hooks/useOperations";
import { OperationFeedback } from "@/features/operations/components/OperationFeedback";
import { ProductImage } from "@/features/products/components/ProductImage";
import {
  returnFormSchema,
  type CommerceHistory,
} from "../schemas/adjustment.schema";
import type { CommerceOrder } from "../schemas/commerce.schema";
import {
  fieldClass,
  primaryButton,
  formatMoney,
  paymentLabels,
} from "../utils/commerce-format";
import { FormField } from "./FormField";
export function ReturnModal({
  order,
  history,
  onClose,
}: {
  order: CommerceOrder;
  history: CommerceHistory;
  onClose: () => void;
}) {
  function remaining(id: string) {
    const item = order.items.find((i) => i.id === id);
    return (
      (item?.quantity ?? 0) -
      history.returns
        .filter((r) => r.item_id === id)
        .reduce((s, r) => s + r.quantity, 0)
    );
  }
  const schema = returnFormSchema.superRefine((v, ctx) => {
    const item = order.items.find((i) => i.id === v.item_id);
    if (!item || v.quantity > remaining(v.item_id))
      ctx.addIssue({
        code: "custom",
        path: ["quantity"],
        message: "La cantidad supera las piezas pendientes de devolución.",
      });
    if (item && v.amount > item.unit_price * v.quantity)
      ctx.addIssue({
        code: "custom",
        path: ["amount"],
        message: "El reembolso supera el importe de estas piezas.",
      });
  });
  const form = useForm<
    z.input<typeof schema>,
    unknown,
    z.output<typeof schema>
  >({
    resolver: zodResolver(schema),
    defaultValues: {
      item_id: order.items.find((i) => remaining(i.id) > 0)?.id ?? "",
      quantity: "1",
      amount: "",
      method: "cash",
      restock: false,
    },
  });
  const watched = useWatch({ control: form.control });
  const item = order.items.find((i) => i.id === watched.item_id);
  const qty = Number(watched.quantity) || 0;
  const op = useOperation("return", "Devolución registrada");
  const submit = form.handleSubmit(async (v) => {
    if (await op.execute({ ...v, order_id: order.id })) onClose();
  });
  return (
    <Modal
      title="Devolución de venta"
      onClose={onClose}
      busy={op.busy || op.uncertain}
    >
      <form onSubmit={submit} className="space-y-5">
        <p className="text-sm">
          Venta #{String(order.order_number).padStart(4, "0")} ·{" "}
          {order.customer_name || "Mostrador"}
        </p>
        <fieldset disabled={op.busy || op.uncertain} className="space-y-4">
          <FormField
            label="Producto devuelto"
            error={form.formState.errors.item_id?.message}
          >
            {(id) => (
              <select
                id={id}
                {...form.register("item_id")}
                className={fieldClass}
              >
                {order.items
                  .filter((i) => remaining(i.id) > 0)
                  .map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.product_name} · {i.size} · {i.color}
                    </option>
                  ))}
              </select>
            )}
          </FormField>
          {item ? (
            <div className="flex items-center gap-4 border-y border-arma-border py-4">
              <div className="h-24 w-20 shrink-0">
                <ProductImage
                  src={item.cover_url}
                  alt={item.product_name}
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="text-sm">
                <p className="font-semibold">{item.product_name}</p>
                <p className="mt-1 text-arma-muted">
                  {remaining(item.id)} piezas pueden devolverse
                </p>
                <p className="mt-1">{formatMoney(item.unit_price)} por pieza</p>
              </div>
            </div>
          ) : null}
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              label="Cantidad devuelta"
              error={form.formState.errors.quantity?.message}
            >
              {(id) => (
                <input
                  id={id}
                  inputMode="numeric"
                  {...form.register("quantity")}
                  className={fieldClass}
                />
              )}
            </FormField>
            <FormField
              label="Reembolso real (MXN)"
              error={form.formState.errors.amount?.message}
            >
              {(id) => (
                <input
                  id={id}
                  inputMode="decimal"
                  {...form.register("amount")}
                  className={fieldClass}
                />
              )}
            </FormField>
          </div>
          <p className="text-xs text-arma-muted">
            Máximo para estas piezas:{" "}
            {formatMoney((item?.unit_price ?? 0) * qty)}. Puedes registrar cero
            si no hubo reembolso.
          </p>
          <FormField label="Medio del reembolso">
            {(id) => (
              <select
                id={id}
                {...form.register("method")}
                className={fieldClass}
              >
                {Object.entries(paymentLabels).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            )}
          </FormField>
          <FormField
            label="Motivo de la devolución"
            error={form.formState.errors.reason?.message}
          >
            {(id) => (
              <textarea
                id={id}
                maxLength={500}
                {...form.register("reason")}
                className={fieldClass}
              />
            )}
          </FormField>
          <label className="flex min-h-11 items-start gap-3 text-sm">
            <input
              type="checkbox"
              {...form.register("restock")}
              className="mt-1 size-5 accent-arma-active"
            />
            La prenda está en condiciones de venta y vuelve al stock disponible.
          </label>
          <label className="flex min-h-11 items-start gap-3 text-sm">
            <input
              type="checkbox"
              {...form.register("confirmed")}
              className="mt-1 size-5 accent-arma-active"
            />
            Confirmo la devolución y que el importe indicado ya se reembolsó al
            cliente.
          </label>
          {form.formState.errors.confirmed ? (
            <p role="alert" className="text-sm text-arma-red">
              {form.formState.errors.confirmed.message}
            </p>
          ) : null}
        </fieldset>
        <OperationFeedback
          uncertain={op.uncertain}
          busy={op.busy}
          retry={() => {
            void op.retry().then((saved) => {
              if (saved) {
                onClose();
              }
            });
          }}
        />
        <button
          type="submit"
          disabled={op.busy || op.uncertain}
          className={primaryButton}
        >
          {op.busy ? "Registrando…" : "Confirmar devolución"}
        </button>
      </form>
    </Modal>
  );
}
