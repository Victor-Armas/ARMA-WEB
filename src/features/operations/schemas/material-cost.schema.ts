import { z } from "zod";
const optionalDecimal = z
  .string()
  .trim()
  .refine(
    (v) => v === "" || (/^\d+(\.\d{1,2})?$/.test(v) && Number(v) <= 999999),
    "Usa un número positivo con hasta dos decimales.",
  );
export const materialCostFormSchema = z
  .object({
    method: z.enum(["manual", "area"]),
    manual_cost: optionalDecimal,
    sheet_price: optionalDecimal,
    sheet_width_cm: optionalDecimal,
    sheet_length_cm: optionalDecimal,
    design_width_cm: optionalDecimal,
    design_height_cm: optionalDecimal,
    waste_percent: optionalDecimal,
    apply_inventory: z.boolean(),
  })
  .superRefine((v, ctx) => {
    if (v.method === "manual" && v.manual_cost === "")
      ctx.addIssue({
        code: "custom",
        path: ["manual_cost"],
        message: "Escribe el costo por pieza.",
      });
    if (v.method === "area") {
      for (const key of [
        "sheet_price",
        "sheet_width_cm",
        "sheet_length_cm",
        "design_width_cm",
        "design_height_cm",
      ] as const)
        if (Number(v[key]) <= 0)
          ctx.addIssue({
            code: "custom",
            path: [key],
            message: "Escribe una medida o precio mayor que cero.",
          });
      if (v.waste_percent === "" || Number(v.waste_percent) > 100)
        ctx.addIssue({
          code: "custom",
          path: ["waste_percent"],
          message: "La merma debe estar entre 0 y 100%.",
        });
      if (
        Number(v.sheet_width_cm) > 1000 ||
        Number(v.sheet_length_cm) > 10000 ||
        Number(v.design_width_cm) > 1000 ||
        Number(v.design_height_cm) > 1000
      )
        ctx.addIssue({
          code: "custom",
          path: ["design_width_cm"],
          message: "Revisa las medidas en centímetros.",
        });
      const dw = Number(v.design_width_cm),
        dh = Number(v.design_height_cm),
        sw = Number(v.sheet_width_cm),
        sl = Number(v.sheet_length_cm);
      if (
        dw > 0 &&
        dh > 0 &&
        sw > 0 &&
        sl > 0 &&
        !((dw <= sw && dh <= sl) || (dh <= sw && dw <= sl))
      )
        ctx.addIssue({
          code: "custom",
          path: ["design_width_cm"],
          message: "El diseño no cabe en el formato, ni al rotarlo.",
        });
    }
  });
export type MaterialCostForm = z.infer<typeof materialCostFormSchema>;
const nullableNumber = z.number().nullable();
export const materialCostProfileSchema = z.object({
  profile: z
    .object({
      method: z.enum(["manual", "area"]),
      manual_cost: nullableNumber,
      sheet_price: nullableNumber,
      sheet_width_cm: nullableNumber,
      sheet_length_cm: nullableNumber,
      design_width_cm: nullableNumber,
      design_height_cm: nullableNumber,
      waste_percent: z.number(),
      unit_cost: z.number(),
    })
    .nullable(),
  inventory_cost: nullableNumber,
  dimensions: z
    .object({ width: nullableNumber, height: nullableNumber })
    .nullable(),
});
export type MaterialCostProfile = z.infer<typeof materialCostProfileSchema>;
