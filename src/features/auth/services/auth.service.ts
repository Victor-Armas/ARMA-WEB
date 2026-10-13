import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import type { LoginFormData } from "../schemas/login.schema";

export async function signInWithPassword(credentials: LoginFormData) {
  const { data, error } = await supabase.auth.signInWithPassword(credentials);

  if (error) {
    throw error;
  }

  return data.session;
}

export function subscribeToAuthChanges(
  onSessionChange: (session: Session | null) => void,
): () => void {
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    onSessionChange(session);
  });

  return () => {
    data.subscription.unsubscribe();
  };
}
