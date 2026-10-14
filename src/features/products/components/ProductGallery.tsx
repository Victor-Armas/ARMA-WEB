import { ChevronLeft, ChevronRight, ZoomIn } from 'lucide-react';
import { lazy, Suspense, useState } from 'react';
import type { ProductImageData } from '../types/product-detail.types';
import { ProductImage } from './ProductImage';

const ImageViewer = lazy(() => import('@/components/ui/ImageViewer'));

interface ProductGalleryProps {
  images: ProductImageData[];
  name: string;
}

export function ProductGallery({ images, name }: ProductGalleryProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [viewerOpen, setViewerOpen] = useState(false);
  const index = Math.max(0, images.findIndex(image => image.id === selectedId));
  const selected = images[index];

  function move(offset: number) {
    const next = images[(index + offset + images.length) % images.length];
    if (next) setSelectedId(next.id);
  }

  return (
    <section aria-label={`Fotografías de ${name}`} className="min-w-0">
      <button type="button" disabled={!selected?.url} aria-label={`Ampliar fotografía de ${name}`} onClick={() => setViewerOpen(true)} className="flex h-[55dvh] min-h-64 w-full cursor-zoom-in items-center justify-center overflow-hidden rounded-arma bg-arma-background focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arma-active disabled:cursor-default lg:h-[64dvh]">
        <ProductImage src={selected?.url ?? null} alt={selected?.alt ?? name} loading="eager" className="h-full w-full object-contain" />
      </button>
      {selected?.url ? <p className="mt-2 flex items-center gap-2 text-xs text-arma-muted"><ZoomIn size={15} aria-hidden="true" />Pulsa la imagen para ampliar</p> : null}
      {selected ? (
        <div className="mt-2 flex items-center justify-between gap-3">
          <p className="min-w-0 text-sm text-arma-muted">{selected.caption ?? 'Fotografía del producto'}</p>
          <div className="flex shrink-0 items-center gap-1">
            <button type="button" onClick={() => move(-1)} disabled={images.length < 2} aria-label="Fotografía anterior" className="flex size-11 touch-manipulation items-center justify-center rounded-arma text-arma-icon focus-visible:outline-2 focus-visible:outline-arma-active disabled:opacity-40"><ChevronLeft size={20} aria-hidden="true" /></button>
            <span className="text-xs text-arma-muted tabular-nums">{index + 1} / {images.length}</span>
            <button type="button" onClick={() => move(1)} disabled={images.length < 2} aria-label="Fotografía siguiente" className="flex size-11 touch-manipulation items-center justify-center rounded-arma text-arma-icon focus-visible:outline-2 focus-visible:outline-arma-active disabled:opacity-40"><ChevronRight size={20} aria-hidden="true" /></button>
          </div>
        </div>
      ) : <p className="mt-3 text-sm text-arma-muted">Este producto todavía no tiene fotografías.</p>}
      {images.length > 1 ? (
        <div className="mt-3 flex gap-3 overflow-x-auto p-1" aria-label="Elegir fotografía">
          {images.map((image, imageIndex) => (
            <button key={image.id} type="button" aria-label={`Ver fotografía ${imageIndex + 1} de ${name}`} aria-pressed={image.id === selected?.id} onClick={() => setSelectedId(image.id)} className={`h-24 w-20 shrink-0 touch-manipulation overflow-hidden rounded-arma border bg-arma-background focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arma-active ${image.id === selected?.id ? 'border-arma-active ring-1 ring-arma-active' : 'border-arma-border'}`}>
              <ProductImage src={image.url} alt="" className="h-full w-full object-contain" />
            </button>
          ))}
        </div>
      ) : null}
      {viewerOpen ? (
        <Suspense fallback={<div role="status" className="fixed inset-0 z-[9999] flex flex-col items-center justify-center gap-4 bg-arma-background"><p className="text-sm text-arma-muted">Abriendo imagen…</p><button type="button" onClick={() => setViewerOpen(false)} className="min-h-11 rounded-arma border border-arma-border px-4 text-sm">Cancelar</button></div>}>
          <ImageViewer images={images} selectedId={selected?.id ?? null} onSelect={setSelectedId} onClose={() => setViewerOpen(false)} />
        </Suspense>
      ) : null}
    </section>
  );
}
