import { describe, expect, it } from "vitest";
import {
  buildAnswer,
  firstUnansweredIndex,
  indexAfterSave,
  parseQuantity,
  progressPercent,
  splitOptions,
} from "./flow";
import { diagnosticParams } from "./analytics";
import type { PublicQuestion } from "./types";

const question = (partial: Partial<PublicQuestion> & Pick<PublicQuestion, "code">): PublicQuestion => ({
  type: "single",
  labelFr: partial.code,
  labelEn: partial.code,
  axisId: "measure",
  axisLabelFr: "Mesure carbone",
  axisLabelEn: "Carbon measurement",
  options: [
    { value: "yes", labelFr: "Oui", labelEn: "Yes" },
    { value: "unknown", labelFr: "Je ne sais pas", labelEn: "I don't know" },
  ],
  ...partial,
});

describe("diagnostic 360 flow", () => {
  it("uses only the API progress", () => {
    expect(progressPercent({ answered: 0, total: 18 })).toBe(0);
    expect(progressPercent({ answered: 7, total: 18 })).toBe(39);
    expect(progressPercent({ answered: 0, total: 0 })).toBe(0);
  });

  it("keeps Je ne sais pas out of the main options", () => {
    const split = splitOptions(question({ code: "energy_tracking" }));
    expect(split.main.map((option) => option.value)).toEqual(["yes"]);
    expect(split.unknown?.value).toBe("unknown");
  });

  it("moves within the path returned by the API when a branch disappears", () => {
    const before = [question({ code: "has_fleet" }), question({ code: "fleet_fuel_tracking", axisId: "mobility" })];
    const after = [question({ code: "has_fleet" }), question({ code: "business_travel_tracking", axisId: "mobility" })];
    expect(indexAfterSave("has_fleet", after)).toBe(1);
    expect(after[indexAfterSave("has_fleet", after)]?.code).toBe("business_travel_tracking");
    expect(after.some((item) => item.code === "fleet_fuel_tracking")).toBe(false);
    expect(before[1]?.code).toBe("fleet_fuel_tracking");
  });

  it("resumes on the first unanswered shown question", () => {
    const questions = [question({ code: "country", axisId: null }), question({ code: "sector", axisId: null })];
    expect(firstUnansweredIndex(questions, { country: { kind: "choice", value: "TN" } })).toBe(1);
  });

  it("parses a quantity without applying an emission factor", () => {
    expect(parseQuantity("1 250,5")).toBe(1250.5);
    expect(parseQuantity("-4")).toBeNull();
    expect(buildAnswer(question({ code: "kwh", type: "number", options: [] }), { choice: null, multi: [], quantity: "12" })).toEqual({
      kind: "number",
      value: 12,
    });
  });

  it("drops confidential fields from analytics", () => {
    expect(diagnosticParams({
      question_code: "energy_tracking",
      answer_kind: "unknown",
      email: "ada@example.com",
      company: "Engines",
      value: 1250,
      kwh: 10,
    })).toEqual({
      question_code: "energy_tracking",
      answer_kind: "unknown",
    });
  });
});
