import type { ProductVariant } from '../schemas/product.schema';
import type { ColorStock, StockLevel } from '../types/product-stock.types';

export const mainSizes = [
  { size: 'S', label: 'Chica' },
  { size: 'M', label: 'Mediana' },
  { size: 'L', label: 'Grande' },
];

export function getStockLevel(quantity: number): StockLevel {
  if (quantity <= 3) return 'low';
  if (quantity <= 5) return 'warning';
  return 'healthy';
}

export function getStockByColor(variants: ProductVariant[]): ColorStock[] {
  const groups = new Map<string, Map<string, number>>();

  for (const variant of variants) {
    const sizes = groups.get(variant.color) ?? new Map<string, number>();
    groups.set(variant.color, sizes);
    const size = variant.size.trim().toUpperCase();
    if (!isSupportedSize(size)) continue;
    const available = getAvailableQuantity(variant);
    sizes.set(size, (sizes.get(size) ?? 0) + available);
    groups.set(variant.color, sizes);
  }

  return [...groups.entries()]
    .sort(([first], [second]) => first.localeCompare(second, 'es'))
    .map(([color, quantities]) => {
      return {
        color,
        quantity: [...quantities.values()].reduce((total, value) => total + value, 0),
        sizes: mainSizes.map(({ size, label }) => ({
          size,
          label,
          quantity: quantities.get(size) ?? 0,
        })),
      };
    });
}


export function isSupportedSize(size: string): boolean {
  return mainSizes.some(main => main.size === size.trim().toUpperCase());
}

export function getAvailableQuantity(variant: ProductVariant): number {
  return variant.inventory_balances.reduce((total, balance) => total + balance.available_quantity, 0);
}
