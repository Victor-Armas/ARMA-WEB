import { z } from "zod";
import { supabase } from "@/lib/supabase";
import {
  temporaryCredentialSchema,
  type MemberForm,
} from "../schemas/access.schema";
type UserAction =
  | {
      action: "create";
      email: string;
      full_name: string;
      phone: string;
      roles: MemberForm["roles"];
    }
  | {
      action: "edit";
      user_id: string;
      full_name: string;
      phone: string;
      roles: MemberForm["roles"];
    }
  | { action: "reset" | "disable" | "enable"; user_id: string }
  | { action: "change_password"; temporary: string; password: string };
export async function administerUser(input: UserAction): Promise<unknown> {
  const { data, error } = await supabase.functions.invoke("user-admin", {
    body: input,
  });
  if (error) {
    if (error.context instanceof Response) {
      const body = z
        .object({ error: z.string() })
        .safeParse(await error.context.json().catch(() => null));
      if (body.success) throw new Error(body.data.error);
    }
    throw new Error(
      "No pudimos completar la operación. Comprueba tu conexión y reintenta.",
    );
  }
  return data;
}
// Las credenciales se mantienen solo en el modal, nunca en la caché de consultas.
export async function createMember(input: MemberForm) {
  return temporaryCredentialSchema.parse(
    await administerUser({ action: "create", ...input }),
  );
}
export async function resetMemberPassword(userId: string) {
  return temporaryCredentialSchema.parse(
    await administerUser({ action: "reset", user_id: userId }),
  );
}
