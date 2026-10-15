import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { d } from "@newcarboscan/carbon-engine";
import { analyze } from "../analyze.js";
import { buildNarrativeBriefs } from "../ai/brief.js";
import { ateliersDuSahel } from "../fixtures/ateliersDuSahel.js";
import { exact } from "../format.js";
import { CHAPTER6_DRAFT_MODELS, PILOT_MODELS } from "./catalog.js";
import { loadPilotModels } from "./load.js";
import { buildChapter6Preview } from "./preview.js";
import { selectChapter6Preview, selectForReport } from "./select.js";
import { DEFAULT_ANALYSIS_OPTIONS, type ActivityLine, type ReportData } from "../types.js";

const options = DEFAULT_ANALYSIS_OPTIONS;

function run(data: ReportData) {
  const analysis = analyze(data, options);
  return { analysis, selections: selectForReport(data, analysis) };
}

function code(selections: ReturnType<typeof selectForReport>, slot: string) {
  return selections.find((item) => item.slotKey === slot);
}

function scaleScopes(data: ReportData, factors: Partial<Record<1 | 2 | 3, string>>): ReportData {
  return {
    ...data,
    lines: data.lines.map((line) => scaleLine(line, factors[line.scope])),
  };
}

function scaleLine(line: ActivityLine, factor: string | undefined): ActivityLine {
  if (!factor || line.inclusion !== "included" || line.quantity == null || line.factorValue == null) return line;
  const quantity = exact(d(line.quantity).mul(d(factor)));
  return { ...line, quantity, resultKgCo2e: exact(d(quantity).mul(d(line.factorValue))) };
}

