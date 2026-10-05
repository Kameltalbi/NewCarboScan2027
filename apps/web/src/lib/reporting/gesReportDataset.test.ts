import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import { ATLAS_COUNTERPARTIES } from "../pcaf/atlasDemoPortfolio";
import { calculateBusinessLoan } from "../pcaf/businessLoans";
import {
  buildGesReportDataset,
  gesReportFilename,
  type FinancedSourceLine,
} from "./gesReportDataset";
import { renderGesExcel } from "./exportGesExcel";
import { renderGesPdf } from "./exportGesPdf";
import { renderGesPptx } from "./exportGesPptx";
import { planExecutiveSlides } from "./gesReportSlides";

const classicBilan = {
  totalEmissions: 1_500_000,
  scope1: 400_000,
  scope2: 300_000,
  scope3: 800_000,
  breakdown: [],
  detailedBreakdown: [
    { category: "Énergie", subcategory: "Gaz", emissions: 400_000, scope: 1 as const, dataQuality: "real" as const, quantity: 100, unit: "MWh", emissionFactor: 0.2, emissionFactorUnit: "t/MWh", emissionFactorSource: "Base ADEME" },
    { category: "Énergie", subcategory: "Électricité", emissions: 300_000, scope: 2 as const, dataQuality: "real" as const },
    { category: "Achats", subcategory: "Services", emissions: 200_000, scope: 3 as const, dataQuality: "estimated" as const },
    { category: "Investissements", subcategory: "cat15_equity", emissions: 600_000, scope: 3 as const, dataQuality: "default" as const },
  ],
};

function atlasLines(): FinancedSourceLine[] {
  return [
    ...ATLAS_COUNTERPARTIES.map((row) => ({
      name: row.name,
      sector: row.sectorLabel,
      result: calculateBusinessLoan(row.input),
    })),
    {
      name: "Immeuble non implémenté",
      sector: "Immobilier",
      result: calculateBusinessLoan({
        assetClass: "commercial_real_estate",
        listing: "unlisted",
        currency: "TND",
        reportingYear: 2025,
        outstandingAmount: 9_999_999,
      }),
    },
  ];
}

async function cell(bytes: Uint8Array, sheetName: string, label: string) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(Buffer.from(bytes));
  const sheet = workbook.getWorksheet(sheetName);
  if (!sheet) throw new Error(`Onglet manquant ${sheetName}`);
  let found: ExcelJS.CellValue | undefined;
  sheet.eachRow((row) => {
    if (row.getCell(1).value === label) found = row.getCell(2).value;
  });
  return found;
}

describe("rapport GES — entreprise", () => {
  const dataset = buildGesReportDataset({
    organizationName: "Atelier Nord",
    year: 2025,
    perimeterLabel: "Périmètre consolidé",
    financialInstitution: false,
    includeFinancedEmissions: false,
    currency: "EUR",
    bilan: classicBilan,
  });

  it("retire la catégorie 15 du total opérationnel et n'ajoute pas de PCAF", () => {
    expect(dataset.operational.totalT).toBe(900);
    expect(dataset.operational.scope1T).toBe(400);
    expect(dataset.operational.scope2T).toBe(300);
    expect(dataset.operational.scope3T).toBe(200);
    expect(dataset.operational.excludedCategory15T).toBe(600);
    expect(dataset.operational.totalT).not.toBe(1500);
    expect(dataset.financed).toBeNull();
    expect(dataset.operational.lines.map((line) => line.subcategory)).not.toContain("cat15_equity");
  });

  it("produit trois fichiers valides avec les mêmes totaux", async () => {
    const pdf = renderGesPdf(dataset);
    const pptx = await renderGesPptx(dataset);
    const xlsx = await renderGesExcel(dataset);
    expect(Buffer.from(pdf).subarray(0, 4).toString()).toBe("%PDF");
    expect(Buffer.from(pptx).subarray(0, 2).toString()).toBe("PK");
    expect(await cell(xlsx, "01_Synthese", "Empreinte opérationnelle")).toBe(900);
    expect(await cell(xlsx, "01_Synthese", "Scope 3 hors catégorie 15")).toBe(200);
    expect((await new ExcelJS.Workbook().xlsx.load(Buffer.from(xlsx))).getWorksheet("10_PCAF_Synthese")).toBeUndefined();
    const titles = planExecutiveSlides(dataset).map((slide) => slide.id);
    expect(titles).not.toContain("pcaf");
    expect(titles).not.toContain("actions");
    expect(gesReportFilename("Atelier Nord", 2025, "pdf")).toBe("CarboScan_Atelier-Nord_2025_Rapport-GES.pdf");
    expect(gesReportFilename("Atelier Nord", 2025, "pptx")).toBe("CarboScan_Atelier-Nord_2025_Presentation-GES.pptx");
    expect(gesReportFilename("Atelier Nord", 2025, "xlsx")).toBe("CarboScan_Atelier-Nord_2025_Donnees-GES.xlsx");
  });
});

