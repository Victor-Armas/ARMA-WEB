import { z } from "zod";
const photo = z
  .object({ path: z.string(), background: z.enum(["white", "gray", "black"]) })
  .nullable();
export const sellerOverviewSchema = z.object({
  seller_id: z.uuid(),
  manager: z.boolean(),
  summary: z.object({
    due: z.number(),
    purchases: z.number().default(0),
    consignment_owed: z.number().default(0),
    earned: z.number(),
    revenue: z.number(),
    owed: z.number(),
    paid: z.number(),
    sold: z.number(),
    physical: z.number(),
    reserved: z.number(),
    advances: z.number(),
  }),
  people: z.array(
    z.object({ id: z.uuid(), name: z.string(), active: z.boolean() }),
  ),
  total: z.number(),
  payments_total: z.number(),
  deliveries: z.array(
    z.object({
      id: z.uuid(),
      created_at: z.string(),
      label: z.string(),
      product_id: z.uuid(),
      quantity: z.number(),
      unit_price: z.number(),
      payment_terms: z
        .enum(["consignment", "paid", "credit"])
        .default("consignment"),
      initial_paid: z.number().default(0),
      physical: z.number(),
      reserved: z.number(),
      available: z.number(),
      returned: z.number(),
      notes: z.string(),
      photo,
      photo_url: z.string().nullable().optional(),
    }),
  ),
  payments: z.array(
    z.object({
      id: z.uuid(),
      amount: z.number(),
      direction: z.enum(["payment", "refund"]),
      method: z.enum(["cash", "transfer", "card"]),
      reference: z.string(),
      created_at: z.string(),
    }),
  ),
});
export type SellerOverview = z.infer<typeof sellerOverviewSchema>;
export type SellerDelivery = SellerOverview["deliveries"][number];
export const sellerFormSchema = z
  .object({
    action: z.enum(["deliver", "return", "payment", "refund"]),
    payment_terms: z.enum(["consignment", "paid", "credit"]),
    variant_id: z.string(),
    quantity: z.string(),
    unit_price: z.string(),
    amount: z.string(),
    method: z.enum(["cash", "transfer", "card"]),
    reference: z.string().trim().max(200),
    notes: z.string().trim().max(500),
  })
  .superRefine((v, ctx) => {
    if (v.action === "deliver" && !z.uuid().safeParse(v.variant_id).success)
      ctx.addIssue({
        code: "custom",
        path: ["variant_id"],
        message: "Selecciona una variante.",
      });
    if (
      (v.action === "deliver" || v.action === "return") &&
      !/^\d+$/.test(v.quantity)
    )
      ctx.addIssue({
        code: "custom",
        path: ["quantity"],
        message: "Escribe una cantidad entera.",
      });
    if (
      (v.action === "deliver" || v.action === "return") &&
      (Number(v.quantity) < 1 || Number(v.quantity) > 10000)
    )
      ctx.addIssue({
        code: "custom",
        path: ["quantity"],
        message: "Usa una cantidad entre 1 y 10,000.",
      });
    const key = v.action === "deliver" ? "unit_price" : "amount";
    if (
      v.action !== "return" &&
      (!/^\d+(\.\d{1,2})?$/.test(v[key]) ||
        Number(v[key]) <= 0 ||
        Number(v[key]) > (key === "unit_price" ? 999999 : 99999999))
    )
      ctx.addIssue({
        code: "custom",
        path: [key],
        message:
          "Escribe un importe válido mayor que cero, con hasta dos decimales.",
      });
  });
export type SellerForm = z.infer<typeof sellerFormSchema>;

export const paymentTermsLabels = {
  consignment: "Consignación · Se paga al vender",
  paid: "Compra · Pagada al entregar",
  credit: "Compra a crédito · Se paga después",
};
