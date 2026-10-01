import { describe, expect, it } from "vitest";
import { bilanTotalAfterPlan, toClimateActionPayload, type ActionPlanForm } from "./actionPlan";

const empty: ActionPlanForm = {
  title: "Isoler l'atelier",
  description: "Toiture",
  actionType: "reduction",
  leverId: "",
  poste: "Combustion",
  siteId: "",
  ownerName: "Amina",
  startDate: "2026-01-01",
  targetDate: "2026-12-31",
  priority: "high",
  status: "to_launch",
  budget: "12000",
  indicatorName: "kWh",
  indicatorTarget: "10000",
  potentialT: "4.5",
  estimationMethod: "invoice",
};

describe("plan d'actions", () => {
  it.each(["reduction", "data_quality", "awareness", "suppliers", "other"] as const)(
    "enregistre le type %s",
    (actionType) => {
      const payload = toClimateActionPayload({ ...empty, actionType });
      expect(payload).toMatchObject({ action_type: actionType, title: "Isoler l'atelier" });
    },
  );

  it("relit les champs du besoin", () => {
    const payload = toClimateActionPayload(empty);
    expect(payload).toMatchObject({
      description: "Toiture",
      source_emission_targeted: "Combustion",
      owner_name: "Amina",
      start_date: "2026-01-01",
      target_date: "2026-12-31",
      priority: "high",
      status: "to_launch",
      budget_estimated: 12000,
      indicator_name: "kWh",
      indicator_target: "10000",
      expected_reduction_tco2e: 4.5,
      estimation_method: "invoice",
      lever_id: null,
      site_id: null,
    });
  });

  it("laisse le total du bilan inchangé", () => {
    expect(bilanTotalAfterPlan(2040, 4.5)).toBe(2040);
  });
});