describe("rapport GES — institution financière", () => {
  const dataset = buildGesReportDataset({
    organizationName: "Banque Atlas",
    year: 2025,
    perimeterLabel: "Périmètre consolidé",
    financialInstitution: true,
    includeFinancedEmissions: true,
    currency: "TND",
    bilan: classicBilan,
    financedLines: atlasLines(),
  });

  it("garde l'empreinte et le PCAF séparés, sans valeur inventée", async () => {
    expect(dataset.operational.totalT).toBe(900);
    expect(dataset.financed).not.toBeNull();
    const financed = dataset.financed!;
    expect(financed.exposure).toBe(325_300_000);
    expect(financed.currency).toBe("TND");
    expect(financed.scope12T).toBeCloseTo(129_138, 0);
    expect(financed.scope3T).toBeCloseTo(46_295, 0);
    expect(financed.scope12Score).toBeCloseTo(2.63, 2);
    expect(financed.scope3Score).toBeCloseTo(3.02, 2);
    expect(financed.scope12Lines).toBe(12);
    expect(financed.scope3Lines).toBe(11);
    expect(financed.notImplementedClasses).toContain("commercial_real_estate");
    const ghost = financed.exposures.find((row) => row.counterparty === "Immeuble non implémenté");
    expect(ghost?.implemented).toBe(false);
    expect(ghost?.financedScope12T).toBeNull();
    expect(ghost?.exposure).toBeNull();
    const summed12 = financed.exposures.reduce((sum, row) => sum + (row.financedScope12T ?? 0), 0);
    const summed3 = financed.exposures.reduce((sum, row) => sum + (row.financedScope3T ?? 0), 0);
    expect(summed12).toBeCloseTo(financed.scope12T, 0);
    expect(summed3).toBeCloseTo(financed.scope3T, 0);
    expect(dataset.operational.totalT + financed.scope12T + financed.scope3T).not.toBe(dataset.operational.totalT);

    const xlsx = await renderGesExcel(dataset);
    expect(await cell(xlsx, "01_Synthese", "Empreinte opérationnelle")).toBe(900);
    expect(await cell(xlsx, "10_PCAF_Synthese", "Émissions financées Scope 1+2")).toBe(financed.scope12T);
    expect(await cell(xlsx, "10_PCAF_Synthese", "Émissions financées Scope 3")).toBe(financed.scope3T);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(Buffer.from(xlsx));
    expect(workbook.getWorksheet("11_PCAF_Expositions")).toBeDefined();
    expect(workbook.getWorksheet("12_PCAF_Methodes")).toBeDefined();
    expect(workbook.getWorksheet("13_PCAF_Qualite")).toBeDefined();

    const slides = planExecutiveSlides(dataset);
    expect(slides.map((slide) => slide.id)).toEqual(expect.arrayContaining(["pcaf", "sectors", "pcaf-quality", "counterparties"]));
    expect(slides.every((slide) => slide.message.trim().length > 0)).toBe(true);
    const pptx = await renderGesPptx(dataset);
    const names = Buffer.from(pptx).toString("latin1").match(/ppt\/slides\/slide\d+\.xml/g) ?? [];
    expect(new Set(names).size).toBe(slides.length);
    expect(Buffer.from(renderGesPdf(dataset)).subarray(0, 4).toString()).toBe("%PDF");
    expect(gesReportFilename("Banque Atlas", 2025, "pdf")).toBe("CarboScan_Banque-Atlas_2025_Rapport-GES.pdf");
  });

  it("n'affiche pas de total opérationnel si la catégorie 15 ne peut pas être isolée", async () => {
    const opaque = buildGesReportDataset({
      organizationName: "Banque Atlas",
      year: 2025,
      perimeterLabel: "Périmètre consolidé",
      financialInstitution: true,
      includeFinancedEmissions: true,
      currency: "TND",
      bilan: {
        totalEmissions: 7_865_000,
        scope1: 2_000_000,
        scope2: 2_460_000,
        scope3: 3_405_000,
        breakdown: [{ category: "Scope 3", emissions: 3_405_000, percentage: 43 }],
        detailedBreakdown: [
          { category: "Énergie", subcategory: "Gaz", emissions: 2_000_000, scope: 1 as const },
          { category: "Énergie", subcategory: "Électricité", emissions: 2_460_000, scope: 2 as const },
          { category: "Scope 3", subcategory: "Scope 3", emissions: 3_405_000, scope: 3 as const },
        ],
      },
      financedLines: atlasLines(),
    });

    expect(opaque.operational.determinable).toBe(false);
    expect(opaque.operational.totalT).toBeNull();
    expect(opaque.operational.scope3T).toBeNull();
    expect(opaque.operational.excludedCategory15T).toBeNull();
    expect(opaque.operational.status).toBe(
      "Total opérationnel non déterminable — ventilation Scope 3 insuffisante",
    );
    expect(opaque.operational.missingData.join(" ")).toMatch(/catégorie 15/);
    expect(opaque.operational.posts).toEqual([]);
    expect(opaque.financed?.scope12T).toBeCloseTo(129_138, 0);

    const xlsx = await renderGesExcel(opaque);
    expect(await cell(xlsx, "01_Synthese", "Empreinte opérationnelle")).toBeNull();
    expect(await cell(xlsx, "01_Synthese", "Scope 3 hors catégorie 15")).toBeNull();
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(Buffer.from(xlsx));
    const synthesis = workbook.getWorksheet("01_Synthese");
    let note = "";
    synthesis?.eachRow((row) => {
      if (row.getCell(1).value === "Empreinte opérationnelle") note = String(row.getCell(4).value ?? "");
    });
    expect(note).toContain("ventilation Scope 3 insuffisante");
    const slides = planExecutiveSlides(opaque).map((slide) => slide.id);
    expect(slides).toContain("operational-gap");
    expect(slides).not.toContain("scopes");
    expect(slides).not.toContain("footprint");
  });
});
