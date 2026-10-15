import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { analyze } from "./analyze.js";
import { ateliersDuSahel } from "./fixtures/ateliersDuSahel.js";
import { assertReportProse } from "./proseGuard.js";
import { buildReductionPlan } from "./recommendations.js";
import { DEFAULT_ANALYSIS_OPTIONS, type ReportData } from "./types.js";

describe("recommandations et plan d'action", () => {
  const analysis = analyze(ateliersDuSahel, DEFAULT_ANALYSIS_OPTIONS);
  const plan = buildReductionPlan(analysis);

  it("couvre les quatre postes significatifs dans l'ordre du moteur", () => {
    const significant = plan.filter((item) => item.significant);
    assert.deepEqual(
      significant.map((item) => item.postLabel),
      ["Achats de biens et services", "Électricité, usine", "Gaz naturel, usine", "Transport amont"],
    );
    assert.deepEqual(
      significant.map((item) => [item.emissionsTonnes, item.shareDisplayPct]),
      [
        ["820", "30.3"],
        ["758.35", "28.1"],
        ["370.08", "13.7"],
        ["204", "7.5"],
      ],
    );
    assert.equal(analysis.totalTonnes, "2702.107");
  });

  it("classe le proxy, le scénario, l'absence de levier et le jeu fictif", () => {
    const byId = Object.fromEntries(plan.map((item) => [item.id, item]));
    const purchases = byId["reco-purchases"];
    const electricity = byId["reco-elec-sfax"];
    const gas = byId["reco-gas-sfax"];
    const freight = byId["reco-freight-up"];
    assert.equal(purchases?.basis, "justifiee");
    assert.equal(purchases?.priority, "Haute");
    assert.equal(purchases?.potentialTonnes, null);
    assert.match(purchases?.prose ?? "", /820/);
    assert.match(purchases?.prose ?? "", /30,3/);
    assert.equal(electricity?.basis, "conditionnelle");
    assert.equal(electricity?.priority, "Haute");
    assert.equal(electricity?.potentialTonnes, analysis.actions.find((action) => action.id === "elec-contract")?.potentialTonnes);
    assert.doesNotMatch(electricity?.prose ?? "", /photovoltaïque|chaudière|budget/);
    assert.equal(gas?.basis, "conditionnelle");
    assert.equal(gas?.priority, "Moyenne");
    assert.equal(gas?.potentialTonnes, null);
    assert.equal(gas?.horizon, "Non fixé");
    assert.match(gas?.prose ?? "", /370,08/);
    assert.doesNotMatch(gas?.prose ?? "", /chaudière|photovoltaïque|budget/);
    assert.equal(freight?.basis, "justifiee");
    assert.equal(freight?.priority, "Basse");
    assert.equal(freight?.factorTime, "jeu_fictif");
    assert.equal(freight?.potentialTonnes, null);
    assert.match(freight?.prose ?? "", /démonstration/);
    assert.doesNotMatch(freight?.prose ?? "", /postérieur/);
  });

  it("ne crée pas de gain hors hypothèse et ne désigne pas de responsable", () => {
    const quantified = new Set(
      analysis.actions.filter((action) => action.quantified && action.potentialTonnes).map((action) => action.potentialTonnes),
    );
    for (const item of plan) {
      assert.equal(item.owner, "À désigner");
      if (item.potentialTonnes !== null) assert.equal(quantified.has(item.potentialTonnes), true);
    }
    const refrigerant = plan.find((item) => item.id === "reco-refrigerant-leaks");
    assert.equal(refrigerant?.significant, false);
    assert.equal(refrigerant?.priority, "Basse");
    assert.equal(refrigerant?.potentialTonnes, analysis.actions.find((action) => action.id === "refrigerant-leaks")?.potentialTonnes);
    assert.equal(plan.filter((item) => item.potentialTonnes !== null).length, 2);
  });

  it("retire le scénario d'électricité quand aucune fiche n'est enregistrée", () => {
    const data: ReportData = { ...ateliersDuSahel, actions: [] };
    const bare = buildReductionPlan(analyze(data, DEFAULT_ANALYSIS_OPTIONS));
    const electricity = bare.find((item) => item.id === "reco-elec-sfax");
    assert.equal(electricity?.potentialTonnes, null);
    assert.equal(electricity?.priority, "Moyenne");
    assert.equal(electricity?.horizon, "Non fixé");
    assert.doesNotMatch(electricity?.prose ?? "", /photovoltaïque/);
    assert.equal(bare.some((item) => item.id === "reco-refrigerant-leaks"), false);
    const model = assertReportProse(data);
    assert.match(model.sections.find((section) => section.id === "plan-action")?.blocks.map((block) => JSON.stringify(block)).join("\n") ?? "", /Aucune action de réduction/);
  });

  it("reste vide sans poste significatif et sans fiche", () => {
    const data: ReportData = { ...ateliersDuSahel, lines: [], actions: [] };
    assert.deepEqual(buildReductionPlan(analyze(data, DEFAULT_ANALYSIS_OPTIONS)), []);
    const model = assertReportProse(data);
    assert.equal(model.sections.find((section) => section.id === "recommandations")?.number, "08");
    assert.equal(model.sections.find((section) => section.id === "plan-action")?.number, "09");
  });

  it("donne la priorité au jeu fictif même si une hypothèse chiffrée existe", () => {
    const data: ReportData = {
      ...ateliersDuSahel,
      actions: [
        {
          id: "demo-gain",
          title: "Transport fictif",
          text: "une part du transport amont baisse dans le scénario seulement.",
          horizon: "Non fixé",
          indicator: "Facteur remplacé",
          hypothesis: { kind: "share_of_line", lineId: "freight-up", share: "0.25" },
        },
      ],
    };
    const freight = buildReductionPlan(analyze(data, DEFAULT_ANALYSIS_OPTIONS)).find((item) => item.id === "reco-freight-up");
    assert.equal(freight?.factorTime, "jeu_fictif");
    assert.equal(freight?.potentialTonnes, null);
    assert.equal(freight?.priority, "Basse");
  });
});
