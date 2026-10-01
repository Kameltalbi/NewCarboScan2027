import type { BilanCarboneResult, EmissionLineDetail } from "./BilanCarboneCalculator";

const T_TO_KG = 1000;

export function isClosedBilanStatus(status: unknown): boolean {
  return status === "submitted" || status === "validated";
}

interface SnapshotLine {
  lineKey?: string;
  name?: string;
  category?: string;
  scope?: number;
  quantity?: number;
  activityUnit?: string;
  factorValue?: number;
  factorUnit?: string;
  factorSource?: string;
  factorName?: string;
  resultKgCo2e?: number;
  usedAt?: string;
}

function emptyQuality(): BilanCarboneResult["dataQuality"] {
  return { real: 0, estimated: 0, default: 0 };
}

function fromStoredTonnes(
  row: Record<string, unknown>,
  periodStart: string,
  periodEnd: string,
  frozenAt: string | null,
): BilanCarboneResult | null {
  const tonnes = Number(row.total_emission ?? row.total_kgco2e ?? 0) || 0;
  if (tonnes <= 0) return null;
  const scope1 = (Number(row.scope1_emission ?? row.scope1_kgco2e) || 0) * T_TO_KG;
  const scope2 = (Number(row.scope2_emission ?? row.scope2_kgco2e) || 0) * T_TO_KG;
  const scope3 = (Number(row.scope3_emission ?? row.scope3_kgco2e) || 0) * T_TO_KG;
  const totalEmissions = tonnes * T_TO_KG;
  const breakdown = [
    { category: "Scope 1", emissions: scope1, percentage: totalEmissions > 0 ? (scope1 / totalEmissions) * 100 : 0 },
    { category: "Scope 2", emissions: scope2, percentage: totalEmissions > 0 ? (scope2 / totalEmissions) * 100 : 0 },
    { category: "Scope 3", emissions: scope3, percentage: totalEmissions > 0 ? (scope3 / totalEmissions) * 100 : 0 },
  ].filter((item) => item.emissions > 0);
  return {
    totalEmissions,
    scope1,
    scope2,
    scope3,
    breakdown,
    detailedBreakdown: [],
    period: { start: periodStart, end: periodEnd },
    dataQuality: { real: 100, estimated: 0, default: 0 },
    missingFactors: [],
    frozen: true,
    frozenAt,
  };
}

export function resultFromFrozenBilan(
  row: Record<string, unknown>,
  periodStart: string,
  periodEnd: string,
): BilanCarboneResult | null {
  if (!isClosedBilanStatus(row.status)) return null;
  const snapshot = row.published_snapshot as { frozenAt?: string; lines?: SnapshotLine[] } | null;
  const lines = snapshot?.lines;
  if (!lines || lines.length === 0) {
    return fromStoredTonnes(row, periodStart, periodEnd, snapshot?.frozenAt ?? null);
  }

  let scope1 = 0;
  let scope2 = 0;
  let scope3 = 0;
  const detailedBreakdown: EmissionLineDetail[] = [];
  for (const line of lines) {
    const emissions = Number(line.resultKgCo2e) || 0;
    const scope = line.scope === 2 || line.scope === 3 ? line.scope : 1;
    if (scope === 1) scope1 += emissions;
    else if (scope === 2) scope2 += emissions;
    else scope3 += emissions;
    detailedBreakdown.push({
      category: line.category || "other",
      subcategory: line.factorName || line.name || line.lineKey || "ligne",
      quantity: Number(line.quantity) || 0,
      unit: line.activityUnit || "",
      emissionFactor: Number(line.factorValue) || 0,
      emissionFactorUnit: line.factorUnit || "",
      emissionFactorSource: line.factorSource || "Non trouvé",
      emissions,
      scope,
      dataQuality: "real",
    });
  }
  const totalEmissions = scope1 + scope2 + scope3;
  const breakdown = [
    { category: "Scope 1", emissions: scope1, percentage: totalEmissions > 0 ? (scope1 / totalEmissions) * 100 : 0 },
    { category: "Scope 2", emissions: scope2, percentage: totalEmissions > 0 ? (scope2 / totalEmissions) * 100 : 0 },
    { category: "Scope 3", emissions: scope3, percentage: totalEmissions > 0 ? (scope3 / totalEmissions) * 100 : 0 },
  ].filter((item) => item.emissions > 0);

  return {
    totalEmissions,
    scope1,
    scope2,
    scope3,
    breakdown,
    detailedBreakdown,
    period: { start: periodStart, end: periodEnd },
    dataQuality: emptyQuality(),
    missingFactors: [],
    frozen: true,
    frozenAt: snapshot?.frozenAt ?? null,
  };
}
