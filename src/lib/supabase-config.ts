function readSupabaseConfiguration() {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!url) throw new Error("Falta configurar VITE_SUPABASE_URL");
  if (!key || !key.startsWith("sb_publishable_")) {
    throw new Error("ARMA Web requiere una clave publishable de Supabase");
  }
  return { url, key };
}
const configuration = readSupabaseConfiguration();
export const supabaseUrl = configuration.url;
export const supabasePublishableKey = configuration.key;
