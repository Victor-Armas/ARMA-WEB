import { z } from "zod";
import {
  moneyInput,
  quantityInput,
} from "@/features/operations/schemas/operations.schema";
export const paymentFormSchema = z.object({
  amount: moneyInput.refine((v) => v > 0, "El abono debe ser mayor que cero."),
  method: z.enum(["cash", "transfer", "card"]),
});
export const returnFormSchema = z.object({
  item_id: z.uuid("Selecciona un producto."),
  quantity: quantityInput,
  amount: moneyInput,
  method: z.enum(["cash", "transfer", "card"]),
  restock: z.boolean(),
  reason: z.string().trim().min(3, "Explica el motivo.").max(500),
  confirmed: z.literal(true, {
    error: "Confirma que el reembolso se realizó.",
  }),
});
export const commerceHistorySchema = z.object({
  payments: z.array(
    z.object({
      id: z.uuid(),
      amount: z.number(),
      method: z.enum(["cash", "transfer", "card"]),
      kind: z.enum(["sale", "deposit", "payment", "cancellation", "return"]),
      created_at: z.string(),
      reference: z.string(),
    }),
  ),
  returns: z.array(
    z.object({
      id: z.uuid(),
      item_id: z.uuid(),
      quantity: z.number(),
      restock: z.boolean(),
      refund: z.number(),
      method: z.enum(["cash", "transfer", "card"]),
      reason: z.string(),
      created_at: z.string(),
    }),
  ),
});
export type CommerceHistory = z.infer<typeof commerceHistorySchema>;
