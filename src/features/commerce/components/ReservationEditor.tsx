import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuthStore } from "@/features/auth/stores/auth.store";
import { useOperation } from "@/features/operations/hooks/useOperations";
import { OperationFeedback } from "@/features/operations/components/OperationFeedback";
import { getReservationEditOptions } from "../services/reservation-edit.service";
import { commerceError } from "../services/commerce.service";
import {
  reservationEditSchema,
  type ReservationEditOptions,
} from "../schemas/reservation-edit.schema";
import {
  fieldClass,
  primaryButton,
  secondaryButton,
  formatMoney,
  formatDateTime,
} from "../utils/commerce-format";
import { FormField } from "./FormField";

export function ReservationEditor({
  id,
  onClose,
  onBusyChange,
}: {
  id: string;
  onClose: () => void;
  onBusyChange: (busy: boolean) => void;
}) {
  const uid = useAuthStore((s) => s.session?.user.id);
  const query = useQuery({
    queryKey: ["reservation-edit", uid, id],
    queryFn: ({ signal }) => getReservationEditOptions(id, signal),
    enabled: Boolean(uid),
    staleTime: 0,
    refetchOnWindowFocus: false,
    retry: false,
  });
  return (
    <section className="my-4 rounded-arma border border-arma-border p-4">
      <h3 className="mb-4 text-lg font-semibold">Editar apartado</h3>
      {query.isPending || query.isFetching ? (
        <p role="status">Cargando datos actuales…</p>
      ) : query.isError ? (
        <div role="alert">
          <p className="text-sm text-arma-red">{commerceError(query.error)}</p>
          <button
            type="button"
            onClick={() => void query.refetch()}
            className={`${secondaryButton} mt-3`}
          >
            Reintentar
          </button>
        </div>
      ) : (
        <EditForm
          key={query.data.version}
          id={id}
          data={query.data}
          onClose={onClose}
          onBusyChange={onBusyChange}
        />
      )}
      {query.isPending || query.isFetching || query.isError ? (
        <button
          type="button"
          onClick={onClose}
          className={`${secondaryButton} mt-3`}
        >
          Cancelar edición
        </button>
      ) : null}
    </section>
  );
}

