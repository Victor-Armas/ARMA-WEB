import { useEffect, useState } from "react";
import type { AppearanceAssetKind } from "@/features/collection-appearance/schemas/appearance.schema";
import {
  prepareAppearanceImage,
  type PreparedAppearanceImage,
} from "../services/artwork-image.service";
export function useDraftImage(kind: AppearanceAssetKind) {
  const [image, setImage] = useState<
    (PreparedAppearanceImage & { url: string }) | null
  >(null);
  const [preparing, setPreparing] = useState(false),
    [error, setError] = useState("");
  useEffect(
    () => () => {
      if (image) URL.revokeObjectURL(image.url);
    },
    [image],
  );
  async function select(file: File) {
    setPreparing(true);
    setError("");
    try {
      const prepared = await prepareAppearanceImage(file, kind);
      setImage({ ...prepared, url: URL.createObjectURL(prepared.file) });
      return true;
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "No pudimos preparar la imagen.",
      );
      return false;
    } finally {
      setPreparing(false);
    }
  }
  function clear() {
    setImage(null);
    setError("");
  }
  return { image, preparing, error, select, clear };
}
