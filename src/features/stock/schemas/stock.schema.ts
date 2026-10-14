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
  alt_text: z.string(),
});

export const stockRowsSchema = z.array(
  z.object({
    id: z.uuid(),
    name: z.string(),
    code: z.string(),
    is_demo: z.boolean(),
    product_images: z.array(coverSchema),
    product_variants: z.array(variantSchema),
  }),
);

export type StockVariant = z.infer<typeof variantSchema>;

export interface StockProduct {
  id: string;
  name: string;
  code: string;
  isDemo: boolean;
  coverUrl: string | null;
  coverAlt: string;
  variants: StockVariant[];
}
