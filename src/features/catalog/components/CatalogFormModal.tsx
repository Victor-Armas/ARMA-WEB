import { useState } from "react";
import { normalizeSku } from "../utils/normalize-sku";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Modal } from "@/components/ui/Modal";
import {
  fieldClass,
  primaryButton,
  secondaryButton,
} from "@/features/commerce/utils/commerce-format";
import { catalogError } from "../services/catalog.service";
import {
  catalogFormSchema,
  catalogDefaults,
  emptyVariant,
  type CatalogKind,
  type CatalogItem,
  type CatalogForm,
} from "../schemas/catalog.schema";
import { useCatalogMutations } from "../hooks/useCatalog";
export function CatalogFormModal({
  kind,
  item,
  onClose,
}: {
  kind: CatalogKind;
  item?: CatalogItem;
  onClose: () => void;
}) {
  const [error, setError] = useState("");
  const mutation = useCatalogMutations();
  const product = kind === "product";
  const [defaults] = useState(() => catalogDefaults(item));
  const form = useForm<CatalogForm>({
    resolver: zodResolver(catalogFormSchema),
    defaultValues: defaults,
  });
  const variants = useFieldArray({
    control: form.control,
    name: "variants",
    keyName: "formKey",
  });
  const busy = form.formState.isSubmitting;
  async function submit(values: CatalogForm) {
    setError("");
    if (
      product &&
      values.variants.some(
        (variant) => !variant.color || Number(variant.sale_price) <= 0,
      )
    ) {
      setError("Cada variante necesita un color y un precio mayor que cero.");
      return;
    }
    try {
      await mutation.save.mutateAsync({ kind, values });
      onClose();
    } catch (failure: unknown) {
      setError(catalogError(failure));
    }
  }
  return (
    <Modal
      title={`${item ? "Editar" : "Crear"} ${product ? "producto" : "insumo"}`}
      onClose={onClose}
      busy={busy}
      wide
    >
      <form onSubmit={form.handleSubmit(submit)} className="space-y-5">
        <fieldset disabled={busy} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="catalog-name"
                className="mb-2 block text-sm font-medium"
              >
                Nombre
              </label>
              <input
                id="catalog-name"
                maxLength={120}
                className={fieldClass}
                {...form.register("name")}
              />
              {form.formState.errors.name ? (
                <p role="alert" className="mt-1 text-xs text-arma-red">
                  {form.formState.errors.name.message}
                </p>
              ) : null}
            </div>
            <div>
              <label
                htmlFor="catalog-code"
                className="mb-2 block text-sm font-medium"
              >
                Código
              </label>
              <input
                id="catalog-code"
                maxLength={50}
                placeholder={product ? "ARMA-ESTRELLA" : "DTF-ESTRELLA"}
                className={fieldClass}
                {...form.register("code")}
              />
              {form.formState.errors.code ? (
                <p role="alert" className="mt-1 text-xs text-arma-red">
                  {form.formState.errors.code.message}
                </p>
              ) : null}
            </div>
          </div>
          {!product ? (
            <div>
              <label
                htmlFor="catalog-type"
                className="mb-2 block text-sm font-medium"
              >
                Tipo de insumo
              </label>
              <select
                id="catalog-type"
                disabled={Boolean(item) || busy}
                className={fieldClass}
                {...form.register("material_type")}
              >
                <option value="blank_shirt">Playera sin imprimir</option>
                <option value="dtf_transfer">Transferencia DTF</option>
              </select>
            </div>
          ) : null}
          <div>
            <label
              htmlFor="catalog-description"
              className="mb-2 block text-sm font-medium"
            >
              Descripción
            </label>
            <textarea
              id="catalog-description"
              rows={3}
              maxLength={2000}
              placeholder={
                product
                  ? "Tipo de playera, tela, gramaje y diseño"
                  : "Características de la playera o del DTF"
              }
              className={fieldClass}
              {...form.register("description")}
            />
          </div>
          <div>
            <h3 className="text-lg font-semibold">Variantes</h3>
            <p className="mt-1 text-xs leading-5 text-arma-muted">
              Las variantes nuevas comienzan con 0 piezas. Editar sus datos
              conserva las existencias y el historial.
            </p>
          </div>
          {variants.fields.map((variant, index) => (
            <fieldset
              key={variant.formKey}
              className="rounded-arma border border-arma-border p-4"
            >
              <legend className="px-2 text-sm font-semibold">
                Variante {index + 1}
              </legend>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor={`variant-sku-${index}`}
                    className="mb-2 block text-sm"
                  >
                    SKU
                  </label>
                  <input
                    id={`variant-sku-${index}`}
                    maxLength={80}
                    className={fieldClass}
                    autoCapitalize="characters"
                    autoCorrect="off"
                    spellCheck={false}
                    {...form.register(`variants.${index}.sku`)}
                    onChange={(event) => {
                      const input = event.currentTarget;
                      const raw = input.value;
                      const start = input.selectionStart;
                      const end = input.selectionEnd;
                      input.value = normalizeSku(raw);
                      form.setValue(`variants.${index}.sku`, input.value, {
                        shouldDirty: true,
                        shouldValidate: form.formState.isSubmitted,
                      });
                      if (start !== null && end !== null) {
                        input.setSelectionRange(
                          normalizeSku(raw.slice(0, start)).length,
                          normalizeSku(raw.slice(0, end)).length,
                        );
                      }
                    }}
                  />
                </div>
                <div>
                  <label
                    htmlFor={`variant-color-${index}`}
                    className="mb-2 block text-sm"
                  >
                    Color{product ? "" : " (opcional)"}
                  </label>
                  <input
                    id={`variant-color-${index}`}
                    maxLength={80}
                    className={fieldClass}
                    {...form.register(`variants.${index}.color`)}
                  />
                </div>
                <div>
                  <label
                    htmlFor={`variant-size-${index}`}
                    className="mb-2 block text-sm"
                  >
                    Talla
                  </label>
                  {product ? (
                    <select
                      id={`variant-size-${index}`}
                      className={fieldClass}
                      {...form.register(`variants.${index}.size`)}
                    >
                      {!["S", "M", "L"].includes(variant.size) ? (
                        <option value={variant.size}>
                          {variant.size} (existente)
                        </option>
                      ) : null}
                      <option value="S">Chica</option>
                      <option value="M">Mediana</option>
                      <option value="L">Grande</option>
                    </select>
                  ) : (
                    <input
                      id={`variant-size-${index}`}
                      maxLength={20}
                      className={fieldClass}
                      {...form.register(`variants.${index}.size`)}
                    />
                  )}
                </div>
                {product ? (
                  <div>
                    <label
                      htmlFor={`variant-price-${index}`}
                      className="mb-2 block text-sm"
                    >
                      Precio de venta · MXN
                    </label>
                    <input
                      id={`variant-price-${index}`}
                      inputMode="decimal"
                      className={fieldClass}
                      {...form.register(`variants.${index}.sale_price`)}
                    />
                  </div>
                ) : (
                  <>
                    <div>
                      <label
                        htmlFor={`variant-width-${index}`}
                        className="mb-2 block text-sm"
                      >
                        Ancho · cm (opcional)
                      </label>
                      <input
                        id={`variant-width-${index}`}
                        inputMode="decimal"
                        className={fieldClass}
                        {...form.register(`variants.${index}.width_cm`)}
                      />
                    </div>
                    <div>
                      <label
                        htmlFor={`variant-height-${index}`}
                        className="mb-2 block text-sm"
                      >
                        Alto · cm (opcional)
                      </label>
                      <input
                        id={`variant-height-${index}`}
                        inputMode="decimal"
                        className={fieldClass}
                        {...form.register(`variants.${index}.height_cm`)}
                      />
                    </div>
                  </>
                )}
                <div>
                  <label
                    htmlFor={`variant-minimum-${index}`}
                    className="mb-2 block text-sm"
                  >
                    Stock mínimo
                  </label>
                  <input
                    id={`variant-minimum-${index}`}
                    inputMode="numeric"
                    className={fieldClass}
                    {...form.register(`variants.${index}.minimum_stock`)}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label
                    htmlFor={`variant-description-${index}`}
                    className="mb-2 block text-sm"
                  >
                    Descripción de la variante
                  </label>
                  <textarea
                    id={`variant-description-${index}`}
                    rows={2}
                    maxLength={1000}
                    className={fieldClass}
                    {...form.register(`variants.${index}.description`)}
                  />
                </div>
              </div>
              {form.formState.errors.variants?.[index] ? (
                <p role="alert" className="mt-3 text-sm text-arma-red">
                  {Object.values(form.formState.errors.variants[index])
                    .flatMap((value) =>
                      value &&
                      typeof value === "object" &&
                      "message" in value &&
                      typeof value.message === "string"
                        ? [value.message]
                        : [],
                    )
                    .join(" ") || "Revisa los datos de esta variante."}
                </p>
              ) : null}
              {!item?.variants.some((existing) => existing.id === variant.id) &&
              variants.fields.length > 1 ? (
                <button
                  type="button"
                  onClick={() => variants.remove(index)}
                  className="mt-3 min-h-11 text-sm text-arma-red underline"
                >
                  Quitar variante nueva
                </button>
              ) : null}
            </fieldset>
          ))}
          <button
            type="button"
            disabled={variants.fields.length >= 30}
            onClick={() => variants.append(emptyVariant())}
            className={secondaryButton}
          >
            Agregar variante
          </button>
        </fieldset>
        {error ? (
          <p role="alert" className="text-sm text-arma-red">
            {error}
          </p>
        ) : null}
        <div className="flex flex-wrap gap-3">
          <button type="submit" disabled={busy} className={primaryButton}>
            {busy ? "Guardando…" : "Guardar"}
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
