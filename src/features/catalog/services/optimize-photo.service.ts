export async function optimizeCatalogPhoto(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file, {
    imageOrientation: "from-image",
  });
  try {
    const ratio = Math.min(1, 1600 / bitmap.width, 2000 / bitmap.height);
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * ratio));
    canvas.height = Math.max(1, Math.round(bitmap.height * ratio));
    const context = canvas.getContext("2d");
    if (!context)
      throw new Error(
        "No pudimos preparar la fotografía. Intenta con otra imagen.",
      );
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/webp", 0.84),
    );
    if (
      !blob ||
      blob.type !== "image/webp" ||
      (ratio === 1 && blob.size >= file.size)
    )
      return file;
    return new File([blob], `${file.name.replace(/\.[^.]+$/, "")}.webp`, {
      type: "image/webp",
      lastModified: file.lastModified,
    });
  } finally {
    bitmap.close();
  }
}
