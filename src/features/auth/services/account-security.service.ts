import { supabase } from "@/lib/supabase";
import { administerUser } from "@/features/access/services/user-admin.service";
import {
  accountGateSchema,
  type PasswordChangeValues,
} from "../schemas/password-change.schema";
export async function getAccountGate(signal: AbortSignal) {
  const { data, error } = await supabase
    .rpc("account_gate")
    .abortSignal(signal);
  if (error) throw error;
  return accountGateSchema.parse(data);
}
export async function changeTemporaryPassword(
  values: PasswordChangeValues,
  email: string,
) {
  await administerUser({
    action: "change_password",
    temporary: values.temporary,
    password: values.password,
  });
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password: values.password,
  });
  if (error) {
    await supabase.auth.signOut({ scope: "local" });
    throw new Error(
      "Tu contraseña se guardó. Inicia sesión con la contraseña nueva.",
    );
  }
}
