import { DeliveryPaymentTerms } from "./DeliveryPaymentTerms";
import { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Modal } from "@/components/ui/Modal";
import { FormField } from "@/features/commerce/components/FormField";
import {
  fieldClass,
  primaryButton,
  formatMoney,
  paymentLabels,
} from "@/features/commerce/utils/commerce-format";
import { VariantPicker } from "@/features/operations/components/VariantPicker";
import { OperationFeedback } from "@/features/operations/components/OperationFeedback";
import { useOperation } from "@/features/operations/hooks/useOperations";
import type { VariantOption } from "@/features/operations/schemas/operations.schema";
import {
  sellerFormSchema,
  type SellerForm,
  type SellerDelivery,
} from "../schemas/seller.schema";
const titles = {
  deliver: "Entregar mercancía",
  return: "Regresar mercancía al taller",
  payment: "Registrar pago a ARMA",
  refund: "Reintegrar saldo al vendedor",
};
function SellerOperationForm({
  action,
  seller,
  delivery,
  onClose,
  onBusy,
}: {
  action: SellerForm["action"];
  seller: string;
  delivery?: SellerDelivery;
  onClose: () => void;
  onBusy: (v: boolean) => void;
}) {
  const [variant, setVariant] = useState<VariantOption | null>(null);
  const form = useForm<SellerForm>({
    resolver: zodResolver(sellerFormSchema),
    defaultValues: {
      action,
      payment_terms: "consignment",
      variant_id: "",
      quantity: "1",
      unit_price: "",
      amount: "",
      method: "cash",
      reference: "",
      notes: "",
    },
  });
  const [quantity, unitPrice, terms] = useWatch({
    control: form.control,
    name: ["quantity", "unit_price", "payment_terms"],
  });
  const total =
    /^\d+$/.test(quantity ?? "") && /^\d+(\.\d{1,2})?$/.test(unitPrice ?? "")
      ? Math.round(Number(quantity) * Number(unitPrice) * 100) / 100
      : null;
  const op = useOperation("consignment", "Operación del vendedor registrada");
  useEffect(() => {
    onBusy(op.busy || op.uncertain);
  }, [onBusy, op.busy, op.uncertain]);
  const errors = form.formState.errors;
  const submit = form.handleSubmit(async (values) => {
    const available =
      action === "deliver" ? variant?.available : delivery?.available;
    if (available !== undefined && Number(values.quantity) > available) {
      form.setError("quantity", {
        message: `Hay ${available} piezas disponibles.`,
      });
      return;
    }
    if (
      await op.execute({
        ...values,
        seller_id: seller,
        delivery_id: delivery?.id ?? "",
      })
    )
      onClose();
  });
  return (
    <form onSubmit={submit} className="space-y-5">
      <p className="text-sm leading-6 text-arma-muted">
        {action === "deliver"
          ? "Selecciona las piezas, acuerda el importe por pieza y elige si ya recibiste el pago, queda pendiente o se pagará conforme se venda."
          : action === "return"
            ? "Regresa al taller piezas sin vender y disponibles. Las piezas apartadas deben liberarse primero."
            : action === "payment"
              ? "Registra dinero que ARMA ya recibió del vendedor. No es otra venta ni otro cobro al cliente."
              : "Registra dinero devuelto al vendedor por su saldo a favor. No es un reembolso al cliente."}
      </p>
      <fieldset disabled={op.busy || op.uncertain} className="space-y-5">
        {action === "deliver" ? (
          <>
            <VariantPicker
              kind="product"
              sellerDelivery
              showCost={false}
              value={variant}
              onChange={(v) => {
                setVariant(v);
                form.setValue("variant_id", v.id, { shouldValidate: true });
              }}
            />
            {errors.variant_id ? (
              <p role="alert" className="text-sm text-arma-red">
                {errors.variant_id.message}
              </p>
            ) : null}
          </>
        ) : null}
        {delivery ? (
          <p className="font-semibold">
            {delivery.label} · {delivery.available} disponibles · ARMA{" "}
            {formatMoney(delivery.unit_price)} por pieza
          </p>
        ) : null}
        {action === "deliver" || action === "return" ? (
          <FormField
            label="Cantidad de piezas"
            error={errors.quantity?.message}
          >
            {(id, err) => (
              <input
                id={id}
                aria-describedby={err}
                inputMode="numeric"
                {...form.register("quantity")}
                className={fieldClass}
              />
            )}
          </FormField>
        ) : null}
        {action === "deliver" ? (
          <>
            <FormField
              label="Importe para ARMA por pieza (MXN)"
              error={errors.unit_price?.message}
            >
              {(id, err) => (
                <input
                  id={id}
                  aria-describedby={err}
                  inputMode="decimal"
                  {...form.register("unit_price")}
                  className={fieldClass}
                />
              )}
            </FormField>
            <div
              className="rounded-arma bg-arma-info-soft p-4 text-arma-info"
              aria-live="polite"
            >
              <p className="text-sm font-medium">Total de la entrega</p>
              <p className="mt-2 text-2xl font-semibold tabular-nums">
                {total === null ? "—" : formatMoney(total)}
              </p>
              {total !== null ? (
                <p className="mt-2 text-xs">
                  {quantity} piezas × {formatMoney(Number(unitPrice))}
                </p>
              ) : null}
            </div>
            <DeliveryPaymentTerms register={form.register} />
            <p className="text-sm leading-6 text-arma-muted">
              {terms === "paid"
                ? "Se registrará el pago completo de esta entrega. No añadirá saldo pendiente; cualquier saldo anterior se conserva."
                : terms === "credit"
                  ? "El total de esta entrega se sumará al saldo pendiente desde ahora. Registra los pagos posteriores desde la cuenta del vendedor."
                  : "Esta entrega no genera deuda inicial. El saldo aumentará cuando se completen las ventas de sus piezas."}
            </p>
            <FormField
              label="Notas de entrega (opcional)"
              error={errors.notes?.message}
            >
              {(id) => (
                <textarea
                  id={id}
                  rows={2}
                  maxLength={500}
                  {...form.register("notes")}
                  className={fieldClass}
                />
              )}
            </FormField>
          </>
        ) : null}
        {action === "payment" ||
        action === "refund" ||
        (action === "deliver" && terms === "paid") ? (
          <>
            {action !== "deliver" ? (
              <FormField
                label="Importe recibido o reintegrado (MXN)"
                error={errors.amount?.message}
              >
                {(id, err) => (
                  <input
                    id={id}
                    aria-describedby={err}
                    inputMode="decimal"
                    {...form.register("amount")}
                    className={fieldClass}
                  />
                )}
              </FormField>
            ) : null}
            <FormField label="Medio de pago">
              {(id) => (
                <select
                  id={id}
                  {...form.register("method")}
                  className={fieldClass}
                >
                  {Object.entries(paymentLabels).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              )}
            </FormField>
            <FormField label="Referencia (opcional)">
              {(id) => (
                <input
                  id={id}
                  maxLength={200}
                  {...form.register("reference")}
                  className={fieldClass}
                />
              )}
            </FormField>
          </>
        ) : null}
      </fieldset>
      <OperationFeedback
        busy={op.busy}
        uncertain={op.uncertain}
        retry={() => {
          void op.retry().then((saved) => {
            if (saved) onClose();
          });
        }}
      />
      <button
        type="submit"
        disabled={op.busy || op.uncertain}
        className={primaryButton}
      >
        {op.busy
          ? "Guardando…"
          : action === "deliver" && terms === "paid"
            ? "Entregar y registrar pago"
            : titles[action]}
      </button>
    </form>
  );
}
export function SellerOperationModal({
  action,
  seller,
  delivery,
  onClose,
}: {
  action: SellerForm["action"];
  seller: string;
  delivery?: SellerDelivery;
  onClose: () => void;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <Modal
      title={titles[action]}
      wide={action === "deliver"}
      busy={busy}
      onClose={onClose}
    >
      <SellerOperationForm
        action={action}
        seller={seller}
        delivery={delivery}
        onClose={onClose}
        onBusy={setBusy}
      />
    </Modal>
  );
}
