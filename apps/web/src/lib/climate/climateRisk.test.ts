import { describe, expect, it } from "vitest";
import { toClimateRiskPayload } from "./climateRisk";

describe("toClimateRiskPayload", () => {
  it("relit les six champs et conserve le niveau saisi", () => {
    const payload = toClimateRiskPayload({
      title: "Crue du site nord",
      category: "physical",
      probability: "high",
      impact: "high",
      riskLevel: "low",
      measure: "Rehausser les stocks",
      actionId: "",
    });
    expect(payload).toEqual({
      title: "Crue du site nord",
      category: "physical",
      probability: "high",
      impact: "high",
      risk_level: "low",
      measure: "Rehausser les stocks",
      action_id: null,
    });
  });

  it("accepte une mesure vide et une action", () => {
    const payload = toClimateRiskPayload({
      title: "Prix du carbone",
      category: "transition",
      probability: "medium",
      impact: "low",
      riskLevel: "medium",
      measure: "  ",
      actionId: "11111111-1111-4111-8111-111111111111",
    });
    expect(payload).toMatchObject({ measure: null, action_id: "11111111-1111-4111-8111-111111111111" });
  });

  it("refuse un titre vide", () => {
    expect(toClimateRiskPayload({
      title: "  ",
      category: "other",
      probability: "low",
      impact: "low",
      riskLevel: "low",
      measure: "",
      actionId: "",
    })).toEqual({ error: "Le risque est requis." });
  });
});
