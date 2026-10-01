/**
 * Même donnée et même facteur : le calculateur écran égale le moteur.
 * Le catalogue vivant est vide dans ce test. Les facteurs sont ceux des cas figés.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { calculateEmission } from "../../../../../packages/carbon-engine/src/index.ts";
import { SCOPE1_REFERENCE_CASES } from "../../../../../packages/carbon-engine/src/reference/scope1Cases.ts";
import {
  matchProcessEmission,
  validateProcessEmission,
  type ProcessEmissionDraft,
} from "../activity-data/processEmission";
import {
  BilanCarboneCalculator,
  invalidateEmissionFactorCache,
} from "./BilanCarboneCalculator";

vi.mock("@/integrations/api/client", () => ({
  api: {
    listFactors: vi.fn(async () => ({ items: [] })),
  },
}));

const lineCalc = BilanCarboneCalculator as unknown as {
  calculateWithFactorHierarchyAndCheck: (
    activity: {
      subcategory: string;
      activity_type: string;
      quantity: string;
      unit: string;
      notes: string;
    },
    organizationId: string,
  ) => Promise<{ emissions: number; emissionFactor: number }>;
  getDefaultFactor: (subcategory: string, activityType: string) => number;
};

function processDraft(
  screen: Extract<(typeof SCOPE1_REFERENCE_CASES)[number]["screen"], { kind: "process_factor" | "process_direct" }>,
): ProcessEmissionDraft {
  if (screen.kind === "process_factor") {
    return {
      processName: screen.processName,
      ghg: screen.ghg,
      description: "",
      comment: "",
      justification: "",
      mode: "activity_factor",
      activityQuantity: screen.activityQuantity,
      activityUnit: screen.activityUnit,
      factorValue: screen.factorValue,
      factorScale: screen.factorScale,
      factorSource: screen.factorSource,
      directValue: "",
      directScale: "kg",
      uncertaintyPct: "",
    };
  }
  return {
    processName: screen.processName,
    ghg: screen.ghg,
    description: "",
    comment: "",
    justification: "",
    mode: "direct_emission",
    activityQuantity: "",
    activityUnit: "",
    factorValue: "",
    factorScale: "kg",
    factorSource: "",
    directValue: screen.directValue,
    directScale: screen.directScale,
    uncertaintyPct: "",
  };
}

describe("cas de référence Scope 1 — écran et moteur", () => {
  beforeEach(() => {
    invalidateEmissionFactorCache();
  });

  for (const ref of SCOPE1_REFERENCE_CASES) {
    it(`${ref.id} : l'écran égale le moteur`, async () => {
      const engine = calculateEmission({
        activity: { ...ref.activity },
        factor: { ...ref.factor },
        methodologyVersion: ref.methodologyVersion,
      });
      expect(engine.emissionsKgCO2e).toBe(ref.expectedKgCO2e);

      let activity: {
        subcategory: string;
        activity_type: string;
        quantity: string;
        unit: string;
        notes: string;
      };

      if (ref.screen.kind === "default_factor") {
        expect(lineCalc.getDefaultFactor(ref.screen.subcategory, ref.screen.activityType)).toBe(
          Number(ref.factor.value),
        );
        activity = {
          subcategory: ref.screen.subcategory,
          activity_type: ref.screen.activityType,
          quantity: ref.activity.value,
          unit: ref.activity.unit,
          notes: "",
        };
      } else {
        const prepared = validateProcessEmission(processDraft(ref.screen));
        expect(prepared.ok).toBe(true);
        if (!prepared.ok) return;
        const matched = matchProcessEmission({
          subcategory: prepared.subcategory,
          notes: prepared.notes,
        });
        expect(matched.kind).toBe("ok");
        activity = {
          subcategory: prepared.subcategory,
          activity_type: "process",
          quantity: String(prepared.quantity),
          unit: prepared.unit,
          notes: prepared.notes,
        };
      }

      const screen = await lineCalc.calculateWithFactorHierarchyAndCheck(activity, "org-ref");
      expect(String(screen.emissions)).toBe(engine.emissionsKgCO2e);
      expect(String(screen.emissions)).toBe(ref.expectedKgCO2e);
    });
  }

  it("une tonne de bois n'est pas le cas au kilogramme", () => {
    const perKg = lineCalc.getDefaultFactor("biomass_wood", "energy");
    const oneTonneAsStored = 1 * perKg;
    const oneTonneInKg = 1000 * perKg;
    expect(perKg).toBe(0.04);
    expect(oneTonneAsStored).toBe(0.04);
    expect(oneTonneInKg).toBe(40);
  });
});
