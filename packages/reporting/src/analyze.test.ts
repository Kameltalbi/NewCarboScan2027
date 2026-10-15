import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { analyze } from "./analyze.js";
import { ateliersDuSahel } from "./fixtures/ateliersDuSahel.js";
import { assertReportProse, proseOf } from "./proseGuard.js";
import { DEFAULT_ANALYSIS_OPTIONS, type ReportData } from "./types.js";
import { buildViewModel } from "./viewModel.js";

function clone(patch?: (data: ReportData) => void): ReportData {
  const data = structuredClone(ateliersDuSahel);
  patch?.(data);
  return data;
}

describe("jeu Ateliers du Sahel", () => {
  const analysis = analyze(ateliersDuSahel, DEFAULT_ANALYSIS_OPTIONS);

  it("somme les postes inclus sans transformer une absence en zéro", () => {
    assert.equal(analysis.totalKgCo2e, "2702107");
    assert.equal(analysis.totalTonnes, "2702.107");
    assert.equal(analysis.scopes.map((scope) => scope.share?.displayPct).join(","), "22.3,31.7,46.0");
    assert.equal(analysis.scopeShareSumDisplayPct, "100.0");
    assert.equal(analysis.zeros[0]?.id, "domestic-fuel");
    assert.equal(analysis.zeros[0]?.kgCo2e, "0");
  });

  it("qualifie les postes avec le seuil fourni", () => {
    assert.deepEqual(analysis.significant.map((line) => line.id), ["purchases", "elec-sfax", "gas-sfax", "freight-up"]);
    assert.deepEqual(
      analysis.significant.map((line) => [line.tonnes, line.share.displayPct, line.cumulative.displayPct, line.factorTime]),
      [
        ["820", "30.3", "30.3", "posterieur"],
        ["758.35", "28.1", "58.4", "posterieur"],
        ["370.08", "13.7", "72.1", "posterieur"],
        ["204", "7.5", "79.7", "jeu_fictif"],
      ],
    );
    const core = analysis.ranked.filter((line) => line.factorSource === "Core TN");
    assert.ok(core.some((line) => !line.significant));
    assert.ok(core.every((line) => line.factorTime === "posterieur"));
    const stricter = analyze(ateliersDuSahel, { ...DEFAULT_ANALYSIS_OPTIONS, significantShareMin: "0.20" });
    assert.deepEqual(stricter.significant.map((line) => line.id), ["purchases", "elec-sfax"]);
  });

  it("calcule les intensités et refuse un dénominateur nul", () => {
    assert.equal(analysis.intensities.find((item) => item.id === "employees")?.display, "14.527");
    assert.equal(analysis.intensities.find((item) => item.id === "revenue")?.display, "63.579");
    assert.equal(analysis.intensities.find((item) => item.id === "production")?.display, "146.854");
    assert.equal(analysis.intensities.find((item) => item.id === "employees")?.executiveDisplay, "14.5");
    assert.equal(analysis.intensities.find((item) => item.id === "revenue")?.executiveDisplay, "63.6");
    assert.equal(analysis.intensities.find((item) => item.id === "production")?.executiveDisplay, "146.9");
    const missing = analyze(clone((data) => {
      data.denominators[0].value = null;
    }), DEFAULT_ANALYSIS_OPTIONS);
    assert.equal(missing.intensities[0]?.status, "not_available");
    const zero = analyze(clone((data) => {
      data.denominators[0].value = "0";
    }), DEFAULT_ANALYSIS_OPTIONS);
    assert.equal(zero.intensities[0]?.status, "not_available");
    assert.equal(zero.intensities[0]?.display, null);
  });

  it("ne produit pas de taux si la comparaison est absente ou le total précédent est nul", () => {
    assert.equal(analysis.comparison.rateDisplayPct, "-6.9");
    const absent = analyze(clone((data) => {
      data.comparison.status = "not_available";
      data.comparison.priorTotalKgCo2e = null;
    }), DEFAULT_ANALYSIS_OPTIONS);
    assert.equal(absent.comparison.rateDisplayPct, null);
    const priorZero = analyze(clone((data) => {
      data.comparison.priorTotalKgCo2e = "0";
    }), DEFAULT_ANALYSIS_OPTIONS);
    assert.equal(priorZero.comparison.status, "rate_not_available");
  });

  it("laisse un scope sans ligne au statut non évalué", () => {
    const data = clone((draft) => {
      draft.actions = draft.actions.filter((action) => action.hypothesis?.lineId !== "elec-sfax");
      draft.lines = draft.lines.map((line) =>
        line.scope === 2
          ? { ...line, inclusion: "not_reported", quantity: null, factorValue: null, resultKgCo2e: null, dataQuality: null }
          : line,
      );
    });
    const result = analyze(data, DEFAULT_ANALYSIS_OPTIONS);
    assert.equal(result.scopes[1]?.status, "not_reported");
    assert.equal(result.scopes[1]?.kgCo2e, null);
    assert.notEqual(result.totalKgCo2e, analysis.totalKgCo2e);
  });

  it("rejette une ligne dont le résultat ne vaut pas quantité × facteur", () => {
    const data = clone((draft) => {
      draft.lines[0].resultKgCo2e = "1";
    });
    assert.throws(() => analyze(data, DEFAULT_ANALYSIS_OPTIONS), /gas-sfax/);
  });

  it("n'accepte dans le texte que des nombres présents dans les faits", () => {
    const model = assertReportProse();
    assert.equal(model.sections.map((section) => section.id).includes("recommandations"), true);
    assert.equal(model.sections.map((section) => section.id).includes("plan-action"), true);
    assert.deepEqual(
      model.sections.map((section) => section.number),
      ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12", "13", "A"],
    );
    const postes = model.sections.find((section) => section.id === "postes");
    const texts = postes?.blocks.flatMap((block) => (block.type === "paragraphs" ? block.items.map((item) => item.text) : [])) ?? [];
    const joined = texts.join("\n");
    assert.equal(texts.filter((text) => text.includes("n'est pas démontrée")).length, 1);
    assert.match(joined, /820/);
    assert.match(joined, /58,4/);
    assert.match(joined, /Facteur de démonstration/);
    const freight = texts.find((text) => text.includes("Transport amont")) ?? "";
    assert.match(freight, /démonstration/);
    assert.doesNotMatch(freight, /postérieur/);
    assert.doesNotMatch(joined, /figurent dans le tableau|Aucun site n'est indiqué|antérieur|contemporain/);
    const scopes = model.sections.find((section) => section.id === "scopes");
    assert.equal(scopes?.number, "06");
    assert.equal(postes?.number, "07");
    assert.equal(model.sections.find((section) => section.id === "recommandations")?.number, "08");
    assert.equal(model.sections.find((section) => section.id === "plan-action")?.number, "09");
  });

  it("garde les chapitres visibles quand le plan et la comparaison sont absents", () => {
    const data = clone((draft) => {
      draft.actions = [];
      draft.comparison.status = "not_available";
      draft.comparison.priorYear = null;
      draft.comparison.priorTotalKgCo2e = null;
    });
    const model = assertReportProse(data);
    assert.equal(model.sections.some((section) => section.id === "recommandations"), true);
    assert.equal(model.sections.some((section) => section.id === "plan-action"), true);
    assert.equal(model.sections.at(-1)?.number, "A");
    assert.equal(proseOf(model).includes("2024"), false);
    assert.match(proseOf(model), /Aucune action de réduction/);
  });
});
