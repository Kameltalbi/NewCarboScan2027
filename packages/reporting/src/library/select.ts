import type { Analysis, RankedLine } from "../analyze.js";
import { isDemonstrationFactor } from "../factorTime.js";
import { percentPhrase } from "../format.js";
import type { ReportData } from "../types.js";
import { CHAPTER6_DRAFT_MODELS, PILOT_MODELS, modelByCode, type ParagraphModel } from "./catalog.js";

/**
 * Bande éditoriale, distincte du seuil de significativité des postes (5 %).
 * En dessous de cet écart de parts affichées, aucun scope n'est dit prédominant.
 */
export const BALANCE_GAP_POINTS = 10;

export interface LibrarySelection {
  slotKey: string;
  code: string | null;
  version: number | null;
  chapter: string | null;
  rule: string;
  variables: Record<string, string>;
  rendered: string | null;
  sources: string[];
  limits: string[];
  insuffisance: string | null;
}

const QUALITY: Record<string, string> = {
  primary: "primaire",
  estimated: "estimée",
  default: "défaut",
};

const METHOD: Record<string, string> = {
  invoice: "facture",
  measured_zero: "mesure nulle",
  proxy_monetary: "proxy monétaire",
  modeled: "modélisation",
  extrapolated: "extrapolation",
  maintenance_estimate: "estimation de maintenance",
};

export function selectForReport(
  data: ReportData,
  analysis: Analysis,
  catalog: ParagraphModel[] = PILOT_MODELS,
): LibrarySelection[] {
  return [
    selectExecutive(data, analysis, catalog),
    ...analysis.significant.map((line, index) => selectPost(data, analysis, line, index === 0, catalog)),
    ...data.boundary
      .filter((item) => item.status === "not_reported")
      .map((item) => selectUnquantified(item.label, item.reason, `lacune-${item.id}`, catalog)),
    ...data.boundary
      .filter((item) => item.status !== "not_reported")
      .map((item) => documentedGap(item.label, item.status, item.reason, `perimetre-${item.id}`)),
    selectEstimated(analysis, catalog),
    selectTrend(data, analysis, catalog),
  ];
}

export function fillTemplate(body: string, variables: Record<string, string>): string {
  return body.replace(/\{([a-zA-Z]+)\}/g, (token, key: string) => variables[key] ?? token);
}

const UNRESOLVED = /\{[a-zA-Z]+\}/;

/**
 * Prévisualisation des brouillons CH06. Le catalogue actif et le PDF publié ne passent pas ici.
 * M01 : règle fiable actuelle. M02 : qualité estimée ou proxy monétaire. M05 : catégorie non évaluée.
 * Un poste dominant seulement modélisé, extrapolé ou estimé par maintenance ne reçoit pas M02.
 */
export function selectChapter6Preview(
  data: ReportData,
  analysis: Analysis,
  catalog: ParagraphModel[] = CHAPTER6_DRAFT_MODELS,
): LibrarySelection[] {
  const dominant = analysis.significant[0];
  const posts = dominant
    ? [selectDominantDraft(data, dominant, catalog)]
    : [empty("poste-dominant", "Aucun poste ne dépasse le seuil de significativité.", "Aucun brouillon de poste ne s'applique.")];
  const gaps = data.boundary
    .filter((item) => item.status === "not_reported")
    .map((item) => selectUnquantifiedDraft(item.label, item.reason, `lacune-${item.id}`, catalog));
  return [...posts, ...gaps];
}

