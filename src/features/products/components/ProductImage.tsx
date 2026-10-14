import { ImageOff } from 'lucide-react';
import { useState } from 'react';

interface ProductImageProps {
  src: string | null;
  alt: string;
  className: string;
  loading?: 'lazy' | 'eager';
}

export function ProductImage({ src, alt, className, loading = 'lazy' }: ProductImageProps) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  if (!src || failedUrl === src) {
    return (
      <div role="img" aria-label={`${alt}. Imagen no disponible.`} className={`flex items-center justify-center bg-arma-background text-arma-muted ${className}`}>
        <ImageOff size={28} strokeWidth={1.5} aria-hidden="true" />
      </div>
    );
  }
  return <img src={src} alt={alt} loading={loading} decoding="async" onError={() => setFailedUrl(src)} className={className} />;
}
