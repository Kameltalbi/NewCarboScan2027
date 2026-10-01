import { describe, expect, it } from "vitest";
import { NetZeroTrajectoryCalculator } from "./NetZeroTrajectoryCalculator";
import { buildReductionTrajectory, latestActualByYear } from "./reductionTrajectory";

const base = {
  referenceYear: 2020,
  referenceEmissionsT: 1000,
  targetYear: 2024,
  reductionPercent: 40,
  kind: "reference" as const,
  intermediates: [],
  actuals: [],
};

describe("trajectoire de réduction", () => {
  it("reste vide tant que l'objectif n'est pas enregistré", () => {
    const view = buildReductionTrajectory({ ...base, reductionPercent: null });
    expect(view.status).toBe("empty");
    expect(view.points).toEqual([]);
  });

  it("reprend la droite du calculateur existant", () => {
    const view = buildReductionTrajectory(base);
    const linear = NetZeroTrajectoryCalculator.calculateLinearTrajectory(2020, 1000, 2024, 40);
    expect(view.status).toBe("ready");
    expect(view.points.map((point) => point.targetT)).toEqual(
      linear.map((point) => point.target_emissions),
    );
    expect(view.points[0].targetT).toBe(1000);
    expect(view.points[4].targetT).toBe(600);
  });

  it("passe par les jalons enregistrés", () => {
    const view = buildReductionTrajectory({
      ...base,
      kind: "personalized",
      intermediates: [{ year: 2022, reductionPercent: 10 }],
    });
    const byYear = Object.fromEntries(view.points.map((point) => [point.year, point.targetT]));
    expect(byYear[2020]).toBe(1000);
    expect(byYear[2022]).toBe(900);
    expect(byYear[2024]).toBe(600);
    expect(byYear[2021]).toBe(950);
  });

  it("pose les émissions réelles seulement sur les années de bilan", () => {
    const view = buildReductionTrajectory({
      ...base,
      actuals: [{ year: 2021, emissionsT: 980 }],
    });
    expect(view.points.find((point) => point.year === 2021)?.actualT).toBe(980);
    expect(view.points.find((point) => point.year === 2020)?.actualT).toBeNull();
  });

  it("garde le bilan le plus récent pour une même année", () => {
    expect(latestActualByYear([
      { year: 2024, emissionsT: 10, updatedAt: "2024-01-01" },
      { year: 2024, emissionsT: 12, updatedAt: "2024-06-01" },
      { year: null, emissionsT: 99, updatedAt: "2024-07-01" },
    ])).toEqual([{ year: 2024, emissionsT: 12 }]);
  });
});
