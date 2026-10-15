import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Calculator } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { useAppAccess } from "@/features/access/hooks/useAppAccess";
import { FormField } from "@/features/commerce/components/FormField";
import {
  fieldClass,
  primaryButton,
  secondaryButton,
  formatMoney,
} from "@/features/commerce/utils/commerce-format";
import type { CatalogItem } from "@/features/catalog/schemas/catalog.schema";
import { useMaterialCostProfile, useOperation } from "../hooks/useOperations";
import {
  materialCostFormSchema,
  type MaterialCostForm,
  type MaterialCostProfile,
} from "../schemas/material-cost.schema";
import { estimateDtfCost } from "../utils/material-cost";
import { OperationFeedback } from "./OperationFeedback";
function CostEditor({
  variantId,
  dtf,
  profile,
  onSaved,
  onBusy,
}: {
  variantId: string;
  dtf: boolean;
  profile: MaterialCostProfile;
  onSaved: () => void;
  onBusy: (value: boolean) => void;
}) {
  const access = useAppAccess();
  const cost = profile.profile;
  const str = (v: number | null | undefined) =>
    v === null || v === undefined ? "" : String(v);
  const form = useForm<MaterialCostForm>({
    resolver: zodResolver(materialCostFormSchema),
    defaultValues: {
      method: cost?.method ?? "manual",
      manual_cost: str(cost?.manual_cost ?? profile.inventory_cost),
      sheet_price: str(cost?.sheet_price),
      sheet_width_cm: str(cost?.sheet_width_cm),
      sheet_length_cm: str(cost?.sheet_length_cm),
      design_width_cm: str(cost?.design_width_cm ?? profile.dimensions?.width),
      design_height_cm: str(
        cost?.design_height_cm ?? profile.dimensions?.height,
      ),
      waste_percent: str(cost?.waste_percent ?? 0),
      apply_inventory: false,
    },
  });
  const values = useWatch({ control: form.control });
  const op = useOperation("cost", "Costo de referencia guardado");
  const estimate =
    values.method === "area"
      ? estimateDtfCost(
          Number(values.sheet_price),
          Number(values.sheet_width_cm),
          Number(values.sheet_length_cm),
          Number(values.design_width_cm),
          Number(values.design_height_cm),
          Number(values.waste_percent),
        )
      : values.manual_cost !== ""
        ? Number(values.manual_cost)
        : null;
  const submit = form.handleSubmit(async (v) => {
    onBusy(true);
    try {
      if (await op.execute({ ...v, variant_id: variantId })) onSaved();
    } finally {
      onBusy(false);
    }
  });
  const fields = [
    ["sheet_price", "Precio del formato (MXN)"],
    ["sheet_width_cm", "Ancho del formato (cm)"],
    ["sheet_length_cm", "Largo del formato (cm)"],
    ["design_width_cm", "Ancho del diseño (cm)"],
    ["design_height_cm", "Alto del diseño (cm)"],
    ["waste_percent", "Merma adicional (%)"],
  ] as const;
  return (
    <form onSubmit={submit} className="mt-5 space-y-5">
      <fieldset
        disabled={op.busy || op.uncertain || !access.can("materials.edit")}
        className="space-y-4"
      >
        <FormField label="Cómo determinar el costo">
          {(id) => (
            <select id={id} {...form.register("method")} className={fieldClass}>
              <option value="manual">Costo fijo por pieza</option>
              {dtf ? (
                <option value="area">DTF por dimensiones y tarifa</option>
              ) : null}
            </select>
          )}
        </FormField>
        {values.method === "area" ? (
          <>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className={secondaryButton}
                onClick={() => {
                  form.setValue("sheet_price", "180");
                  form.setValue("sheet_width_cm", "58");
                  form.setValue("sheet_length_cm", "100");
                }}
              >
                DTF 58 cm · $180 / metro
              </button>
              <button
                type="button"
                className={secondaryButton}
                onClick={() => {
                  form.setValue("sheet_price", "200");
                  form.setValue("sheet_width_cm", "28");
                  form.setValue("sheet_length_cm", "100");
                }}
              >
                DTF V 28 cm · $200 / metro
              </button>
            </div>
            <p className="text-xs leading-5 text-arma-muted">
              Son formatos iniciales editables. Un metro de largo se registra
              como 100 cm.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              {fields.map(([key, label]) => (
                <FormField
                  key={key}
                  label={label}
                  error={form.formState.errors[key]?.message}
                >
                  {(id, err) => (
                    <input
                      id={id}
                      inputMode="decimal"
                      aria-describedby={err}
                      {...form.register(key)}
                      className={fieldClass}
                    />
                  )}
                </FormField>
              ))}
            </div>
            <p className="text-xs leading-5 text-arma-muted">
              Estimación por área: tarifa × área del diseño / área del formato,
              más el porcentaje adicional de merma. No simula el acomodo exacto
              de impresión. Para estandarizar varios diseños puedes usar un
              costo fijo por pieza.
            </p>
          </>
        ) : (
          <FormField
            label="Costo fijo por pieza (MXN)"
            error={form.formState.errors.manual_cost?.message}
          >
            {(id, err) => (
              <input
                id={id}
                inputMode="decimal"
                aria-describedby={err}
                {...form.register("manual_cost")}
                className={fieldClass}
              />
            )}
          </FormField>
        )}
        {access.can("materials.receive") ? (
          <label className="flex min-h-11 items-start gap-3 rounded-arma bg-arma-gold-soft p-3 text-sm leading-6 text-arma-gold">
            <input
              type="checkbox"
              {...form.register("apply_inventory")}
              className="mt-1 size-5 shrink-0 accent-arma-active"
            />
            Confirmo este costo también para mis existencias actuales. No cambia
            cantidades ni costos históricos de ventas.
          </label>
        ) : null}
      </fieldset>
      <div className="flex items-center gap-3 rounded-arma bg-arma-green-soft p-4 text-arma-green">
        <Calculator size={24} strokeWidth={1.6} />
        <div>
          <p className="text-xs">Costo de referencia por pieza</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">
            {estimate === null || !Number.isFinite(estimate)
              ? "Completa las medidas"
              : formatMoney(estimate)}
          </p>
        </div>
      </div>
      <p className="text-xs leading-5 text-arma-muted">
        Costo promedio actual del inventario:{" "}
        {profile.inventory_cost === null
          ? "sin registrar"
          : formatMoney(profile.inventory_cost)}
        . Las recetas usarán el costo de referencia; las ventas conservarán el
        costo de inventario registrado al producir.
      </p>
      <OperationFeedback
        uncertain={op.uncertain}
        busy={op.busy}
        retry={() => {
          onBusy(true);
          void op
            .retry()
            .then((saved) => {
              if (saved) onSaved();
            })
            .finally(() => onBusy(false));
        }}
      />
      {access.can("materials.edit") ? (
        <button
          type="submit"
          disabled={op.busy || op.uncertain}
          className={primaryButton}
        >
          {op.busy ? "Guardando…" : "Guardar costo"}
        </button>
      ) : null}
    </form>
  );
}
export function MaterialCostsModal({
  item,
  onClose,
}: {
  item: CatalogItem;
  onClose: () => void;
}) {
  const [variantId, setVariantId] = useState(item.variants[0]?.id ?? "");
  const [busy, setBusy] = useState(false);
  const query = useMaterialCostProfile(variantId);
  return (
    <Modal title={`Costos · ${item.name}`} wide busy={busy} onClose={onClose}>
      <label
        htmlFor="material-cost-variant"
        className="mb-2 block text-sm font-medium"
      >
        Variante del insumo
      </label>
      <select
        id="material-cost-variant"
        disabled={busy}
        value={variantId}
        onChange={(e) => setVariantId(e.target.value)}
        className={fieldClass}
      >
        {item.variants.map((v) => (
          <option key={v.id} value={v.id}>
            {v.sku} · {[v.color, v.size].filter(Boolean).join(" · ")}
          </option>
        ))}
      </select>
      {query.isPending ? (
        <p role="status" className="mt-5 text-sm">
          Cargando costos…
        </p>
      ) : query.isError || !query.data ? (
        <div role="alert" className="mt-5">
          <p>No pudimos cargar el costo.</p>
          <button
            type="button"
            onClick={() => void query.refetch()}
            className={secondaryButton}
          >
            Reintentar
          </button>
        </div>
      ) : (
        <CostEditor
          key={variantId}
          variantId={variantId}
          dtf={item.material_type === "dtf_transfer"}
          profile={query.data}
          onSaved={onClose}
          onBusy={setBusy}
        />
      )}
    </Modal>
  );
}
