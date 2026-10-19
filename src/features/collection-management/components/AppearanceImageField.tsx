import { useId } from "react";
import { Upload, Trash2 } from "lucide-react";
import type { AppearanceAssetKind } from "@/features/collection-appearance/schemas/appearance.schema";
import type { useDraftImage } from "../hooks/useDraftImage";
import { assetGuides } from "../services/artwork-image.service";
import { secondaryClass } from "./CollectionFields";
export function AppearanceImageField({
  kind,
  draft,
  url,
  disabled,
  onSelect,
  onRemove,
}: {
  kind: AppearanceAssetKind;
  draft: ReturnType<typeof useDraftImage>;
  url: string | null;
  disabled: boolean;
  onSelect: (file: File) => void;
  onRemove: () => void;
}) {
  const id = useId(),
    guide = assetGuides[kind];
  return (
    <div className="space-y-3">
      <div
        id={id}
        className="rounded-arma bg-arma-primary-soft p-4 text-xs leading-6"
      >
        <p className="font-semibold">{guide.recommended}</p>
        <p className="mt-2">
          PNG, JPG o WebP · hasta 2 MB. Ancho: {guide.minWidth}–{guide.maxWidth}{" "}
          px; alto: {guide.minHeight}–{guide.maxHeight} px, máximo 12
          megapíxeles. Lo convertimos a WebP, hasta {guide.output} px y 512 KB.
        </p>
        <p>
          {guide.trim
            ? "Quitamos márgenes transparentes para que el dibujo se vea a buen tamaño. No se elimina un fondo de color que ya venga dentro de la imagen."
            : "Usa una imagen sin textos. Una capa de color automática protege la lectura de la portada."}{" "}
          No se aceptan SVG, GIF ni videos.
        </p>
      </div>
      <label
        className={`${secondaryClass} w-full ${disabled ? "pointer-events-none opacity-50" : "cursor-pointer"}`}
      >
        <Upload size={17} />
        {draft.preparing
          ? "Preparando imagen…"
          : `Elegir ${guide.label.toLowerCase()}`}
        <input
          aria-label={`Elegir ${guide.label.toLowerCase()}`}
          aria-describedby={id}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          disabled={disabled}
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (file) onSelect(file);
          }}
        />
      </label>
      {draft.error && (
        <p role="alert" className="text-sm text-red-700">
          {draft.error}
        </p>
      )}
      {url && (
        <div className="flex min-w-0 items-center gap-4 rounded-arma bg-arma-surface p-3">
          <div className="flex h-24 w-28 shrink-0 items-center justify-center rounded-arma bg-[#221128]">
            <img
              src={url}
              alt={`${guide.label} seleccionado`}
              className="max-h-20 max-w-24 object-contain"
            />
          </div>
          <div className="min-w-0">
            <p className="text-xs leading-5">
              {draft.image
                ? `${draft.image.width} × ${draft.image.height} px · ${Math.ceil(draft.image.file.size / 1024)} KB · pendiente de publicar`
                : "Imagen publicada"}
              {draft.image?.trimmed
                ? " · márgenes transparentes recortados"
                : ""}
            </p>
            <button
              type="button"
              disabled={disabled}
              className="mt-2 inline-flex min-h-11 items-center gap-2 text-sm underline disabled:opacity-50"
              onClick={onRemove}
            >
              <Trash2 size={15} />
              Quitar {guide.label.toLowerCase()}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
