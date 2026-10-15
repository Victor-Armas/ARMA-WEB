import { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { FormField } from "@/features/commerce/components/FormField";
import {
  fieldClass,
  primaryButton,
  formatMoney,
} from "@/features/commerce/utils/commerce-format";
import { VariantPicker } from "./VariantPicker";
import { OperationFeedback } from "./OperationFeedback";
import { useOperation } from "../hooks/useOperations";
import {
  receiptFormSchema,
  valuationFormSchema,
  type VariantOption,
} from "../schemas/operations.schema";
export function ReceiptForm({
  valuation = false,
  onBusyChange,
}: {
  valuation?: boolean;
  onBusyChange?: (busy: boolean) => void;
}) {
  const [variant, setVariant] = useState<VariantOption | null>(null);
  const schema = valuation ? valuationFormSchema : receiptFormSchema;
  const form = useForm<
    z.input<typeof schema>,
    unknown,
    z.output<typeof schema>
  >({
    resolver: zodResolver(schema),
    defaultValues: {
      variant_id: "",
      quantity: "1",
      unit_cost: "",
      supplier: "",
      reference: "",
      reason: "",
    },
  });
  const op = useOperation(
    valuation ? "value" : "receive",
    valuation
      ? "Costo de existencias actualizado"
      : "Entrada de materia prima registrada",
  );
  const protectedOperation = op.busy || op.uncertain;
  useEffect(() => {
    onBusyChange?.(protectedOperation);
  }, [onBusyChange, protectedOperation]);
  const submit = form.handleSubmit(async (values) => {
    if (await op.execute(values)) {
      form.reset();
      setVariant(null);
    }
  });
  const watched = useWatch({ control: form.control });
  const errors = form.formState.errors;
  return (
    <form onSubmit={submit} className="space-y-5">
      <fieldset disabled={op.busy || op.uncertain} className="space-y-5">
        <VariantPicker
          kind="material"
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
        <div className="grid gap-4 sm:grid-cols-2">
          {!valuation ? (
            <FormField
              label="Piezas recibidas"
              error={
                "quantity" in errors ? errors.quantity?.message : undefined
              }
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
          <FormField
            label="Costo por pieza (MXN)"
            error={errors.unit_cost?.message}
          >
            {(id, err) => (
              <input
                id={id}
                aria-describedby={err}
                inputMode="decimal"
                {...form.register("unit_cost")}
                className={fieldClass}
              />
            )}
          </FormField>
        </div>
        {valuation ? (
          <FormField
            label="Motivo de la valoración"
            error={"reason" in errors ? errors.reason?.message : undefined}
          >
            {(id) => (
              <textarea
                id={id}
                {...form.register("reason")}
                maxLength={500}
                className={fieldClass}
              />
            )}
          </FormField>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Proveedor (opcional)">
              {(id) => (
                <input
                  id={id}
                  maxLength={120}
                  {...form.register("supplier")}
                  className={fieldClass}
                />
              )}
            </FormField>
            <FormField label="Referencia o factura (opcional)">
              {(id) => (
                <input
                  id={id}
                  maxLength={200}
                  {...form.register("reference")}
                  className={fieldClass}
                />
              )}
            </FormField>
          </div>
        )}
      </fieldset>
      <p className="text-sm leading-6 text-arma-muted">
        {valuation
          ? "Asigna un costo por pieza a las existencias actuales, sin cambiar su cantidad. Usa el costo real de compra; el cambio queda registrado."
          : "La entrada suma existencias y calcula el costo promedio ponderado. Si las existencias anteriores no tienen costo, usa primero Ajustar costo actual."}
      </p>
      {!valuation ? (
        <p className="text-sm font-semibold tabular-nums">
          Importe de entrada:{" "}
          {formatMoney(
            (Number("quantity" in watched ? watched.quantity : 0) || 0) *
              (Number(watched.unit_cost) || 0),
          )}
        </p>
      ) : null}
      <OperationFeedback
        uncertain={op.uncertain}
        busy={op.busy}
        retry={() => {
          void op.retry().then((saved) => {
            if (saved) {
              form.reset();
              setVariant(null);
            }
          });
        }}
      />
      <button
        type="submit"
        className={primaryButton}
        disabled={op.busy || op.uncertain}
      >
        {op.busy
          ? "Guardando…"
          : valuation
            ? "Confirmar valoración"
            : "Registrar entrada"}
      </button>
    </form>
  );
}
