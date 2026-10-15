import { getSignedProductImages } from "@/features/products/services/product-image-cache.service";
import { materialCostProfileSchema } from "../schemas/material-cost.schema";
import { z } from "zod";
import { supabase } from "@/lib/supabase";
import {
  variantOptionSchema,
  recipeSchema,
  receiptPageSchema,
  productionPageSchema,
  recipesPageSchema,
  productionBoardSchema,
  type ProductionStatus,
  type WorkshopAction,
  type OperationPayload,
} from "../schemas/operations.schema";
export async function getWorkshopOptions(
  kind: "product" | "material" | "ready_product" | "seller_product",
  search: string,
  signal: AbortSignal,
  userId: string,
) {
  const request =
    kind === "seller_product"
      ? supabase.rpc("seller_delivery_options", { p_search: search })
      : supabase.rpc("workshop_options", { p_kind: kind, p_search: search });
  const { data, error } = await request.abortSignal(signal);
  if (error) throw error;
  return withPhotos(z.array(variantOptionSchema).parse(data), userId);
}
export async function getWorkshopRecipe(
  id: string,
  signal: AbortSignal,
  userId: string,
) {
  const { data, error } = await supabase
    .rpc("workshop_recipe", { p_id: id })
    .abortSignal(signal);
  if (error) throw error;
  const result = recipeSchema.parse(data);
  return { ...result, lines: await withPhotos(result.lines, userId) };
}
export async function getWorkshopHistory(
  kind: "receipts" | "production",
  page: number,
  signal: AbortSignal,
) {
  const { data, error } = await supabase
    .rpc("workshop_history", { p_kind: kind, p_page: page })
    .abortSignal(signal);
  if (error) throw error;
  return kind === "receipts"
    ? receiptPageSchema.parse(data)
    : productionPageSchema.parse(data);
}
export async function writeWorkshop(
  action: WorkshopAction,
  payload: OperationPayload,
) {
  const { data, error } = await supabase.rpc("workshop_write", {
    p_action: action,
    p_payload: payload,
  });
  if (error) throw error;
  return z.uuid().parse(data);
}
export async function adjustCommerce(
  action: "payment" | "return",
  payload: OperationPayload,
) {
  const { data, error } = await supabase.rpc("commerce_adjust", {
    p_action: action,
    p_payload: payload,
  });
  if (error) throw error;
  return z.uuid().parse(data);
}

export async function getMaterialCostProfile(id: string, signal: AbortSignal) {
  const { data, error } = await supabase
    .rpc("material_cost_profile", { p_id: id })
    .abortSignal(signal);
  if (error) throw error;
  return materialCostProfileSchema.parse(data);
}
export async function saveMaterialCost(payload: OperationPayload) {
  const { data, error } = await supabase.rpc("save_material_cost", {
    p_payload: payload,
  });
  if (error) throw error;
  return z.uuid().parse(data);
}

async function withPhotos<
  T extends {
    photo?: { path: string; background: "white" | "gray" | "black" } | null;
  },
>(items: T[], userId: string) {
  try {
    const urls = await getSignedProductImages(
      items.flatMap((i) => (i.photo ? [i.photo.path] : [])),
      userId,
    );
    return items.map((i) => ({
      ...i,
      photo_url: i.photo ? (urls.get(i.photo.path)?.url ?? null) : null,
    }));
  } catch {
    return items.map((i) => ({ ...i, photo_url: null }));
  }
}
export async function getRecipesPage(
  state: string,
  page: number,
  search: string,
  userId: string,
  signal: AbortSignal,
) {
  const { data, error } = await supabase
    .rpc("workshop_recipes_page", {
      p_state: state,
      p_page: page,
      p_search: search,
    })
    .abortSignal(signal);
  if (error) throw error;
  const result = recipesPageSchema.parse(data);
  return { ...result, items: await withPhotos(result.items, userId) };
}
export async function getProductionBoard(
  status: ProductionStatus,
  page: number,
  search: string,
  userId: string,
  signal: AbortSignal,
) {
  const { data, error } = await supabase
    .rpc("production_board", {
      p_status: status,
      p_page: page,
      p_search: search,
    })
    .abortSignal(signal);
  if (error) throw error;
  const result = productionBoardSchema.parse(data);
  return {
    ...result,
    items: await Promise.all(
      (await withPhotos(result.items, userId)).map(async (order) => ({
        ...order,
        inputs: await withPhotos(order.inputs, userId),
      })),
    ),
  };
}

export async function getWorkshopVariant(
  id: string,
  userId: string,
  signal: AbortSignal,
) {
  const { data, error } = await supabase
    .rpc("workshop_options", {
      p_kind: "ready_product",
      p_id: id,
      p_search: "",
    })
    .abortSignal(signal);
  if (error) throw error;
  const items = await withPhotos(
    z.array(variantOptionSchema).parse(data),
    userId,
  );
  return items[0] ?? null;
}
