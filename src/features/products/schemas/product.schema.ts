import { z } from "zod";

const balanceSchema = z.object({
  physical_quantity: z.number().int().nonnegative(),
  reserved_quantity: z.number().int().nonnegative(),
  available_quantity: z.number().int().nonnegative(),
});

const variantSchema = z.object({
  id: z.uuid(),
  sku: z.string(),
  size: z.string(),
  color: z.string(),
  sale_price: z.number().nonnegative(),
  currency: z.string().regex(/^[A-Z]{3}$/),
  inventory_balances: z.array(balanceSchema),
});

const coverSchema = z.object({
  storage_bucket: z.literal("inventory-images"),
  storage_path: z.string(),
  thumbnail_path: z.string().nullable().optional(),
  alt_text: z.string(),
});

export const productRowsSchema = z.array(
  z.object({
    id: z.uuid(),
    name: z.string(),
    code: z.string(),
    is_demo: z.boolean(),
    product_images: z.array(coverSchema),
    product_variants: z.array(variantSchema),
  }),
);

export type ProductVariant = z.infer<typeof variantSchema>;

export interface Product {
  id: string;
  name: string;
  code: string;
  isDemo: boolean;
  coverUrl: string | null;
  coverAlt: string;
  variants: ProductVariant[];
}


export const productDetailRowSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  code: z.string(),
  description: z.string().nullable(),
  is_demo: z.boolean(),
  product_variants: z.array(variantSchema),
  product_images: z.array(coverSchema.extend({
    id: z.uuid(),
    caption: z.string().nullable(),
    sort_order: z.number().int().nonnegative(),
    is_cover: z.boolean(),
  })),
});


export const productsPageSchema = z.object({
  items: productRowsSchema,
  total: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  page_size: z.literal(12),
});

export interface ProductsPageData {
  items: Product[];
  total: number;
  page: number;
  imageRefreshAt: number | null;
}
