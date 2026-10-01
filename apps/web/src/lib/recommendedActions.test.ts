import { describe, expect, it } from "vitest";
import { getRecommendedActions } from "./recommendedActions";

describe("getRecommendedActions", () => {
  it("filtre le catalogue pour un profil type Banque Atlas (kgCO₂e)", async () => {
    const actions = await getRecommendedActions({
      totalEmissions: 7864.7 * 1000,
      scope1: 912.6 * 1000,
      scope2: 3547.8 * 1000,
      scope3: 3404.3 * 1000,
      categoryBreakdown: [],
      majorityScope: 2,
    });
    expect(actions.length).toBeGreaterThan(0);
    expect(actions.some((a) => a.categorie === "Énergie")).toBe(true);
    expect(actions.some((a) => a.scope_cible === "2")).toBe(true);
  });

  it("ne recommande rien si émissions nulles", async () => {
    const actions = await getRecommendedActions({
      totalEmissions: 0,
      scope1: 0,
      scope2: 0,
      scope3: 0,
      categoryBreakdown: [],
      majorityScope: 1,
    });
    expect(actions).toHaveLength(0);
  });
});
