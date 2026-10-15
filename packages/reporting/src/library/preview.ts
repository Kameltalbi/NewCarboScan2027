import { analyze } from "../analyze.js";
import { ateliersDuSahel } from "../fixtures/ateliersDuSahel.js";
import { assertModelProse } from "../proseGuard.js";
import { DEFAULT_ANALYSIS_OPTIONS, type AnalysisOptions, type ReportData } from "../types.js";
import { buildViewModel, type Block, type ReportViewModel, type Section } from "../viewModel.js";
import { selectChapter6Preview, type LibrarySelection } from "./select.js";

export interface Chapter6Preview {
  model: ReportViewModel;
  /** Sélections enregistrées avec le rapport. Les modèles restent en brouillon. */
  selections: LibrarySelection[];
  activated: false;
}

/** Compare, sur le même bilan, le paragraphe déterministe et le brouillon résolu. N'appelle pas OpenAI. */
export function buildChapter6Preview(
  data: ReportData = ateliersDuSahel,
  options: AnalysisOptions = DEFAULT_ANALYSIS_OPTIONS,
): Chapter6Preview {
  const analysis = analyze(data, options);
  const selections = selectChapter6Preview(data, analysis);
  const model = buildViewModel(data, options);
  model.document.status = "Aperçu — brouillons non activés";
  model.document.pdfDescription = "Comparaison du texte actuel et des brouillons. Ces modèles ne sont pas activés.";
  model.document.coverFoot = `${model.document.coverFoot} · Aperçu brouillon non activé`;
  insertPostCallouts(model, selections);
  insertPerimeterCallouts(model, selections);
  const declared = data.boundary.flatMap((item) => item.reason.match(/-?\d[\d\s]*([.,]\d+)?/g) ?? []);
  assertModelProse(model, data, options, declared);
  return { model, selections, activated: false };
}

function insertPostCallouts(model: ReportViewModel, selections: LibrarySelection[]): void {
  const section = model.sections.find((item) => item.id === "postes");
  if (!section) return;
  for (const selection of selections.filter((item) => item.chapter === "07" || item.slotKey.startsWith("post-") || item.slotKey === "poste-dominant")) {
    insertAfter(section, selection.slotKey.startsWith("post-") ? selection.slotKey : null, comparisonCallout(selection));
  }
}

function insertPerimeterCallouts(model: ReportViewModel, selections: LibrarySelection[]): void {
  const section = model.sections.find((item) => item.id === "objectifs");
  if (!section) return;
  const tableAt = section.blocks.findIndex((block) => block.type === "table");
  const callouts = selections
    .filter((item) => item.code === "CH06-M05" && item.rendered)
    .map((selection) => comparisonCallout(selection));
  const at = tableAt === -1 ? section.blocks.length : tableAt;
  section.blocks.splice(at, 0, ...callouts);
}

function comparisonCallout(selection: LibrarySelection): Block {
  if (selection.rendered) {
    return {
      type: "callout",
      kind: "hypothesis",
      title: "Texte proposé, brouillon non activé",
      text: selection.rendered,
    };
  }
  const text = selection.slotKey === "poste-dominant"
    ? "Aucun poste ne dépasse le seuil de significativité. Aucun brouillon de poste n'est imprimé."
    : "Le poste dominant ne remplit ni la condition documentée, ni la condition estimée ou monétaire. Le paragraphe actuel est conservé.";
  return { type: "callout", kind: "limit", title: "Aucun texte proposé", text };
}

function insertAfter(section: Section, slotKey: string | null, block: Block): void {
  if (!slotKey) {
    section.blocks.push(block);
    return;
  }
  const index = section.blocks.findIndex(
    (item) => item.type === "paragraphs" && item.items.some((paragraph) => paragraph.slotKey === slotKey),
  );
  if (index === -1) section.blocks.push(block);
  else section.blocks.splice(index + 1, 0, block);
}
