import { describe, expect, it } from "vitest";
import {
  UNVALIDATED_MONETARY_LABEL,
  isUnvalidatedMonetaryDefault,
  shareByMethod,
} from "./dataMethod";

describe("part physique et monétaire", () => {
  it("calcule 25 % physique et 75 % monétaire", () => {
    const share = shareByMethod([
      { method: "physical", kg: 100 },
      { method: "monetary", kg: 300 },
    ]);
    expect(share.percent.physical).toBe(25);
    expect(share.percent.monetary).toBe(75);
    expect(share.kg.physical).toBe(100);
    expect(share.kg.monetary).toBe(300);
  });

  it("ne compte pas une ligne sans méthode comme physique", () => {
    const share = shareByMethod([
      { method: "physical", kg: 100 },
      { method: null, kg: 100 },
    ]);
    expect(share.kg.physical).toBe(100);
    expect(share.kg.unspecified).toBe(100);
    expect(share.percent.physical).toBe(50);
  });

  it("laisse les ratios TND identifiables comme non validés", () => {
    expect(isUnvalidatedMonetaryDefault("cat1_other")).toBe(true);
    expect(isUnvalidatedMonetaryDefault("cat2_it_equipment")).toBe(true);
    expect(isUnvalidatedMonetaryDefault("fossil_gas")).toBe(false);
    expect(isUnvalidatedMonetaryDefault("cat2_vehicles")).toBe(false);
    expect(UNVALIDATED_MONETARY_LABEL).toBe("Ratio monétaire non validé ABC");
    expect(UNVALIDATED_MONETARY_LABEL.includes("conforme")).toBe(false);
  });
});
