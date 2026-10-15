import { supabase } from "@/lib/supabase";
import { commerceHistorySchema } from "../schemas/adjustment.schema";
export async function getCommerceHistory(id: string, signal: AbortSignal) {
  const { data, error } = await supabase
    .rpc("commerce_history", { p_id: id })
    .abortSignal(signal);
  if (error) throw error;
  return commerceHistorySchema.parse(data);
}
