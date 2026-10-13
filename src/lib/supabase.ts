import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl) {
  throw new Error('Falta configurar VITE_SUPABASE_URL');
}

if (!supabasePublishableKey) {
  throw new Error('Falta configurar VITE_SUPABASE_PUBLISHABLE_KEY');
}

if (!supabasePublishableKey.startsWith('sb_publishable_')) {
  throw new Error('ARMA Web requiere una clave publishable de Supabase');
}

export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});
