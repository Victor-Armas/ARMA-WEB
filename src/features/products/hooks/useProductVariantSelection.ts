import { useState } from 'react';
import type { ProductVariant } from '../schemas/product.schema';
import { getAvailableQuantity, isSupportedSize } from '../utils/product-stock';

export function useProductVariantSelection(variants: ProductVariant[]) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const supported = variants.filter(variant => isSupportedSize(variant.size));
  const selectedVariant = supported.find(variant => variant.id === selectedId)
    ?? supported.find(variant => getAvailableQuantity(variant) > 0)
    ?? supported[0]
    ?? null;
  const colors = [...new Set(supported.map(variant => variant.color))];

  function selectColor(color: string) {
    const matches = supported.filter(variant => variant.color === color);
    const next = matches.find(variant => variant.size === selectedVariant?.size)
      ?? matches.find(variant => getAvailableQuantity(variant) > 0)
      ?? matches[0];
    setSelectedId(next?.id ?? null);
  }

  return { supported, colors, selectedVariant, selectColor, selectVariant: setSelectedId };
}
