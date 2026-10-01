import { describe, expect, it } from "vitest";
import {
  listCorporateFactorSources,
  publicFactorSourceGroups,
  sourceUsage,
  type FactorSourceVersion,
} from "./factorSourceInventory";

function row(partial: Partial<FactorSourceVersion> & Pick<FactorSourceVersion, "sourceKey" | "name">): FactorSourceVersion {
  return {
    license: null,
    publisher: null,
    homepage: null,
    versionLabel: null,
    datasetVersion: null,
    publishedYear: null,
    validFrom: null,
    gwpSet: null,
    status: "approved",
    catalogStatus: "visible",
    calculationStatus: "enabled",
    resolverStatus: "enabled",
    notes: null,
    factorCount: 1,
    calculableCount: 1,
    ...partial,
  };
}

describe("inventaire des sources de facteurs", () => {
  it("n'affiche une source que si source_key existe", () => {
    const shown = listCorporateFactorSources([
      row({ sourceKey: "ademe", name: "ADEME Base Carbone", versionLabel: "23.9" }),
      row({ sourceKey: null, name: "Sans clé" }),
    ]);
    expect(shown.map((item) => item.name)).toEqual(["ADEME Base Carbone"]);
  });

  it("ne présente pas Agribalyse comme base active et écarte PCAF", () => {
    const shown = listCorporateFactorSources([
      row({ sourceKey: "internal", name: "Newcarboscan Core Pack TN", versionLabel: "core-tn-2027.1" }),
      row({ sourceKey: "pcaf", name: "PCAF" }),
    ]);
    expect(shown.map((item) => item.sourceKey)).toEqual(["internal"]);
    expect(shown.some((item) => /agribalyse/i.test(item.name))).toBe(false);

    const publicNames = publicFactorSourceGroups("Facteurs locaux").flatMap((group) =>
      group.items.map((item) => item.name),
    );
    expect(publicNames).not.toContain("Agribalyse");
    expect(publicNames).not.toContain("PCAF");
    const imported = publicFactorSourceGroups("Facteurs locaux").find((group) => group.status === "imported");
    expect(imported?.items.map((item) => item.name)).toEqual(["EPA", "IPCC"]);
  });

  it("distingue le sous-ensemble calculable d'un import hors calcul", () => {
    expect(sourceUsage(row({
      sourceKey: "ipcc_efdb",
      name: "IPCC",
      factorCount: 778,
      calculableCount: 216,
      calculationStatus: "enabled",
    }))).toBe("calculable");
    expect(sourceUsage(row({
      sourceKey: "ademe",
      name: "ADEME",
      factorCount: 10,
      calculableCount: 0,
      calculationStatus: "disabled",
      catalogStatus: "visible",
    }))).toBe("imported");
  });
});
