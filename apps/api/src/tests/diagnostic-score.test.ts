import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { FREE_BILAN_FACTOR_PACK } from "../services/freeBilan.js";
import { AXES, MATURITY_BANDS, QUESTIONS, RECOMMENDATIONS } from "../services/diagnostic/catalog.js";
import { evaluateDiagnostic } from "../services/diagnostic/engine.js";
import { DIAGNOSTIC_TEMPLATE_VERSION, type AnswerMap, type DiagnosticAnswer } from "../services/diagnostic/types.js";

const here = dirname(fileURLToPath(import.meta.url));
const migration = readFileSync(join(here, "../../../../db/migrations/035_diagnostic_360.sql"), "utf8");

const choice = (value: string): DiagnosticAnswer => ({ kind: "choice", value });
const multi = (values: string[]): DiagnosticAnswer => ({ kind: "multi", values });
const unknown: DiagnosticAnswer = { kind: "unknown" };

function profile(partial: AnswerMap): AnswerMap {
  return {
    country: choice("TN"),
    sector: choice("services"),
    employees: choice("lt10"),
    export_status: choice("none"),
    has_fleet: choice("no"),
    has_industrial_site: choice("no"),
    ...partial,
  };
}

const scenarioA: AnswerMap = profile({
  carbon_assessment_status: choice("never"),
  carbon_owner: choice("none"),
  energy_tracking: choice("none"),
  energy_target: choice("none"),
  business_travel_tracking: choice("none"),
  purchase_data: choice("none"),
  supplier_carbon: choice("none"),
  review_cadence: choice("never"),
  reduction_target: choice("none"),
  action_plan: choice("none"),
  client_requirements: choice("none"),
  carbon_reporting: choice("none"),
});

const scenarioB: AnswerMap = profile({
  sector: choice("industry"),
  employees: choice("50_249"),
  has_industrial_site: choice("yes"),
  carbon_assessment_status: choice("regular"),
  scopes_covered: multi(["s1", "s2"]),
  assessment_data_basis: choice("measured"),
  carbon_owner: choice("named"),
  energy_tracking: choice("monthly"),
  energy_target: choice("qualitative"),
  energy_audit: choice("recent"),
  business_travel_tracking: choice("partial"),
  purchase_data: choice("by_category"),
  supplier_carbon: choice("none"),
  scope3_posture: choice("not_started"),
  reduction_target: choice("qualitative"),
  action_plan: choice("list"),
  client_requirements: choice("occasional"),
  carbon_reporting: choice("internal"),
});

const scenarioC: AnswerMap = profile({
  country: choice("EU"),
  sector: choice("industry"),
  employees: choice("ge1000"),
  has_fleet: choice("yes"),
  has_industrial_site: choice("yes"),
  carbon_assessment_status: choice("multi_year"),
  scopes_covered: multi(["s1", "s2", "s3"]),
  assessment_data_basis: choice("verified"),
  carbon_owner: choice("named"),
  energy_tracking: choice("by_site"),
  energy_target: choice("quantified"),
  energy_audit: choice("recent"),
  fleet_fuel_tracking: choice("km_and_fuel"),
  purchase_data: choice("by_supplier"),
  supplier_carbon: choice("systematic"),
  scope3_posture: choice("activity"),
  reduction_target: choice("quantified"),
  action_plan: choice("owned_budgeted"),
  client_requirements: choice("contractual"),
  carbon_reporting: choice("external"),
});

const scenarioD: AnswerMap = profile({
  sector: choice("industry"),
  employees: choice("250_999"),
  export_status: choice("goods_eu"),
  has_fleet: choice("yes"),
  has_industrial_site: choice("yes"),
  carbon_assessment_status: choice("never"),
  carbon_owner: choice("none"),
  energy_tracking: choice("none"),
  energy_target: choice("none"),
  energy_audit: choice("never"),
  fleet_fuel_tracking: choice("none"),
  purchase_data: choice("none"),
  supplier_carbon: choice("none"),
  review_cadence: choice("never"),
  reduction_target: choice("none"),
  action_plan: choice("none"),
  client_requirements: choice("contractual"),
  cbam_exposure: choice("not_examined"),
});

