import { useEffect, useState } from "react";
import { useForm, useFieldArray, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Trash2 } from "lucide-react";
import { ProductImage } from "@/features/products/components/ProductImage";
import { FormField } from "@/features/commerce/components/FormField";
import {
  fieldClass,
  primaryButton,
  secondaryButton,
  formatMoney,
} from "@/features/commerce/utils/commerce-format";
import { useOperation } from "../hooks/useOperations";
import {
  recipeFormSchema,
  type RecipeFormInput,
  type RecipeFormValues,
  type Recipe,
  type VariantOption,
} from "../schemas/operations.schema";
import { VariantPicker } from "./VariantPicker";
import { OperationFeedback } from "./OperationFeedback";
import { RecipeCostBreakdown } from "./RecipeCostBreakdown";
type CostMaterial = Pick<
  Recipe["lines"][number],
  "label" | "photo" | "photo_url" | "cost"
>;
export function RecipeEditor({
  variantId,
  recipe,
  onSaved,
  onBusyChange,
}: {
  variantId: string;
  recipe: Recipe;
  onSaved: () => void;
  onBusyChange?: (value: boolean) => void;
}) {
  const [selected, setSelected] = useState<VariantOption | null>(null);
  const [materials, setMaterials] = useState<Record<string, CostMaterial>>(() =>
    Object.fromEntries(recipe.lines.map((l) => [l.material_variant_id, l])),
  );
  const form = useForm<RecipeFormInput, unknown, RecipeFormValues>({
    resolver: zodResolver(recipeFormSchema),
    defaultValues: {
      labor_cost: recipe.recipe ? String(recipe.recipe.labor_cost) : "",
      target_margin: recipe.recipe ? String(recipe.recipe.target_margin) : "",
      electricity_cost: String(recipe.recipe?.electricity_cost ?? 0),
      tape_cost: String(recipe.recipe?.tape_cost ?? 0),
      other_cost: String(recipe.recipe?.other_cost ?? 0),
      lines: recipe.lines.map((l) => ({
        material_variant_id: l.material_variant_id,
        quantity: String(l.quantity),
      })),
    },
  });
  const array = useFieldArray({ control: form.control, name: "lines" });
  const values = useWatch({ control: form.control });
  const op = useOperation("recipe", "Receta guardada");
  useEffect(() => {
    onBusyChange?.(op.busy || op.uncertain);
  }, [op.busy, op.uncertain, onBusyChange]);
  const subtotal =
    values.lines?.length &&
    values.lines.every(
      (l) =>
        l?.material_variant_id &&
        materials[l.material_variant_id]?.cost != null,
    )
      ? values.lines.reduce(
          (sum, l) =>
            sum +
            (l?.material_variant_id
              ? (materials[l.material_variant_id]?.cost ?? 0)
              : 0) *
              (Number(l?.quantity) || 0),
          0,
        )
      : null;
  const submit = form.handleSubmit(async (v) => {
    if (await op.execute({ ...v, variant_id: variantId })) onSaved();
  });
  return (
    <form onSubmit={submit} className="space-y-5">
      <p className="text-sm leading-6 text-arma-muted">
        Define una playera sin imprimir y uno o varios DTF por prenda. Elige
        talla, color, corte y diseño. Los costos de luz, cinta y otros gastos se
        asignan por playera.
      </p>
      <fieldset disabled={op.busy || op.uncertain} className="space-y-5">
        <div className="divide-y divide-arma-border border-y border-arma-border">
          {array.fields.map((line, index) => {
            const material = materials[line.material_variant_id];
            return (
              <div
                key={line.id}
                className="flex flex-wrap items-center gap-3 py-4"
              >
                <div className="h-20 w-16 shrink-0">
                  <ProductImage
                    src={material?.photo_url ?? null}
                    background={material?.photo?.background}
                    alt={material?.label ?? "Insumo"}
                    className="h-full w-full rounded-arma object-contain"
                  />
                </div>
                <div className="min-w-0 flex-1 basis-28">
                  <p className="break-words text-sm font-semibold">
                    {material?.label ?? "Insumo"}
                  </p>
                  <p className="mt-2 text-xs text-arma-muted">
                    Costo de referencia:{" "}
                    {material?.cost == null
                      ? "sin registrar"
                      : formatMoney(material.cost)}
                  </p>
                </div>
                <div className="w-20">
                  <FormField
                    label="Por pieza"
                    error={
                      form.formState.errors.lines?.[index]?.quantity?.message
                    }
                  >
                    {(id) => (
                      <input
                        id={id}
                        inputMode="numeric"
                        {...form.register(`lines.${index}.quantity`)}
                        className={fieldClass}
                      />
                    )}
                  </FormField>
                </div>
                <button
                  type="button"
                  onClick={() => array.remove(index)}
                  aria-label={`Quitar ${material?.label ?? "insumo"}`}
                  className={`${secondaryButton} px-3`}
                >
                  <Trash2 size={17} />
                </button>
              </div>
            );
          })}
        </div>
        <VariantPicker
          kind="material"
          value={selected}
          onChange={setSelected}
        />
        <button
          type="button"
          className={secondaryButton}
          disabled={
            !selected ||
            array.fields.length >= 30 ||
            array.fields.some((l) => l.material_variant_id === selected?.id)
          }
          onClick={() => {
            if (selected) {
              setMaterials((v) => ({
                ...v,
                [selected.id]: {
                  label: selected.label,
                  photo: selected.photo,
                  photo_url: selected.photo_url,
                  cost: selected.estimated_cost ?? selected.cost,
                },
              }));
              array.append({ material_variant_id: selected.id, quantity: "1" });
              setSelected(null);
            }
          }}
        >
          Agregar insumo a la receta
        </button>
        {form.formState.errors.lines?.root?.message ||
        form.formState.errors.lines?.message ? (
          <p role="alert" className="text-sm text-arma-red">
            {form.formState.errors.lines.root?.message ??
              form.formState.errors.lines.message}
          </p>
        ) : null}
        <div className="grid gap-4 border-t border-arma-border pt-5 sm:grid-cols-2">
          {(
            [
              ["labor_cost", "Mano de obra por playera (MXN)"],
              ["electricity_cost", "Luz por playera (MXN)"],
              ["tape_cost", "Cinta y consumibles por playera (MXN)"],
              ["other_cost", "Otros gastos por playera (MXN)"],
              ["target_margin", "Margen objetivo sobre venta (%)"],
            ] as const
          ).map(([key, label]) => (
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
      </fieldset>
      <RecipeCostBreakdown
        materials={subtotal}
        labor={Number(values.labor_cost) || 0}
        electricity={Number(values.electricity_cost) || 0}
        tape={Number(values.tape_cost) || 0}
        other={Number(values.other_cost) || 0}
        margin={values.target_margin ? Number(values.target_margin) : null}
      />
      <OperationFeedback
        uncertain={op.uncertain}
        busy={op.busy}
        retry={() => {
          void op.retry().then((saved) => {
            if (saved) onSaved();
          });
        }}
      />
      <button
        type="submit"
        className={primaryButton}
        disabled={op.busy || op.uncertain}
      >
        {op.busy ? "Guardando…" : "Guardar receta"}
      </button>
    </form>
  );
}
