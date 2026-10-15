import { secondaryButton } from "@/features/commerce/utils/commerce-format";
import {
  getRoleLabel,
  type RoleConfig,
  type TeamMember,
} from "../schemas/access.schema";
import type { MemberAction } from "./MemberActionModal";
export function TeamMemberRow({
  member,
  roles,
  canEdit,
  canReset,
  canDisable,
  onEdit,
  onAction,
}: {
  member: TeamMember;
  roles: RoleConfig["roles"];
  canEdit: boolean;
  canReset: boolean;
  canDisable: boolean;
  onEdit: () => void;
  onAction: (action: MemberAction) => void;
}) {
  const expired = member.temporary_expired;
  return (
    <article className="grid gap-4 border-b border-arma-border bg-arma-surface p-5 last:border-b-0 lg:grid-cols-[minmax(0,1fr)_auto]">
      <div className="min-w-0">
        <h2 className="font-semibold">
          {member.full_name || "Cuenta sin nombre"}
        </h2>
        <p className="mt-1 break-all text-sm text-arma-muted">{member.email}</p>
        {member.phone ? (
          <p className="mt-1 text-xs text-arma-muted">{member.phone}</p>
        ) : null}
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
          <span
            className={`rounded-arma px-2 py-1 ${member.is_active ? "bg-arma-green-soft text-arma-green" : "bg-arma-neutral-soft text-arma-neutral"}`}
          >
            {member.is_active ? "Activa" : "Deshabilitada"}
          </span>
          <span className="text-arma-active">
            {member.roles
              .map((role) => getRoleLabel(role, roles))
              .join(" · ") || "Sin roles"}
          </span>
          {member.requires_change ? (
            <span className="text-arma-warning">
              {expired
                ? "Contraseña temporal vencida"
                : "Cambio de contraseña pendiente"}
            </span>
          ) : null}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 lg:max-w-110 lg:justify-end">
        {canEdit ? (
          <button type="button" onClick={onEdit} className={secondaryButton}>
            Editar
          </button>
        ) : null}
        {canReset && member.is_active ? (
          <button
            type="button"
            onClick={() => onAction("reset")}
            className={secondaryButton}
          >
            Restablecer contraseña
          </button>
        ) : null}
        {canDisable ? (
          <button
            type="button"
            onClick={() => onAction(member.is_active ? "disable" : "enable")}
            className={secondaryButton}
          >
            {member.is_active ? "Deshabilitar" : "Reactivar"}
          </button>
        ) : null}
      </div>
    </article>
  );
}
