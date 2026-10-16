import type { PublicVariant } from "../schemas/storefront.schema";
export function publicPrice(variants: PublicVariant[]) {
  const currencies = [...new Set(variants.map((v) => v.currency))];
  if (currencies.length !== 1) return "Ver precios por variante";
  const prices = variants.map((v) => v.sale_price);
  if (!prices.length) return "Consulta el precio";
  const minimum = Math.min(...prices);
  const amount = new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: currencies[0],
    maximumFractionDigits: 2,
  }).format(minimum);
  return `${Math.max(...prices) > minimum ? "Desde " : ""}${amount} ${currencies[0]}`;
}
export function publicSizes(variants: PublicVariant[]) {
  const order = ["XS", "S", "CH", "M", "L", "G", "XL", "XXL"];
  return [...new Set(variants.map((v) => v.size))].sort((a, b) => {
    const first = order.indexOf(a.toUpperCase());
    const second = order.indexOf(b.toUpperCase());
    return (
      (first < 0 ? 99 : first) - (second < 0 ? 99 : second) ||
      a.localeCompare(b)
    );
  });
}
