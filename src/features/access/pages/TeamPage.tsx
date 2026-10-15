import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/features/auth/stores/auth.store";
import { notify } from "@/lib/notify";
import { clearProductImageCache } from "@/features/products/services/product-image-cache.service";
import {
  primaryButton,
  secondaryButton,
} from "@/features/commerce/utils/commerce-format";
import { useAppAccess } from "../hooks/useAppAccess";
import { useTeam, useRoleConfig } from "../hooks/useTeam";
import {
  administerUser,
  createMember,
  resetMemberPassword,
} from "../services/user-admin.service";
import { TeamMemberRow } from "../components/TeamMemberRow";
import { MemberFormModal } from "../components/MemberFormModal";
import { CredentialModal } from "../components/CredentialModal";
import {
  MemberActionModal,
  type MemberAction,
} from "../components/MemberActionModal";
import { RolePermissions } from "../components/RolePermissions";
import type {
  TeamMember,
  TemporaryCredential,
  MemberForm,
} from "../schemas/access.schema";
export function TeamPage() {
  const access = useAppAccess();
  const team = useTeam(access.can("team.read"));
  const config = useRoleConfig(access.can("team.read"));
  const client = useQueryClient();
  const ownId = useAuthStore((state) => state.session?.user.id);
  const [tab, setTab] = useState<"users" | "permissions">("users");
  const [form, setForm] = useState<TeamMember | "new" | null>(null);
  const [action, setAction] = useState<{
    member: TeamMember;
    kind: MemberAction;
  } | null>(null);
  const [credential, setCredential] = useState<TemporaryCredential | null>(
    null,
  );
  const administrator =
    access.data?.roles.some((role) => role === "owner" || role === "admin") ===
    true;
  async function refresh() {
    clearProductImageCache();
    await client.invalidateQueries();
  }
  async function save(values: MemberForm) {
    if (form === "new") {
      const next = await createMember(values);
      setForm(null);
      setCredential(next);
    } else if (form) {
      await administerUser({
        action: "edit",
        user_id: form.id,
        full_name: values.full_name,
        phone: values.phone,
        roles: values.roles,
      });
      setForm(null);
      notify.success("Cuenta actualizada");
    }
    await refresh();
  }
  async function confirm() {
    if (!action) return;
    if (action.kind === "reset") {
      const next = await resetMemberPassword(action.member.id);
      setCredential(next);
    } else {
      await administerUser({ action: action.kind, user_id: action.member.id });
      notify.success(
        action.kind === "disable"
          ? "Cuenta deshabilitada"
          : "Cuenta reactivada",
      );
    }
    setAction(null);
    await refresh();
  }
  return (
    <section className="px-5 py-6 sm:px-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-arma-heading text-4xl tracking-[-0.035em]">
            Equipo y permisos
          </h1>
          <p className="mt-2 text-sm leading-6 text-arma-muted">
            Gestiona las cuentas del personal y lo que puede hacer cada rol.
          </p>
        </div>
        {tab === "users" && access.can("team.users.create") ? (
          <button
            type="button"
            onClick={() => setForm("new")}
            className={primaryButton}
          >
            Crear usuario
          </button>
        ) : null}
      </header>
      <div className="mt-6 flex gap-6 border-b border-arma-border">
        {(
          [
            { key: "users", label: "Personal" },
            { key: "permissions", label: "Permisos de roles" },
          ] as const
        ).map((item) => (
          <button
            key={item.key}
            type="button"
            aria-pressed={tab === item.key}
            onClick={() => setTab(item.key)}
            className={`min-h-12 border-b-2 px-1 text-sm font-medium ${tab === item.key ? "border-arma-active text-arma-active" : "border-transparent text-arma-muted"}`}
          >
            {item.label}
          </button>
        ))}
      </div>
      {tab === "users" ? (
        team.isPending ? (
          <p role="status" className="mt-6 text-sm text-arma-muted">
            Cargando equipo…
          </p>
        ) : team.isError ? (
          <div role="alert" className="mt-6">
            <p>No pudimos cargar el equipo.</p>
            <button
              type="button"
              onClick={() => void team.refetch()}
              className={`${secondaryButton} mt-3`}
            >
              Reintentar
            </button>
          </div>
        ) : (
          <div className="mt-5 overflow-hidden rounded-arma border border-arma-border">
            {team.data?.map((member) => {
              const allowed =
                administrator ||
                !member.roles.some((role) => role !== "seller");
              return (
                <TeamMemberRow
                  key={member.id}
                  member={member}
                  roles={config.data?.roles ?? []}
                  canEdit={allowed && access.can("team.users.edit")}
                  canReset={
                    allowed &&
                    member.id !== ownId &&
                    access.can("team.users.reset")
                  }
                  canDisable={
                    allowed &&
                    member.id !== ownId &&
                    access.can("team.users.disable")
                  }
                  onEdit={() => setForm(member)}
                  onAction={(kind) => setAction({ member, kind })}
                />
              );
            })}
          </div>
        )
      ) : config.isPending ? (
        <p role="status" className="mt-6 text-sm text-arma-muted">
          Cargando permisos…
        </p>
      ) : config.isError ? (
        <div role="alert" className="mt-6">
          <p>No pudimos cargar los permisos.</p>
          <button
            type="button"
            onClick={() => void config.refetch()}
            className={`${secondaryButton} mt-3`}
          >
            Reintentar
          </button>
        </div>
      ) : config.data ? (
        <div className="mt-6">
          <RolePermissions
            config={config.data}
            editable={access.can("team.permissions.edit")}
          />
        </div>
      ) : null}
      {form && config.isPending ? (
        <p role="status" className="mt-5 text-sm">
          Cargando roles…
        </p>
      ) : form && config.isError ? (
        <div role="alert" className="mt-5">
          <p>No pudimos cargar los roles para esta cuenta.</p>
          <button
            type="button"
            onClick={() => void config.refetch()}
            className={`${secondaryButton} mt-3`}
          >
            Reintentar roles
          </button>
        </div>
      ) : null}
      {form && config.data ? (
        <MemberFormModal
          member={form === "new" ? undefined : form}
          allowAdminRoles={administrator && access.can("team.users.edit")}
          availableRoles={config.data?.roles ?? []}
          onSave={save}
          onClose={() => setForm(null)}
        />
      ) : null}
      {action ? (
        <MemberActionModal
          action={action.kind}
          member={action.member}
          onConfirm={confirm}
          onClose={() => setAction(null)}
        />
      ) : null}
      {credential ? (
        <CredentialModal
          credential={credential}
          onClose={() => setCredential(null)}
        />
      ) : null}
    </section>
  );
}