function selectExecutive(data: ReportData, analysis: Analysis, catalog: ParagraphModel[]): LibrarySelection {
  const reported = analysis.scopes.filter((scope) => scope.status === "reported" && scope.share && scope.tonnes);
  if (reported.length === 0) {
    return empty("executive", "Aucun scope n'est évalué.", "Aucun modèle de synthèse ne s'applique.");
  }
  const ordered = [...reported].sort((a, b) => Number(b.share!.displayPct) - Number(a.share!.displayPct));
  const lead = ordered[0]!;
  const second = ordered[1];
  const gap = second ? Number(lead.share!.displayPct) - Number(second.share!.displayPct) : BALANCE_GAP_POINTS;
  const balanced = second !== undefined && gap < BALANCE_GAP_POINTS;
  const code = balanced ? "EXEC_BALANCED" : `EXEC_SCOPE${lead.scope}_DOMINANT`;
  const top = analysis.ranked[0];
  const variables: Record<string, string> = {
    entreprise: data.company.name,
    exercice: String(data.inventory.year),
    scopeDominant: String(lead.scope),
    partScopeDominant: lead.share!.displayPct,
    scopeSecond: second ? String(second.scope) : "",
    partScopeSecond: second?.share?.displayPct ?? "",
    postePrincipal: top?.label ?? "",
    qualitePoste: top ? QUALITY[top.dataQuality] : "",
    methodePoste: top ? METHOD[top.method] : "",
    comptageElectricite: data.inventory.electricityAccounting,
  };
  const rule = balanced
    ? `Écart de ${gap} point${gap > 1 ? "s" : ""} entre le scope ${lead.scope} et le scope ${second!.scope}, sous la bande de ${BALANCE_GAP_POINTS} points.`
    : `Le scope ${lead.scope} est le plus élevé (${lead.share!.displayPct} % affichés).`;
  return apply(catalog, "executive", code, rule, variables, [
    `secteur déclaré : ${data.company.sector}`,
    `total ${analysis.totalTonnes} tCO₂e`,
  ], top ? [] : ["Aucun poste à résultat positif : le modèle de synthèse ne peut pas nommer de poste."]);
}

function selectPost(
  data: ReportData,
  analysis: Analysis,
  line: RankedLine,
  dominant: boolean,
  catalog: ParagraphModel[],
): LibrarySelection {
  const reliable = isReliable(line);
  const code = dominant
    ? reliable
      ? "POST_DOMINANT_RELIABLE"
      : "POST_DOMINANT_UNCERTAIN"
    : "POST_SECONDARY";
  const limite = !reliable
    ? isDemonstrationFactor(line.factorSource, line.factorVersion)
      ? "Le facteur appartient à un jeu de démonstration et n'est pas utilisable pour une entreprise réelle."
      : line.method === "proxy_monetary"
        ? "Le proxy monétaire ne mesure pas une quantité physique."
        : "La donnée n'est pas une mesure primaire documentée par une facture."
    : "";
  const variables: Record<string, string> = {
    poste: line.label,
    partDuTotal: line.share.displayPct,
    methode: METHOD[line.method],
    qualite: QUALITY[line.dataQuality],
    sourceFacteur: line.factorSource,
    postePrincipal: analysis.ranked[0]?.label ?? line.label,
    limite,
  };
  const rule = dominant
    ? reliable
      ? "Premier poste, donnée primaire de facture ou de mesure nulle, facteur hors démonstration."
      : "Premier poste sans le niveau de documentation retenu pour une lecture fiable."
    : `Poste classé après « ${analysis.ranked[0]?.label ?? "le premier"} ». Le seuil de significativité reste celui du calcul.`;
  return apply(catalog, `post-${line.id}`, code, rule, variables, [
    `secteur déclaré : ${data.company.sector}`,
    `facteur ${line.factorId}`,
  ], [line.uncertaintyPct ? "L'incertitude de la ligne est déclarée, pas un intervalle de confiance." : "Aucune incertitude n'est déclarée sur la ligne."]);
}

function selectUnquantified(label: string, reason: string, slotKey: string, catalog: ParagraphModel[]): LibrarySelection {
  return apply(
    catalog,
    slotKey,
    "POST_UNQUANTIFIED",
    "Catégorie non évaluée : elle reste hors somme.",
    { categorie: label, motif: reason },
    ["périmètre déclaré"],
    ["Aucune émission n'est imputée à cette catégorie."],
  );
}

