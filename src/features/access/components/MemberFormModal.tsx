import { DataPrivacyNotice } from "@/features/legal/components/DataPrivacyNotice";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Modal } from "@/components/ui/Modal";
import {
  fieldClass,
  primaryButton,
  secondaryButton,
} from "@/features/commerce/utils/commerce-format";
import {
  memberFormSchema,
  getRoleLabel,
  type MemberForm,
  type RoleConfig,
  type TeamMember,
} from "../schemas/access.schema";
export function MemberFormModal({
  member,
  allowAdminRoles,
  availableRoles,
  onSave,
  onClose,
}: {
  member?: TeamMember;
  allowAdminRoles: boolean;
  availableRoles: RoleConfig["roles"];
  onSave: (values: MemberForm) => Promise<void>;
  onClose: () => void;
}) {
  const [error, setError] = useState("");
  const form = useForm<MemberForm>({
    resolver: zodResolver(memberFormSchema),
    defaultValues: {
      email: member?.email ?? "",
      full_name: member?.full_name ?? "",
      phone: member?.phone ?? "",
      roles: member?.roles.length ? member.roles : ["seller"],
    },
  });
  const busy = form.formState.isSubmitting;
  const roles = availableRoles.filter(
    (role) => allowAdminRoles || role.code === "seller",
  );
  async function submit(values: MemberForm) {
    setError("");
    try {
      await onSave(values);
    } catch (failure: unknown) {
      setError(
        failure instanceof Error
          ? failure.message
          : "No pudimos guardar la cuenta.",
      );
    }
  }
  return (
    <Modal
      title={member ? "Editar cuenta" : "Crear usuario"}
      onClose={onClose}
      busy={busy}
    >
      <form onSubmit={form.handleSubmit(submit)} className="space-y-5">
        <DataPrivacyNotice audience="staff" />
        <fieldset disabled={busy} className="space-y-5">
          <div>
            <label
              htmlFor="member-name"
              className="mb-2 block text-sm font-medium"
            >
              Nombre del personal
            </label>
            <input
              id="member-name"
              autoComplete="name"
              maxLength={120}
              className={fieldClass}
              {...form.register("full_name")}
            />
            {form.formState.errors.full_name ? (
              <p role="alert" className="mt-2 text-sm text-arma-red">
                {form.formState.errors.full_name.message}
              </p>
            ) : null}
          </div>
          <div>
            <label
              htmlFor="member-email"
              className="mb-2 block text-sm font-medium"
            >
              Correo de acceso
            </label>
            <input
              id="member-email"
              type="email"
              autoComplete="email"
              readOnly={Boolean(member)}
              maxLength={254}
              className={fieldClass}
              {...form.register("email")}
            />
            {form.formState.errors.email ? (
              <p role="alert" className="mt-2 text-sm text-arma-red">
                {form.formState.errors.email.message}
              </p>
            ) : null}
          </div>
          <div>
            <label
              htmlFor="member-phone"
              className="mb-2 block text-sm font-medium"
            >
              Teléfono <span className="text-arma-muted">(opcional)</span>
            </label>
            <input
              id="member-phone"
              type="tel"
              autoComplete="tel"
              maxLength={30}
              className={fieldClass}
              {...form.register("phone")}
            />
          </div>
          <fieldset>
            <legend className="text-sm font-medium">Roles</legend>
            <div className="mt-2 flex flex-wrap gap-x-5">
              {roles.map((role) => (
                <label
                  key={role.code}
                  className="flex min-h-11 items-center gap-2 text-sm"
                >
                  <input
                    type="checkbox"
                    value={role.code}
                    className="size-5 accent-arma-active"
                    {...form.register("roles")}
                  />
                  {getRoleLabel(role.code, availableRoles)}
                </label>
              ))}
            </div>
            {form.formState.errors.roles ? (
              <p role="alert" className="text-sm text-arma-red">
                {form.formState.errors.roles.message}
              </p>
            ) : null}
          </fieldset>
        </fieldset>
        {!member ? (
          <p className="rounded-arma bg-arma-primary-soft p-3 text-sm leading-6">
            Al crear la cuenta verás una contraseña temporal válida por 24
            horas. El usuario deberá cambiarla al entrar.
          </p>
        ) : null}
        {error ? (
          <p role="alert" className="text-sm text-arma-red">
            {error}
          </p>
        ) : null}
        <div className="flex flex-wrap gap-3">
          <button type="submit" disabled={busy} className={primaryButton}>
            {busy ? "Guardando…" : member ? "Guardar cambios" : "Crear usuario"}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            className={secondaryButton}
          >
            Cancelar
          </button>
        </div>
      </form>
    </Modal>
  );
}
