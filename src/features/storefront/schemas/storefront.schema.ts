import { z } from "zod";

export const publicVariantSchema = z.object({
  id: z.uuid(),
  size: z.string(),
  color: z.string(),
  description: z.string().nullable(),
  sale_price: z.number().finite().nonnegative(),
  regular_price: z.number().finite().nonnegative().optional(),
  currency: z.string().regex(/^[A-Z]{3}$/),
});
const imageSchema = z.object({
  id: z.uuid(),
  storage_path: z.string(),
  thumbnail_path: z.string().nullable(),
  alt_text: z.string(),
  caption: z.string().nullable(),
  background_color: z.enum(["white", "gray", "black"]),
});
export const storefrontPageSchema = z.object({
  page: z.number().int().positive(),
  page_size: z.literal(12),
  total: z.number().int().nonnegative(),
  sizes: z.array(z.string()),
  colors: z.array(z.string()),
  items: z.array(
    z.object({
      id: z.uuid(),
      name: z.string(),
      description: z.string().nullable(),
      promotion: z
        .object({
          label: z.string(),
          price: z.number().positive(),
          starts_on: z.string().nullable(),
          ends_on: z.string().nullable(),
        })
        .nullable()
        .optional(),
      variants: z.array(publicVariantSchema),
      images: z.array(imageSchema),
    }),
  ),
});
export type PublicVariant = z.infer<typeof publicVariantSchema>;
export interface CatalogFilters {
  page: number;
  search: string;
  size: string;
  color: string;
}
export type StorefrontProduct = z.infer<
  typeof storefrontPageSchema
>["items"][number] & {
  photos: {
    id: string;
    url: string | null;
    alt: string;
    caption: string | null;
    background: "white" | "gray" | "black";
  }[];
};
export interface StorefrontPage {
  page: number;
  page_size: 12;
  total: number;
  sizes: string[];
  colors: string[];
  items: StorefrontProduct[];
}