function selectEstimated(analysis: Analysis, catalog: ParagraphModel[]): LibrarySelection {
  const estimated = analysis.quality.find((slice) => slice.quality === "estimated");
  const primary = analysis.quality.find((slice) => slice.quality === "primary");
  if (!estimated || estimated.status !== "reported" || !estimated.kgCo2e) {
    return empty("qualite", "Aucune classe estimée n'est déclarée.", null);
  }
  const others = analysis.quality.filter((slice) => slice.quality !== "estimated" && slice.status === "reported" && slice.kgCo2e);
  const leads = others.every((slice) => Number(estimated.kgCo2e) >= Number(slice.kgCo2e));
  if (!leads) {
    return empty("qualite", "La classe estimée n'est pas la plus lourde.", null);
  }
  return apply(
    catalog,
    "qualite",
    "DATA_ESTIMATED",
    "La masse estimée est au moins égale à chaque autre classe déclarée.",
    {
      partEstimee: estimated.share?.displayPct ?? "",
      partPrimaire: primary?.status === "reported" ? primary.share?.displayPct ?? "" : "aucune part déclarée",
    },
    ["classes de donnée déclarées sur les lignes"],
    ["La répartition n'est pas un indice de fiabilité."],
  );
}

function selectTrend(data: ReportData, analysis: Analysis, catalog: ParagraphModel[]): LibrarySelection {
  const comparable = analysis.comparison.status === "available" && data.comparison.categories === "available";
  if (comparable) {
    return empty("evolution", "Le total et le détail de l'exercice précédent sont disponibles.", null);
  }
  const base = data.comparison.basis
    ?? (analysis.comparison.status === "not_comparable"
      ? "Les périmètres ou les méthodes ne sont pas comparables."
      : "Le détail nécessaire à la comparaison n'est pas disponible.");
  return apply(
    catalog,
    "evolution",
    "TREND_NOT_COMPARABLE",
    `Statut de comparaison : ${analysis.comparison.status}. Détail antérieur : ${data.comparison.categories}.`,
    { base },
    ["comparaison déclarée dans le jeu"],
    ["Aucune variation n'est lue comme une réduction réalisée."],
  );
}

function isReliable(line: RankedLine): boolean {
  const demo = isDemonstrationFactor(line.factorSource, line.factorVersion);
  return line.dataQuality === "primary" && (line.method === "invoice" || line.method === "measured_zero") && !demo;
}

function apply(
  catalog: ParagraphModel[],
  slotKey: string,
  code: string,
  rule: string,
  variables: Record<string, string>,
  sources: string[],
  limits: string[],
): LibrarySelection {
  const model = modelByCode(catalog, code);
  if (!model) return empty(slotKey, rule, `Le modèle ${code} est absent du catalogue.`);
  if (model.status !== "active") {
    return {
      slotKey,
      code: null,
      version: model.version,
      chapter: model.chapter,
      rule,
      variables,
      rendered: null,
      sources,
      limits,
      insuffisance: `${code} est au statut ${model.status} et n'est pas utilisé.`,
    };
  }
  const missing = model.requiredVariables.filter((key) => !variables[key]);
  if (missing.length > 0) {
    return {
      slotKey,
      code: null,
      version: model.version,
      chapter: model.chapter,
      rule,
      variables,
      rendered: null,
      sources,
      limits,
      insuffisance: `Variables manquantes pour ${code} : ${missing.join(", ")}. Aucune valeur n'est inventée.`,
    };
  }
  return {
    slotKey,
    code: model.code,
    version: model.version,
    chapter: model.chapter,
    rule,
    variables,
    rendered: fillTemplate(model.body, variables),
    sources,
    limits,
    insuffisance: null,
  };
}

function selectDominantDraft(data: ReportData, line: RankedLine, catalog: ParagraphModel[]): LibrarySelection {
  const variables = postVariables(line);
  const sources = [`secteur déclaré : ${data.company.sector}`, `facteur ${line.factorId}`];
  if (isReliable(line)) {
    return renderDraft(catalog, `post-${line.id}`, "CH06-M01", "Règle fiable : donnée primaire, facture ou mesure nulle, facteur hors démonstration.", variables, sources, [
      "L'incertitude de ligne, si elle est déclarée, n'est pas un intervalle de confiance.",
    ]);
  }
  if (line.dataQuality === "estimated" || line.method === "proxy_monetary") {
    return renderDraft(catalog, `post-${line.id}`, "CH06-M02", "Qualité estimée ou méthode proxy monétaire.", variables, sources, [
      "Le rang ne crée pas une mesure physique.",
    ]);
  }
  return {
    slotKey: `post-${line.id}`,
    code: null,
    version: null,
    chapter: "07",
    rule: "Le poste dominant n'est ni fiable au sens documenté, ni de qualité estimée, ni issu d'un proxy monétaire.",
    variables,
    rendered: null,
    sources,
    limits: ["Un poste seulement modélisé, extrapolé ou estimé par maintenance ne reçoit pas le brouillon monétaire ou estimé."],
    insuffisance: "Aucun brouillon de poste ne s'applique.",
  };
}

