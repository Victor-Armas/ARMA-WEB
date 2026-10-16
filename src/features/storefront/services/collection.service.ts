import { z } from "zod";
import { publicSupabase } from "@/lib/supabase-public";
import { storefrontPageSchema } from "../schemas/storefront.schema";
import { hydrateStorefrontPage } from "./storefront.service";
const schema = storefrontPageSchema.extend({
  published: z.boolean(),
  featured_ids: z.array(z.uuid()),
  offer_ids: z.array(z.uuid()),
  settings: z.object({
    published: z.boolean(),
    headline_1: z.string(),
    headline_2: z.string(),
    headline_3: z.string(),
    intro: z.string(),
    offers_title: z.string(),
  }),
});
export async function getPublicCollection(signal: AbortSignal) {
  const { data, error } = await publicSupabase
    .rpc("customer_collection")
    .abortSignal(AbortSignal.any([signal, AbortSignal.timeout(15000)]));
  if (error) throw error;
  const parsed = schema.parse(data);
  return { ...parsed, ...(await hydrateStorefrontPage(parsed)) };
}
