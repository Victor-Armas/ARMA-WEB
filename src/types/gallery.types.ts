import type { ImageBackground } from "@/types/image-background";
export interface GalleryImage {
  id: string;
  url: string | null;
  background?: ImageBackground;
  alt: string;
}
