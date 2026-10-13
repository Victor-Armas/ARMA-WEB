import type { LoginFormData } from '../schemas/login.schema';

export async function signInWithPassword(credentials: LoginFormData) {
  const { supabase } = await import('@/lib/supabase');
  const { data, error } = await supabase.auth.signInWithPassword(credentials);
  if (error) {
    throw error;
  }
  return data.session;
}
