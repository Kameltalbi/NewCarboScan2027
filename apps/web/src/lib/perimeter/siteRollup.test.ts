import { describe, expect, it } from "vitest";
import { rollupSites } from "./siteRollup";

describe("rollupSites", () => {
  it("additionne deux sites une seule fois", () => {
    const rollup = rollupSites([
      { siteId: "a", scope: 1, kg: 2040 },
      { siteId: "b", scope: 1, kg: 1340 },
    ]);
    expect(rollup.organizationKg).toBe(3380);
    expect(rollup.sites.map((site) => site.kg)).toEqual([2040, 1340]);
    expect(rollup.unassignedKg).toBe(0);
    expect(rollup.balanced).toBe(true);
    expect(rollup.allocationViews).toEqual([]);
    expect(rollup.overlaps).toEqual([]);
  });

  it("garde une ligne sans site dans le total, hors des sites", () => {
    const rollup = rollupSites([
      { siteId: "a", scope: 1, kg: 1000 },
      { siteId: null, scope: 2, kg: 500 },
    ]);
    expect(rollup.organizationKg).toBe(1500);
    expect(rollup.sites).toHaveLength(1);
    expect(rollup.unassignedKg).toBe(500);
    expect(rollup.sitesPlusUnassignedKg).toBe(1500);
  });

  it("montre 40 % du scope sans donnée comme une vue, hors du total", () => {
    const rollup = rollupSites(
      [
        { siteId: "a", scope: 1, kg: 1000 },
        { siteId: null, scope: 1, kg: 500 },
      ],
      [{ siteId: "b", scope: 1, percent: 40 }],
    );
    expect(rollup.organizationKg).toBe(1500);
    expect(rollup.sites.find((site) => site.siteId === "b")).toBeUndefined();
    expect(rollup.allocationViews).toEqual([{ siteId: "b", scope: 1, kg: 600 }]);
    expect(rollup.balanced).toBe(true);
  });

  it("signale une donnée de site et une allocation du même scope sans les additionner", () => {
    const rollup = rollupSites(
      [{ siteId: "a", scope: 1, kg: 1000 }],
      [{ siteId: "a", scope: 1, percent: 40 }],
    );
    expect(rollup.organizationKg).toBe(1000);
    expect(rollup.sites[0].kg).toBe(1000);
    expect(rollup.overlaps).toEqual([
      { siteId: "a", scope: 1, ownKg: 1000, percent: 40 },
    ]);
    expect(rollup.allocationViews).toEqual([]);
  });

  it("compte deux saisies distinctes, faute de transfert interne", () => {
    const rollup = rollupSites([
      { siteId: "a", scope: 1, kg: 100 },
      { siteId: "b", scope: 1, kg: 100 },
    ]);
    expect(rollup.organizationKg).toBe(200);
  });

  it("signale une somme de clés différente de 100", () => {
    const rollup = rollupSites(
      [{ siteId: null, scope: 2, kg: 1000 }],
      [
        { siteId: "a", scope: 2, percent: 40 },
        { siteId: "b", scope: 2, percent: 40 },
      ],
    );
    expect(rollup.percentGaps).toEqual([{ scope: 2, sum: 80 }]);
    expect(rollup.organizationKg).toBe(1000);
  });
});
