import type { EpaCanonicalDto, EpaRawFactor } from "./types.js";

export function normalizeEpaFactors(raw: EpaRawFactor[]): EpaCanonicalDto[] {
  const dtos: EpaCanonicalDto[] = [];
  const seen = new Set<string>();

  for (const r of raw) {
    const stableFactorId = `epa:2025:${r.stemParts.join(":")}`;
    if (seen.has(stableFactorId)) {
      throw new Error(`Duplicate stable_factor_id: ${stableFactorId}`);
    }
    seen.add(stableFactorId);

    dtos.push({
      externalCode: stableFactorId,
      stableFactorId,
      name: r.name,
      value: r.value,
      originalValue: r.valueText,
      unitNumerator: r.unitNumerator,
      unitDenominator: r.unitDenominator,
      energyBasis: r.energyBasis,
      lifecycleBoundary: r.lifecycleBoundary,
      gwpBasis: r.gwpBasis,
      factorKind: r.factorKind,
      factorType: r.factorType,
      countryCode: r.countryCode,
      region:
        typeof r.dims.egrid_subregion_acronym === "string"
          ? r.dims.egrid_subregion_acronym
          : null,
      sourceCategory: r.sourceCategory,
      sourceSubcategory: r.sourceSubcategory,
      internalCategory: r.sourceCategory,
      internalSubcategory: r.sourceSubcategory,
      geographicApplicability: r.geographicApplicability,
      gas: r.gas,
      table: r.table,
      tableName: r.tableName,
      dims: r.dims,
      derived: Boolean(r.derived),
      derivedFormula: r.derivedFormula ?? null,
      derivedFromStems: r.derivedFromStems ?? [],
    });
  }

  return dtos.sort((a, b) =>
    a.stableFactorId < b.stableFactorId ? -1 : a.stableFactorId > b.stableFactorId ? 1 : 0,
  );
}

export function summarizeEpaDtos(dtos: EpaCanonicalDto[]) {
  const counts = {
    imported: dtos.length,
    ghgComponents: 0,
    activityCo2e: 0,
    gwp: 0,
    derived: 0,
    usSpecific: 0,
    globalApplicable: 0,
    requiresReview: 0,
    byTable: {} as Record<number, number>,
    byUnit: {} as Record<string, number>,
    byLifecycle: {} as Record<string, number>,
  };
  for (const d of dtos) {
    if (d.factorKind === "ghg_component") counts.ghgComponents += 1;
    if (d.factorKind === "activity_emission_factor") counts.activityCo2e += 1;
    if (d.factorKind === "gwp") counts.gwp += 1;
    if (d.derived) counts.derived += 1;
    if (d.geographicApplicability === "US_SPECIFIC") counts.usSpecific += 1;
    if (d.geographicApplicability === "GLOBAL_APPLICABLE") counts.globalApplicable += 1;
    if (d.geographicApplicability === "REQUIRES_REVIEW") counts.requiresReview += 1;
    counts.byTable[d.table] = (counts.byTable[d.table] ?? 0) + 1;
    const u = `${d.unitNumerator} / ${d.unitDenominator}`;
    counts.byUnit[u] = (counts.byUnit[u] ?? 0) + 1;
    counts.byLifecycle[d.lifecycleBoundary] = (counts.byLifecycle[d.lifecycleBoundary] ?? 0) + 1;
  }
  return counts;
}
