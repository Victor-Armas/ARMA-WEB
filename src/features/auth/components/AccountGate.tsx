import { LegalLinks } from "@/features/legal/components/LegalLinks";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { z } from "zod";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "../stores/auth.store";
import { getAccountGate } from "../services/account-security.service";
import { PasswordChangeForm } from "./PasswordChangeForm";
import { secondaryButton } from "@/features/commerce/utils/commerce-format";
function sessionIdentity(token: string) {
  try {
    return z
      .object({ session_id: z.string() })
      .parse(
        JSON.parse(
          atob(token.split(".")[1].replaceAll("-", "+").replaceAll("_", "/")),
        ),
      ).session_id;
  } catch {
    return token;
  }
}
export function AccountGate({ children }: { children: ReactNode }) {
  const session = useAuthStore((state) => state.session);
  const client = useQueryClient();
  const identity = session ? sessionIdentity(session.access_token) : "";
  const gate = useQuery({
    queryKey: ["account-gate", session?.user.id, identity],
    enabled: Boolean(session),
    queryFn: ({ signal }) => getAccountGate(signal),
    staleTime: 15000,
    refetchInterval: 15000,
    refetchOnWindowFocus: "always",
    retry: false,
  });
  async function refresh() {
    await client.invalidateQueries();
  }
  if (!session) return children;
  if (
    gate.data?.is_active &&
    gate.data.session_valid &&
    !gate.data.requires_change
  )
    return children;
  const mustChange =
    gate.data?.is_active &&
    gate.data.session_valid &&
    gate.data.requires_change &&
    !gate.data.expired;
  return (
    <main className="flex min-h-dvh items-center justify-center bg-arma-background px-5 py-10">
      <section className="w-full max-w-lg rounded-arma border border-arma-border bg-arma-surface p-6 sm:p-8">
        <p className="text-xs font-semibold tracking-[0.2em] text-arma-active">
          ARMA · ACCESO DEL PERSONAL
        </p>
        <h1 className="mt-4 font-arma-heading text-3xl">
          {gate.isPending
            ? "Comprobando acceso…"
            : mustChange
              ? "Crea tu contraseña"
              : gate.isError
                ? "No pudimos comprobar tu acceso"
                : !gate.data?.is_active
                  ? "Cuenta deshabilitada"
                  : gate.data.expired
                    ? "La contraseña temporal venció"
                    : "Inicia sesión nuevamente"}
        </h1>
        {mustChange && session.user.email ? (
          <>
            <p className="mt-3 break-all text-sm text-arma-muted">
              {session.user.email}
            </p>
            <p className="mt-3 text-sm leading-6 text-arma-muted">
              Antes de entrar, reemplaza la contraseña temporal que te entregó
              tu administrador.
            </p>
            <PasswordChangeForm
              email={session.user.email}
              onChanged={refresh}
            />
          </>
        ) : gate.isPending ? (
          <p role="status" className="mt-4 text-sm text-arma-muted">
            Un momento…
          </p>
        ) : (
          <>
            <p className="mt-4 text-sm leading-6 text-arma-muted">
              {gate.isError
                ? "Comprueba tu conexión y vuelve a intentar."
                : !gate.data?.is_active
                  ? "Solicita a tu administrador que reactive tu cuenta."
                  : gate.data.expired
                    ? "Solicita una nueva contraseña temporal a tu administrador. Su vigencia es de 24 horas."
                    : "Se actualizó la seguridad de tu cuenta. Vuelve a entrar con tu contraseña actual."}
            </p>
            {gate.isError ? (
              <button
                type="button"
                onClick={() => void gate.refetch()}
                className={`${secondaryButton} mt-4`}
              >
                Reintentar
              </button>
            ) : null}
          </>
        )}
        {!gate.isPending ? (
          <button
            type="button"
            onClick={() => void supabase.auth.signOut({ scope: "local" })}
            className="mt-5 min-h-11 text-sm text-arma-active underline underline-offset-4"
          >
            Salir e ir al inicio de sesión
          </button>
        ) : null}
        <div className="mt-6 border-t border-arma-border pt-3">
          <LegalLinks />
        </div>
      </section>
    </main>
  );
}
