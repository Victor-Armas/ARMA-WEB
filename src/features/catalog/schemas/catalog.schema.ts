import { z } from "zod";
export type CatalogKind = "product" | "material";
export const catalogVariantSchema = z.object({
  id: z.uuid(),
  sku: z.string(),
  size: z.string().nullable(),
  color: z.string().nullable(),
  description: z.string().nullable(),
  minimum_stock: z.number(),
  sale_price: z.number().optional(),
  estimated_cost: z.number().nullable().optional(),
  inventory_cost: z.number().nullable().optional(),
  width_cm: z.number().nullable().optional(),
  height_cm: z.number().nullable().optional(),
  available: z.number(),
  physical: z.number(),
  reserved: z.number(),
  is_active: z.boolean(),
});
export const catalogItemSchema = z.object({
  id: z.uuid(),
  kind: z.enum(["product", "material"]),
  name: z.string(),
  code: z.string(),
  description: z.string().nullable(),
  material_type: z.enum(["blank_shirt", "dtf_transfer"]).optional(),
  is_active: z.boolean(),
  created_by: z.uuid().nullable(),
  variants: z.array(catalogVariantSchema),
  images: z.array(
    z.object({
      id: z.uuid(),
      storage_path: z.string(),
      background: z.enum(["white", "gray", "black"]).default("white"),
      alt_text: z.string(),
      caption: z.string().nullable(),
    }),
  ),
});
export type CatalogItem = z.infer<typeof catalogItemSchema>;
export const catalogPageSchema = z.object({
  items: z.array(catalogItemSchema),
  total: z.number().int(),
  page: z.number().int(),
});
const decimal = z
  .string()
  .regex(/^\d+(\.\d{1,2})?$/, "Usa hasta dos decimales.")
  .refine((value) => Number(value) <= 999999, "Importe demasiado grande.");
const dimension = z
  .string()
  .refine(
    (value) =>
      value === "" ||
      (/^\d+(\.\d{1,2})?$/.test(value) &&
        Number(value) > 0 &&
        Number(value) <= 1000),
    "Usa una medida entre 0 y 1000 cm.",
  );
export const catalogFormSchema = z.object({
  id: z.uuid(),
  code: z
    .string()
    .trim()
    .min(2, "Escribe el código.")
    .max(50)
    .regex(/^[A-Za-z0-9_-]+$/, "Usa letras, números, guion o guion bajo."),
  name: z.string().trim().min(2, "Escribe el nombre.").max(120),
  description: z.string().trim().max(2000),
  material_type: z.enum(["blank_shirt", "dtf_transfer"]),
  variants: z
    .array(
      z.object({
        id: z.uuid(),
        sku: z.string().trim().min(2, "Escribe el SKU.").max(80),
        size: z.string().trim().max(20),
        color: z.string().trim().max(80),
        description: z.string().trim().max(1000),
        sale_price: decimal,
        minimum_stock: z
          .string()
          .regex(/^\d+$/, "Escribe un número entero.")
          .refine(
            (value) => Number(value) <= 100000,
            "Cantidad demasiado grande.",
          ),
        width_cm: dimension,
        height_cm: dimension,
      }),
    )
    .min(1, "Agrega una variante.")
    .max(30),
});
export type CatalogForm = z.infer<typeof catalogFormSchema>;
export function emptyVariant() {
  return {
    id: crypto.randomUUID(),
    sku: "",
    size: "M",
    color: "",
    description: "",
    sale_price: "300",
    minimum_stock: "0",
    width_cm: "",
    height_cm: "",
  };
}
export function catalogDefaults(item?: CatalogItem): CatalogForm {
  return {
    id: item?.id ?? crypto.randomUUID(),
    name: item?.name ?? "",
    code: item?.code ?? "",
    description: item?.description ?? "",
    material_type: item?.material_type ?? "blank_shirt",
    variants: item
      ? item.variants.map((variant) => ({
          id: variant.id,
          sku: variant.sku,
          size: variant.size ?? "",
          color: variant.color ?? "",
          description: variant.description ?? "",
          sale_price: String(variant.sale_price ?? 300),
          minimum_stock: String(variant.minimum_stock),
          width_cm:
            variant.width_cm === null || variant.width_cm === undefined
              ? ""
              : String(variant.width_cm),
          height_cm:
            variant.height_cm === null || variant.height_cm === undefined
              ? ""
              : String(variant.height_cm),
        }))
      : [emptyVariant()],
  };
}
