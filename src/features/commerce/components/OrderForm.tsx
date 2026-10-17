import { DataPrivacyNotice } from "@/features/legal/components/DataPrivacyNotice";
import { useAppAccess } from "@/features/access/hooks/useAppAccess";
import { useEffect, useRef } from "react";
import { Link } from "react-router";
import type { ProductVariant } from "@/features/products/schemas/product.schema";
import { getAvailableQuantity } from "@/features/products/utils/product-stock";
import type { OrderKind } from "../schemas/commerce.schema";
import { useOrderForm } from "../hooks/useOrderForm";
import { FormField } from "./FormField";
import {
  fieldClass,
  primaryButton,
  secondaryButton,
  formatMoney,
  todayInMonterrey,
  paymentLabels,
} from "../utils/commerce-format";

interface OrderFormProps {
  kind: OrderKind;
  variant: ProductVariant;
  productName: string;
  onClose: () => void;
  delivery?: { id: string; unit_price: number; available: number };
  onBusyChange?: (value: boolean) => void;
  stockMode?: "reserved" | "waiting";
  stockSource?: "warehouse" | "seller";
}
export function OrderForm({
  kind,
  variant,
  productName,
  onClose,
  delivery,
  onBusyChange,
  stockMode = "reserved",
  stockSource = "warehouse",
}: OrderFormProps) {
  const access = useAppAccess();
  const { form, values, total, submit, pending, locked } = useOrderForm(
    kind,
    variant.id,
    variant.sale_price,
    delivery?.available ?? getAvailableQuantity(variant),
    onClose,
    delivery,
    delivery || stockSource === "seller"
      ? (variant.seller_price ?? undefined)
      : undefined,
    stockMode,
    stockSource,
  );
  useEffect(() => {
    onBusyChange?.(pending || locked);
  }, [onBusyChange, pending, locked]);
  const titleRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    titleRef.current?.focus();
  }, []);
  const {
    register,
    formState: { errors },
  } = form;
  return (
    <section className="min-w-0" aria-labelledby="order-form-title">
      <h2
        ref={titleRef}
        tabIndex={-1}
        id="order-form-title"
        className="text-xl font-semibold focus:outline-none"
      >
        {kind === "sale" ? "Registrar venta" : "Crear apartado"}
      </h2>
      <p className="mt-2 text-sm text-arma-muted">
        {productName} · {variant.color} · {variant.size}
      </p>
      {delivery &&
      variant.seller_price !== null &&
      variant.seller_price < delivery.unit_price ? (
        <p className="mt-3 rounded-arma bg-arma-warning-soft p-3 text-sm leading-6 text-arma-warning">
          Tu precio habitual es menor que el importe para ARMA de esta entrega.
          Ajusta el precio de esta operación antes de confirmar; tu precio
          guardado no cambiará.
        </p>
      ) : null}
      <div className="mt-4">
        <DataPrivacyNotice />
      </div>
      <form onSubmit={submit} noValidate className="mt-5 space-y-5">
        <fieldset
          disabled={pending || locked}
          className="space-y-5 disabled:opacity-70"
        >
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Cantidad" error={errors.quantity?.message}>
              {(id, errorId) => (
                <input
                  {...register("quantity")}
                  id={id}
                  aria-describedby={errorId}
                  aria-invalid={Boolean(errorId)}
                  type="number"
                  min="1"
                  max={
                    stockMode === "waiting"
                      ? 10000
                      : (delivery?.available ?? getAvailableQuantity(variant))
                  }
                  step="1"
                  className={fieldClass}
                />
              )}
            </FormField>
            <FormField
              label="Precio por pieza (MXN)"
              error={errors.unit_price?.message}
            >
              {(id, errorId) => (
                <input
                  {...register("unit_price")}
                  id={id}
                  aria-describedby={errorId}
                  aria-invalid={Boolean(errorId)}
                  type="number"
                  min="0.01"
                  max="999999"
                  step="0.01"
                  inputMode="decimal"
                  className={fieldClass}
                />
              )}
            </FormField>
          </div>
          <p className="text-xs text-arma-muted">
            Precio de catálogo: {formatMoney(variant.sale_price)}. Puedes
            ajustar el precio por negociación.
          </p>
          <FormField
            label={
              kind === "reservation"
                ? "Nombre del cliente"
                : "Nombre del cliente (opcional)"
            }
            error={errors.customer_name?.message}
          >
            {(id, errorId) => (
              <input
                {...register("customer_name")}
                id={id}
                aria-describedby={errorId}
                aria-invalid={Boolean(errorId)}
                maxLength={120}
                autoComplete="name"
                className={fieldClass}
              />
            )}
          </FormField>
          <FormField
            label="Teléfono (opcional)"
            error={errors.customer_phone?.message}
          >
            {(id, errorId) => (
              <input
                {...register("customer_phone")}
                id={id}
                aria-describedby={errorId}
                aria-invalid={Boolean(errorId)}
                type="tel"
                maxLength={30}
                autoComplete="tel"
                className={fieldClass}
              />
            )}
          </FormField>
          {kind === "reservation" ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                label="Pago inicial (MXN, opcional)"
                error={errors.deposit?.message}
              >
                {(id, errorId) => (
                  <input
                    {...register("deposit")}
                    id={id}
                    aria-describedby={errorId}
                    aria-invalid={Boolean(errorId)}
                    type="number"
                    min="0"
                    step="0.01"
                    inputMode="decimal"
                    className={fieldClass}
                  />
                )}
              </FormField>
              <FormField
                label="Fecha límite de pago (opcional)"
                error={errors.due_date?.message}
              >
                {(id, errorId) => (
                  <input
                    {...register("due_date")}
                    id={id}
                    aria-describedby={errorId}
                    aria-invalid={Boolean(errorId)}
                    type="date"
                    min={todayInMonterrey()}
                    className={fieldClass}
                  />
                )}
              </FormField>
            </div>
          ) : null}
          {kind === "reservation" ? (
            <FormField
              label="Compromiso de entrega (opcional)"
              error={errors.delivery_date?.message}
            >
              {(id, errorId) => (
                <input
                  {...register("delivery_date")}
                  id={id}
                  aria-describedby={errorId}
                  aria-invalid={Boolean(errorId)}
                  type="date"
                  min={todayInMonterrey()}
                  className={fieldClass}
                />
              )}
            </FormField>
          ) : null}
          {kind === "sale" || Number(values.deposit) > 0 ? (
            <FormField
              label="Forma de pago"
              error={errors.payment_method?.message}
            >
              {(id, errorId) => (
                <select
                  {...register("payment_method")}
                  id={id}
                  aria-describedby={errorId}
                  className={fieldClass}
                >
                  {Object.entries(paymentLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              )}
            </FormField>
          ) : null}
          <FormField label="Notas (opcional)" error={errors.notes?.message}>
            {(id, errorId) => (
              <textarea
                {...register("notes")}
                id={id}
                aria-describedby={errorId}
                aria-invalid={Boolean(errorId)}
                maxLength={1000}
                rows={3}
                className={fieldClass}
              />
            )}
          </FormField>
        </fieldset>
        <dl className="flex flex-wrap justify-between gap-4 border-y border-arma-border py-4 tabular-nums">
          <div>
            <dt className="text-xs text-arma-muted">Total</dt>
            <dd className="mt-1 text-xl font-semibold">{formatMoney(total)}</dd>
          </div>
          {kind === "reservation" ? (
            <div>
              <dt className="text-xs text-arma-muted">Saldo pendiente</dt>
              <dd className="mt-1 text-xl font-semibold">
                {formatMoney(
                  Math.max(0, total - (Number(values.deposit) || 0)),
                )}
              </dd>
            </div>
          ) : null}
        </dl>
        {delivery ? (
          <dl className="grid gap-4 rounded-arma bg-arma-green-soft p-4 text-arma-green sm:grid-cols-2">
            <div>
              <dt className="text-xs">Importe para ARMA</dt>
              <dd className="mt-1 text-lg font-semibold">
                {formatMoney(
                  delivery.unit_price * (Number(values.quantity) || 0),
                )}
              </dd>
            </div>
            <div>
              <dt className="text-xs">
                Tu ganancia{" "}
                {kind === "reservation" ? "al completar" : "antes de gastos"}
              </dt>
              <dd className="mt-1 text-lg font-semibold">
                {formatMoney(
                  total - delivery.unit_price * (Number(values.quantity) || 0),
                )}
              </dd>
            </div>
          </dl>
        ) : null}
        <p className="text-xs leading-5 text-arma-muted">
          {kind === "sale"
            ? "Confirma después de recibir el pago. Se descontarán las piezas del stock físico."
            : stockMode === "waiting"
              ? "El anticipo registra dinero recibido. Este pedido queda pendiente de existencia y todavía no reserva piezas."
              : "El pago inicial registra dinero recibido. Las piezas se reservan hasta completar o cancelar el apartado."}
        </p>
        {locked && !pending ? (
          <p className="text-xs text-arma-muted">
            La operación necesita confirmación. Reintenta con los mismos datos
            para evitar un registro duplicado.
          </p>
        ) : null}
        {errors.root?.server?.message ? (
          <p role="alert" className="text-sm text-arma-red">
            {errors.root.server.message}
          </p>
        ) : null}
        <div className="flex flex-wrap gap-3">
          <button type="submit" disabled={pending} className={primaryButton}>
            {pending
              ? "Guardando…"
              : kind === "sale"
                ? "Confirmar venta"
                : stockMode === "waiting"
                  ? "Guardar pedido pendiente"
                  : "Confirmar apartado"}
          </button>
          <button
            type="button"
            disabled={pending || locked}
            onClick={onClose}
            className={secondaryButton}
          >
            Cancelar
          </button>
        </div>
        {!pending &&
        !locked &&
        access.can(kind === "sale" ? "sales.read" : "reservations.read") ? (
          <Link
            to={kind === "sale" ? "/sales" : "/reservations"}
            className="inline-block text-sm text-arma-active underline underline-offset-4"
          >
            Ver {kind === "sale" ? "ventas" : "apartados"}
          </Link>
        ) : null}
      </form>
    </section>
  );
}
