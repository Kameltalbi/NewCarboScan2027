import { analyze } from "../analyze.js";
import { frenchifyNumbers } from "../format.js";
import { ateliersDuSahel } from "../fixtures/ateliersDuSahel.js";
import { collectNumericFacts, declineMagnitudes, horizonFactYears } from "../proseGuard.js";
import { DEFAULT_ANALYSIS_OPTIONS, type AnalysisOptions, type ReportData } from "../types.js";
import { buildViewModel, type Block, type ReportViewModel } from "../viewModel.js";
import type { ParagraphModel } from "../library/catalog.js";
import { selectForReport, type LibrarySelection } from "../library/select.js";
import { buildNarrativeBriefs } from "./brief.js";
import { type DraftStatus, type NarrativeProvider, type NarrativeRequest, type NarrativeSlot, type NarrativeUsage } from "./contract.js";
import { FallbackNarrativeProvider } from "./fallback.js";
import { OpenAiNarrativeProvider } from "./openai.js";

export interface NarrativeRecord {
  slot: NarrativeSlot;
  slotKey: string;
  status: DraftStatus;
  provider: "fallback" | "openai";
  model: string | null;
  promptVersion: string;
  usage: NarrativeUsage | null;
  failureReason: string | null;
}

export interface EnrichedReport {
  model: ReportViewModel;
  records: NarrativeRecord[];
  usage: NarrativeUsage & { calls: number };
  library: LibrarySelection[];
}

/** Publication bloquée tant qu'un lecteur n'a pas repris chaque passage. */
export function assertReadyToPublish(records: NarrativeRecord[]): void {
  if (records.some((record) => record.status !== "edited")) {
    throw new Error("Validation humaine requise avant publication.");
  }
}

/**
 * Rédige les passages prévus à partir des faits calculés.
 * Sans allowNetwork, ou si la clé manque, le texte déterministe est conservé.
 * Le navigateur ne doit pas appeler cette fonction.
 */
export async function enrichReport(
  data: ReportData = ateliersDuSahel,
  options: AnalysisOptions = DEFAULT_ANALYSIS_OPTIONS,
  input: { allowNetwork?: boolean; provider?: NarrativeProvider; catalog?: ParagraphModel[] } = {},
): Promise<EnrichedReport> {
  const model = buildViewModel(data, options);
  const analysis = analyze(data, options);
  const library = selectForReport(data, analysis, input.catalog);
  const briefs = buildNarrativeBriefs(data, analysis, { catalog: input.catalog });
  const sharedFacts = [...new Set([
    ...collectNumericFacts({ data, analysis, options }),
    ...horizonFactYears(analysis),
    ...declineMagnitudes(analysis),
  ])];
  const jobs = collectJobs(model);
  let provider = input.provider ?? (input.allowNetwork ? new OpenAiNarrativeProvider() : new FallbackNarrativeProvider());
  const records: NarrativeRecord[] = [];
  let apiFailed = false;

  for (const job of jobs) {
    const brief = briefs[job.slotKey];
    if (!brief) throw new Error(`Dossier rédactionnel absent : ${job.slotKey}`);
    const chiffresAutorises = [...new Set([...brief.chiffresAutorises, ...sharedFacts])];
    const request: NarrativeRequest = {
      ...job,
      brief: { ...brief, chiffresAutorises },
      facts: Object.fromEntries(chiffresAutorises.map((value, index) => [`n${index}`, value])),
      allowNetwork: input.allowNetwork === true && !apiFailed,
    };
    let draft;
    try {
      draft = await provider.draft(request);
    } catch (error) {
      apiFailed = true;
      provider = new FallbackNarrativeProvider();
      draft = await provider.draft({ ...request, allowNetwork: false });
      draft = { ...draft, failureReason: safeError(error) };
    }
    const visible = input.allowNetwork === true && draft.status !== "generated"
      ? `Texte de repli, non rédigé par OpenAI. ${draft.originalText}`
      : draft.status === "generated"
        ? frenchifyNumbers(draft.originalText)
        : draft.originalText;
    if (draft.status === "generated" || visible !== job.fallbackText) replaceText(model, job.slotKey, visible);
    records.push({
      slot: draft.slot,
      slotKey: draft.slotKey,
      status: draft.status,
      provider: draft.provider,
      model: draft.model,
      promptVersion: draft.promptVersion,
      usage: draft.usage,
      failureReason: draft.failureReason,
    });
  }

  markProvenance(model, records);
  return { model, records, usage: sumUsage(records), library };
}

