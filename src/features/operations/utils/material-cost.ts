export function estimateDtfCost(
  price: number,
  sheetWidth: number,
  sheetLength: number,
  width: number,
  height: number,
  waste: number,
): number | null {
  if (
    ![price, sheetWidth, sheetLength, width, height, waste].every(
      Number.isFinite,
    ) ||
    price <= 0 ||
    sheetWidth <= 0 ||
    sheetLength <= 0 ||
    width <= 0 ||
    height <= 0 ||
    waste < 0 ||
    waste > 100 ||
    !(
      (width <= sheetWidth && height <= sheetLength) ||
      (height <= sheetWidth && width <= sheetLength)
    )
  )
    return null;
  return (
    Math.ceil(
      (price / (sheetWidth * sheetLength)) *
        width *
        height *
        (1 + waste / 100) *
        100,
    ) / 100
  );
}
