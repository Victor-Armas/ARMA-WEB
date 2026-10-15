import { createClient } from "npm:@supabase/supabase-js@2.117.3";
import { z } from "npm:zod@4.6.7";

const role = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[a-z][a-z0-9_]*$/);
const fields = {
  full_name: z.string().trim().min(2).max(120),
  phone: z.string().trim().max(30),
  roles: z.array(role).min(1).max(32),
};
const newPassword = z
  .string()
  .min(12, "Usa al menos 12 caracteres.")
  .max(64)
  .refine(
    (value) => new TextEncoder().encode(value).length <= 72,
    "La contraseña es demasiado larga.",
  );
const bodySchema = z.discriminatedUnion("action", [
  z
    .object({
      action: z.literal("create"),
      email: z.email().max(254),
      ...fields,
    })
    .strict(),
  z
    .object({ action: z.literal("edit"), user_id: z.uuid(), ...fields })
    .strict(),
  z.object({ action: z.literal("reset"), user_id: z.uuid() }).strict(),
  z.object({ action: z.literal("disable"), user_id: z.uuid() }).strict(),
  z.object({ action: z.literal("enable"), user_id: z.uuid() }).strict(),
  z
    .object({
      action: z.literal("change_password"),
      temporary: z.string().min(1).max(128),
      password: newPassword,
    })
    .strict(),
]);
const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
  Pragma: "no-cache",
};
function respond(value: unknown, status = 200) {
  return new Response(JSON.stringify(value), { status, headers });
}
async function digest(value: string) {
  return Array.from(
    new Uint8Array(
      await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)),
    ),
    (byte) => byte.toString(16).padStart(2, "0"),
  ).join("");
}
function temporaryPassword() {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return (
    "ARMA-" +
    btoa(String.fromCharCode(...bytes))
      .replaceAll("+", "-")
      .replaceAll("/", "_")
      .replaceAll("=", "")
  );
}

