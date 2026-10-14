import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import {
  profileDisplaySchema,
  type ProfileDisplay,
} from "../schema/profile.schema";

interface ProfileDisplayState extends ProfileDisplay {
  setDisplayName: (userId: string, fullName: string | null) => void;
  clear: () => void;
}

export const useProfileDisplayStore = create<ProfileDisplayState>()(
  persist(
    (set) => ({
      userId: null,
      fullName: null,

      setDisplayName: (userId, fullName) =>
        set((state) => {
          if (state.userId === userId && state.fullName === fullName) {
            return state;
          }

          return { userId, fullName };
        }),

      clear: () => set({ userId: null, fullName: null }),
    }),
    {
      name: "arma-profile-display",
      storage: createJSONStorage(() => localStorage),

      partialize: ({ userId, fullName }) => ({
        userId,
        fullName,
      }),

      merge: (persistedState, currentState) => {
        const result = profileDisplaySchema.safeParse(persistedState);

        return result.success
          ? { ...currentState, ...result.data }
          : currentState;
      },
    },
  ),
);
