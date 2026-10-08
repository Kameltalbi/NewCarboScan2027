import React, { useState } from "react";
import { cn } from "@/lib/utils";

interface OptimizedBlogImageProps {
  src: string;
  alt: string;
  className?: string;
  aspectRatio?: "video" | "hero";
  fit?: "cover" | "contain";
  sizes?: string;
}

/**
 * Generates optimized Supabase Storage image URLs using transform API.
 * Falls back gracefully if transforms aren't available.
 */
const getTransformedUrl = (src: string, width: number, quality = 75): string => {
  // Only transform Supabase Storage URLs
  if (!src.includes("supabase.co/storage/v1/object/public/")) {
    return src;
  }
  // Use Supabase image transform: /render/image/
  const transformedUrl = src.replace(
    "/storage/v1/object/public/",
    `/storage/v1/render/image/public/`
  );
  return `${transformedUrl}?width=${width}&quality=${quality}`;
};

const WIDTHS = [400, 800, 1200];

export const OptimizedBlogImage: React.FC<OptimizedBlogImageProps> = ({
  src,
  alt,
  className,
  aspectRatio = "video",
  fit = "cover",
  sizes = "(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw",
}) => {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  const srcSet = WIDTHS.map((w) => `${getTransformedUrl(src, w)} ${w}w`).join(", ");
  const fallbackSrc = getTransformedUrl(src, 800);

  if (error) {
    return (
      <div
        className={cn(
          "bg-muted flex items-center justify-center",
          aspectRatio === "hero" ? "h-64 md:h-96" : "aspect-video",
          className
        )}
      >
        <span className="text-muted-foreground text-sm">Image indisponible</span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "bg-muted relative",
        fit === "contain"
          ? "overflow-visible"
          : cn("overflow-hidden", aspectRatio === "hero" ? "h-64 md:h-96" : "aspect-video"),
        className
      )}
    >
      {/* Low-quality blur placeholder */}
      {!loaded && (
        <div className="absolute inset-0 bg-muted animate-pulse" />
      )}
      <img
        src={fit === "contain" ? src : fallbackSrc}
        srcSet={fit === "contain" ? undefined : srcSet}
        sizes={fit === "contain" ? undefined : sizes}
        alt={alt}
        loading="lazy"
        decoding="async"
        onLoad={() => setLoaded(true)}
        onError={() => setError(true)}
        className={cn(
          "w-full transition-opacity duration-300",
          fit === "contain" ? "h-auto max-h-none object-contain" : "h-full object-cover",
          loaded ? "opacity-100" : "opacity-0"
        )}
        style={
          fit === "contain"
            ? { width: "100%", height: "auto", maxHeight: "none", objectFit: "contain" }
            : undefined
        }
      />
    </div>
  );
};
