// Palette dashboard CarboScan – design visualisation officiel
// Scope 1: Bleu Énergie | Scope 2: Ambre Électrique | Scope 3: Indigo Industriel

export const DASHBOARD_PALETTE = {
  // Scopes (couleurs fixes)
  scope1: '#0EA5E9',      // Bleu Énergie – émissions directes
  scope2: '#F59E0B',      // Ambre Électrique – énergie indirecte
  scope3: '#6366F1',      // Indigo Industriel – autres indirectes
  // Structure
  background: '#F8FAFC',
  cardSurface: '#FFFFFF',
  textPrimary: '#1E293B',
  cardBorder: '#E2E8F0',
  // Accent & alerte
  accent: '#10B981',      // Nature
  alert: '#EF4444',       // Hotspot
  // Mode sombre (optionnel)
  darkBackground: '#0F172A',
  darkCardBorder: '#334155',
  // Neutres / secondaires
  attenuated: '#94A3B8',
  // Tendances
  trendPositive: '#10B981',
  trendNegative: '#EF4444',
} as const;

/** Couleurs pour barres "Top postes émetteurs" – scopes + accent + alert + variantes */
export const BAR_COLORS = [
  DASHBOARD_PALETTE.scope1,
  DASHBOARD_PALETTE.scope2,
  DASHBOARD_PALETTE.scope3,
  DASHBOARD_PALETTE.accent,
  DASHBOARD_PALETTE.alert,
  '#7C3AED', '#0E7490', '#4F46E5',
] as const;
