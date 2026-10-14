import type { ProductVariant } from '../schemas/product.schema';

export interface ProductImageData {
  id: string;
  url: string | null;
  alt: string;
  caption: string | null;
}

export interface ProductDetail {
  id: string;
  name: string;
  code: string;
  description: string | null;
  isDemo: boolean;
  images: ProductImageData[];
  variants: ProductVariant[];
  imageRefreshAt: number | null;
}
