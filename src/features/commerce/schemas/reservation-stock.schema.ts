import { z } from "zod";
export const reservationStockOptionsSchema = z.object({
  source: z.enum(["warehouse", "seller"]),
  quantity: z.number().int().positive(),
  unit_price: z.number().positive(),
  available: z.number().int().nonnegative(),
  lots: z.array(
    z.object({
      id: z.uuid(),
      available: z.number().int().nonnegative(),
      unit_price: z.number().positive(),
      created_at: z.string(),
    }),
  ),
});
