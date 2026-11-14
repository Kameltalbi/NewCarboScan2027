import { describe, expect, it } from "vitest";
import {
  buildImportDraft,
  confirmAssociation,
  emissionCell,
  importAnnouncement,
  lineNotes,
  matchingLines,
} from "./importReview";
import type { PreviewFactor } from "./linePreview";

const HEADERS = ["Début de période", "Fin de période", "Désignation", "Produit ou type", "Quantité", "Unité", "Référence du justificatif"];

function sheet(rows: unknown[][], name = "Saisie") {
  return { name, rows: [HEADERS, ...rows] };
}

const beefFactor: PreviewFactor = {
  id: "boeuf-cru",
  name: "Bœuf cru",
  value: 28,
  unit: "kgCO2e/kg",
  sourceName: "Base Carbone",
  factorYear: 2024,
  countryCode: "FR",
  stableFactorId: null,
};

describe("relecture d’import", () => {
  const draft = buildImportDraft({
    activityGroupId: "purchases",
    year: 2025,
    organizationCountry: "Tunisie",
    sheets: [
      sheet([
        ["01/01/2025", "31/12/2025", "Achat lait cuisine", "Lait", 30, "L", "F-12"],
        ["01/03/2025", "01/03/2025", "Bœuf frais", "", 45, "kg", ""],
        ["01/03/2025", "01/03/2025", "Bœuf frais", "", 45, "kg", ""],
        ["02/03/2025", "02/03/2025", "Achat viande fournisseur X", "", 20, "kg", ""],
        ["04/03/2025", "04/03/2025", "Divers cuisine", "", "1 lot", "lot", ""],
        ["01/01/2024", "31/12/2024", "Achat lait ancien", "", 10, "L", ""],
        ["", "", "Ligne cassée", "", "beaucoup", "kg", ""],
      ], "Achats"),
      sheet([["Bœuf frais", "", 45, "kg"]], "Exemples"),
    ],
  });

  it("propose sans confirmer, et ne convertit pas un lot", () => {
    const milk = draft.lines.find((line) => line.designation === "Achat lait cuisine");
    const beef = draft.lines.find((line) => line.designation === "Bœuf frais");
    const meat = draft.lines.find((line) => line.designation.startsWith("Achat viande"));
    const mixed = draft.lines.find((line) => line.designation === "Divers cuisine");
    expect(draft.ignoredSheets).toEqual(["Exemples"]);
    expect(milk?.status).toBe("confirm");
    expect(milk?.productLabel).toBe("Lait entier");
    expect(milk?.factorConfirmed).toBe(false);
    expect(beef?.status).toBe("confirm");
    expect(beef?.productLabel).toBe("Bœuf cru — à préciser");
    expect(meat?.status).toBe("incomplete");
    expect(meat?.productLabel).toBe("À préciser");
    expect(meat?.hint).toMatch(/viande/);
    expect(mixed?.quantity).toBe(1);
    expect(mixed?.unit).toBe("lot");
    expect(mixed?.status).toBe("incomplete");
    expect(mixed?.issues.join(" ")).toMatch(/lot/);
    expect(emissionCell(mixed!)).toBe("Non calculées");
    expect(emissionCell(beef!)).not.toBe("0");
  });

  it("signale les doublons, les dates hors exercice et les lignes illisibles sans les supprimer", () => {
    expect(draft.lines.filter((line) => line.designation === "Bœuf frais").every((line) => line.duplicate)).toBe(true);
    const old = draft.lines.find((line) => line.designation === "Achat lait ancien");
    const broken = draft.lines.find((line) => line.designation === "Ligne cassée");
    expect(old?.outOfYear).toBe(true);
    expect(old?.status).toBe("incomplete");
    expect(broken?.unreadable).toBe(true);
    expect(draft.lines).toHaveLength(7);
  });

  it("ne compte un facteur qu’après confirmation, et bloque une unité incompatible", () => {
    const milk = draft.lines.find((line) => line.designation === "Achat lait cuisine")!;
    const confirmed = confirmAssociation(draft.lines, {
      lineId: milk.id,
      factor: { ...beefFactor, unit: "kgCO2e/L", name: "Lait entier" },
      productQuery: "lait entier",
      choiceValue: "cat1_dairy_eggs",
      state: null,
      applyToIdentical: false,
      year: 2025,
    });
    const ready = confirmed.lines.find((line) => line.id === milk.id)!;
    expect(confirmed.blocked).toBeNull();
    expect(ready.status).toBe("ready");
    expect(ready.preview?.kg).toBe(840);
    expect(lineNotes(ready, "achats.xlsx")).toContain("DESIGNATION: Achat lait cuisine");
    expect(lineNotes(ready, "achats.xlsx")).toContain("LIGNE_FICHIER: achats.xlsx#");
    expect(lineNotes(draft.lines.find((line) => line.designation.startsWith("Achat viande"))!, "achats.xlsx")).toMatch(/^A_COMPLETER:/);

    const lot = draft.lines.find((line) => line.designation === "Divers cuisine")!;
    const blocked = confirmAssociation(draft.lines, {
      lineId: lot.id,
      factor: beefFactor,
      productQuery: "bœuf",
      choiceValue: "cat1_meat_red",
      state: "cru",
      applyToIdentical: true,
      year: 2025,
    });
    expect(blocked.blocked).toMatch(/unité/i);
    expect(blocked.lines.find((line) => line.id === lot.id)?.preview?.kg).toBeNull();
    expect(importAnnouncement(confirmed.lines)).toBe("1 ligne sera comptée ; 6 lignes seront conservées à compléter.");
  });

  it("regroupe seulement les lignes de même produit, état et unité", () => {
    const beefs = draft.lines.filter((line) => line.designation === "Bœuf frais");
    expect(matchingLines(draft.lines, beefs[0].id).map((line) => line.id)).toEqual([beefs[1].id]);
    const meat = draft.lines.find((line) => line.designation.startsWith("Achat viande"))!;
    expect(matchingLines(draft.lines, meat.id)).toEqual([]);
  });

  it("propose l’électricité tunisienne sans la confirmer", () => {
    const electricity = buildImportDraft({
      activityGroupId: "electricity",
      year: 2025,
      organizationCountry: "Tunisie",
      sheets: [sheet([["", "", "Facture réseau", "", 23208, "kWh", ""]])],
    });
    const line = electricity.lines[0];
    expect(line.status).toBe("confirm");
    expect(line.factor?.value).toBe(0.53);
    expect(line.factorConfirmed).toBe(false);
    expect(emissionCell(line)).toBe("Non calculées");
    const saved = confirmAssociation(electricity.lines, {
      lineId: line.id,
      factor: line.factor,
      productQuery: "électricité",
      choiceValue: "electricity_grid",
      state: null,
      applyToIdentical: false,
      year: 2025,
    });
    expect(saved.lines[0].status).toBe("ready");
    expect(saved.lines[0].preview?.resultLabel).toBe("12,3 t CO₂e");
  });
});