function selectUnquantifiedDraft(label: string, reason: string, slotKey: string, catalog: ParagraphModel[]): LibrarySelection {
  return renderDraft(
    catalog,
    slotKey,
    "CH06-M05",
    "Catégorie non évaluée. Aucune significativité n'est présumée.",
    { categorie: label, motif: reason },
    ["périmètre déclaré"],
    ["Aucune émission n'est imputée à cette catégorie."],
  );
}

function postVariables(line: RankedLine): Record<string, string> {
  const demo = isDemonstrationFactor(line.factorSource, line.factorVersion);
  const parts: string[] = [];
  if (line.method === "proxy_monetary") parts.push("Le proxy monétaire ne mesure pas une quantité physique.");
  if (line.dataQuality === "estimated" && line.method !== "proxy_monetary") {
    parts.push("La classe estimée n'est pas une mesure primaire documentée par une facture.");
  }
  if (demo) parts.push("Le facteur appartient à un jeu de démonstration et n'est pas utilisable pour une entreprise réelle.");
  if (parts.length === 0) parts.push("La limite de cette donnée est celle qui est déjà déclarée sur la ligne.");
  return {
    poste: line.label,
    partDuTotal: percentPhrase(line.share.displayPct),
    methode: METHOD[line.method],
    qualite: QUALITY[line.dataQuality],
    sourceFacteur: line.factorSource,
    limite: parts.join(" "),
    ancrage: line.site ? `Le site indiqué sur la ligne est « ${line.site} ».` : "Aucun site n'est indiqué sur cette ligne.",
  };
}

function renderDraft(
  catalog: ParagraphModel[],
  slotKey: string,
  code: string,
  rule: string,
  variables: Record<string, string>,
  sources: string[],
  limits: string[],
): LibrarySelection {
  const model = modelByCode(catalog, code);
  if (!model || model.status !== "draft") {
    return empty(slotKey, rule, `Le brouillon ${code} est absent ou n'est pas au statut brouillon.`);
  }
  const missing = model.requiredVariables.filter((key) => !variables[key]);
  if (missing.length > 0) {
    return {
      slotKey,
      code: null,
      version: model.version,
      chapter: model.chapter,
      rule,
      variables,
      rendered: null,
      sources,
      limits,
      insuffisance: `Variables manquantes pour ${code} : ${missing.join(", ")}. Aucune valeur n'est inventée.`,
    };
  }
  const rendered = fillTemplate(model.body, variables);
  if (UNRESOLVED.test(rendered)) {
    return {
      slotKey,
      code: null,
      version: model.version,
      chapter: model.chapter,
      rule,
      variables,
      rendered: null,
      sources,
      limits,
      insuffisance: `Le brouillon ${code} laisse une variable non résolue. Il n'est pas imprimé.`,
    };
  }
  return {
    slotKey,
    code: model.code,
    version: model.version,
    chapter: model.chapter,
    rule,
    variables,
    rendered,
    sources,
    limits,
    insuffisance: null,
  };
}

function empty(slotKey: string, rule: string, insuffisance: string | null): LibrarySelection {
  return {
    slotKey,
    code: null,
    version: null,
    chapter: null,
    rule,
    variables: {},
    rendered: null,
    sources: [],
    limits: [],
    insuffisance,
  };
}

function documentedGap(label: string, status: string, reason: string, slotKey: string): LibrarySelection {
  return {
    slotKey,
    code: null,
    version: null,
    chapter: "03",
    rule: `« ${label} » est ${status}. Aucun modèle d'émission ne s'applique.`,
    variables: {},
    rendered: null,
    sources: [reason],
    limits: ["Cette situation n'est pas convertie en émission nulle."],
    insuffisance: null,
  };
}
