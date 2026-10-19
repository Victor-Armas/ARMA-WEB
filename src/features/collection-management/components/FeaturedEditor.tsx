import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowUp, ArrowDown, Save } from "lucide-react";
import { ProductImage } from "@/features/products/components/ProductImage";
import {
  collectionFormSchema,
  type CollectionForm,
} from "../schemas/collection.schema";
import type { getCollectionAdmin } from "../services/collection.service";
import {
  CollectionField,
  fieldClass,
  primaryClass,
  secondaryClass,
} from "./CollectionFields";
type Data = Awaited<ReturnType<typeof getCollectionAdmin>>;
export function FeaturedEditor({
  data,
  busy,
  onSave,
}: {
  data: Data;
  busy: boolean;
  onSave: (payload: CollectionForm) => void;
}) {
  const form = useForm<CollectionForm>({
    resolver: zodResolver(collectionFormSchema),
    defaultValues: {
      ...data.settings,
      featured: Array.from({ length: 4 }, (_, i) => ({
        product_id: data.featured[i]?.product_id ?? "",
        image_id: data.featured[i]?.image_id ?? null,
      })),
    },
  });
  const fields = useFieldArray({ control: form.control, name: "featured" });
  const selected = useWatch({ control: form.control, name: "featured" });
  return (
    <form onSubmit={form.handleSubmit(onSave)} className="space-y-8">
      <fieldset disabled={busy} className="space-y-8 disabled:opacity-70">
        <section className="grid gap-6 border-b border-arma-border pb-8 lg:grid-cols-[1fr_1.5fr]">
          <div>
            <h2 className="font-arma-heading text-2xl">La primera impresión</h2>
            <p className="mt-3 max-w-sm text-sm leading-6 text-arma-muted">
              Elige las palabras y los cuatro modelos que reciben a tus
              clientes. Fotos recomendadas: 1200 × 1500 px (proporción 4:5), JPG
              o WebP. Para fondos transparentes, PNG o WebP. Mantén la prenda
              centrada y deja margen; evita texto pegado a los bordes. Estas
              fotos se eligen de Gestión de productos.
            </p>
            <label className="mt-5 flex min-h-11 items-center gap-3 text-sm font-medium">
              <input
                type="checkbox"
                {...form.register("published")}
                className="size-5 accent-arma-green"
              />
              Colección pública visible
            </label>
            <p className="mt-2 text-xs leading-5 text-arma-muted">
              Al desactivarla, la colección y el catálogo dejan de mostrar
              productos.
            </p>
          </div>
          <div className="grid min-w-0 gap-4 sm:grid-cols-3">
            {(["headline_1", "headline_2", "headline_3"] as const).map(
              (name, i) => (
                <CollectionField
                  key={name}
                  label={`Título · línea ${i + 1}`}
                  error={form.formState.errors[name]?.message}
                >
                  <input
                    maxLength={40}
                    {...form.register(name)}
                    className={fieldClass}
                  />
                </CollectionField>
              ),
            )}
            <div className="sm:col-span-3">
              <CollectionField
                label="Texto de bienvenida"
                error={form.formState.errors.intro?.message}
              >
                <textarea
                  rows={3}
                  maxLength={240}
                  {...form.register("intro")}
                  className={fieldClass}
                />
              </CollectionField>
            </div>
            <div className="sm:col-span-3">
              <CollectionField
                label="Título de la sección de ofertas"
                error={form.formState.errors.offers_title?.message}
              >
                <input
                  maxLength={80}
                  {...form.register("offers_title")}
                  className={fieldClass}
                />
              </CollectionField>
            </div>
          </div>
        </section>
        <section>
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <h2 className="font-arma-heading text-2xl">
              Cuatro modelos principales
            </h2>
            <p className="text-sm text-arma-muted">
              De izquierda a derecha en la portada
            </p>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {fields.fields.map((field, i) => {
              const product = data.products.find(
                (p) => p.id === selected[i]?.product_id,
              );
              const image =
                product?.images.find(
                  (image) => image.id === selected[i]?.image_id,
                ) ?? product?.images[0];
              return (
                <article
                  key={field.id}
                  className="min-w-0 overflow-hidden rounded-arma border border-arma-border bg-arma-surface"
                >
                  <div className="flex items-center justify-between bg-arma-primary-soft px-4 py-2">
                    <h3 className="text-sm font-semibold">Posición {i + 1}</h3>
                    <div className="flex">
                      <button
                        type="button"
                        disabled={i === 0}
                        aria-label={`Subir posición ${i + 1}`}
                        onClick={() => fields.swap(i, i - 1)}
                        className="flex size-11 items-center justify-center disabled:opacity-25"
                      >
                        <ArrowUp size={18} />
                      </button>
                      <button
                        type="button"
                        disabled={i === 3}
                        aria-label={`Bajar posición ${i + 1}`}
                        onClick={() => fields.swap(i, i + 1)}
                        className="flex size-11 items-center justify-center disabled:opacity-25"
                      >
                        <ArrowDown size={18} />
                      </button>
                    </div>
                  </div>
                  <ProductImage
                    src={
                      image
                        ? (data.urls.get(image.storage_path)?.url ?? null)
                        : null
                    }
                    alt={product?.name ?? "Elige un modelo"}
                    background={image?.background_color}
                    className="aspect-[4/3] w-full object-contain"
                  />
                  <div className="space-y-4 p-4">
                    <CollectionField
                      label={`Modelo ${i + 1}`}
                      error={
                        form.formState.errors.featured?.[i]?.product_id?.message
                      }
                    >
                      <select
                        className={fieldClass}
                        {...form.register(`featured.${i}.product_id`, {
                          onChange: () =>
                            form.setValue(`featured.${i}.image_id`, null),
                        })}
                      >
                        <option value="">Seleccionar modelo</option>
                        {data.products
                          .filter((p) => p.is_active && p.base_price !== null)
                          .map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name}
                            </option>
                          ))}
                      </select>
                    </CollectionField>
                    <CollectionField label={`Fotografía ${i + 1}`}>
                      <select
                        className={fieldClass}
                        value={selected[i]?.image_id ?? ""}
                        onChange={(e) =>
                          form.setValue(
                            `featured.${i}.image_id`,
                            e.target.value || null,
                            { shouldDirty: true },
                          )
                        }
                      >
                        <option value="">Foto principal del producto</option>
                        {product?.images.map((image, n) => (
                          <option key={image.id} value={image.id}>
                            {image.alt_text || `Foto ${n + 1}`}
                          </option>
                        ))}
                      </select>
                    </CollectionField>
                  </div>
                </article>
              );
            })}
          </div>
          {form.formState.errors.featured?.root?.message && (
            <p role="alert" className="mt-3 text-sm text-red-700">
              {form.formState.errors.featured.root.message}
            </p>
          )}
          {form.formState.errors.featured?.message && (
            <p role="alert" className="mt-3 text-sm text-red-700">
              {form.formState.errors.featured.message}
            </p>
          )}
        </section>
        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-arma-border pt-5">
          <p className="text-sm text-arma-muted">
            Los cambios se publican al guardar.
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              className={secondaryClass}
              onClick={() => form.reset()}
            >
              Deshacer cambios
            </button>
            <button className={primaryClass} type="submit">
              <Save size={17} />
              {busy ? "Guardando…" : "Guardar portada"}
            </button>
          </div>
        </div>
      </fieldset>
    </form>
  );
}
