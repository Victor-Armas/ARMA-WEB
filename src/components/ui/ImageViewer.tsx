import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Maximize, Minimize, X, ZoomIn, ZoomOut } from 'lucide-react';
import Lightbox from 'yet-another-react-lightbox';
import Zoom from 'yet-another-react-lightbox/plugins/zoom';
import Fullscreen from 'yet-another-react-lightbox/plugins/fullscreen';
import 'yet-another-react-lightbox/styles.css';
import type { GalleryImage } from '@/types/gallery.types';

interface ImageViewerProps {
  images: GalleryImage[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onClose: () => void;
}

export default function ImageViewer({ images, selectedId, onSelect, onClose }: ImageViewerProps) {
  const [zoomed, setZoomed] = useState(false);
  const available = useMemo(() => images.filter(image => image.url !== null), [images]);
  const slides = useMemo(() => available.flatMap(image => image.url ? [{ src: image.url, alt: image.alt }] : []), [available]);
  const index = Math.max(0, available.findIndex(image => image.id === selectedId));

  return (
    <Lightbox
      open
      close={onClose}
      slides={slides}
      index={index}
      plugins={[Zoom, Fullscreen]}
      zoom={{ scrollToZoom: true, maxZoomPixelRatio: 2 }}
      controller={{ closeOnBackdropClick: true }}
      carousel={{ padding: 24, imageFit: 'contain' }}
      labels={{
        Previous: 'Anterior', Next: 'Siguiente', Close: 'Cerrar imagen',
        'Zoom in': 'Acercar', 'Zoom out': 'Alejar',
        'Enter Fullscreen': 'Pantalla completa', 'Exit Fullscreen': 'Salir de pantalla completa',
      }}
      on={{
        view: ({ index: nextIndex }) => {
          const image = available[nextIndex];
          if (image) onSelect(image.id);
        },
        zoom: ({ zoom }) => setZoomed(zoom > 1),
      }}
      render={{
        iconPrev: () => <ChevronLeft size={28} strokeWidth={1.7} />,
        iconNext: () => <ChevronRight size={28} strokeWidth={1.7} />,
        iconClose: () => <X size={26} strokeWidth={1.7} />,
        iconZoomIn: () => <ZoomIn size={26} strokeWidth={1.7} />,
        iconZoomOut: () => <ZoomOut size={26} strokeWidth={1.7} />,
        iconEnterFullscreen: () => <Maximize size={25} strokeWidth={1.7} />,
        iconExitFullscreen: () => <Minimize size={25} strokeWidth={1.7} />,
      }}
      className={`[--yarl__color_backdrop:var(--color-arma-background)] [--yarl__color_button:var(--color-arma-icon)] [--yarl__color_button_active:var(--color-arma-text)] [--yarl__color_button_disabled:var(--color-arma-muted)] [--yarl__button_filter:none] [&_.yarl__toolbar]:pt-[max(0.5rem,env(safe-area-inset-top))] [&_.yarl__toolbar]:pr-[max(0.5rem,env(safe-area-inset-right))] [&_.yarl__button]:min-h-11 [&_.yarl__button]:min-w-11 [&_.yarl__button]:rounded-arma [&_.yarl__button:focus-visible]:outline-2 [&_.yarl__button:focus-visible]:outline-arma-active ${zoomed ? '[&_.yarl__slide_image]:cursor-grab [&_.yarl__slide_image]:active:cursor-grabbing' : '[&_.yarl__slide_image]:cursor-zoom-in'}`}
    />
  );
}
