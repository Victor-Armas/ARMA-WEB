import { z } from "zod";

const money = z
  .string()
  .trim()
  .regex(/^\d+(\.\d{1,2})?$/, "Usa un importe con hasta dos decimales.")
  .transform(Number)
  .pipe(z.number().finite().min(0).max(999999));
export const orderFormSchema = z
  .object({
    quantity: z
      .string()
      .regex(/^\d+$/, "Escribe una cantidad entera.")
      .transform(Number)
      .pipe(
        z.number().int().min(1, "La cantidad debe ser al menos 1.").max(10000),
      ),
    unit_price: money.refine(
      (value) => value > 0,
      "El precio debe ser mayor que cero.",
    ),
    customer_name: z.string().trim().max(120),
    customer_phone: z.string().trim().max(30),
    notes: z.string().trim().max(1000),
    deposit: z
      .string()
      .transform((value) => value.trim() || "0")
      .pipe(money),
    payment_method: z.enum(["cash", "transfer", "card"]),
    delivery_date: z
      .string()
      .refine(
        (value) => value === "" || /^\d{4}-\d{2}-\d{2}$/.test(value),
        "Fecha inválida.",
      ),
    due_date: z
      .string()
      .refine(
        (value) => value === "" || /^\d{4}-\d{2}-\d{2}$/.test(value),
        "Fecha inválida.",
      ),
  })
  .refine((value) => value.deposit <= value.quantity * value.unit_price, {
    path: ["deposit"],
    message: "El anticipo no puede superar el total.",
  });
export type OrderFormInput = z.input<typeof orderFormSchema>;
export type OrderFormValues = z.output<typeof orderFormSchema>;
export type SalesPeriod = "all" | "today" | "week" | "month";
export type OrderKind = "sale" | "reservation";
export type PaymentMethod = OrderFormValues["payment_method"];
export interface CreateOrderInput extends OrderFormValues {
  request_id: string;
  kind: OrderKind;
  variant_id: string;
  delivery_id?: string;
  stock_mode?: "reserved" | "waiting";
  stock_source?: "warehouse" | "seller";
}
export interface ResolveReservationInput {
  id: string;
  action: "complete" | "cancel";
  requestId: string;
  paymentMethod: PaymentMethod;
  refundConfirmed: boolean;
}
export const commercePermissionsSchema = z.object({
  read: z.boolean(),
  write: z.boolean(),
  read_all: z.boolean(),
  manage_all: z.boolean(),
});
const orderItemSchema = z.object({
  id: z.uuid(),
  product_id: z.uuid(),
  product_variant_id: z.uuid(),
  product_name: z.string(),
  sku: z.string(),
  size: z.string(),
  color: z.string(),
  cover_path: z.string().nullable().default(null),
  cover_url: z.string().nullable().default(null),
  quantity: z.number().int().positive(),
  catalog_price: z.number().nonnegative(),
  unit_price: z.number().positive(),
});
export const orderSchema = z.object({
  stock_status: z.enum(["waiting", "reserved"]).default("reserved"),
  stock_source: z.enum(["warehouse", "seller"]).default("warehouse"),
  stock_assigned_at: z.string().nullable().default(null),
  id: z.uuid(),
  order_number: z.number().int().positive(),
  kind: z.enum(["sale", "reservation"]),
  status: z.enum(["active", "completed", "cancelled", "fulfilled"]),
  customer_name: z.string(),
  customer_phone: z.string(),
  notes: z.string(),
  total: z.number().positive(),
  deposit: z.number().nonnegative(),
  payment_method: z.enum(["cash", "transfer", "card"]).nullable(),
  due_date: z.string().nullable(),
  created_at: z.string(),
  seller_name: z.string(),
  created_by: z.uuid(),
  delivery_date: z.string().nullable(),
  delivered_at: z.string().nullable(),
  source_reservation_id: z.uuid().nullable(),
  refunded_amount: z.number().nonnegative(),
  source_deposit: z.number().nonnegative(),
  sale_id: z.uuid().nullable(),
  items: z.array(orderItemSchema),
});
export type CommerceOrder = z.infer<typeof orderSchema>;
export const deliverySummarySchema = z.object({
  scheduled: z.array(
    z.object({
      date: z.string(),
      orders: z.number().int().nonnegative(),
      pieces: z.number().int().nonnegative(),
    }),
  ),
  overdue_orders: z.number().int().nonnegative(),
  overdue_pieces: z.number().int().nonnegative(),
  unscheduled_orders: z.number().int().nonnegative(),
  unscheduled_pieces: z.number().int().nonnegative(),
});
export type DeliverySummary = z.infer<typeof deliverySummarySchema>;
export const salesSummarySchema = z.object({
  orders: z.number().int().nonnegative(),
  revenue: z.number().nonnegative(),
  average_ticket: z.number().nonnegative(),
  pieces: z.number().int().nonnegative(),
  discounts: z.number().nonnegative(),
  applied_deposits: z.number().nonnegative(),
  payments: z.array(
    z.object({
      method: z.enum(["cash", "transfer", "card"]).nullable(),
      orders: z.number().int().nonnegative(),
      amount: z.number().nonnegative(),
    }),
  ),
});
export type SalesSummaryData = z.infer<typeof salesSummarySchema>;
export const ordersPageSchema = z.object({
  delivery_summary: deliverySummarySchema,
  sales_summary: salesSummarySchema,
  items: z.array(orderSchema),
  total: z.number().int().nonnegative(),
  page: z.number().int().positive(),
});
