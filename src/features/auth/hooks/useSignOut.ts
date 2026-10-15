import { useRef, useState } from "react";
import { notify } from "@/lib/notify";
import { signOutCurrentSession } from "../services/auth.service";

export function useSignOut() {
  const [isPending, setIsPending] = useState(false);
  const inProgress = useRef(false);

  async function signOut() {
    if (inProgress.current) return;
    inProgress.current = true;
    setIsPending(true);
    try {
      // useAuthSession handles session, profile and query/image cache cleanup.
      await signOutCurrentSession();
    } catch {
      notify.error("No pudimos cerrar sesión", {
        description: "Comprueba tu conexión y vuelve a intentarlo.",
      });
    } finally {
      inProgress.current = false;
      setIsPending(false);
    }
  }

  return { signOut, isPending };
}
