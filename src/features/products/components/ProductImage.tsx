import {
  imageBackgroundClasses,
  type ImageBackground,
} from "@/types/image-background";
import { ImageOff } from "lucide-react";
import { useState } from "react";

interface ProductImageProps {
  src: string | null;
  background?: ImageBackground;
  alt: string;
  className: string;
  loading?: "lazy" | "eager";
  fetchPriority?: "high" | "low" | "auto";
  width?: number;
  height?: number;
}

export function ProductImage({
  src,
  alt,
  className,
  background,
  loading = "lazy",
  fetchPriority = "auto",
  width,
  height,
}: ProductImageProps) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  if (!src || failedUrl === src) {
    return (
      <div
        role="img"
        aria-label={`${alt}. Imagen no disponible.`}
        className={`flex items-center justify-center ${background ? imageBackgroundClasses[background] : "bg-arma-background"} ${background === "black" || background === "gray" ? "text-white" : "text-arma-muted"} ${className}`}
      >
        <ImageOff size={28} strokeWidth={1.5} aria-hidden="true" />
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      loading={loading}
      fetchPriority={fetchPriority}
      width={width}
      height={height}
      decoding="async"
      onError={() => setFailedUrl(src)}
      className={`${className} ${background ? imageBackgroundClasses[background] : ""}`}
    />
  );
}
