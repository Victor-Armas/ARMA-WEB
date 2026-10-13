import type { Session } from "@supabase/supabase-js";
import { useEffect, useState } from "react";
import { subscribeToAuthChanges } from "../services/auth.service";

export function useAuthSession() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    return subscribeToAuthChanges(setSession);
  }, []);

  return {
    session,
    isLoading: session === undefined,
  };
}
