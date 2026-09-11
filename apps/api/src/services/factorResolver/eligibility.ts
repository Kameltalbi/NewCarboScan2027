import { evaluateEnergyBasis } from "./energyBasisPolicy.js";
import { evaluateGeography } from "./geographyPolicy.js";
import { evaluateGwp } from "./gwpPolicy.js";
import { evaluateLifecycle } from "./lifecyclePolicy.js";
import { isProductionSafeCandidate } from "./productionSafeSubset.js";
import type { FactorCandidate, ResolveFactorInput } from "./types.js";
import {
  compareUnits,
  isMonetaryUnit,
  normalizeResolverUnit,
} from "./unitCompatibility.js";

export type FilterResult = {
  eligible: FactorCandidate[];
  rejected: Array<{ candidate: FactorCandidate; reasonCode: string }>;
  meta: Map<
    string,
    {
      geographyReason?: string;
      warnings: string[];
      unitClass: string;
      unitMultiplier: number | null;
    }
  >;
};

/**
 * Hard eligibility filters. Methodological rejects never become rank winners.
 */
export function applyHardFilters(
  input: ResolveFactorInput,
  candidates: FactorCandidate[],
): FilterResult {
  const eligible: FactorCandidate[] = [];
  const rejected: FilterResult["rejected"] = [];
  const meta: FilterResult["meta"] = new Map();

  const activityUnit = normalizeResolverUnit(input.unit);
  const monetaryActivity =
    input.factorTypeHint === "monetary" || isMonetaryUnit(activityUnit);

  for (const c of candidates) {
    const warnings: string[] = [];

    if (c.factorKind && c.factorKind !== "activity_emission_factor" && c.factorKind !== "other") {
      // Allow NULL kind (ADEME/Core); reject explicit non-activity kinds
      if (
        c.factorKind === "gwp" ||
        c.factorKind === "ghg_component" ||
        c.factorKind === "energy_intensity" ||
        c.factorKind === "avoided_emission"
      ) {
        rejected.push({ candidate: c, reasonCode: "KIND_INCOMPATIBLE" });
        continue;
      }
    }

    // Physical vs monetary
    if (monetaryActivity) {
      if (c.factorType !== "monetary") {
        rejected.push({ candidate: c, reasonCode: "MONETARY_REQUIRED" });
        continue;
      }
    } else {
      if (c.factorType === "monetary" || c.factorType === "gwp") {
        rejected.push({ candidate: c, reasonCode: "PHYSICAL_REQUIRED" });
        continue;
      }
    }

    const unit = compareUnits(activityUnit, c.unitDenominator);
    if (unit.class === "INCOMPATIBLE" || unit.class === "CONTEXT_REQUIRED") {
      rejected.push({
        candidate: c,
        reasonCode: unit.reasonCode,
      });
      continue;
    }

    const geo = evaluateGeography(input, c);
    if (!geo.eligible) {
      rejected.push({ candidate: c, reasonCode: geo.reasonCode });
      continue;
    }
    if (geo.warning) warnings.push(geo.warning);

    const life = evaluateLifecycle(input, c);
    if (!life.compatible) {
      rejected.push({ candidate: c, reasonCode: life.reasonCode });
      continue;
    }
    if (life.warning) warnings.push(life.warning);

    const energy = evaluateEnergyBasis(input, c);
    if (!energy.compatible) {
      rejected.push({ candidate: c, reasonCode: energy.reasonCode });
      continue;
    }
    if (energy.warning) warnings.push(energy.warning);

    const gwp = evaluateGwp(input, c);
    if (!gwp.compatible) {
      rejected.push({ candidate: c, reasonCode: gwp.reasonCode });
      continue;
    }
    if (gwp.warning) warnings.push(gwp.warning);

    // Production mode already filtered in SQL; belt-and-suspenders:
    if (input.mode === "production" && c.resolverStatus !== "enabled") {
      rejected.push({ candidate: c, reasonCode: "RESOLVER_DISABLED" });
      continue;
    }

    // FE V1: version flags may enable whole ADEME/UK versions — only safe subset auto-resolves.
    if (input.mode === "production" && !isProductionSafeCandidate(c)) {
      rejected.push({ candidate: c, reasonCode: "OUTSIDE_PRODUCTION_SAFE_SUBSET" });
      continue;
    }

    meta.set(c.id, {
      geographyReason: geo.reasonCode,
      warnings,
      unitClass: unit.class,
      unitMultiplier: unit.multiplier,
    });
    eligible.push(c);
  }

  return { eligible, rejected, meta };
}
