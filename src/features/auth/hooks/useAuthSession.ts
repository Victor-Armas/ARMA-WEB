import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

import { subscribeToAuthChanges } from "../services/auth.service";
import { useAuthStore } from "../stores/auth.store";
import { useProfileDisplayStore } from "@/features/profile/stores/profile-display.store";

export function useAuthSession() {
  const queryClient = useQueryClient();

  const session = useAuthStore((state) => state.session);
  const cachedProfile = useProfileDisplayStore.getState();
  const setSession = useAuthStore((state) => state.setSession);

  useEffect(() => {
    return subscribeToAuthChanges((nextSession) => {
      if (
        nextSession === null ||
        (cachedProfile.userId !== null &&
          cachedProfile.userId !== nextSession.user.id)
      ) {
        cachedProfile.clear();
      }
      const previousSession = useAuthStore.getState().session;

      if (previousSession?.user.id !== nextSession?.user.id) {
        queryClient.clear();
      }

      setSession(nextSession);
    });
  }, [queryClient, setSession]);

  return {
    session,
    isLoading: session === undefined,
  };
}
