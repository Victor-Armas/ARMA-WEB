import { z } from "zod";
const amount = z.number();
export const dashboardSchema = z.object({
  mode: z.enum(["business", "personal"]),
  personal: z
    .object({
      profit: amount.nullable(),
      contract_cost: amount.nullable(),
      unknown_pieces: amount,
      previous: z.object({
        from: z.string(),
        to: z.string(),
        sale_count: amount,
        sales: amount,
        profit: amount.nullable(),
        unknown_pieces: amount,
      }),
      series: z.array(
        z.object({ date: z.string(), profit: amount.nullable() }),
      ),
    })
    .nullable(),
  company: z
    .object({
      revenue: amount,
      known_cost: amount,
      known_margin: amount,
      unknown_cost_pieces: amount,
      received: amount,
      refunded: amount,
      net_receipts: amount,
      series: z.array(
        z.object({
          date: z.string(),
          revenue: amount,
          margin: amount,
          receipts: amount,
        }),
      ),
      payments: z.array(
        z.object({
          method: z.enum(["cash", "transfer", "card"]),
          received: amount,
          refunded: amount,
          net: amount,
        }),
      ),
    })
    .nullable(),
  scope: z.string(),
  finance: z.boolean(),
  sales: amount,
  sale_count: amount,
  pieces: amount,
  average_price: amount,
  catalog_value: amount,
  receipts: amount,
  refunds: amount,
  net_receipts: amount,
  returned_pieces: amount,
  sales_refunds: amount,
  balance: amount,
  pending_reservations: amount,
  overdue: amount,
  available: amount.nullable(),
  production_pending: amount.nullable(),
  known_cost: amount.nullable(),
  unknown_cost_pieces: amount.nullable(),
  known_gross_margin: amount.nullable(),
  material_purchases: amount.nullable(),
  payments: z.array(
    z.object({
      method: z.enum(["cash", "transfer", "card"]),
      received: amount,
      refunded: amount,
      net: amount,
    }),
  ),
  series: z.array(
    z.object({ date: z.string(), sales: amount, receipts: amount }),
  ),
  top_products: z.array(
    z.object({ name: z.string(), pieces: amount, revenue: amount }),
  ),
  recent: z.array(
    z.object({
      id: z.uuid(),
      order_number: amount,
      kind: z.enum(["sale", "reservation"]),
      status: z.string(),
      customer_name: z.string(),
      total: amount,
      deposit: amount,
      created_at: z.string(),
      seller_name: z.string(),
    }),
  ),
  prices: z.array(
    z.object({
      id: z.uuid(),
      label: z.string(),
      catalog_price: amount,
      actual_price: amount.nullable(),
      labor_cost: amount.nullable(),
      expenses: amount.nullable().optional(),
      target_margin: amount.nullable(),
      cost: amount.nullable(),
    }),
  ),
  stock_alerts: z.array(
    z.object({
      label: z.string(),
      available: amount,
      kind: z.enum(["material", "product"]),
    }),
  ),
});
export type Dashboard = z.infer<typeof dashboardSchema>;
