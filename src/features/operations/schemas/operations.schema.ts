import { z } from "zod";
export const moneyInput = z
  .string()
  .trim()
  .regex(/^\d+(\.\d{1,2})?$/, "Escribe un importe con hasta dos decimales.")
  .transform(Number)
  .pipe(z.number().finite().min(0).max(999999));
export const quantityInput = z
  .string()
  .regex(/^\d+$/, "Escribe una cantidad entera.")
  .transform(Number)
  .pipe(z.number().int().min(1).max(10000));
export const workshopPhotoSchema = z
  .object({ path: z.string(), background: z.enum(["white", "gray", "black"]) })
  .nullable()
  .default(null);
export const workshopImageFields = {
  photo: workshopPhotoSchema,
  photo_url: z.string().nullable().default(null),
};
export const variantOptionSchema = z.object({
  id: z.uuid(),
  ...workshopImageFields,
  estimated_cost: z.number().nullable().default(null),
  catalog_price: z.number().nonnegative().nullable().default(null),
  label: z.string(),
  description: z.string(),
  type: z.string(),
  available: z.number(),
  cost: z.number().nullable(),
});
export type VariantOption = z.infer<typeof variantOptionSchema>;
export const recipeLineSchema = z.object({
  ...workshopImageFields,
  inventory_cost: z.number().nullable().default(null),
  material_variant_id: z.uuid(),
  quantity: z.number().int().positive(),
  label: z.string(),
  description: z.string(),
  available: z.number(),
  cost: z.number().nullable(),
  active: z.boolean(),
});
export const recipeSchema = z.object({
  recipe: z
    .object({
      labor_cost: z.number(),
      target_margin: z.number(),
      electricity_cost: z.number().default(0),
      tape_cost: z.number().default(0),
      other_cost: z.number().default(0),
    })
    .nullable(),
  lines: z.array(recipeLineSchema),
});
export type Recipe = z.infer<typeof recipeSchema>;
export const recipeFormSchema = z.object({
  electricity_cost: moneyInput,
  tape_cost: moneyInput,
  other_cost: moneyInput,
  labor_cost: moneyInput,
  target_margin: moneyInput.pipe(
    z.number().lt(100, "El margen debe ser menor que 100%."),
  ),
  lines: z
    .array(
      z.object({
        material_variant_id: z.uuid("Selecciona un insumo."),
        quantity: quantityInput.pipe(z.number().max(1000)),
      }),
    )
    .min(1)
    .max(30),
});
export type RecipeFormInput = z.input<typeof recipeFormSchema>;
export type RecipeFormValues = z.output<typeof recipeFormSchema>;
export const receiptFormSchema = z.object({
  variant_id: z.uuid("Selecciona una variante."),
  quantity: quantityInput,
  unit_cost: moneyInput,
  supplier: z.string().trim().max(120),
  reference: z.string().trim().max(200),
});
export const valuationFormSchema = z.object({
  variant_id: z.uuid("Selecciona una variante."),
  unit_cost: moneyInput,
  reason: z.string().trim().min(3, "Explica el motivo.").max(500),
});
export const productionFormSchema = z.object({
  quantity: quantityInput,
  notes: z.string().trim().max(1000),
});
export const productionOrderSchema = z.object({
  ...workshopImageFields,
  electricity_cost: z.number().default(0),
  tape_cost: z.number().default(0),
  other_cost: z.number().default(0),
  id: z.uuid(),
  order_number: z.number(),
  label: z.string(),
  status: z.enum(["draft", "completed", "cancelled"]),
  planned_quantity: z.number(),
  actual_quantity: z.number().nullable(),
  created_at: z.string(),
  notes: z.string().nullable(),
  unit_cost: z.number().nullable(),
  inputs: z.array(
    z.object({
      label: z.string(),
      description: z.string(),
      quantity: z.number(),
      ...workshopImageFields,
      per_unit: z.number(),
      unit_cost: z.number().nullable(),
    }),
  ),
});
export type ProductionOrder = z.infer<typeof productionOrderSchema>;
export const receiptSchema = z.object({
  id: z.uuid(),
  label: z.string(),
  quantity: z.number(),
  unit_cost: z.number(),
  supplier: z.string(),
  reference: z.string(),
  created_at: z.string(),
});
export const receiptPageSchema = z.object({
  total: z.number(),
  items: z.array(receiptSchema),
});
export const productionPageSchema = z.object({
  total: z.number(),
  items: z.array(productionOrderSchema),
});
export type WorkshopAction =
  | "receive"
  | "value"
  | "recipe"
  | "start"
  | "finish"
  | "cancel";
export type OperationPayload = Record<
  string,
  | string
  | number
  | boolean
  | { material_variant_id: string; quantity: number }[]
>;

export const recipesPageSchema = z.object({
  total: z.number(),
  page: z.number(),
  ready: z.number(),
  missing: z.number(),
  items: z.array(
    variantOptionSchema.extend({ configured: z.boolean(), inputs: z.number() }),
  ),
});
export const productionBoardSchema = productionPageSchema.extend({
  page: z.number(),
  counts: z.object({
    draft: z.number(),
    completed: z.number(),
    cancelled: z.number(),
  }),
});
export type ProductionStatus = "draft" | "completed" | "cancelled";
