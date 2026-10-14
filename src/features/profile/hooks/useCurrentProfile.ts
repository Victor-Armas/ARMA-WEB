import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";

import { useAuthStore } from "@/features/auth/stores/auth.store";
import { notify } from "@/lib/notify";
import { getCurrentProfile } from "../services/profile.service";
import { useProfileDisplayStore } from "../stores/profile-display.store";

export function useCurrentProfile() {
  const userId = useAuthStore((state) => state.session?.user.id);

  const cachedName = useProfileDisplayStore((state) =>
    state.userId === userId ? state.fullName : null,
  );

  const setDisplayName = useProfileDisplayStore(
    (state) => state.setDisplayName,
  );

  const query = useQuery({
    queryKey: ["current-profile", userId],
    enabled: Boolean(userId),
    queryFn: ({ signal }) => {
      if (!userId) {
        throw new Error("No hay un usuario con sesión activa");
      }

      return getCurrentProfile(userId, signal);
    },
  });

  const { data, isSuccess, isError, errorUpdatedAt } = query;
  const notificationId = userId ? `profile:${userId}` : null;

  useEffect(() => {
    if (userId && isSuccess) {
      setDisplayName(userId, data?.full_name?.trim() || null);
    }
  }, [userId, isSuccess, data, setDisplayName]);

  useEffect(() => {
    if (!notificationId) {
      return;
    }

    if (isError) {
      notify.error("No pudimos actualizar tu perfil", {
        id: notificationId,
        description: "Comprueba tu conexión e inténtalo de nuevo.",
      });

      return;
    }

    if (isSuccess) {
      if (!data) {
        notify.error("Tu perfil no está disponible", {
          id: notificationId,
          description: "Contacta al administrador de ARMA.",
        });

        return;
      }

      if (!data.full_name?.trim()) {
        notify.info("Tu perfil todavía no tiene nombre", {
          id: notificationId,
        });

        return;
      }

      notify.dismiss(notificationId);
    }
  }, [notificationId, isError, isSuccess, data, errorUpdatedAt]);

  useEffect(() => {
    return () => {
      if (notificationId) {
        notify.dismiss(notificationId);
      }
    };
  }, [notificationId]);

  const fullName = isSuccess ? data?.full_name?.trim() || null : cachedName;

  return {
    ...query,
    fullName,
  };
}
