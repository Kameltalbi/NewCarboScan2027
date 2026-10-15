import { d } from "@newcarboscan/carbon-engine";
import {
  assertEveryNumberInTextExistsInStructuredFacts,
  assertNoInventedClimateClaims,
} from "@newcarboscan/carbon-engine";
import type { Analysis } from "./analyze.js";
import { analyze } from "./analyze.js";
import { exact } from "./format.js";
import { ateliersDuSahel } from "./fixtures/ateliersDuSahel.js";
import { DEFAULT_ANALYSIS_OPTIONS, type AnalysisOptions, type ReportData } from "./types.js";
import { buildViewModel, type Block, type ReportViewModel } from "./viewModel.js";

export function proseOf(model: ReportViewModel): string {
  const chunks: string[] = [];
  for (const section of model.sections) {
    for (const block of section.blocks) chunks.push(...blockProse(block));
  }
  return chunks.join("\n");
}

export function assertReportProse(
  data: ReportData = ateliersDuSahel,
  options: AnalysisOptions = DEFAULT_ANALYSIS_OPTIONS,
): ReportViewModel {
  return assertModelProse(buildViewModel(data, options), data, options);
}

export function assertModelProse(
  model: ReportViewModel,
  data: ReportData = ateliersDuSahel,
  options: AnalysisOptions = DEFAULT_ANALYSIS_OPTIONS,
  extraFacts: string[] = [],
): ReportViewModel {
  const analysis = analyze(data, options);
  const prose = proseOf(model);
  const claims = assertNoInventedClimateClaims(prose);
  if (!claims.ok) {
    throw new Error(`Affirmations interdites : ${claims.matches.join(", ")}`);
  }
  const numbers = assertEveryNumberInTextExistsInStructuredFacts(prose, [
    ...collectNumericFacts({ data, analysis, options }),
    ...horizonFactYears(analysis),
    ...declineMagnitudes(analysis),
    ...extraFacts,
  ]);
  if (!numbers.ok) {
    throw new Error(`Nombres absents des faits : ${numbers.unknownNumbers.join(" | ")}`);
  }
  return model;
}

function blockProse(block: Block): string[] {
  switch (block.type) {
    case "paragraphs":
      return block.items.map((item) => item.text);
    case "callout":
      return [block.title, block.text];
    case "list":
      return block.items;
    case "subhead":
      return [block.text];
    case "chart":
      return [block.title, block.caption];
    case "table":
      return block.note ? [block.note] : [];
    case "kpis":
      return [];
    case "messages":
      return block.items.flatMap((item) => [item.title, item.text]);
    case "cards":
      return block.items.flatMap((item) => [item.title, item.comment]);
    case "pair":
      return [...blockProse(block.left), ...blockProse(block.right)];
  }
}

/** Valeur absolue d'un taux déjà calculé, pour écrire « baisse de 6,9 » sans nouveau calcul. */
export function declineMagnitudes(analysis: Analysis): string[] {
  const rate = analysis.comparison.rateDisplayPct;
  if (!rate?.startsWith("-")) return [];
  return [rate.slice(1)];
}

/** Années déjà écrites dans l'horizon d'une fiche. Elles ne sont pas recalculées. */
export function horizonFactYears(analysis: Analysis): string[] {
  const years = new Set<string>();
  for (const action of analysis.actions) {
    for (const year of action.horizon.match(/\b20\d{2}\b/g) ?? []) years.add(year);
  }
  return [...years];
}

export function collectNumericFacts(value: unknown, out = new Set<string>()): string[] {
  if (typeof value === "string") {
    if (/^-?\d+(\.\d+)?$/.test(value)) out.add(value);
    return [...out];
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    out.add(exact(d(value)));
    return [...out];
  }
  if (Array.isArray(value)) {
    for (const item of value) collectNumericFacts(item, out);
    return [...out];
  }
  if (value && typeof value === "object") {
    for (const item of Object.values(value)) collectNumericFacts(item, out);
  }
  return [...out];
}

export type { Analysis };
