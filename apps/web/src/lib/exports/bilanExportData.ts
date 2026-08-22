import type { BilanCarboneResult } from '@/lib/calculators/BilanCarboneCalculator';

export interface BilanExportContext {
  result: BilanCarboneResult;
  organizationName: string;
  year: number;
  employees: number | null;
  sector?: string;
  revenue?: number | null;
  currency?: string;
}

export interface ExportComputed {
  totalT: number;
  s1T: number;
  s2T: number;
  s3T: number;
  pctS1: number;
  pctS2: number;
  pctS3: number;
  perEmployeeT: number | null;
  perRevenueT: number | null;
  topCategories: { category: string; tonnes: number; pct: number }[];
  realPct: number;
  estimatedPct: number;
  defaultPct: number;
  confidenceScore: number; // 0-100
  trajectory: { year: number; bau: number; target: number }[];
  reductionTarget2030T: number;
  topActions: { title: string; lever: string; reductionT: number; priority: string }[];
}

export function computeExport(ctx: BilanExportContext): ExportComputed {
  const { result, year, employees, revenue } = ctx;
  const totalT = result.totalEmissions / 1000;
  const s1T = result.scope1 / 1000;
  const s2T = result.scope2 / 1000;
  const s3T = result.scope3 / 1000;
  const safe = (n: number) => (totalT > 0 ? (n / totalT) * 100 : 0);
  const topCategories = [...(result.breakdown || [])]
    .sort((a, b) => b.emissions - a.emissions)
    .slice(0, 10)
    .map(b => ({
      category: b.category,
      tonnes: b.emissions / 1000,
      pct: b.percentage,
    }));

  const dq = result.dataQuality || { real: 0, estimated: 0, default: 0 };
  const dqTotal = (dq.real || 0) + (dq.estimated || 0) + (dq.default || 0) || 1;
  const realPct = (dq.real / dqTotal) * 100;
  const estimatedPct = (dq.estimated / dqTotal) * 100;
  const defaultPct = (dq.default / dqTotal) * 100;
  const confidenceScore = Math.round(realPct * 1 + estimatedPct * 0.6 + defaultPct * 0.3);

  // Hypothèse interne illustrative (−42 % / 2030), non validée par un tiers
  const reductionTarget2030T = totalT * 0.42;
  const trajectory: { year: number; bau: number; target: number }[] = [];
  const startYear = year;
  const endYear = 2030;
  const totalYears = Math.max(endYear - startYear, 1);
  for (let y = startYear; y <= endYear; y++) {
    const t = (y - startYear) / totalYears;
    trajectory.push({
      year: y,
      bau: +(totalT * (1 + 0.02 * (y - startYear))).toFixed(1),
      target: +(totalT * (1 - 0.42 * t)).toFixed(1),
    });
  }

  // Top actions derived from top categories
  const topActions = topCategories.slice(0, 5).map((c, i) => ({
    title: `Plan de réduction — ${c.category}`,
    lever: inferLever(c.category),
    reductionT: +(c.tonnes * (i === 0 ? 0.25 : 0.15)).toFixed(1),
    priority: i < 2 ? 'Haute' : i < 4 ? 'Moyenne' : 'Faible',
  }));

  return {
    totalT,
    s1T,
    s2T,
    s3T,
    pctS1: safe(s1T),
    pctS2: safe(s2T),
    pctS3: safe(s3T),
    perEmployeeT: employees && employees > 0 ? totalT / employees : null,
    perRevenueT: revenue && revenue > 0 ? (totalT / revenue) * 1_000_000 : null,
    topCategories,
    realPct,
    estimatedPct,
    defaultPct,
    confidenceScore,
    trajectory,
    reductionTarget2030T,
    topActions,
  };
}

function inferLever(category: string): string {
  const c = category.toLowerCase();
  if (c.includes('electric') || c.includes('énergie') || c.includes('elec')) return 'Sobriété & efficacité énergétique';
  if (c.includes('transport') || c.includes('fret') || c.includes('voyage')) return 'Mobilité & logistique bas-carbone';
  if (c.includes('achat') || c.includes('matière')) return 'Achats responsables';
  if (c.includes('déchet') || c.includes('waste')) return 'Économie circulaire';
  if (c.includes('combustible') || c.includes('gaz') || c.includes('fioul')) return 'Décarbonation des procédés';
  return 'Plan d\'action ciblé';
}

export const formatT = (n: number) => `${n.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} tCO₂e`;