function EditForm({
  id,
  data,
  onClose,
  onBusyChange,
}: {
  id: string;
  data: ReservationEditOptions;
  onClose: () => void;
  onBusyChange: (busy: boolean) => void;
}) {
  const schema = reservationEditSchema
    .refine((v) => v.quantity * data.unit_price >= data.deposit, {
      path: ["quantity"],
      message: "El total no puede ser menor que los abonos recibidos.",
    })
    .refine(
      (v) =>
        v.stock_status !== "reserved" ||
        data.stock_source !== "seller" ||
        data.lots.some(
          (lot) => lot.id === v.delivery_id && lot.variant_id === v.variant_id,
        ),
      {
        path: ["delivery_id"],
        message: "Selecciona una entrega para esta talla y color.",
      },
    );
  const form = useForm<
    z.input<typeof schema>,
    unknown,
    z.output<typeof schema>
  >({
    resolver: zodResolver(schema),
    defaultValues: {
      variant_id: data.variant_id,
      quantity: String(data.quantity),
      customer_name: data.customer_name,
      customer_phone: data.customer_phone,
      notes: data.notes,
      stock_status: data.stock_status,
      delivery_id: data.delivery_id ?? "",
    },
  });
  const values = useWatch({ control: form.control });
  const op = useOperation("reservation-edit", "Apartado actualizado");
  const protectedOperation = op.busy || op.uncertain;
  useEffect(() => {
    onBusyChange(protectedOperation);
    return () => onBusyChange(false);
  }, [onBusyChange, protectedOperation]);
  const submit = form.handleSubmit(async (v) => {
    if (
      await op.execute({
        ...v,
        order_id: id,
        version: data.version,
        delivery_id:
          v.stock_status === "reserved" && data.stock_source === "seller"
            ? v.delivery_id
            : "",
      })
    )
      onClose();
  });
  const errors = form.formState.errors;
  const total = (Number(values.quantity) || 0) * data.unit_price;
  return (
    <form onSubmit={submit} className="space-y-4">
      <fieldset disabled={protectedOperation} className="space-y-4">
        <FormField label="Talla y color" error={errors.variant_id?.message}>
          {(inputId, err) => (
            <select
              id={inputId}
              aria-describedby={err}
              {...form.register("variant_id")}
              className={fieldClass}
            >
              {!data.variants.some((v) => v.id === data.variant_id) ? (
                <option value={data.variant_id}>
                  Variante actual inactiva; elige otra
                </option>
              ) : null}
              {data.variants.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.color} · {v.size} · {v.sku}
                </option>
              ))}
            </select>
          )}
        </FormField>
        <FormField label="Cantidad de piezas" error={errors.quantity?.message}>
          {(inputId, err) => (
            <input
              id={inputId}
              inputMode="numeric"
              aria-describedby={err}
              {...form.register("quantity")}
              className={fieldClass}
            />
          )}
        </FormField>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Cliente" error={errors.customer_name?.message}>
            {(inputId, err) => (
              <input
                id={inputId}
                aria-describedby={err}
                maxLength={120}
                {...form.register("customer_name")}
                className={fieldClass}
              />
            )}
          </FormField>
          <FormField label="Teléfono" error={errors.customer_phone?.message}>
            {(inputId, err) => (
              <input
                id={inputId}
                type="tel"
                aria-describedby={err}
                maxLength={30}
                {...form.register("customer_phone")}
                className={fieldClass}
              />
            )}
          </FormField>
        </div>
        <FormField label="Notas" error={errors.notes?.message}>
          {(inputId, err) => (
            <textarea
              id={inputId}
              aria-describedby={err}
              maxLength={1000}
              {...form.register("notes")}
              className={fieldClass}
            />
          )}
        </FormField>
        <FormField label="Existencias" error={errors.stock_status?.message}>
          {(inputId) => (
            <select
              id={inputId}
              {...form.register("stock_status")}
              className={fieldClass}
            >
              <option value="waiting">Pendiente de existencia</option>
              <option value="reserved">Reservar piezas disponibles</option>
            </select>
          )}
        </FormField>
        {values.stock_status === "reserved" &&
        data.stock_source === "seller" ? (
          <FormField
            label="Entrega del vendedor"
            error={errors.delivery_id?.message}
          >
            {(inputId, err) => (
              <select
                id={inputId}
                aria-describedby={err}
                {...form.register("delivery_id")}
                className={fieldClass}
              >
                <option value="">Selecciona una entrega</option>
                {data.lots
                  .filter((lot) => lot.variant_id === values.variant_id)
                  .map((lot) => (
                    <option
                      key={lot.id}
                      value={lot.id}
                      disabled={
                        lot.available < Number(values.quantity) ||
                        lot.unit_price > data.unit_price
                      }
                    >
                      {formatDateTime(lot.created_at)} · {lot.available}{" "}
                      disponibles · ARMA {formatMoney(lot.unit_price)} c/u
                    </option>
                  ))}
              </select>
            )}
          </FormField>
        ) : null}
        <p className="text-sm leading-6 text-arma-muted">
          {values.stock_status === "waiting"
            ? "El pedido quedará pendiente de existencia. Si tenía piezas reservadas, se liberarán."
            : "Se validará la disponibilidad de la talla y cantidad elegidas antes de guardar."}{" "}
          Se conservan el precio acordado por pieza, los abonos y las fechas.
        </p>
      </fieldset>
      <div className="space-y-1 text-sm tabular-nums" aria-live="polite">
        <p>Precio por pieza: {formatMoney(data.unit_price)}</p>
        <p className="font-semibold">Nuevo total: {formatMoney(total)}</p>
        <p>
          Abonos: {formatMoney(data.deposit)} · Saldo:{" "}
          {formatMoney(total - data.deposit)}
        </p>
      </div>
      <OperationFeedback
        uncertain={op.uncertain}
        busy={op.busy}
        retry={() => {
          void op.retry().then((saved) => {
            if (saved) onClose();
          });
        }}
      />
      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={protectedOperation}
          className={primaryButton}
        >
          {op.busy ? "Guardando…" : "Guardar cambios"}
        </button>
        <button
          type="button"
          disabled={protectedOperation}
          onClick={onClose}
          className={secondaryButton}
        >
          Cancelar edición
        </button>
      </div>
    </form>
  );
}
