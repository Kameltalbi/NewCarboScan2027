/**
 * CarboScan brand & Scope color tokens — single source of truth.
 * Prefer importing from here (or CSS vars synced in index.css) instead of raw hex.
 *
 * Scope ring in the brand icon (graphic equality, not emission proportions):
 * - Top-left turquoise → Scope 2
 * - Top-right emerald  → Scope 1
 * - Bottom orange      → Scope 3
 */

export const BRAND = {
  /** Deep green — primary brand, logo lettering on light */
  primary: "#073F35",
  /** Dark green — dark brand surfaces */
  primaryDark: "#072F29",
  /** Main surfaces */
  white: "#FFFFFF",
  /** Light page background */
  surface: "#F7FAF8",
  /** Secondary text on light */
  textSecondary: "#53645E",
  /** Decorative separators on light */
  separator: "#DCE5E0",
} as const;

/** GHG Protocol scopes — fixed identity colors */
export const SCOPE_COLORS = {
  1: "#00BF72",
  2: "#00BDCE",
  3: "#FF851B",
} as const;

export type ScopeNumber = 1 | 2 | 3;

export const SCOPE_LABELS_FR: Record<ScopeNumber, string> = {
  1: "Scope 1",
  2: "Scope 2",
  3: "Scope 3",
};

export function scopeColor(scope: ScopeNumber | "1" | "2" | "3" | number): string {
  const n = Number(scope) as ScopeNumber;
  return SCOPE_COLORS[n] ?? SCOPE_COLORS[1];
}

/** Text on vivid scope fills must use brand deep green for WCAG (not white). */
export const SCOPE_LABEL_ON_FILL = BRAND.primary;

export const BRAND_ASSETS = {
  logoLight: "/brand/carboscan-logo-light.png",
  logoDark: "/brand/carboscan-logo-dark.png",
  symbol: "/brand/carboscan-icon.png",
  /** Legacy paths still served for OG / cached URLs */
  legacyLogoLight: "/logos/CarboScan-logo.png",
  legacyLogoDark: "/logos/logo-carboscan-blanc.png",
} as const;
