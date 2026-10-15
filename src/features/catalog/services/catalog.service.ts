import { z } from "zod";
import { supabase } from "@/lib/supabase";
import {
  getSignedProductImages,
  getImageRefreshAt,
} from "@/features/products/services/product-image-cache.service";
import {
  catalogPageSchema,
  type CatalogKind,
  type CatalogForm,
} from "../schemas/catalog.schema";
export async function getCatalogPage(
  kind: CatalogKind,
  page: number,
  search: string,
  state: string,
  type: string,
  userId: string,
  signal: AbortSignal,
) {
  const { data, error } = await supabase
    .rpc("catalog_admin_page", {
      p_kind: kind,
      p_page: page,
      p_search: search,
      p_state: state,
      p_type: type,
    })
    .abortSignal(signal);
  if (error) throw error;
  const result = catalogPageSchema.parse(data);
  const images = await getSignedProductImages(
    result.items.flatMap((item) =>
      item.images.map((image) => image.storage_path),
    ),
    userId,
  );
  return {
    ...result,
    imageRefreshAt: getImageRefreshAt(images),
    items: result.items.map((item) => ({
      ...item,
      gallery: item.images.map((image) => ({
        id: image.id,
        url: images.get(image.storage_path)?.url ?? null,
        alt: image.alt_text,
        background: image.background,
        caption: image.caption,
      })),
    })),
  };
}
export async function saveCatalog(input: {
  kind: CatalogKind;
  values: CatalogForm;
}) {
  const payload = {
    ...input.values,
    variants: input.values.variants.map((variant) => ({
      ...variant,
      sale_price: Number(variant.sale_price),
      minimum_stock: Number(variant.minimum_stock),
      width_cm: variant.width_cm ? Number(variant.width_cm) : null,
      height_cm: variant.height_cm ? Number(variant.height_cm) : null,
    })),
  };
  const { data, error } = await supabase.rpc(
    input.kind === "product" ? "save_product" : "save_material",
    { p_payload: payload },
  );
  if (error) throw error;
  return data;
}
export async function setCatalogActive(input: {
  kind: CatalogKind;
  id: string;
  active: boolean;
}) {
  const { error } = await supabase.rpc(
    input.kind === "product" ? "set_product_active" : "set_material_active",
    { p_id: input.id, p_active: input.active },
  );
  if (error) throw error;
}
export async function uploadCatalogPhoto(input: {
  kind: CatalogKind;
  id: string;
  file: File;
}) {
  const extensions: Record<string, string> = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/webp": "webp",
  };
  const extension = extensions[input.file.type];
  if (!extension || input.file.size === 0 || input.file.size > 5 * 1024 * 1024)
    throw new Error("Elige una imagen PNG, JPG o WebP de hasta 5 MB.");
  const path = `${input.kind === "product" ? "products" : "materials"}/${input.id}/${crypto.randomUUID()}.${extension}`;
  const { error } = await supabase.storage
    .from("inventory-images")
    .upload(path, input.file, {
      upsert: false,
      contentType: input.file.type,
      cacheControl: "3600",
    });
  if (error) throw error;
  const result = await supabase.rpc(
    input.kind === "product" ? "attach_product_image" : "attach_material_image",
    { p_id: input.id, p_path: path },
  );
  if (result.error) throw result.error;
}

export function catalogError(error: unknown): string {
  const parsed = z
    .object({ code: z.string(), message: z.string() })
    .safeParse(error);
  if (parsed.success && parsed.data.code === "23505")
    return "Ya existe un registro con ese código, SKU o combinación de talla y color.";
  if (parsed.success && parsed.data.code === "P0001")
    return parsed.data.message;
  if (parsed.success && parsed.data.code === "42501")
    return "Tu cuenta no tiene permiso para esta operación.";
  return error instanceof Error
    ? error.message
    : "No pudimos guardar los cambios. Comprueba tu conexión y reintenta.";
}

export async function catalogImageAction(input: {
  kind: CatalogKind;
  id: string;
  imageId: string;
  action: "remove" | "background";
  background?: "white" | "gray" | "black";
}) {
  const { data, error } = await supabase.rpc("catalog_image_action", {
    p_kind: input.kind,
    p_id: input.id,
    p_image: input.imageId,
    p_action: input.action,
    p_background: input.background ?? null,
  });
  if (error) throw error;
  return z.uuid().parse(data);
}
