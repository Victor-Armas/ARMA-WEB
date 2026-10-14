import type { Session } from "@supabase/supabase-js";
import { create } from "zustand";

interface AuthState {
  session: Session | null | undefined;
  setSession: (session: Session | null) => void;
}

export const useAuthStore = create<AuthState>()((set) => ({
  session: undefined,
  setSession: (session) => set({ session }),
}));
