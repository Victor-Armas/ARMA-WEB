import { LogOut } from "lucide-react";
import { useSignOut } from "../hooks/useSignOut";

export function SignOutButton({ menu = false }: { menu?: boolean }) {
  const { signOut, isPending } = useSignOut();
  return (
    <button
      type="button"
      disabled={isPending}
      aria-busy={isPending}
      onClick={() => void signOut()}
      className={`inline-flex min-h-11 items-center gap-2 rounded-arma px-3 text-sm font-medium text-arma-icon hover:bg-arma-primary-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arma-active disabled:cursor-wait disabled:opacity-60 ${menu ? "w-full justify-start" : "border border-arma-border"}`}
    >
      <LogOut size={18} strokeWidth={1.7} aria-hidden="true" />
      <span>{isPending ? "Cerrando sesión…" : "Cerrar sesión"}</span>
    </button>
  );
}
