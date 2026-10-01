import { describe, expect, it } from "vitest";
import { rollupSites, type EmissionSiteLine } from "./siteRollup";

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

/**
 * Cohérence multi-sites type Banque Atlas :
 * Scope 1 consolidé = somme Scope 1 des sites (sans double comptage siège).
 */
describe("consolidation multi-sites — Scope 1/2/3", () => {
  /** Profil simplifié inspiré du seed Banque Atlas (siège + agences + DC). */
  const banqueAtlasLines: EmissionSiteLine[] = [
    // Siège — données centralisées (gaz, flotte, fugitives)
    { siteId: "hq", scope: 1, kg: 120_000 },
    { siteId: "hq", scope: 2, kg: 900_000 },
    { siteId: "hq", scope: 3, kg: 450_000 },
    // Agence Sfax
    { siteId: "sfax", scope: 1, kg: 18_000 },
    { siteId: "sfax", scope: 2, kg: 95_000 },
    { siteId: "sfax", scope: 3, kg: 22_000 },
    // Data Center
    { siteId: "dc", scope: 1, kg: 8_000 },
    { siteId: "dc", scope: 2, kg: 420_000 },
    { siteId: "dc", scope: 3, kg: 15_000 },
    // Petite agence
    { siteId: "gabes", scope: 1, kg: 6_500 },
    { siteId: "gabes", scope: 2, kg: 48_000 },
    { siteId: "gabes", scope: 3, kg: 9_000 },
  ];

  it("Scope 1 consolidé = somme des Scope 1 de chaque site", () => {
    const rollup = rollupSites(banqueAtlasLines);
    const scope1Sites = rollup.sites.reduce((sum, site) => sum + site.scopes[1], 0);
    const scope1Org = banqueAtlasLines
      .filter((l) => l.scope === 1)
      .reduce((sum, l) => sum + l.kg, 0);

    expect(scope1Sites).toBe(120_000 + 18_000 + 8_000 + 6_500);
    expect(scope1Sites).toBe(scope1Org);
    expect(rollup.organizationKg).toBe(
      banqueAtlasLines.reduce((sum, l) => sum + l.kg, 0),
    );
    expect(rollup.balanced).toBe(true);
  });

  it("Scope 2 et Scope 3 consolidés = somme par site, sans double comptage", () => {
    const rollup = rollupSites(banqueAtlasLines);
    const sumScope = (scope: 1 | 2 | 3) =>
      rollup.sites.reduce((sum, site) => sum + site.scopes[scope], 0);

    expect(sumScope(2)).toBe(900_000 + 95_000 + 420_000 + 48_000);
    expect(sumScope(3)).toBe(450_000 + 22_000 + 15_000 + 9_000);
    expect(sumScope(1) + sumScope(2) + sumScope(3)).toBe(rollup.organizationKg);
  });

  it("les données centralisées au siège ne sont pas redistribuées aux agences", () => {
    const rollup = rollupSites(banqueAtlasLines);
    const hq = rollup.sites.find((s) => s.siteId === "hq");
    const sfax = rollup.sites.find((s) => s.siteId === "sfax");

    expect(hq?.scopes[1]).toBe(120_000);
    expect(sfax?.scopes[1]).toBe(18_000);
    // Filtrer « Agence Sfax » ≠ total consolidé
    expect(sfax!.kg).toBeLessThan(rollup.organizationKg);
    expect(sfax!.kg).toBe(18_000 + 95_000 + 22_000);
  });

  it("une vue site exclut les lignes des autres sites", () => {
    const sfaxOnly = banqueAtlasLines.filter((l) => l.siteId === "sfax");
    const rollup = rollupSites(sfaxOnly);
    expect(rollup.organizationKg).toBe(18_000 + 95_000 + 22_000);
    expect(rollup.sites).toHaveLength(1);
    expect(rollup.sites[0].siteId).toBe("sfax");
    expect(rollup.unassignedKg).toBe(0);
  });

  it("n’ajoute pas une seconde fois le Scope 1 siège via une clé d’allocation", () => {
    const rollup = rollupSites(banqueAtlasLines, [
      { siteId: "hq", scope: 1, percent: 100 },
      { siteId: "sfax", scope: 1, percent: 0 },
    ]);
    expect(rollup.organizationKg).toBe(
      banqueAtlasLines.reduce((sum, l) => sum + l.kg, 0),
    );
    // Chevauchement signalé : le siège a déjà ses kg propres
    expect(rollup.overlaps.some((o) => o.siteId === "hq" && o.scope === 1)).toBe(true);
    expect(rollup.allocationViews).toEqual([]);
  });
});
