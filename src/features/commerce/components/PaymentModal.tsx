import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Modal } from "@/components/ui/Modal";
import { useOperation } from "@/features/operations/hooks/useOperations";
import { OperationFeedback } from "@/features/operations/components/OperationFeedback";
import { paymentFormSchema } from "../schemas/adjustment.schema";
import type { CommerceOrder } from "../schemas/commerce.schema";
import {
  fieldClass,
  primaryButton,
  formatMoney,
  paymentLabels,
} from "../utils/commerce-format";
import { FormField } from "./FormField";
export function PaymentModal({
  order,
  onClose,
}: {
  order: CommerceOrder;
  onClose: () => void;
}) {
  const schema = paymentFormSchema.refine(
    (v) => v.amount <= order.total - order.deposit,
    { path: ["amount"], message: "El abono supera el saldo pendiente." },
  );
  const form = useForm<
    z.input<typeof schema>,
    unknown,
    z.output<typeof schema>
  >({
    resolver: zodResolver(schema),
    defaultValues: { amount: "", method: "cash" },
  });
  const op = useOperation("payment", "Abono registrado");
  const submit = form.handleSubmit(async (v) => {
    if (await op.execute({ ...v, order_id: order.id })) onClose();
  });
  return (
    <Modal
      title="Registrar abono"
      onClose={onClose}
      busy={op.busy || op.uncertain}
    >
      <p className="text-sm">
        Apartado #{String(order.order_number).padStart(4, "0")} ·{" "}
        {order.customer_name}
      </p>
      <p className="mt-2 text-lg font-semibold tabular-nums">
        Saldo pendiente: {formatMoney(order.total - order.deposit)}
      </p>
      <form onSubmit={submit} className="mt-5 space-y-5">
        <fieldset disabled={op.busy || op.uncertain} className="space-y-4">
          <FormField
            label="Importe recibido (MXN)"
            error={form.formState.errors.amount?.message}
          >
            {(id, err) => (
              <input
                id={id}
                inputMode="decimal"
                aria-describedby={err}
                {...form.register("amount")}
                className={fieldClass}
              />
            )}
          </FormField>
          <FormField label="Medio del abono">
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
          <p className="text-sm leading-6 text-arma-muted">
            Confirma únicamente dinero que ya recibiste. Aunque el saldo llegue
            a cero, usa «Completar venta» para cerrar el apartado; después
            podrás marcarlo como entregado.
          </p>
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
          {op.busy ? "Guardando…" : "Confirmar abono recibido"}
        </button>
      </form>
    </Modal>
  );
}