function markProvenance(model: ReportViewModel, records: NarrativeRecord[]): void {
  const generated = records.filter((record) => record.status === "generated").length;
  if (generated === 0) return;
  const incomplete = records.length - generated;
  if (incomplete === 0) {
    model.document.status = "Brouillon — validation humaine requise";
    model.document.pdfDescription = "Brouillon fictif : passages rédigés par OpenAI, non publié.";
    model.document.coverFoot = `${model.document.coverFoot} · ${generated} passages rédigés par OpenAI, validation humaine requise`;
    return;
  }
  model.document.status = "Brouillon incomplet — repli partiel";
  model.document.pdfDescription = "Brouillon fictif incomplet : une partie des passages est le texte de repli, non rédigé par OpenAI.";
  model.document.coverFoot = `${model.document.coverFoot} · Rédaction incomplète : ${generated} passages OpenAI, ${incomplete} passages de repli`;
}

function sumUsage(records: NarrativeRecord[]): NarrativeUsage & { calls: number } {
  const usage = records.reduce(
    (sum, record) => {
      if (!record.usage) return sum;
      sum.calls += 1;
      sum.promptTokens += record.usage.promptTokens;
      sum.completionTokens += record.usage.completionTokens;
      sum.totalTokens += record.usage.totalTokens;
      return sum;
    },
    { promptTokens: 0, completionTokens: 0, totalTokens: 0, calls: 0 },
  );
  return usage;
}

function collectJobs(model: ReportViewModel): Omit<NarrativeRequest, "facts" | "allowNetwork" | "brief">[] {
  const jobs: Omit<NarrativeRequest, "facts" | "allowNetwork" | "brief">[] = [];
  const visit = (block: Block) => {
    if (block.type === "paragraphs") {
      for (const item of block.items) {
        if (!item.slot || !item.slotKey) continue;
        jobs.push({
          slot: item.slot,
          slotKey: item.slotKey,
          context: { passage: item.slotKey },
          fallbackText: item.text,
        });
      }
    } else if (block.type === "cards") {
      for (const item of block.items) {
        if (!item.slot || !item.slotKey) continue;
        jobs.push({
          slot: item.slot,
          slotKey: item.slotKey,
          context: { passage: item.title },
          fallbackText: item.comment,
        });
      }
    } else if (block.type === "pair") {
      visit(block.left);
      visit(block.right);
    }
  };
  for (const section of model.sections) {
    for (const block of section.blocks) visit(block);
  }
  return jobs;
}

function replaceText(model: ReportViewModel, slotKey: string, text: string) {
  const visit = (block: Block) => {
    if (block.type === "paragraphs") {
      for (const item of block.items) {
        if (item.slotKey === slotKey) item.text = text;
      }
    } else if (block.type === "cards") {
      for (const item of block.items) {
        if (item.slotKey === slotKey) item.comment = text;
      }
    } else if (block.type === "pair") {
      visit(block.left);
      visit(block.right);
    }
  };
  for (const section of model.sections) {
    for (const block of section.blocks) visit(block);
  }
}

function safeError(error: unknown): string {
  const message = error instanceof Error ? error.message : "échec OpenAI";
  return message.replace(/sk-[A-Za-z0-9_\-]+/g, "[redacted]").slice(0, 180);
}
