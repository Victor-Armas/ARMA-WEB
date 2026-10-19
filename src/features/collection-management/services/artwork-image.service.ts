import type { AppearanceAssetKind } from "@/features/collection-appearance/schemas/appearance.schema";
export const assetGuides = {
  artwork: {
    label: "Adorno o franja",
    recommended:
      "Composición: 1200 × 500 px. Franja repetible: 1600 × 200 px, con bordes que continúen al repetirse.",
    minWidth: 256,
    minHeight: 48,
    maxWidth: 4096,
    maxHeight: 2048,
    output: 2048,
    trim: true,
  },
  background: {
    label: "Imagen de fondo",
    recommended: "Fotografía: 1920 × 1080 px. Patrón repetible: 512 × 512 px.",
    minWidth: 256,
    minHeight: 256,
    maxWidth: 4096,
    maxHeight: 4096,
    output: 1920,
    trim: false,
  },
  logo: {
    label: "Logo de temporada",
    recommended: "800 × 240 px, con fondo transparente y sin márgenes vacíos.",
    minWidth: 128,
    minHeight: 32,
    maxWidth: 4096,
    maxHeight: 2048,
    output: 800,
    trim: true,
  },
} as const;
export interface PreparedAppearanceImage {
  file: File;
  width: number;
  height: number;
  trimmed: boolean;
}
export async function prepareAppearanceImage(
  file: File,
  kind: AppearanceAssetKind,
): Promise<PreparedAppearanceImage> {
  const guide = assetGuides[kind];
  if (!["image/png", "image/jpeg", "image/webp"].includes(file.type))
    throw new Error(
      "Selecciona una imagen PNG, JPG o WebP. No se aceptan SVG ni GIF.",
    );
  if (!file.size || file.size > 2 * 1024 * 1024)
    throw new Error("La imagen debe pesar como máximo 2 MB.");
  const h = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const png =
    h[0] === 137 &&
    h[1] === 80 &&
    h[2] === 78 &&
    h[3] === 71 &&
    h[4] === 13 &&
    h[5] === 10 &&
    h[6] === 26 &&
    h[7] === 10;
  const jpeg = h[0] === 255 && h[1] === 216 && h[2] === 255;
  const webp =
    String.fromCharCode(...h.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...h.slice(8, 12)) === "WEBP";
  if (
    !(
      (file.type === "image/png" && png) ||
      (file.type === "image/jpeg" && jpeg) ||
      (file.type === "image/webp" && webp)
    )
  )
    throw new Error("El contenido no coincide con el formato de la imagen.");
  let image: ImageBitmap;
  try {
    image = await createImageBitmap(file);
  } catch {
    throw new Error("No pudimos leer la imagen. Prueba con otro archivo.");
  }
  try {
    const { width, height } = image;
    if (
      width < guide.minWidth ||
      height < guide.minHeight ||
      width > guide.maxWidth ||
      height > guide.maxHeight ||
      width * height > 12582912
    )
      throw new Error(
        `Para ${guide.label.toLowerCase()}, el ancho debe ser de ${guide.minWidth} a ${guide.maxWidth} px y el alto de ${guide.minHeight} a ${guide.maxHeight} px; máximo 12 megapíxeles.`,
      );
    let x = 0,
      y = 0,
      w = width,
      h = height,
      trimmed = false;
    if (guide.trim) {
      const scan = document.createElement("canvas");
      scan.width = width;
      scan.height = height;
      const sc = scan.getContext("2d", { willReadFrequently: true });
      if (!sc) throw new Error("Tu navegador no permite preparar esta imagen.");
      sc.drawImage(image, 0, 0);
      const pixels = sc.getImageData(0, 0, width, height).data;
      let left = width,
        top = height,
        right = -1,
        bottom = -1;
      for (let py = 0; py < height; py++)
        for (let px = 0; px < width; px++)
          if (pixels[(py * width + px) * 4 + 3] > 8) {
            left = Math.min(left, px);
            right = Math.max(right, px);
            top = Math.min(top, py);
            bottom = Math.max(bottom, py);
          }
      if (right < 0)
        throw new Error(
          "La imagen está completamente transparente. Elige un archivo con contenido visible.",
        );
      x = left;
      y = top;
      w = right - left + 1;
      h = bottom - top + 1;
      trimmed = x > 0 || y > 0 || w < width || h < height;
      scan.width = scan.height = 0;
    }
    const ratio = Math.min(1, guide.output / Math.max(w, h));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(w * ratio));
    canvas.height = Math.max(1, Math.round(h * ratio));
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Tu navegador no permite preparar esta imagen.");
    ctx.drawImage(image, x, y, w, h, 0, 0, canvas.width, canvas.height);
    for (const quality of [0.85, 0.65, 0.45]) {
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/webp", quality),
      );
      if (blob?.type === "image/webp" && blob.size <= 512 * 1024)
        return {
          file: new File([blob], `${kind}.webp`, { type: "image/webp" }),
          width: canvas.width,
          height: canvas.height,
          trimmed,
        };
    }
    throw new Error(
      "No pudimos reducirla a 512 KB. Simplifica la imagen o elige otra.",
    );
  } finally {
    image.close();
  }
}
export function prepareArtwork(file: File) {
  return prepareAppearanceImage(file, "artwork");
}