describe("bibliothèque rédactionnelle", () => {
  it("sélectionne le scope 1 et le poste documenté pour une industrie", () => {
    const data = scaleScopes(
      { ...ateliersDuSahel, company: { ...ateliersDuSahel.company, sector: "Industrie manufacturière" } },
      { 2: "0.01", 3: "0.01" },
    );
    const { selections } = run(data);
    const executive = code(selections, "executive");
    assert.equal(executive?.code, "EXEC_SCOPE1_DOMINANT");
    assert.equal(executive?.version, 1);
    assert.match(executive?.rendered ?? "", /émissions directes/);
    assert.doesNotMatch(executive?.rendered ?? "", /électricité/);
    const dominant = selections.find((item) => item.code === "POST_DOMINANT_RELIABLE");
    assert.ok(dominant);
    assert.match(dominant.rule, /Premier poste/);
    assert.equal(dominant.variables.poste, "Gaz naturel, usine");
  });

  it("sélectionne le scope 2 sans inventer d'usage électrique", () => {
    const data = scaleScopes(
      { ...ateliersDuSahel, company: { ...ateliersDuSahel.company, sector: "Services tertiaires" } },
      { 1: "0.01", 3: "0.01" },
    );
    const { selections } = run(data);
    const executive = code(selections, "executive");
    assert.equal(executive?.code, "EXEC_SCOPE2_DOMINANT");
    assert.match(executive?.rendered ?? "", /Location-based/);
    assert.match(executive?.rendered ?? "", /Aucun usage, aucun équipement et aucun profil de charge ne sont déduits/);
    assert.equal(code(selections, "post-elec-sfax")?.code, "POST_DOMINANT_RELIABLE");
  });

  it("approfondit les achats quand le scope 3 domine", () => {
    const data = { ...ateliersDuSahel, company: { ...ateliersDuSahel.company, sector: "Commerce de gros" } };
    const { selections } = run(data);
    assert.equal(code(selections, "executive")?.code, "EXEC_SCOPE3_DOMINANT");
    assert.equal(code(selections, "post-purchases")?.code, "POST_DOMINANT_UNCERTAIN");
    assert.notEqual(code(selections, "post-elec-sfax")?.code, "POST_DOMINANT_UNCERTAIN");
    assert.equal(code(selections, "post-elec-sfax")?.code, "POST_SECONDARY");
    assert.match(code(selections, "post-purchases")?.rendered ?? "", /proxy monétaire/);
  });

  it("n'attribue pas zéro à une catégorie non quantifiée", () => {
    const { selections } = run(ateliersDuSahel);
    const gap = code(selections, "lacune-capital-goods");
    assert.equal(gap?.code, "POST_UNQUANTIFIED");
    assert.match(gap?.rendered ?? "", /n'est pas une émission nulle/);
    assert.equal(gap?.rendered?.includes("0"), false);
    assert.equal(code(selections, "perimetre-heat")?.code, null);
    assert.match(code(selections, "perimetre-heat")?.limits.join(" ") ?? "", /n'est pas convertie en émission nulle/);
  });

  it("empêche de lire une variation quand les périmètres diffèrent", () => {
    const data: ReportData = {
      ...ateliersDuSahel,
      comparison: {
        status: "not_comparable",
        priorYear: 2024,
        priorTotalKgCo2e: "2902400",
        categories: "not_available",
        basis: "Les périmètres des deux exercices diffèrent.",
      },
    };
    const trend = code(run(data).selections, "evolution");
    assert.equal(trend?.code, "TREND_NOT_COMPARABLE");
    assert.match(trend?.rendered ?? "", /n'est pas une réduction/);
    assert.match(trend?.rendered ?? "", /périmètres des deux exercices diffèrent/);
  });

  it("signale les estimations quand elles pèsent autant que les autres classes", () => {
    const data: ReportData = {
      ...ateliersDuSahel,
      lines: ateliersDuSahel.lines.map((line) => (line.inclusion === "included" ? { ...line, dataQuality: "estimated" } : line)),
    };
    const quality = code(run(data).selections, "qualite");
    assert.equal(quality?.code, "DATA_ESTIMATED");
    assert.match(quality?.rendered ?? "", /pas un intervalle de confiance/);
    assert.equal(code(run(ateliersDuSahel).selections, "qualite")?.code, null);
  });

  it("conserve les résultats des Ateliers du Sahel", () => {
    const analysis = analyze(ateliersDuSahel, options);
    assert.equal(analysis.totalTonnes, "2702.107");
    assert.equal(analysis.scopes[0]?.tonnes, "603.032");
    assert.equal(analysis.scopes[1]?.tonnes, "855.628");
    assert.equal(analysis.scopes[2]?.tonnes, "1243.447");
    const selections = selectForReport(ateliersDuSahel, analysis);
    assert.equal(code(selections, "executive")?.code, "EXEC_SCOPE3_DOMINANT");
    assert.equal(code(selections, "evolution")?.code, "TREND_NOT_COMPARABLE");
    const briefs = buildNarrativeBriefs(ateliersDuSahel, analysis);
    assert.equal(briefs.executive.dossier.modeleReference && (briefs.executive.dossier.modeleReference as { code: string }).code, "EXEC_SCOPE3_DOMINANT");
    assert.equal(analysis.totalTonnes, "2702.107");
  });

  it("signale un modèle désactivé sans le remplacer par un autre scope", () => {
    const catalog = PILOT_MODELS.map((model) =>
      model.code === "EXEC_SCOPE3_DOMINANT" ? { ...model, status: "deprecated" as const } : model,
    );
    const executive = code(selectForReport(ateliersDuSahel, analyze(ateliersDuSahel, options), catalog), "executive");
    assert.equal(executive?.code, null);
    assert.match(executive?.insuffisance ?? "", /deprecated/);
  });

  it("signale l'absence de modèle quand aucun scope n'est évalué", () => {
    const data: ReportData = { ...ateliersDuSahel, lines: [], actions: [] };
    const executive = code(run(data).selections, "executive");
    assert.equal(executive?.code, null);
    assert.match(executive?.insuffisance ?? "", /Aucun modèle de synthèse/);
  });

  it("bascule sur le catalogue embarqué si la base est indisponible", async () => {
    const loaded = await loadPilotModels(async () => {
      throw new Error("ECONNREFUSED");
    });
    assert.equal(loaded.source, "catalogue-embarque");
    assert.match(loaded.reason ?? "", /indisponible/);
    assert.equal(loaded.models.length, 10);
  });

  it("retrouve les dix modèles dans la migration additive", () => {
    const sql = readFileSync(new URL("../../../../db/migrations/052_report_paragraph_library.sql", import.meta.url), "utf8");
    for (const model of PILOT_MODELS) {
      assert.equal(sql.includes(model.code), true, model.code);
      assert.equal(sql.includes(model.body), true, model.code);
    }
    assert.equal(sql.includes("CREATE TABLE"), false);
    assert.equal(sql.includes("DROP TABLE"), false);
    assert.equal(sql.includes("DELETE FROM"), false);
  });
});

describe("brouillons CH06", () => {
  it("garde les dix modèles actifs hors de la prévisualisation", () => {
    assert.equal(PILOT_MODELS.length, 10);
    assert.equal(PILOT_MODELS.some((model) => model.code.startsWith("CH06")), false);
    assert.deepEqual(CHAPTER6_DRAFT_MODELS.map((model) => model.status), ["draft", "draft", "draft"]);
    const { selections } = run(ateliersDuSahel);
    assert.equal(code(selections, "post-purchases")?.code, "POST_DOMINANT_UNCERTAIN");
    assert.equal(selections.some((item) => item.code?.startsWith("CH06")), false);
  });

  it("propose M01 pour un poste dominant fiable", () => {
    const data = scaleScopes(ateliersDuSahel, { 2: "0.01", 3: "0.01" });
    const selections = selectChapter6Preview(data, analyze(data, options));
    const dominant = selections.find((item) => item.slotKey === "post-gas-sfax");
    assert.equal(dominant?.code, "CH06-M01");
    assert.equal(dominant?.version, 1);
    assert.match(dominant?.rendered ?? "", /Gaz naturel, usine/);
    assert.match(dominant?.rendered ?? "", /Sfax/);
    assert.doesNotMatch(dominant?.rendered ?? "", /\{[a-zA-Z]+\}/);
    assert.doesNotMatch(dominant?.rendered ?? "", /proxy monétaire|estimée/);
    assert.equal(selections.filter((item) => item.code === "CH06-M01" || item.code === "CH06-M02").length, 1);
  });

  it("propose M02 pour un poste dominant estimé ou monétaire", () => {
    const selections = selectChapter6Preview(ateliersDuSahel, analyze(ateliersDuSahel, options));
    const dominant = codePreview(selections, "post-purchases");
    assert.equal(dominant?.code, "CH06-M02");
    assert.match(dominant?.rendered ?? "", /proxy monétaire/);
    assert.match(dominant?.rendered ?? "", /priorité de collecte/);
    assert.doesNotMatch(dominant?.rendered ?? "", /\{[a-zA-Z]+\}|mesure physique manquante/);
    assert.equal(selections.filter((item) => item.slotKey.startsWith("post-") && item.code).length, 1);
    assert.equal(codePreview(selections, "post-elec-sfax"), undefined);
    assert.equal(codePreview(selections, "post-gas-sfax"), undefined);
    const estimatedModeled = retitle(ateliersDuSahel, "purchases", { method: "modeled" });
    const modeledEstimated = codePreview(selectChapter6Preview(estimatedModeled, analyze(estimatedModeled, options)), "post-purchases");
    assert.equal(modeledEstimated?.code, "CH06-M02");
    assert.match(modeledEstimated?.rendered ?? "", /n'est pas une mesure primaire/);
  });

  it("ne dirige pas un poste seulement modélisé vers M02", () => {
    const data = retitle(ateliersDuSahel, "purchases", { method: "modeled", dataQuality: "primary" });
    const selections = selectChapter6Preview(data, analyze(data, options));
    const dominant = codePreview(selections, "post-purchases");
    assert.equal(dominant?.code, null);
    assert.equal(dominant?.rendered, null);
    assert.match(dominant?.insuffisance ?? "", /ne s'applique/);
    assert.equal(selections.some((item) => item.code === "CH06-M02"), false);
    assert.equal(codePreview(selections, "lacune-capital-goods")?.code, "CH06-M05");
  });

  it("propose M05 sans qualifier une catégorie non évaluée", () => {
    const selections = selectChapter6Preview(ateliersDuSahel, analyze(ateliersDuSahel, options));
    const gap = codePreview(selections, "lacune-capital-goods");
    assert.equal(gap?.code, "CH06-M05");
    assert.equal(gap?.version, 1);
    assert.match(gap?.rendered ?? "", /n'est pas une émission nulle/);
    assert.doesNotMatch(gap?.rendered ?? "", /\{[a-zA-Z]+\}|significative|\b0\b/);
    assert.equal(selections.some((item) => item.slotKey === "perimetre-franchises"), false);
    assert.equal(selections.some((item) => item.slotKey === "perimetre-heat"), false);
  });

  it("n'imprime rien quand aucune condition n'est remplie", () => {
    const data = closeGaps(retitle(ateliersDuSahel, "purchases", { method: "modeled", dataQuality: "primary" }));
    const selections = selectChapter6Preview(data, analyze(data, options));
    assert.equal(selections.every((item) => item.rendered === null), true);
    assert.equal(selections.some((item) => item.code), false);
  });

  it("compare le texte actuel et le brouillon sans activer le modèle", () => {
    const preview = buildChapter6Preview(ateliersDuSahel);
    assert.equal(preview.activated, false);
    const prose = JSON.stringify(preview.model);
    assert.match(prose, /méthode proxy monétaire/);
    assert.match(prose, /priorité de collecte/);
    assert.match(prose, /Biens d'équipement/);
    assert.equal(preview.selections.filter((item) => item.code === "CH06-M02").length, 1);
    assert.equal(preview.selections.filter((item) => item.code === "CH06-M05").length, 2);
    const published = run(ateliersDuSahel).selections;
    assert.equal(published.some((item) => String(item.code).startsWith("CH06")), false);
  });

  it("retrouve les brouillons dans la migration additive", () => {
    const sql = readFileSync(new URL("../../../../db/migrations/053_report_paragraph_ch06_drafts.sql", import.meta.url), "utf8");
    for (const model of CHAPTER6_DRAFT_MODELS) {
      assert.equal(sql.includes(model.code), true, model.code);
      assert.equal(sql.includes(model.body), true, model.code);
    }
    assert.equal(sql.includes("'draft'"), true);
    assert.equal(sql.includes("CREATE TABLE"), false);
    assert.equal(sql.includes("DROP TABLE"), false);
    assert.equal(sql.includes("DELETE FROM"), false);
    assert.equal(sql.includes("'active'"), false);
  });
});

function codePreview(selections: ReturnType<typeof selectChapter6Preview>, slot: string) {
  return selections.find((item) => item.slotKey === slot);
}

function retitle(data: ReportData, id: string, patch: Partial<ActivityLine>): ReportData {
  return { ...data, lines: data.lines.map((line) => (line.id === id ? { ...line, ...patch } : line)) };
}

function closeGaps(data: ReportData): ReportData {
  return {
    ...data,
    boundary: data.boundary.map((item) => (item.status === "not_reported" ? { ...item, status: "excluded" } : item)),
  };
}
