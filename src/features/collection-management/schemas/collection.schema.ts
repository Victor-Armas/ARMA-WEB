import { z } from "zod";
export const settingsFields = {
  published: z.boolean(),
  headline_1: z
    .string()
    .trim()
    .min(1, "Escribe el título.")
    .max(40, "Usa hasta 40 caracteres."),
  headline_2: z
    .string()
    .trim()
    .min(1, "Escribe el título.")
    .max(40, "Usa hasta 40 caracteres."),
  headline_3: z
    .string()
    .trim()
    .min(1, "Escribe el título.")
    .max(40, "Usa hasta 40 caracteres."),
  intro: z.string().trim().min(1, "Escribe la bienvenida.").max(240),
  offers_title: z
    .string()
    .trim()
    .min(1, "Escribe el título de ofertas.")
    .max(80),
};
export const featuredSchema = z.object({
  product_id: z.uuid("Selecciona un modelo."),
  image_id: z.uuid().nullable(),
});
export const collectionFormSchema = z
  .object({ ...settingsFields, featured: z.array(featuredSchema).length(4) })
  .refine((v) => new Set(v.featured.map((f) => f.product_id)).size === 4, {
    message: "Selecciona cuatro modelos distintos.",
    path: ["featured"],
  });
export const offerFormSchema = z
  .object({
    product_id: z.uuid("Selecciona un modelo."),
    label: z
      .string()
      .trim()
      .min(1, "Escribe el nombre de la promoción.")
      .max(60),
    price: z
      .number("Escribe un precio válido.")
      .finite()
      .positive("El precio debe ser mayor a cero.")
      .max(1000000)
      .refine(
        (v) => Math.abs(v * 100 - Math.round(v * 100)) < 0.000001,
        "Usa hasta dos decimales.",
      ),
    starts_on: z.string().regex(/^$|^\d{4}-\d{2}-\d{2}$/),
    ends_on: z.string().regex(/^$|^\d{4}-\d{2}-\d{2}$/),
    is_active: z.boolean(),
  })
  .refine((v) => !v.starts_on || !v.ends_on || v.ends_on >= v.starts_on, {
    message: "El fin debe ser igual o posterior al inicio.",
    path: ["ends_on"],
  });
export const offerSchema = z.object({
  product_id: z.uuid(),
  label: z.string(),
  price: z.number(),
  starts_on: z.string().nullable(),
  ends_on: z.string().nullable(),
  is_active: z.boolean(),
  updated_at: z.string(),
});
export const adminSchema = z.object({
  settings: z.object({ ...settingsFields, updated_at: z.string() }),
  featured: z.array(featuredSchema.extend({ position: z.number() })),
  offers: z.array(offerSchema),
  products: z.array(
    z.object({
      id: z.uuid(),
      name: z.string(),
      is_active: z.boolean(),
      base_price: z.number().nullable(),
      currency: z.string().nullable(),
      currency_count: z.number(),
      images: z.array(
        z.object({
          id: z.uuid(),
          storage_path: z.string(),
          alt_text: z.string(),
          background_color: z.enum(["white", "gray", "black"]),
        }),
      ),
    }),
  ),
});
export type CollectionForm = z.infer<typeof collectionFormSchema>;
export type OfferForm = z.infer<typeof offerFormSchema>;
export type CollectionOffer = z.infer<typeof offerSchema>;
export type CollectionAdmin = z.infer<typeof adminSchema>;
export const canManageCollection = (
  data: { roles: string[]; permissions: string[] } | undefined,
) =>
  Boolean(
    data?.permissions.includes("collection.manage") &&
    data.roles.some((r) => r === "owner" || r === "admin"),
  );
