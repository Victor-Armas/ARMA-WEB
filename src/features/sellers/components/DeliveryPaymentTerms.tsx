import type { UseFormRegister } from "react-hook-form";
import type { SellerForm } from "../schemas/seller.schema";
export function DeliveryPaymentTerms({
  register,
}: {
  register: UseFormRegister<SellerForm>;
}) {
  return (
    <fieldset>
      <legend className="text-sm font-semibold">
        ¿Cómo paga esta entrega?
      </legend>
      <div className="mt-3 space-y-2">
        {(
          [
            {
              value: "paid",
              label: "Pagado al entregar",
              description:
                "El vendedor compra la mercancía y ya recibiste el pago completo.",
            },
            {
              value: "credit",
              label: "Compra con pago pendiente",
              description:
                "Debe el total desde la entrega, aunque todavía no haya revendido las piezas.",
            },
            {
              value: "consignment",
              label: "Consignación: paga al vender",
              description:
                "Solo debe el importe de las piezas que vaya vendiendo.",
            },
          ] as const
        ).map((option) => (
          <label
            key={option.value}
            className="flex min-h-11 cursor-pointer items-start gap-3 rounded-arma border border-arma-border p-3 has-checked:border-arma-active has-checked:bg-arma-primary-soft"
          >
            <input
              type="radio"
              value={option.value}
              {...register("payment_terms")}
              className="mt-0.5 size-5 shrink-0 accent-arma-active"
            />
            <span>
              <span className="block text-sm font-semibold">
                {option.label}
              </span>
              <span className="mt-1 block text-xs leading-5 text-arma-muted">
                {option.description}
              </span>
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
