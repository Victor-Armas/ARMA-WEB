import { createClient } from "@supabase/supabase-js";
import { supabaseUrl, supabasePublishableKey } from "./supabase-config";

// The customer catalogue always uses guest access, even on a staff device.
export const publicSupabase = createClient(
  supabaseUrl,
  supabasePublishableKey,
  {
    auth: {
      storageKey: "arma-public-catalog",
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  },
);
