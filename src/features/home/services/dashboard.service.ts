import { supabase } from "@/lib/supabase";
import { dashboardSchema } from "../schemas/dashboard.schema";
export async function getDashboard(
  from: string,
  to: string,
  signal: AbortSignal,
) {
  const { data, error } = await supabase
    .rpc("business_dashboard", { p_from: from, p_to: to })
    .abortSignal(signal);
  if (error) throw error;
  return dashboardSchema.parse(data);
}
