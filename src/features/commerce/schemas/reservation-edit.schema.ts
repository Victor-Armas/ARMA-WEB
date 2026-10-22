import { z } from "zod";
import { quantityInput } from "@/features/operations/schemas/operations.schema";

export const reservationEditSchema = z.object({
  variant_id: z.uuid("Selecciona una talla y color."),
  quantity: quantityInput,
  customer_name: z
    .string()
    .trim()
    .min(1, "Escribe el nombre del cliente.")
    .max(120),
  customer_phone: z.string().trim().max(30),
  notes: z.string().trim().max(1000),
  stock_status: z.enum(["waiting", "reserved"]),
  delivery_id: z.union([z.literal(""), z.uuid()]),
});

export const reservationEditOptionsSchema = z.object({
  version: z.string(),
  variant_id: z.uuid(),
  quantity: z.number().int().positive(),
  unit_price: z.number().positive(),
  customer_name: z.string(),
  customer_phone: z.string(),
  notes: z.string(),
  deposit: z.number().nonnegative(),
  stock_status: z.enum(["waiting", "reserved"]),
  stock_source: z.enum(["warehouse", "seller"]),
  delivery_id: z.uuid().nullable(),
  variants: z.array(
    z.object({
      id: z.uuid(),
      size: z.string(),
      color: z.string(),
      sku: z.string(),
    }),
  ),
  lots: z.array(
    z.object({
      id: z.uuid(),
      variant_id: z.uuid(),
      available: z.number().int().nonnegative(),
      unit_price: z.number().positive(),
      created_at: z.string(),
    }),
  ),
});
export type ReservationEditOptions = z.infer<
  typeof reservationEditOptionsSchema
>;
