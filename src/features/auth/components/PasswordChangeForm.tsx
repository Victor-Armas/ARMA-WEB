import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  fieldClass,
  primaryButton,
} from "@/features/commerce/utils/commerce-format";
import {
  passwordChangeSchema,
  type PasswordChangeValues,
} from "../schemas/password-change.schema";
import { changeTemporaryPassword } from "../services/account-security.service";
export function PasswordChangeForm({
  email,
  onChanged,
}: {
  email: string;
  onChanged: () => Promise<void>;
}) {
  const [error, setError] = useState("");
  const form = useForm<PasswordChangeValues>({
    resolver: zodResolver(passwordChangeSchema),
    defaultValues: { temporary: "", password: "", confirm: "" },
  });
  async function submit(values: PasswordChangeValues) {
    setError("");
    try {
      await changeTemporaryPassword(values, email);
      form.reset();
      await onChanged();
    } catch (failure: unknown) {
      setError(
        failure instanceof Error
          ? failure.message
          : "No pudimos cambiar la contraseña.",
      );
    }
  }
  const inputs = [
    {
      name: "temporary",
      label: "Contraseña temporal",
      autoComplete: "current-password",
    },
    {
      name: "password",
      label: "Nueva contraseña",
      autoComplete: "new-password",
    },
    {
      name: "confirm",
      label: "Confirmar nueva contraseña",
      autoComplete: "new-password",
    },
  ] as const;
  return (
    <form onSubmit={form.handleSubmit(submit)} className="mt-6 space-y-5">
      <fieldset disabled={form.formState.isSubmitting} className="space-y-5">
        {inputs.map((input) => (
          <div key={input.name}>
            <label
              htmlFor={`password-${input.name}`}
              className="mb-2 block text-sm font-medium"
            >
              {input.label}
            </label>
            <input
              id={`password-${input.name}`}
              type="password"
              autoComplete={input.autoComplete}
              maxLength={input.name === "temporary" ? 128 : 64}
              className={fieldClass}
              {...form.register(input.name)}
            />
            {form.formState.errors[input.name] ? (
              <p role="alert" className="mt-2 text-sm text-arma-red">
                {form.formState.errors[input.name]?.message}
              </p>
            ) : null}
          </div>
        ))}
      </fieldset>
      <p className="text-xs leading-5 text-arma-muted">
        Usa al menos 12 caracteres. Puedes usar una frase larga que recuerdes y
        que nadie más conozca.
      </p>
      {error ? (
        <p role="alert" className="text-sm text-arma-red">
          {error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={form.formState.isSubmitting}
        className={`${primaryButton} w-full`}
      >
        {form.formState.isSubmitting
          ? "Guardando contraseña…"
          : "Guardar contraseña y entrar"}
      </button>
    </form>
  );
}