const scenarioE: AnswerMap = profile({
  employees: choice("10_49"),
  carbon_assessment_status: choice("never"),
  carbon_owner: choice("informal"),
  energy_tracking: choice("annual"),
  energy_target: choice("none"),
  business_travel_tracking: choice("partial"),
  purchase_data: choice("total_spend"),
  supplier_carbon: choice("none"),
  review_cadence: choice("annual"),
  reduction_target: choice("none"),
  action_plan: choice("none"),
  client_requirements: choice("none"),
  carbon_reporting: choice("none"),
});

describe("diagnostic 360 engine", () => {
  it("keeps the free bilan factor pack outside this journey", () => {
    assert.equal(FREE_BILAN_FACTOR_PACK.version, "free-bilan-2027.1");
    assert.equal(QUESTIONS.some((question) => question.code.includes("tco2")), false);
  });

  it("stays within 18 questions on the standard path and 20 at most", () => {
    const standard = evaluateDiagnostic(scenarioA);
    assert.equal(standard.shownQuestionCodes.length, 18);
    assert.equal(evaluateDiagnostic(scenarioE).shownQuestionCodes.length, 18);

    const sectors = ["services", "industry", "construction", "trade", "transport", "agrifood", "finance", "other"];
    const sizes = ["lt10", "10_49", "50_249", "250_999", "ge1000"];
    const exports = ["none", "services_non_eu", "services_eu", "goods_non_eu", "goods_eu", "both_non_eu", "both_eu"];
    const fleets = ["yes", "no"];
    const sites = ["yes", "no"];
    const assessments = ["never", "once", "regular", "multi_year", "unknown"];
    let min = Infinity;
    let max = 0;
    for (const sector of sectors) {
      for (const employees of sizes) {
        for (const exportStatus of exports) {
          for (const fleet of fleets) {
            for (const site of sites) {
              for (const assessment of assessments) {
                const result = evaluateDiagnostic(profile({
                  sector: choice(sector),
                  employees: choice(employees),
                  export_status: choice(exportStatus),
                  has_fleet: choice(fleet),
                  has_industrial_site: choice(site),
                  carbon_assessment_status: choice(assessment),
                }));
                const count = result.shownQuestionCodes.length;
                min = Math.min(min, count);
                max = Math.max(max, count);
                assert.ok(count <= 20, `${sector}/${employees}/${exportStatus}/${fleet}/${site}/${assessment} => ${count}`);
                const codes = result.shownQuestionCodes;
                assert.equal(codes.includes("fleet_fuel_tracking") && codes.includes("business_travel_tracking"), false);
                assert.equal(codes.includes("scope3_posture") && codes.includes("review_cadence"), false);
                assert.equal(codes.includes("cbam_exposure") && codes.includes("carbon_reporting"), false);
                assert.equal(codes.includes("energy_audit") && codes.includes("energy_target"), false);
                assert.equal(codes.includes("energy_audit"), site === "yes");
                assert.equal(
                  codes.includes("cbam_exposure"),
                  exportStatus === "goods_eu" || exportStatus === "both_eu",
                );
              }
            }
          }
        }
      }
    }
    assert.equal(min, 18);
    assert.equal(max, 20);
  });

  it("does not infer an industrial site or CBAM exposure from the sector", () => {
    const industryOffice = evaluateDiagnostic(profile({
      sector: choice("industry"),
      has_industrial_site: choice("no"),
      export_status: choice("services_eu"),
      carbon_assessment_status: choice("regular"),
      carbon_reporting: choice("none"),
    }));
    assert.equal(industryOffice.shownQuestionCodes.includes("energy_audit"), false);
    assert.equal(industryOffice.shownQuestionCodes.includes("energy_target"), true);
    assert.equal(industryOffice.shownQuestionCodes.includes("cbam_exposure"), false);
    assert.equal(industryOffice.internal.regulatoryPressure, false);

    const servicesWorkshop = evaluateDiagnostic(profile({
      sector: choice("services"),
      has_industrial_site: choice("yes"),
      carbon_assessment_status: choice("never"),
    }));
    assert.equal(servicesWorkshop.shownQuestionCodes.includes("energy_audit"), true);
    assert.equal(servicesWorkshop.shownQuestionCodes.includes("energy_target"), false);

    const goodsOutsideEu = evaluateDiagnostic(profile({
      sector: choice("industry"),
      has_industrial_site: choice("yes"),
      export_status: choice("goods_non_eu"),
    }));
    assert.equal(goodsOutsideEu.shownQuestionCodes.includes("cbam_exposure"), false);

    const servicesGoodsToEu = evaluateDiagnostic(profile({
      sector: choice("services"),
      export_status: choice("goods_eu"),
      cbam_exposure: choice("possible"),
    }));
    assert.equal(servicesGoodsToEu.shownQuestionCodes.includes("cbam_exposure"), true);
    assert.equal(servicesGoodsToEu.recommendations.some((item) => item.id === "cbam_verify_exposure"), true);
  });

  it("recommends checking CBAM exposure and does not assert that it applies", () => {
    const result = evaluateDiagnostic(scenarioD);
    const cbam = result.recommendations.find((item) => item.id === "cbam_verify_exposure");
    assert.ok(cbam);
    assert.equal(cbam?.titleFr, "Vérifier votre exposition au MACF");
    const text = `${cbam?.titleFr} ${cbam?.bodyFr}`;
    assert.equal(/assujett/i.test(text), false);
    assert.equal(/soumis/i.test(text), false);

    const mapped = evaluateDiagnostic({ ...scenarioD, cbam_exposure: choice("mapped") });
    assert.equal(mapped.recommendations.some((item) => item.id === "cbam_verify_exposure"), false);
    assert.equal(mapped.recommendations.some((item) => /assujett|soumis/i.test(item.titleFr + item.bodyFr)), false);
  });

  it("excludes unknown answers from maturity and counts them against data readiness", () => {
    const asZero = evaluateDiagnostic({ ...scenarioE, energy_tracking: choice("none") });
    const asUnknown = evaluateDiagnostic({ ...scenarioE, energy_tracking: unknown });
    assert.equal(asZero.maturityScore, 13);
    assert.equal(asUnknown.maturityScore, 15);
    assert.ok((asUnknown.maturityScore ?? 0) > (asZero.maturityScore ?? 0));
    assert.equal(asUnknown.dataReadinessScore, 17);
    assert.equal(evaluateDiagnostic(scenarioE).dataReadinessScore, 28);
    assert.ok((asUnknown.dataReadinessScore ?? 0) < (evaluateDiagnostic(scenarioE).dataReadinessScore ?? 0));
  });

  it("qualifies a high score as estimated maturity when reliability is limited", () => {
    const guarded = evaluateDiagnostic({
      ...scenarioC,
      carbon_owner: unknown,
      energy_audit: unknown,
      reduction_target: unknown,
      action_plan: unknown,
    });
    assert.equal(guarded.maturityScore, 100);
    assert.equal(guarded.maturityLevel, "advanced");
    assert.equal(guarded.unknownCount, 4);
    assert.equal(guarded.reliability, "low");
    assert.equal(guarded.reliabilityLimited, true);
    assert.equal(guarded.presentation.scoreQualifierFr, "Maturité estimée");
    assert.equal(guarded.presentation.scoreQualifierEn, "Estimated maturity");
    assert.equal(guarded.presentation.levelLabelFr, "Avancé");
    assert.notEqual(guarded.presentation.displayLevelFr, guarded.presentation.levelLabelFr);
    assert.match(guarded.presentation.displayLevelFr ?? "", /Avancé/);
    assert.match(guarded.presentation.reliabilityWarningFr ?? "", /maturité estimée/);
    assert.match(guarded.presentation.displayLevelFr ?? "", /Fiabilité limitée/);
  });

  it("does not let an informative answer change the score", () => {
    const lowPressure = evaluateDiagnostic(scenarioA);
    const highPressure = evaluateDiagnostic({ ...scenarioA, client_requirements: choice("contractual") });
    assert.equal(lowPressure.maturityScore, highPressure.maturityScore);
    assert.equal(lowPressure.dataReadinessScore, highPressure.dataReadinessScore);
    assert.equal(highPressure.internal.urgentNeed, true);
  });

  it("scenario A — small Tunisian SME, no inventory", () => {
    const result = evaluateDiagnostic(scenarioA);
    assert.equal(result.templateVersion, DIAGNOSTIC_TEMPLATE_VERSION);
    assert.equal(result.shownQuestionCodes.length, 18);
    assert.equal(result.shownQuestionCodes.includes("has_industrial_site"), true);
    assert.equal(result.shownQuestionCodes.includes("energy_audit"), false);
    assert.equal(result.maturityScore, 0);
    assert.equal(result.maturityLevel, "initial");
    assert.equal(result.dataReadinessScore, 0);
    assert.equal(result.reliability, "low");
    assert.equal(result.reliabilityLimited, true);
    assert.equal(result.presentation.scoreQualifierFr, "Maturité estimée");
    assert.match(result.presentation.displayLevelFr ?? "", /Initial/);
    assert.match(result.presentation.displayLevelFr ?? "", /Fiabilité limitée/);
    assert.deepEqual(result.recommendations.map((item) => item.id), [
      "no_ghg_inventory",
      "scope3_gap",
      "no_reduction_target",
    ]);
    assert.equal(result.recommendations[0]?.module, "bilan");
    assert.equal(result.internal.urgentNeed, false);
    assert.equal(result.strengths.length, 0);
    assert.equal("emissions" in result, false);
  });

  it("scenario B — industry with an energy audit and no Scope 3", () => {
    const result = evaluateDiagnostic(scenarioB);
    assert.equal(result.shownQuestionCodes.length, 20);
    assert.equal(result.shownQuestionCodes.includes("energy_audit"), true);
    assert.equal(result.shownQuestionCodes.includes("energy_target"), false);
    assert.equal(result.shownQuestionCodes.includes("scope3_posture"), true);
    assert.equal(result.shownQuestionCodes.includes("cbam_exposure"), false);
    assert.equal(result.maturityScore, 54);
    assert.equal(result.maturityLevel, "structuring");
    assert.equal(result.dataReadinessScore, 54);
    assert.equal(result.reliability, "medium");
    assert.equal(result.reliabilityLimited, false);
    assert.equal(result.presentation.scoreQualifierFr, "Maturité");
    assert.equal(result.presentation.reliabilityWarningFr, null);
    assert.equal(result.presentation.displayLevelFr, "En structuration");
    assert.deepEqual(result.recommendations.map((item) => item.id), [
      "incomplete_scopes",
      "scope3_gap",
      "plan_not_owned",
    ]);
  });

  it("scenario C — large company with scopes 1/2/3 and a reduction plan", () => {
    const result = evaluateDiagnostic(scenarioC);
    assert.equal(result.shownQuestionCodes.length, 20);
    assert.equal(result.maturityScore, 100);
    assert.equal(result.maturityLevel, "advanced");
    assert.equal(result.dataReadinessScore, 100);
    assert.equal(result.reliability, "high");
    assert.equal(result.reliabilityLimited, false);
    assert.equal(result.presentation.scoreQualifierFr, "Maturité");
    assert.equal(result.presentation.displayLevelFr, "Avancé");
    assert.deepEqual(result.recommendations.map((item) => item.id), ["maintain_cycle"]);
    assert.deepEqual(result.strengths, ["energy", "governance", "measure"]);
    assert.equal(result.templateVersion, "diag-360-2026.1");
  });

  it("scenario D — EU exporter of goods", () => {
    const result = evaluateDiagnostic(scenarioD);
    assert.equal(result.shownQuestionCodes.length, 18);
    assert.equal(result.shownQuestionCodes.includes("cbam_exposure"), true);
    assert.equal(result.shownQuestionCodes.includes("carbon_reporting"), false);
    assert.equal(result.maturityScore, 0);
    assert.equal(result.maturityLevel, "initial");
    assert.equal(result.dataReadinessScore, 0);
    assert.equal(result.reliability, "low");
    assert.equal(result.presentation.scoreQualifierFr, "Maturité estimée");
    assert.deepEqual(result.recommendations.map((item) => item.id), [
      "no_ghg_inventory",
      "cbam_verify_exposure",
      "scope3_gap",
    ]);
    assert.equal(result.recommendations[1]?.module, "cbam");
    assert.equal(result.internal.exportEu, true);
    assert.equal(result.internal.urgentNeed, true);
    assert.equal(result.internal.regulatoryPressure, true);
  });

  it("scenario E — services, no fleet, no industrial site", () => {
    const result = evaluateDiagnostic(scenarioE);
    assert.equal(result.shownQuestionCodes.includes("energy_audit"), false);
    assert.equal(result.shownQuestionCodes.includes("fleet_fuel_tracking"), false);
    assert.equal(result.shownQuestionCodes.includes("business_travel_tracking"), true);
    assert.equal(result.shownQuestionCodes.includes("has_industrial_site"), true);
    assert.equal(result.shownQuestionCodes.length, 18);
    assert.equal(result.maturityScore, 18);
    assert.equal(result.maturityLevel, "initial");
    assert.equal(result.dataReadinessScore, 28);
    assert.equal(result.reliability, "low");
    assert.equal(result.presentation.scoreQualifierFr, "Maturité estimée");
    assert.deepEqual(result.recommendations.map((item) => item.id), [
      "no_ghg_inventory",
      "scope3_gap",
      "no_reduction_target",
    ]);
  });

  it("routes a finance company without an inventory to PCAF", () => {
    const result = evaluateDiagnostic({ ...scenarioA, sector: choice("finance") });
    assert.equal(result.recommendations[0]?.module, "pcaf");
  });

  it("routes weak energy tracking to WattBim only when a technical site is declared", () => {
    const withSite = evaluateDiagnostic({
      ...scenarioB,
      energy_tracking: choice("none"),
      supplier_carbon: choice("systematic"),
      scope3_posture: choice("activity"),
      scopes_covered: multi(["s1", "s2", "s3"]),
      purchase_data: choice("by_supplier"),
      reduction_target: choice("quantified"),
    });
    assert.equal(withSite.recommendations.find((item) => item.id === "energy_not_tracked")?.module, "wattbim");

    const office = evaluateDiagnostic({
      ...scenarioB,
      has_industrial_site: choice("no"),
      sector: choice("industry"),
      energy_tracking: choice("none"),
      supplier_carbon: choice("systematic"),
      scope3_posture: choice("activity"),
      scopes_covered: multi(["s1", "s2", "s3"]),
      purchase_data: choice("by_supplier"),
      reduction_target: choice("quantified"),
    });
    assert.equal(office.recommendations.find((item) => item.id === "energy_not_tracked")?.module, "history");
  });
});

