import { CreateRoleModal } from "./CreateRoleModal";
import { useState } from "react";
import { notify } from "@/lib/notify";
import { commerceError } from "@/features/commerce/services/commerce.service";
import { primaryButton } from "@/features/commerce/utils/commerce-format";
import {
  getRoleLabel,
  type RoleConfig,
  type StaffRole,
} from "../schemas/access.schema";
import { useSetRolePermissions } from "../hooks/useTeam";
const moduleLabels: Record<string, string> = {
  products: "Productos",
  sales: "Ventas",
  reservations: "Apartados",
  commerce: "Alcance de operaciones",
  materials: "Materia prima",
  team: "Equipo",
  production: "Armado de productos",
  business: "Información del negocio",
  consignments: "Vendedores y liquidaciones",
  inventory: "Inventario del taller",
};
function PermissionEditor({
  role,
  config,
  editable,
}: {
  role: RoleConfig["roles"][number];
  config: RoleConfig;
  editable: boolean;
}) {
  const [keys, setKeys] = useState(role.keys);
  const mutation = useSetRolePermissions();
  const groups = [
    ...new Set(config.permissions.map((permission) => permission.module)),
  ];
  const dirty =
    JSON.stringify([...keys].sort()) !== JSON.stringify([...role.keys].sort());
  async function save() {
    const id = notify.loading("Guardando permisos…");
    try {
      await mutation.mutateAsync({ role: role.code, keys });
      notify.success("Permisos actualizados", { id });
    } catch (error: unknown) {
      notify.error(commerceError(error), { id });
    }
  }
  return (
    <div>
      <p className="text-sm leading-6 text-arma-muted">
        Estos permisos se aplican a todas las cuentas con el rol{" "}
        {getRoleLabel(role.code, config.roles)}. Las cuentas con varios roles
        reúnen sus permisos.
      </p>
      <fieldset
        disabled={!editable || mutation.isPending}
        className="mt-5 grid gap-5 sm:grid-cols-2"
      >
        {groups.map((group) => (
          <fieldset
            key={group}
            className="rounded-arma border border-arma-border bg-arma-surface p-4"
          >
            <legend className="px-2 text-sm font-semibold">
              {moduleLabels[group] ?? group}
            </legend>
            {config.permissions
              .filter((permission) => permission.module === group)
              .map((permission) => (
                <label
                  key={permission.key}
                  className="flex min-h-11 items-center gap-3 py-2 text-sm"
                >
                  <input
                    type="checkbox"
                    checked={keys.includes(permission.key)}
                    onChange={(event) =>
                      setKeys((current) =>
                        event.target.checked
                          ? [...current, permission.key]
                          : current.filter((key) => key !== permission.key),
                      )
                    }
                    className="size-5 shrink-0 accent-arma-active"
                  />
                  <span>{permission.label}</span>
                </label>
              ))}
          </fieldset>
        ))}
      </fieldset>
      {editable ? (
        <button
          type="button"
          disabled={!dirty || mutation.isPending}
          onClick={() => void save()}
          className={`${primaryButton} mt-6`}
        >
          {mutation.isPending
            ? "Guardando…"
            : `Guardar permisos de ${getRoleLabel(role.code, config.roles)}`}
        </button>
      ) : (
        <p className="mt-5 text-sm text-arma-muted">
          Tienes acceso de consulta a los permisos.
        </p>
      )}
    </div>
  );
}
export function RolePermissions({
  config,
  editable,
}: {
  config: RoleConfig;
  editable: boolean;
}) {
  const [selected, setSelected] = useState<StaffRole>("seller");
  const [creating, setCreating] = useState(false);
  const role = config.roles.find((item) => item.code === selected);
  return (
    <div>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">Roles del equipo</h2>
          <p className="mt-2 max-w-prose text-sm leading-6 text-arma-muted">
            Selecciona un rol para definir lo que puede consultar y hacer.
            También puedes crear un rol para una nueva función del personal.
          </p>
        </div>
        {editable ? (
          <button
            type="button"
            onClick={() => setCreating(true)}
            className={primaryButton}
          >
            Crear rol
          </button>
        ) : null}
      </div>
      <div aria-label="Seleccionar rol" className="mb-5 flex flex-wrap gap-2">
        {config.roles.map((item) => (
          <button
            key={item.code}
            type="button"
            aria-pressed={item.code === selected}
            onClick={() => setSelected(item.code)}
            className={`min-h-11 rounded-arma border px-4 text-sm ${selected === item.code ? "border-arma-active bg-arma-primary-soft text-arma-active" : "border-arma-border bg-arma-surface"}`}
          >
            {getRoleLabel(item.code, config.roles)}
          </button>
        ))}
      </div>
      {role?.description ? (
        <p className="mb-4 text-sm text-arma-muted">{role.description}</p>
      ) : null}
      {creating ? (
        <CreateRoleModal
          onClose={() => setCreating(false)}
          onCreated={(code) => {
            setSelected(code);
            setCreating(false);
          }}
        />
      ) : null}
      {role ? (
        <PermissionEditor
          key={`${role.code}-${JSON.stringify(role.keys)}`}
          role={role}
          config={config}
          editable={editable}
        />
      ) : null}
    </div>
  );
}
