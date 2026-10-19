import { collectionError } from "../services/collection.service";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Monitor, Smartphone, Eye, RotateCcw, Check } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import {
  appearancePresets,
  appearanceSchema,
  DEFAULT_APPEARANCE,
  type CollectionAppearance,
  type CollectionColors,
} from "@/features/collection-appearance/schemas/appearance.schema";
import { localToday } from "@/features/collection-appearance/utils/appearance";
import { useAppearanceAdmin } from "../hooks/useAppearanceAdmin";
import { useDraftImage } from "../hooks/useDraftImage";
import { AppearanceImageField } from "./AppearanceImageField";
import type { AppearanceAssetFiles } from "@/features/collection-appearance/schemas/appearance.schema";
import type { getAppearanceAdmin } from "../services/appearance-admin.service";
import { AppearancePreview } from "./AppearancePreview";
import {
  CollectionField,
  fieldClass,
  primaryClass,
  secondaryClass,
} from "./CollectionFields";
const colorFields: {
  key: keyof CollectionColors;
  label: string;
  help: string;
}[] = [
  {
    key: "electric",
    label: "Portada",
    help: "Color principal de la primera sección.",
  },
  { key: "acid", label: "Acento", help: "Botones, destacados y detalles." },
  {
    key: "coral",
    label: "Sección de cierre",
    help: "También se usa en los bloques de modelos.",
  },
  {
    key: "paper",
    label: "Fondo general",
    help: "Mantén un tono claro para leer bien el catálogo.",
  },
  {
    key: "ink",
    label: "Encabezado y pie",
    help: "Mantén un tono oscuro para conservar la identidad del logo.",
  },
];
export function AppearanceEditor({ enabled }: { enabled: boolean }) {
  const { query, save } = useAppearanceAdmin(enabled);
  if (query.isPending)
    return (
      <p role="status" className="py-8">
        Cargando apariencia…
      </p>
    );
  if (query.isError)
    return (
      <div role="alert">
        <p>No pudimos cargar la apariencia.</p>
        <button
          className={`${secondaryClass} mt-4`}
          onClick={() => void query.refetch()}
        >
          Reintentar
        </button>
      </div>
    );
  return (
    <AppearanceForm
      key={query.data.updated_at}
      data={query.data}
      busy={save.isPending}
      onPublish={(payload, files) =>
        save.mutateAsync({ payload, files, revision: query.data.updated_at })
      }
    />
  );
}
function AppearanceForm({
  data,
  busy,
  onPublish,
}: {
  data: Awaited<ReturnType<typeof getAppearanceAdmin>>;
  busy: boolean;
  onPublish: (
    payload: CollectionAppearance,
    files: AppearanceAssetFiles,
  ) => Promise<void>;
}) {
  const form = useForm<CollectionAppearance>({
    resolver: zodResolver(appearanceSchema),
    defaultValues: data.appearance,
  });
  const watched = useWatch({ control: form.control });
  const parsed = appearanceSchema.safeParse(watched);
  const draft = parsed.success ? parsed.data : data.appearance;
  const [device, setDevice] = useState<"desktop" | "mobile">("mobile");
  const [review, setReview] = useState(false);
  const [publishError, setPublishError] = useState("");
  function closeReview() {
    setPublishError("");
    setReview(false);
  }
  const artwork = useDraftImage("artwork"),
    background = useDraftImage("background"),
    logo = useDraftImage("logo");
  const artworkUrl =
    artwork.image?.url ?? (draft.artwork_path ? data.artworkUrl : null);
  const backgroundUrl =
    background.image?.url ??
    (draft.background_path ? data.backgroundUrl : null);
  const logoUrl = logo.image?.url ?? (draft.logo_path ? data.logoUrl : null);
  const preparing = artwork.preparing || background.preparing || logo.preparing;
  const scheduled =
    (draft.starts_on && draft.starts_on > localToday()) ||
    (draft.ends_on && draft.ends_on < localToday());
  const disabled = busy || preparing;
  const deviceControls = (
    <div className="flex gap-2">
      <button
        type="button"
        aria-pressed={device === "mobile"}
        className={`${secondaryClass} aria-pressed:border-arma-green aria-pressed:bg-arma-green-soft aria-pressed:text-arma-green`}
        onClick={() => setDevice("mobile")}
      >
        <Smartphone size={17} />
        Teléfono
      </button>
      <button
        type="button"
        aria-pressed={device === "desktop"}
        className={`${secondaryClass} aria-pressed:border-arma-green aria-pressed:bg-arma-green-soft aria-pressed:text-arma-green`}
        onClick={() => setDevice("desktop")}
      >
        <Monitor size={17} />
        Escritorio
      </button>
    </div>
  );
  return (
    <>
      <form
        onSubmit={form.handleSubmit(() => {
          setPublishError("");
          setReview(true);
        })}
      >
        <div className="mb-7 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="font-arma-heading text-3xl">
              Una colección para cada temporada
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-arma-muted">
              Prueba colores y adornos. Aquí trabajas en un borrador: tus
              clientes no ven ningún cambio hasta que publiques.
            </p>
          </div>
          <button type="submit" disabled={disabled} className={primaryClass}>
            <Eye size={18} />
            Revisar antes de publicar
          </button>
        </div>
        <div className="grid items-start gap-8 xl:grid-cols-[minmax(340px,0.85fr)_minmax(0,1.35fr)]">
          <fieldset
            disabled={disabled}
            className="min-w-0 space-y-8 disabled:opacity-60"
          >
            <section>
              <h3 className="text-lg font-semibold">Elige una base</h3>
              <div className="mt-4 space-y-2">
                {appearancePresets.map((p) => (
                  <button
                    type="button"
                    key={p.id}
                    aria-pressed={draft.preset === p.id}
                    onClick={() => {
                      form.setValue("preset", p.id, { shouldDirty: true });
                      form.setValue("colors", p.colors, { shouldDirty: true });
                      form.setValue("decoration", p.decoration, {
                        shouldDirty: true,
                      });
                    }}
                    className={`flex min-h-20 w-full items-center justify-between gap-4 rounded-arma border p-4 text-left ${draft.preset === p.id ? "border-arma-green bg-arma-green-soft" : "border-arma-border bg-arma-surface"}`}
                  >
                    <span>
                      <span className="block font-semibold">{p.name}</span>
                      <span className="mt-1 block text-xs text-arma-muted">
                        {p.description}
                      </span>
                    </span>
                    <span
                      className="flex shrink-0 -space-x-1"
                      aria-hidden="true"
                    >
                      {[p.colors.electric, p.colors.acid, p.colors.coral].map(
                        (c) => (
                          <span
                            key={c}
                            style={{ backgroundColor: c }}
                            className="size-7 rounded-arma border border-white"
                          />
                        ),
                      )}
                    </span>
                  </button>
                ))}
              </div>
            </section>
            <section className="border-t border-arma-border pt-6">
              <h3 className="text-lg font-semibold">Colores a tu gusto</h3>
              <div className="mt-4 space-y-4">
                {colorFields.map((c) => (
                  <div
                    key={c.key}
                    className="flex items-center justify-between gap-5"
                  >
                    <div>
                      <label
                        htmlFor={`appearance-${c.key}`}
                        className="text-sm font-medium"
                      >
                        {c.label}
                      </label>
                      <p className="mt-1 max-w-64 text-xs leading-5 text-arma-muted">
                        {c.help}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="text-xs uppercase tabular-nums">
                        {draft.colors[c.key]}
                      </span>
                      <input
                        id={`appearance-${c.key}`}
                        type="color"
                        {...form.register(`colors.${c.key}`)}
                        value={
                          watched.colors?.[c.key] ??
                          data.appearance.colors[c.key]
                        }
                        className="size-11 cursor-pointer rounded-arma border border-arma-border bg-arma-surface p-1"
                      />
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-xs leading-5 text-arma-muted">
                El color de los textos sobre los bloques se ajusta para
                conservar contraste.
              </p>
            </section>
            <section className="space-y-4 border-t border-arma-border pt-6">
              <h3 className="text-lg font-semibold">Fondo de la portada</h3>
              <p className="text-xs leading-6 text-arma-muted">
                Añade una imagen sobre el color principal. Puedes usar un fondo
                completo o un patrón de dibujos que se repita. Al quitarla,
                vuelve el fondo de color.
              </p>
              <AppearanceImageField
                kind="background"
                draft={background}
                url={backgroundUrl}
                disabled={disabled}
                onSelect={async (file) => {
                  if (await background.select(file))
                    form.setValue("background_path", null, {
                      shouldDirty: true,
                    });
                }}
                onRemove={() => {
                  background.clear();
                  form.setValue("background_path", null, { shouldDirty: true });
                }}
              />
              <CollectionField label="Ajuste del fondo">
                <select
                  {...form.register("background_mode")}
                  value={draft.background_mode}
                  className={fieldClass}
                >
                  <option value="cover">
                    Cubrir la portada · puede recortar los bordes
                  </option>
                  <option value="pattern">
                    Patrón · repetir sin recortar el dibujo
                  </option>
                </select>
              </CollectionField>
              {draft.background_mode === "pattern" && (
                <CollectionField
                  label={`Tamaño del patrón · ${draft.background_tile_size} px`}
                >
                  <input
                    type="range"
                    min={120}
                    max={800}
                    step={20}
                    value={draft.background_tile_size}
                    onChange={(e) =>
                      form.setValue(
                        "background_tile_size",
                        Number(e.target.value),
                        { shouldDirty: true },
                      )
                    }
                    className="mt-3 min-h-11 w-full accent-arma-green"
                  />
                </CollectionField>
              )}
              <CollectionField
                label={`Visibilidad de la imagen · ${draft.background_strength}%`}
              >
                <input
                  type="range"
                  min={0}
                  max={60}
                  step={5}
                  value={draft.background_strength}
                  onChange={(e) =>
                    form.setValue(
                      "background_strength",
                      Number(e.target.value),
                      { shouldDirty: true },
                    )
                  }
                  className="mt-3 min-h-11 w-full accent-arma-green"
                />
              </CollectionField>
              <p className="text-xs leading-5 text-arma-muted">
                La intensidad se limita automáticamente si hace falta para que
                el título y la descripción sigan siendo legibles.
              </p>
            </section>
            <section className="space-y-4 border-t border-arma-border pt-6">
              <h3 className="text-lg font-semibold">Logo de temporada</h3>
              <p className="text-xs leading-6 text-arma-muted">
                Se muestra con sus colores originales en el encabezado y el pie.
                Usa una versión que se lea bien sobre tu color oscuro. Si lo
                quitas, vuelve el logo habitual de ARMA.
              </p>
              <AppearanceImageField
                kind="logo"
                draft={logo}
                url={logoUrl}
                disabled={disabled}
                onSelect={async (file) => {
                  if (await logo.select(file))
                    form.setValue("logo_path", null, { shouldDirty: true });
                }}
                onRemove={() => {
                  logo.clear();
                  form.setValue("logo_path", null, { shouldDirty: true });
                }}
              />
            </section>
            <section className="space-y-4 border-t border-arma-border pt-6">
              <h3 className="text-lg font-semibold">Adornos de temporada</h3>
              <CollectionField label="Decoración">
                <select {...form.register("decoration")} className={fieldClass}>
                  <option value="none">Sin decoración prediseñada</option>
                  <option value="muertos">
                    Día de Muertos · flores y calaveras
                  </option>
                  <option value="christmas">Navidad · pinos y copos</option>
                </select>
              </CollectionField>
              <CollectionField label="Presencia de los adornos">
                <select {...form.register("intensity")} className={fieldClass}>
                  <option value="subtle">Discreta</option>
                  <option value="festive">Festiva</option>
                </select>
              </CollectionField>
              <p className="text-xs leading-6 text-arma-muted">
                Un dibujo completo se muestra una sola vez. Para papel picado,
                luces o guirnaldas elige una franja repetible. El archivo debe
                tener bordes preparados para continuar sin cortes visibles.
              </p>
              <AppearanceImageField
                kind="artwork"
                draft={artwork}
                url={artworkUrl}
                disabled={disabled}
                onSelect={async (file) => {
                  if (await artwork.select(file))
                    form.setValue("artwork_path", null, { shouldDirty: true });
                }}
                onRemove={() => {
                  artwork.clear();
                  form.setValue("artwork_path", null, { shouldDirty: true });
                }}
              />
              <CollectionField label="Cómo mostrar la imagen">
                <select
                  {...form.register("artwork_mode")}
                  value={draft.artwork_mode}
                  className={fieldClass}
                >
                  <option value="single">Imagen completa · una sola vez</option>
                  <option value="repeat">
                    Franja continua · repetir horizontalmente
                  </option>
                </select>
              </CollectionField>
              <CollectionField
                label={`Alto de la franja · ${draft.artwork_height} px`}
              >
                <input
                  type="range"
                  min={40}
                  max={240}
                  step={8}
                  value={draft.artwork_height}
                  onChange={(e) =>
                    form.setValue("artwork_height", Number(e.target.value), {
                      shouldDirty: true,
                    })
                  }
                  className="mt-3 min-h-11 w-full accent-arma-green"
                />
              </CollectionField>
              <CollectionField label="Ubicación del adorno">
                <select
                  {...form.register("artwork_position")}
                  value={draft.artwork_position}
                  className={fieldClass}
                >
                  <option value="top">Bajo el encabezado</option>
                  <option value="bottom">Antes del pie de página</option>
                  <option value="both">Arriba y abajo</option>
                </select>
              </CollectionField>
            </section>
            <section className="space-y-4 border-t border-arma-border pt-6">
              <h3 className="text-lg font-semibold">¿Cuándo se muestra?</h3>
              <p className="text-xs leading-5 text-arma-muted">
                Fechas opcionales, en horario de Monterrey. Al terminar, vuelve
                ARMA original. Sin fechas, se mantiene hasta que publiques otro
                diseño.
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <CollectionField label="Desde">
                  <input
                    type="date"
                    className={fieldClass}
                    value={watched.starts_on ?? ""}
                    onChange={(e) =>
                      form.setValue("starts_on", e.target.value || null, {
                        shouldDirty: true,
                      })
                    }
                  />
                </CollectionField>
                <CollectionField label="Hasta">
                  <input
                    type="date"
                    className={fieldClass}
                    value={watched.ends_on ?? ""}
                    onChange={(e) =>
                      form.setValue("ends_on", e.target.value || null, {
                        shouldDirty: true,
                      })
                    }
                  />
                </CollectionField>
              </div>
            </section>
            <button
              type="button"
              className={secondaryClass}
              onClick={() => {
                form.reset(DEFAULT_APPEARANCE);
                artwork.clear();
                background.clear();
                logo.clear();
              }}
            >
              <RotateCcw size={16} />
              Restablecer ARMA original
            </button>
          </fieldset>
          <section
            className="min-w-0 xl:sticky xl:top-6"
            aria-label="Vista previa del borrador"
          >
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold">Así se verá</h3>
                <p className="mt-1 text-xs text-arma-muted">
                  Vista previa · todavía no está publicado
                </p>
              </div>
              {deviceControls}
            </div>
            {scheduled && (
              <p className="mb-4 rounded-arma bg-arma-warning-soft p-3 text-xs leading-5 text-arma-warning">
                La vista previa muestra tu diseño. Por las fechas elegidas, hoy
                los visitantes verían ARMA original.
              </p>
            )}
            <AppearancePreview
              appearance={draft}
              artworkUrl={artworkUrl}
              backgroundUrl={backgroundUrl}
              logoUrl={logoUrl}
              device={device}
            />
            <p className="mt-3 text-xs leading-5 text-arma-muted">
              Desplázate dentro de la vista previa para revisar toda la página.
              Los enlaces están desactivados para que conserves tu borrador.
            </p>
          </section>
        </div>
        {!parsed.success && (
          <p
            role="alert"
            className="mt-6 rounded-arma bg-arma-red-soft p-4 text-sm text-arma-red"
          >
            {parsed.error.issues[0]?.message}
          </p>
        )}
        <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-arma-border pt-5">
          <p className="text-xs text-arma-muted">
            Los cambios solo se aplican al catálogo público.
          </p>
          <button type="submit" disabled={disabled} className={primaryClass}>
            <Eye size={18} />
            Revisar antes de publicar
          </button>
        </div>
      </form>
      {review && (
        <Modal
          title="Revisa tu colección antes de publicar"
          wide
          busy={busy}
          onClose={closeReview}
        >
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <p className="max-w-sm text-sm leading-6">
              Esta es tu propuesta. Publicar aplica juntos los colores, los
              adornos y las fechas.
            </p>
            {deviceControls}
          </div>
          <AppearancePreview
            appearance={draft}
            artworkUrl={artworkUrl}
            backgroundUrl={backgroundUrl}
            logoUrl={logoUrl}
            device={device}
          />
          {publishError && (
            <div
              role="alert"
              className="mt-4 rounded-arma bg-arma-red-soft p-4 text-sm leading-6 text-arma-red"
            >
              <p className="font-semibold">No se pudo publicar</p>
              <p>{publishError}</p>
              <p className="mt-2">
                Tu borrador se conserva. Puedes seguir editando o volver a
                intentar publicar.
              </p>
            </div>
          )}
          <div className="mt-5 flex flex-wrap justify-end gap-3">
            <button
              type="button"
              disabled={busy}
              className={secondaryClass}
              onClick={closeReview}
            >
              Seguir editando
            </button>
            <button
              type="button"
              disabled={busy || !parsed.success}
              className={primaryClass}
              onClick={async () => {
                setPublishError("");
                try {
                  await onPublish(draft, {
                    artwork: artwork.image?.file ?? null,
                    background: background.image?.file ?? null,
                    logo: logo.image?.file ?? null,
                  });
                  setReview(false);
                } catch (error) {
                  setPublishError(collectionError(error));
                }
              }}
            >
              <Check size={18} />
              {busy ? "Publicando…" : "Publicar apariencia"}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