describe("diagnostic 360 migration", () => {
  it("versions the template and freezes recommendations in the result", () => {
    assert.match(migration, /diag-360-2026\.1/);
    assert.match(migration, /snapshot \? 'recommendations'/);
    assert.match(migration, /snapshot \? 'templateVersion'/);
  });

  it("keeps anonymous sessions out of tenant RLS", () => {
    const sessions = migration.split("CREATE TABLE diagnostic_sessions")[1]?.split("CREATE TABLE")[0] ?? "";
    assert.equal(sessions.includes("organization_id"), false);
    assert.match(migration, /ALTER TABLE diagnostic_org_links FORCE ROW LEVEL SECURITY/);
  });

  it("stores marketing consent apart from the report request", () => {
    assert.match(migration, /marketing_consent\s+BOOLEAN NOT NULL DEFAULT false/);
    assert.match(migration, /report_requested_at/);
    assert.equal(migration.includes("marketing_consent = true"), false);
  });

  it("locks diag-360-2026.1 between the TypeScript catalog and the SQL seed", () => {
    const questions = rowsBy(migration, "diagnostic_questions");
    const options = rowsBy(migration, "diagnostic_options");
    const rules = rowsBy(migration, "diagnostic_rules");
    const axes = rowsBy(migration, "diagnostic_axes");
    const thresholds = rowsBy(migration, "diagnostic_thresholds").filter((row) => row.kind === "maturity");

    assert.equal(questions.length, QUESTIONS.length);
    assert.deepEqual(
      questions.map((row) => row.code),
      QUESTIONS.map((question) => question.code),
    );
    assert.deepEqual(
      axes.map((row) => ({ id: row.axis_id, fr: row.label_fr, en: row.label_en, position: row.position })),
      AXES.map((axis, index) => ({ id: axis.id, fr: axis.labelFr, en: axis.labelEn, position: index + 1 })),
    );
    assert.deepEqual(
      thresholds.map((row) => ({ max: row.max_inclusive, level: row.level })),
      MATURITY_BANDS.map((band) => ({ max: band.max, level: band.level })),
    );

    QUESTIONS.forEach((question, index) => {
      const row = questions[index];
      assert.ok(row, question.code);
      assert.equal(row.code, question.code);
      assert.equal(row.axis_id, question.axisId);
      assert.equal(row.position, index + 1);
      assert.equal(row.question_type, question.type);
      assert.equal(row.weight, question.weight);
      assert.equal(row.maturity_max, question.maturityMax);
      assert.equal(row.data_max, question.dataMax);
      assert.equal(row.unknown_excludes_maturity, question.unknownExcludesMaturity);
      assert.equal(row.visibility, question.visibility);
      assert.equal(row.label_fr, question.labelFr);
      assert.equal(row.label_en, question.labelEn);
      assert.equal(row.maturity_max != null, question.maturityMax != null);
      assert.equal(row.data_max != null, question.dataMax != null);

      const seeded = options.filter((option) => option.question_code === question.code);
      assert.equal(seeded.length, question.options.length, question.code);
      question.options.forEach((option, optionIndex) => {
        const seededOption = seeded[optionIndex];
        assert.equal(seededOption?.value, option.value);
        assert.equal(seededOption?.position, optionIndex + 1);
        assert.equal(seededOption?.maturity_points, option.maturity);
        assert.equal(seededOption?.data_points, option.data);
        assert.equal(seededOption?.label_fr, option.labelFr);
        assert.equal(seededOption?.label_en, option.labelEn);
      });
    });

    assert.equal(rules.length, RECOMMENDATIONS.length);
    RECOMMENDATIONS.forEach((rule, index) => {
      const row = rules[index];
      assert.equal(row?.rule_id, rule.id);
      assert.equal(row?.axis_id, rule.axisId);
      assert.equal(row?.priority, rule.priority);
      assert.equal(row?.module, rule.module);
      assert.equal(row?.condition_key, rule.conditionKey);
      assert.equal(row?.title_fr, rule.titleFr);
      assert.equal(row?.title_en, rule.titleEn);
    });

    assert.equal(migration.includes("electricity_kwh"), false);
    assert.equal(migration.includes("cbam_awareness"), false);
    assert.equal(migration.includes("'industrial'"), false);
    assert.equal(migration.includes("published = true"), false);
  });
});

