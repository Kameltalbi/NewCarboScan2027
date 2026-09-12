import * as React from "react";
import { BRAND_ASSETS } from "@/brand/colors";
import { cn } from "@/lib/utils";

export type BrandLogoVariant = "light" | "dark" | "symbol";

type BrandLogoProps = {
  variant?: BrandLogoVariant;
  className?: string;
  /** Height class e.g. h-10 — width follows aspect ratio */
  alt?: string;
  priority?: boolean;
};

const SRC: Record<BrandLogoVariant, string> = {
  light: `${BRAND_ASSETS.logoLight}?v=8`,
  dark: `${BRAND_ASSETS.logoDark}?v=8`,
  symbol: `${BRAND_ASSETS.symbol}?v=8`,
};

/**
 * CarboScan brand mark.
 * - light: deep-green lettering + scope ring (use on pale backgrounds)
 * - dark: white lettering + same ring (use on dark footers / panels)
 * - symbol: three-segment ring only (favicon-style)
 *
 * Do not apply CSS filters that recolor the whole asset — that would alter Scope colors.
 */
export const BrandLogo: React.FC<BrandLogoProps> = ({
  variant = "light",
  className,
  alt = "CarboScan",
  priority = false,
}) => {
  const isSymbol = variant === "symbol";
  return (
    <img
      src={SRC[variant]}
      alt={alt}
      className={cn(
        isSymbol ? "h-8 w-8 object-contain" : "h-10 w-auto object-contain object-left",
        className,
      )}
      decoding={priority ? "sync" : "async"}
      loading={priority ? "eager" : "lazy"}
      draggable={false}
    />
  );
};

export default BrandLogo;
