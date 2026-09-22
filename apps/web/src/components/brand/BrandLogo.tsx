import * as React from "react";
import { BRAND_ASSETS } from "@/brand/colors";
import { cn } from "@/lib/utils";

export type BrandLogoVariant = "light" | "dark";

type BrandLogoProps = {
  variant?: BrandLogoVariant;
  className?: string;
  /** Height class e.g. h-10 — width follows aspect ratio */
  alt?: string;
  priority?: boolean;
};

const SRC: Record<BrandLogoVariant, string> = {
  light: `${BRAND_ASSETS.logoLight}?v=11`,
  dark: `${BRAND_ASSETS.logoDark}?v=11`,
};

/**
 * Logo CarboScan fourni : lettres et feuille, jamais un pictogramme seul.
 * - light : couleurs d'origine, fond transparent (surfaces claires)
 * - dark : lettres blanches, même feuille (surfaces sombres)
 */
export const BrandLogo: React.FC<BrandLogoProps> = ({
  variant = "light",
  className,
  alt = "CarboScan",
  priority = false,
}) => {
  return (
    <img
      src={SRC[variant]}
      alt={alt}
      className={cn("h-10 w-auto object-contain object-left", className)}
      decoding={priority ? "sync" : "async"}
      loading={priority ? "eager" : "lazy"}
      draggable={false}
    />
  );
};

export default BrandLogo;
