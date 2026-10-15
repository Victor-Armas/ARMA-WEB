import { z } from "zod";
export const personalPriceSchema = z.object({
  price: z
    .string()
    .trim()
    .regex(/^\d+(\.\d{1,2})?$/, "Usa un precio con hasta dos decimales.")
    .transform(Number)
    .pipe(
      z
        .number()
        .finite()
        .positive("El precio debe ser mayor que cero.")
        .max(999999),
    ),
});
export type PersonalPriceInput = z.input<typeof personalPriceSchema>;
export type PersonalPriceValues = z.output<typeof personalPriceSchema>;