export async function handler(req: Request) {
  if (req.method === "OPTIONS")
    return new Response(null, { status: 204, headers });
  if (req.method !== "POST")
    return respond({ error: "Método no permitido." }, 405);
  const authorization = req.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer "))
    return respond({ error: "Inicia sesión para continuar." }, 401);
  const url = Deno.env.get("SUPABASE_URL");
  const keys = Deno.env.get("SUPABASE_SECRET_KEYS");
  const parsedKeys = keys
    ? z.record(z.string(), z.string()).safeParse(JSON.parse(keys))
    : null;
  const secret =
    (parsedKeys?.success ? parsedKeys.data.default : undefined) ||
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !secret)
    return respond(
      { error: "La administración de cuentas no está disponible." },
      503,
    );
  const admin = createClient(url, secret, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const token = authorization.slice(7);
  const verified = await admin.auth.getUser(token);
  if (verified.error || !verified.data.user)
    return respond(
      { error: "La sesión venció. Inicia sesión nuevamente." },
      401,
    );
  let session: string;
  try {
    const claims = z
      .object({ session_id: z.uuid() })
      .parse(
        JSON.parse(
          atob(token.split(".")[1].replaceAll("-", "+").replaceAll("_", "/")),
        ),
      );
    session = claims.session_id;
  } catch {
    return respond({ error: "La sesión no es válida." }, 401);
  }
  const actor = verified.data.user.id;
  let body: z.infer<typeof bodySchema>;
  try {
    const raw = await req.text();
    if (raw.length > 4096)
      return respond({ error: "Solicitud demasiado larga." }, 413);
    body = bodySchema.parse(JSON.parse(raw));
  } catch {
    return respond({ error: "Revisa los campos del formulario." }, 400);
  }
  const operation = crypto.randomUUID();
  let prepared = false;
  let createdUser: string | null = null;
  async function rpc(name: string, args: Record<string, unknown>) {
    const { data, error } = await admin.rpc(name, args);
    if (error) throw error;
    return data;
  }
  try {
    if (body.action === "change_password") {
      if (body.temporary === body.password)
        return respond(
          { error: "Elige una contraseña diferente a la temporal." },
          400,
        );
      await rpc("service_prepare_credential", {
        p_actor: actor,
        p_session: session,
        p_target: actor,
        p_action: body.action,
        p_operation: operation,
        p_digest: await digest(body.temporary),
      });
      prepared = true;
      const changed = await admin.auth.admin.updateUserById(actor, {
        password: body.password,
      });
      if (changed.error)
        throw new Error(
          "No pudimos guardar la nueva contraseña. Solicita un restablecimiento si el problema continúa.",
        );
      await rpc("service_finish_credential", {
        p_actor: actor,
        p_target: actor,
        p_operation: operation,
      });
      prepared = false;
      return respond({ ok: true });
    }
    await rpc("service_authorize_user_action", {
      p_actor: actor,
      p_session: session,
      p_action: body.action,
      p_target: body.action === "create" ? null : body.user_id,
      p_roles:
        body.action === "create" || body.action === "edit" ? body.roles : null,
    });
    if (body.action === "edit") {
      await rpc("service_edit_member", {
        p_actor: actor,
        p_session: session,
        p_target: body.user_id,
        p_full_name: body.full_name,
        p_phone: body.phone,
        p_roles: body.roles,
      });
      return respond({ ok: true });
    }
    if (body.action === "disable" || body.action === "enable") {
      if (body.action === "disable")
        await rpc("service_set_member_active", {
          p_actor: actor,
          p_session: session,
          p_target: body.user_id,
          p_active: false,
        });
      const changed = await admin.auth.admin.updateUserById(body.user_id, {
        ban_duration: body.action === "disable" ? "876000h" : "none",
      });
      if (changed.error)
        throw new Error(
          body.action === "disable"
            ? "La cuenta ya está deshabilitada. Reintenta para terminar el bloqueo de acceso."
            : "No pudimos reactivar la cuenta. Reintenta.",
        );
      if (body.action === "enable")
        await rpc("service_set_member_active", {
          p_actor: actor,
          p_session: session,
          p_target: body.user_id,
          p_active: true,
        });
      return respond({ ok: true });
    }
    const temporary = temporaryPassword();
    let target: string;
    let email: string;
    if (body.action === "create") {
      const created = await admin.auth.admin.createUser({
        email: body.email,
        password: temporary,
        email_confirm: true,
        user_metadata: { full_name: body.full_name },
      });
      if (created.error || !created.data.user)
        return respond(
          {
            error:
              created.error?.code === "email_exists"
                ? "Este correo ya tiene una cuenta."
                : "No pudimos crear la cuenta. Revisa que el correo no esté registrado.",
          },
          400,
        );
      target = created.data.user.id;
      createdUser = target;
      email = body.email;
    } else {
      target = body.user_id;
      email = "";
    }
    const stage = z.object({ email: z.string() }).parse(
      await rpc("service_prepare_credential", {
        p_actor: actor,
        p_session: session,
        p_target: target,
        p_action: body.action,
        p_operation: operation,
      }),
    );
    prepared = true;
    email = stage.email || email;
    if (body.action === "reset") {
      const updated = await admin.auth.admin.updateUserById(target, {
        password: temporary,
      });
      if (updated.error)
        throw new Error("No pudimos restablecer la contraseña. Reintenta.");
    }
    const final = z.object({ expires_at: z.string() }).parse(
      await rpc("service_finish_credential", {
        p_actor: actor,
        p_target: target,
        p_operation: operation,
        p_digest: await digest(temporary),
        p_roles: body.action === "create" ? body.roles : null,
        p_full_name: body.action === "create" ? body.full_name : null,
        p_phone: body.action === "create" ? body.phone : null,
      }),
    );
    prepared = false;
    createdUser = null;
    return respond({
      user_id: target,
      email,
      temporary_password: temporary,
      expires_at: final.expires_at,
    });
  } catch (error: unknown) {
    if (prepared)
      await admin.rpc("service_abort_credential", { p_operation: operation });
    if (createdUser) await admin.auth.admin.deleteUser(createdUser);
    const failure = z
      .object({ code: z.string(), message: z.string() })
      .safeParse(error);
    const message =
      failure.success && failure.data.code === "42501"
        ? "No tienes permiso para esta operación."
        : failure.success && failure.data.code === "P0001"
          ? failure.data.message
          : error instanceof Error
            ? error.message
            : "No pudimos completar la operación. Reintenta.";
    return respond(
      { error: message },
      failure.success && failure.data.code === "42501" ? 403 : 400,
    );
  }
}
Deno.serve(handler);
