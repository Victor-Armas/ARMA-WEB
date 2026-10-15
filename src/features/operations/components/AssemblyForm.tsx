import { useEffect } from "react";
import { ProductImage } from "@/features/products/components/ProductImage";
import { RecipeCostBreakdown } from "./RecipeCostBreakdown";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { FormField } from "@/features/commerce/components/FormField";
import {
  fieldClass,
  primaryButton,
} from "@/features/commerce/utils/commerce-format";
import {
  productionFormSchema,
  type Recipe,
} from "../schemas/operations.schema";
import { useOperation } from "../hooks/useOperations";
import { OperationFeedback } from "./OperationFeedback";
export function AssemblyForm({
  variantId,
  recipe,
  onStarted,
  onBusyChange,
}: {
  variantId: string;
  recipe: Recipe;
  onStarted?: () => void;
  onBusyChange?: (busy: boolean) => void;
}) {
  const form = useForm<
    z.input<typeof productionFormSchema>,
    unknown,
    z.output<typeof productionFormSchema>
  >({
    resolver: zodResolver(productionFormSchema),
    defaultValues: { quantity: "1", notes: "" },
  });
  const op = useOperation("start", "Armado iniciado; insumos reservados");
  const watchedQuantity = useWatch({ control: form.control, name: "quantity" });
  useEffect(() => {
    onBusyChange?.(op.busy || op.uncertain);
  }, [op.busy, op.uncertain, onBusyChange]);
  const quantity = Number(watchedQuantity) || 0;
  const insufficient = recipe.lines.some(
    (l) => !l.active || l.available < l.quantity * quantity,
  );
  const unknown = recipe.lines.some((l) => l.cost === null);
  const submit = form.handleSubmit(async (values) => {
    if (await op.execute({ ...values, variant_id: variantId })) {
      form.reset();
      onStarted?.();
    }
  });
  return (
    <form onSubmit={submit} className="space-y-5">
      <fieldset disabled={op.busy || op.uncertain} className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            label="Cantidad que vas a armar"
            error={form.formState.errors.quantity?.message}
          >
            {(id, err) => (
              <input
                id={id}
                inputMode="numeric"
                aria-describedby={err}
                {...form.register("quantity")}
                className={fieldClass}
              />
            )}
          </FormField>
          <FormField label="Notas de producción (opcional)">
            {(id) => (
              <input
                id={id}
                maxLength={1000}
                {...form.register("notes")}
                className={fieldClass}
              />
            )}
          </FormField>
        </div>
        <div className="divide-y divide-arma-border border-y border-arma-border">
          {recipe.lines.map((l) => (
            <div
              key={l.material_variant_id}
              className="flex flex-wrap justify-between gap-3 py-4"
            >
              <div className="h-24 w-20 shrink-0">
                <ProductImage
                  src={l.photo_url ?? null}
                  background={l.photo?.background}
                  alt={l.label}
                  className="h-full w-full rounded-arma object-contain"
                />
              </div>
              <div className="min-w-0 flex-1 basis-36">
                <p className="break-words text-sm font-semibold">{l.label}</p>
                <p className="mt-1 break-words text-xs leading-5 text-arma-muted">
                  {l.description}
                </p>
                <p className="mt-1 text-xs text-arma-muted">
                  {l.quantity} por playera {l.active ? "" : "· Insumo oculto"}
                </p>
              </div>
              <div className="text-right tabular-nums">
                <p
                  className={`text-lg font-semibold ${l.available < l.quantity * quantity || !l.active ? "text-arma-red" : ""}`}
                >
                  {l.quantity * quantity} necesarias
                </p>
                <p className="mt-1 text-xs text-arma-muted">
                  {l.available} disponibles
                </p>
              </div>
            </div>
          ))}
        </div>
        <RecipeCostBreakdown
          materials={
            unknown
              ? null
              : recipe.lines.reduce(
                  (sum, l) => sum + (l.cost ?? 0) * l.quantity,
                  0,
                )
          }
          labor={recipe.recipe?.labor_cost ?? 0}
          electricity={recipe.recipe?.electricity_cost ?? 0}
          tape={recipe.recipe?.tape_cost ?? 0}
          other={recipe.recipe?.other_cost ?? 0}
          margin={recipe.recipe?.target_margin ?? null}
        />
        <p className="text-sm leading-6 text-arma-muted">
          Al iniciar se reservan los insumos. Al finalizar confirmarás cuántas
          piezas terminaste; lo no utilizado vuelve a estar disponible. El costo
          final usa el promedio de materiales al terminar.
        </p>
        {insufficient ? (
          <p role="alert" className="text-sm text-arma-red">
            No hay suficientes insumos activos para esta cantidad.
          </p>
        ) : null}
      </fieldset>
      <OperationFeedback
        uncertain={op.uncertain}
        busy={op.busy}
        retry={() => {
          void op.retry().then((saved) => {
            if (saved) {
              form.reset();
              onStarted?.();
            }
          });
        }}
      />
      <button
        type="submit"
        disabled={
          op.busy || op.uncertain || insufficient || !recipe.lines.length
        }
        className={primaryButton}
      >
        {op.busy ? "Iniciando…" : "Iniciar armado"}
      </button>
    </form>
  );
}