type SqlValue = string | number | boolean | null;

function rowsBy(sql: string, table: string): Record<string, SqlValue>[] {
  const match = new RegExp(`INSERT INTO ${table} \\(([^)]+)\\) VALUES`, "i").exec(sql);
  assert.ok(match, table);
  const columns = match[1].split(",").map((column) => column.trim());
  const start = match.index + match[0].length;
  let end = start;
  let inString = false;
  while (end < sql.length) {
    const char = sql[end];
    if (inString) {
      if (char === "'" && sql[end + 1] === "'") {
        end += 2;
        continue;
      }
      if (char === "'") inString = false;
      end += 1;
      continue;
    }
    if (char === "'") {
      inString = true;
      end += 1;
      continue;
    }
    if (char === ";") break;
    end += 1;
  }
  return parseTuples(sql.slice(start, end)).map((tuple) => {
    assert.equal(tuple.length, columns.length, table);
    return Object.fromEntries(columns.map((column, index) => [column, tuple[index]]));
  });
}

function parseTuples(body: string): SqlValue[][] {
  const rows: SqlValue[][] = [];
  let index = 0;
  const skip = () => {
    while (index < body.length && /\s/.test(body[index] ?? "")) index += 1;
  };
  while (index < body.length) {
    skip();
    if (index >= body.length) break;
    if (body[index] === ",") {
      index += 1;
      continue;
    }
    assert.equal(body[index], "(");
    index += 1;
    const row: SqlValue[] = [];
    while (index < body.length) {
      skip();
      row.push(parseValue());
      skip();
      if (body[index] === ",") {
        index += 1;
        continue;
      }
      assert.equal(body[index], ")");
      index += 1;
      break;
    }
    rows.push(row);
  }
  return rows;

  function parseValue(): SqlValue {
    skip();
    if (body.startsWith("NULL", index)) {
      index += 4;
      return null;
    }
    if (body.startsWith("true", index)) {
      index += 4;
      return true;
    }
    if (body.startsWith("false", index)) {
      index += 5;
      return false;
    }
    if (body[index] === "'") {
      index += 1;
      let value = "";
      while (index < body.length) {
        if (body[index] === "'" && body[index + 1] === "'") {
          value += "'";
          index += 2;
          continue;
        }
        if (body[index] === "'") {
          index += 1;
          break;
        }
        value += body[index];
        index += 1;
      }
      return value;
    }
    const start = index;
    while (index < body.length && /[0-9-]/.test(body[index] ?? "")) index += 1;
    assert.notEqual(start, index);
    return Number(body.slice(start, index));
  }
}
