// Palette dashboard CarboScan — synced with src/brand/colors.ts
import { BRAND, SCOPE_COLORS } from "@/brand/colors";

export const DASHBOARD_PALETTE = {
  scope1: SCOPE_COLORS[1],
  scope2: SCOPE_COLORS[2],
  scope3: SCOPE_COLORS[3],
  background: BRAND.surface,
  cardSurface: BRAND.white,
  textPrimary: BRAND.primary,
  cardBorder: BRAND.separator,
  accent: SCOPE_COLORS[1],
  alert: "#EF4444",
  darkBackground: BRAND.primaryDark,
  darkCardBorder: "#1A3D36",
  attenuated: BRAND.textSecondary,
  trendPositive: SCOPE_COLORS[1],
  trendNegative: "#EF4444",
} as const;

/** Couleurs pour barres "Top postes émetteurs" – scopes + status + variantes */
export const BAR_COLORS = [
  DASHBOARD_PALETTE.scope1,
  DASHBOARD_PALETTE.scope2,
  DASHBOARD_PALETTE.scope3,
  DASHBOARD_PALETTE.accent,
  DASHBOARD_PALETTE.alert,
  "#0A6B5A",
  "#008A96",
  "#CC6A15",
] as const;
