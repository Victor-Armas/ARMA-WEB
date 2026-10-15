import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Modal } from "@/components/ui/Modal";
import { commerceError } from "@/features/commerce/services/commerce.service";
import {
  fieldClass,
  primaryButton,
  secondaryButton,
} from "@/features/commerce/utils/commerce-format";
import { notify } from "@/lib/notify";
import {
  createRoleSchema,
  type CreateRoleForm,
} from "../schemas/access.schema";
import { useCreateTeamRole } from "../hooks/useTeam";
export function CreateRoleModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (code: string) => void;
}) {
  const [requestId] = useState(() => crypto.randomUUID());
  const [error, setError] = useState("");
  const mutation = useCreateTeamRole();
  const form = useForm<CreateRoleForm>({
    resolver: zodResolver(createRoleSchema),
    defaultValues: { name: "", description: "" },
  });
  async function submit(values: CreateRoleForm) {
    setError("");
    try {
      const code = await mutation.mutateAsync({ ...values, requestId });
      notify.success("Rol creado. Ahora configura sus permisos.");
      onCreated(code);
    } catch (failure: unknown) {
      setError(commerceError(failure));
    }
  }
  const busy = form.formState.isSubmitting;
  return (
    <Modal title="Crear rol" onClose={onClose} busy={busy}>
      <form onSubmit={form.handleSubmit(submit)} className="space-y-5">
        <p className="text-sm leading-6 text-arma-muted">
          Crea un rol para agrupar permisos, por ejemplo Producción o Encargado
          de almacén.
        </p>
        <fieldset disabled={busy} className="space-y-5">
          <div>
            <label
              htmlFor="role-name"
              className="mb-2 block text-sm font-medium"
            >
              Nombre del rol
            </label>
            <input
              id="role-name"
              maxLength={60}
              className={fieldClass}
              {...form.register("name")}
              aria-invalid={Boolean(form.formState.errors.name)}
              aria-describedby={
                form.formState.errors.name ? "role-name-error" : undefined
              }
            />
            {form.formState.errors.name ? (
              <p
                id="role-name-error"
                role="alert"
                className="mt-2 text-sm text-arma-red"
              >
                {form.formState.errors.name.message}
              </p>
            ) : null}
          </div>
          <div>
            <label
              htmlFor="role-description"
              className="mb-2 block text-sm font-medium"
            >
              Descripción (opcional)
            </label>
            <textarea
              id="role-description"
              rows={3}
              maxLength={250}
              className={fieldClass}
              {...form.register("description")}
            />
          </div>
        </fieldset>
        <p className="rounded-arma bg-arma-info-soft p-3 text-sm leading-6 text-arma-info">
          El rol comienza sin permisos. Después de crearlo podrás habilitarlos y
          asignarlo al personal.
        </p>
        {error ? (
          <p role="alert" className="text-sm text-arma-red">
            {error}
          </p>
        ) : null}
        <div className="flex flex-wrap gap-3">
          <button type="submit" disabled={busy} className={primaryButton}>
            {busy ? "Creando…" : "Crear rol"}
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
