/**
 * Palette éditoriale institutionnelle du rapport Bilan Carbone®.
 * Alignée sur src/brand/colors.ts
 */
import { BRAND, SCOPE_COLORS } from "@/brand/colors";

export const REPORT_PALETTE = {
  deep: BRAND.primary,
  institutional: BRAND.primaryDark,
  accent: SCOPE_COLORS[1],
  night: BRAND.primaryDark,
  body: BRAND.textSecondary,
  muted: BRAND.textSecondary,
  paper: BRAND.surface,
  divider: BRAND.separator,
  alert: "#D97706",
} as const;

/**
 * Table de correspondance ancienne palette (bleu/indigo) -> nouvelle palette éditoriale.
 * Appliquée à la volée sur le HTML rendu de chaque page pour garantir l'homogénéité.
 */
const COLOR_MAP: Record<string, string> = {
  // Titres et textes
  '#0f172a': REPORT_PALETTE.deep,
  '#1e293b': REPORT_PALETTE.night,
  '#0F172A': REPORT_PALETTE.deep,
  '#1E293B': REPORT_PALETTE.night,
  '#334155': REPORT_PALETTE.body,
  '#475569': REPORT_PALETTE.body,
  '#64748b': REPORT_PALETTE.muted,
  '#64748B': REPORT_PALETTE.muted,
  '#94a3b8': REPORT_PALETTE.muted,
  '#94A3B8': REPORT_PALETTE.muted,
  '#cbd5e1': REPORT_PALETTE.divider,
  '#CBD5E1': REPORT_PALETTE.divider,
  '#e2e8f0': REPORT_PALETTE.divider,
  '#E2E8F0': REPORT_PALETTE.divider,
  '#f1f5f9': REPORT_PALETTE.paper,
  '#F1F5F9': REPORT_PALETTE.paper,
  '#f8fafc': REPORT_PALETTE.paper,
  '#F8FAFC': REPORT_PALETTE.paper,
  // Accents bleus / indigo -> verts institutionnels
  '#0EA5E9': REPORT_PALETTE.institutional,
  '#0ea5e9': REPORT_PALETTE.institutional,
  '#0284C7': REPORT_PALETTE.institutional,
  '#0284c7': REPORT_PALETTE.institutional,
  '#3B82F6': REPORT_PALETTE.night,
  '#2563EB': REPORT_PALETTE.night,
  '#6366F1': REPORT_PALETTE.night,
  '#6366f1': REPORT_PALETTE.night,
  '#4F46E5': REPORT_PALETTE.night,
  '#4f46e5': REPORT_PALETTE.night,
  // Verts existants -> vert institutionnel
  '#10B981': REPORT_PALETTE.institutional,
  '#10b981': REPORT_PALETTE.institutional,
  '#059669': REPORT_PALETTE.institutional,
  '#16A34A': REPORT_PALETTE.institutional,
  '#22C55E': REPORT_PALETTE.institutional,
  // Alertes
  '#F59E0B': REPORT_PALETTE.alert,
  '#f59e0b': REPORT_PALETTE.alert,
  '#EF4444': REPORT_PALETTE.alert,
  '#DC2626': REPORT_PALETTE.alert,
  '#EA580C': REPORT_PALETTE.alert,
};

const RGBA_MAP: Record<string, string> = {
  '14, 165, 233': '11, 102, 88',
  '14,165,233': '11,102,88',
  '99, 102, 241': '16, 36, 58',
  '99,102,241': '16,36,58',
  '16, 185, 129': '11, 102, 88',
  '16,185,129': '11,102,88',
};

/** Remappe les couleurs héritées d'un fragment HTML vers la palette éditoriale. */
export function applyReportPalette(html: string): string {
  let out = html;
  for (const [from, to] of Object.entries(COLOR_MAP)) {
    out = out.split(from).join(to);
  }
  for (const [from, to] of Object.entries(RGBA_MAP)) {
    out = out.split(from).join(to);
  }
  return out;
}
