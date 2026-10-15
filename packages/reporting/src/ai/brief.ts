import type { Analysis, RankedLine, ScopeResult } from "../analyze.js";
import { factorTimeLabel, isDemonstrationFactor } from "../factorTime.js";
import { selectForReport, type LibrarySelection } from "../library/select.js";
import type { ParagraphModel } from "../library/catalog.js";
import { collectNumericFacts } from "../proseGuard.js";
import { buildReductionPlan, type ReductionItem } from "../recommendations.js";
import type { ReportData } from "../types.js";
import type { NarrativeBrief, NarrativeSlot } from "./contract.js";

const QUALITY = { primary: "primaire", estimated: "estimée", default: "défaut" } as const;
const METHOD = {
  invoice: "facture",
  measured_zero: "mesure nulle",
  proxy_monetary: "proxy monétaire",
  modeled: "modélisé",
  extrapolated: "extrapolation",
  maintenance_estimate: "estimation de maintenance",
} as const;

export function buildNarrativeBriefs(
  data: ReportData,
  analysis: Analysis,
  library: { enabled?: boolean; catalog?: ParagraphModel[] } = { enabled: true },
): Record<string, NarrativeBrief> {
  const selections = library.enabled === false ? [] : selectForReport(data, analysis, library.catalog);
  const briefs: Record<string, NarrativeBrief> = {
    executive: executiveBrief(data, analysis, selectionFor(selections, "executive")),
  };
  for (const scope of analysis.scopes) {
    if (scope.status !== "reported") continue;
    briefs[`scope-${scope.scope}`] = scopeBrief(data, analysis, scope);
  }
  for (const line of analysis.significant) briefs[`post-${line.id}`] = postBrief(analysis, line, selectionFor(selections, `post-${line.id}`));
  for (const item of buildReductionPlan(analysis)) {
    if (item.slotKey) briefs[item.slotKey] = recommendationBrief(item);
  }
  return briefs;
}

function selectionFor(selections: LibrarySelection[], slotKey: string): LibrarySelection | null {
  return selections.find((item) => item.slotKey === slotKey && item.rendered) ?? null;
}

function referenceOf(selection: LibrarySelection | null): Record<string, unknown> | null {
  if (!selection?.rendered || !selection.code) return null;
  return {
    code: selection.code,
    version: selection.version,
    regle: selection.rule,
    texte: selection.rendered,
    limites: selection.limits,
  };
}

function executiveBrief(data: ReportData, analysis: Analysis, selection: LibrarySelection | null = null): NarrativeBrief {
  const dossier = {
    entreprise: data.company.name,
    secteur: data.company.sector,
    pays: data.company.country,
    exercice: data.inventory.year,
    methodologie: data.inventory.methodology,
    consolidation: data.inventory.consolidation,
    electricite: data.inventory.electricityAccounting,
    totalTco2e: analysis.totalTonnes,
    scopes: analysis.scopes
      .filter((scope) => scope.status === "reported" && scope.tonnes && scope.share)
      .map((scope) => ({
        scope: scope.scope,
        emissionsTco2e: scope.tonnes,
        partPct: scope.share!.displayPct,
      })),
    principauxPostes: analysis.ranked.slice(0, 5).map(lineCard),
    seuilIndividuelPct: analysis.thresholdDisplayPct,
    couvertureDesPostesAuSeuilPct: analysis.significantCoverage?.displayPct ?? null,
    cibleCumulativePct: analysis.coverageTargetDisplayPct,
    comparaison: {
      ...analysis.comparison,
      ampleurDeLaBaissePct: analysis.comparison.rateDisplayPct?.startsWith("-")
        ? analysis.comparison.rateDisplayPct.slice(1)
        : null,
      lecture: "Un taux négatif est une baisse du total. Ce n'est pas une hausse.",
    },
    qualite: analysis.quality
      .filter((slice) => slice.status === "reported" && slice.share)
      .map((slice) => ({
        classe: QUALITY[slice.quality],
        partPct: slice.share!.displayPct,
      })),
    limites: data.assumptions,
    facteursDemonstration: analysis.ranked.filter(isDemo).map((line) => line.label),
    motObligatoire: analysis.ranked.some(isDemo) ? "démonstration" : null,
    intensites: analysis.intensities
      .filter((item) => item.executiveDisplay)
      .map((item) => ({ indicateur: item.label, lecture: item.executiveDisplay, unite: item.displayUnit })),
    fiabilite: "Le proxy monétaire des achats n'est pas une mesure physique. Ne pas le qualifier de fiable.",
    modeleReference: referenceOf(selection),
  };
  return finish("executive_summary", dossier, [
    "Synthèse pour un dirigeant, 90 à 130 mots, en prose suivie sans étiquettes.",
    "Une phrase sur l'écart entre la couverture au seuil et la cible cumulative interne, sans redéfinir la règle.",
    "Nommer deux ou trois priorités de décision, pas la liste complète des postes.",
    "Ne pas décrire un graphique et ne pas qualifier le proxy monétaire de mesure fiable.",
    "Si des facteurs sont de démonstration, écrire exactement le mot démonstration.",
    `Si tu cites un pourcentage, copie-le avec sa décimale et le signe % : couverture ${analysis.significantCoverage?.displayPct ?? ""}, cible ${analysis.coverageTargetDisplayPct}, total ${analysis.totalTonnes}.`,
    "La couverture au seuil n'est pas une exhaustivité du bilan.",
    "La couverture au seuil n'indique pas une représentativité des données.",
    selection ? "Personnalise modeleReference à partir des seuls faits du dossier. Ne le contredis pas et n'ajoute aucun chiffre hors chiffresAutorises." : "",
  ], [
    "Quel est le niveau global des émissions ?",
    "Quels sont les principaux postes émetteurs ?",
    "Que montre la structure des émissions ?",
    "Quelles limites méthodologiques pèsent sur la lecture ?",
    "Quelles priorités la direction devrait-elle examiner ?",
  ], dossier.facteursDemonstration.length > 0 ? ["démonstration"] : []);
}

function scopeBrief(data: ReportData, analysis: Analysis, scope: ScopeResult): NarrativeBrief {
  const lines = analysis.ranked.filter((line) => line.scope === scope.scope);
  const zeros = analysis.zeros.filter((line) => line.scope === scope.scope);
  const dossier = {
    entreprise: data.company.name,
    secteur: data.company.sector,
    exercice: data.inventory.year,
    scope: scope.scope,
    emissionsTco2e: scope.tonnes,
    partDuTotalPct: scope.share?.displayPct ?? null,
    postes: lines.map(lineCard),
    postesMesuresNuls: zeros.map(lineCard),
    lectureDesParts: "partDuTotalPct est la part du bilan de l'entreprise, pas la part interne du scope.",
    categoriesHorsSomme:
      scope.scope === 3
        ? data.boundary.filter((item) => item.id !== "heat").map((item) => ({ categorie: item.label, statut: item.status }))
        : [],
    motObligatoire: lines.some(isDemo) || zeros.some(isDemo) ? "démonstration" : null,
  };
  const demo = lines.some(isDemo) || zeros.some(isDemo);
  return finish("scope_analysis", dossier, [
    "70 à 120 mots. Le tableau sous le texte porte déjà le total du scope : ne le répète pas, décris le poste dominant et sa limite.",
    "Ne mentionne aucun autre scope. Si categoriesHorsSomme est vide, n'en parle pas.",
    scope.scope === 2
      ? "Le location-based couvre la production de l'électricité achetée. Ne dis pas qu'elle est hors périmètre. Le market-based n'est pas calculé."
      : "",
    "Dire la limite de donnée qui change la lecture, puis une piste conditionnelle.",
    "Pour le scope 3, nommer les catégories hors somme sans les compter à zéro.",
    demo ? "Écrire exactement le mot démonstration pour les facteurs de jeu fictif." : "",
    "Un poste mesuré nul n'est pas une catégorie absente. N'attribue jamais partDuTotalPct au seul scope.",
    "N'affirme pas la fiabilité d'un proxy monétaire. L'incertitude d'une ligne n'est pas une mesure métrologique.",
  ], [
    "Quel est le résultat du scope ?",
    "Quels postes le dominent ?",
    "Quelle limite de donnée change la lecture ?",
  ], demo ? ["démonstration"] : []);
}

function postBrief(analysis: Analysis, line: RankedLine, selection: LibrarySelection | null = null): NarrativeBrief {
  const next = analysis.ranked[analysis.significant.length];
  const dossier = {
    poste: lineCard(line),
    posteSuivant: next ? next.label : null,
    modeleReference: referenceOf(selection),
  };
  const mentions = [];
  if (isDemo(line)) mentions.push("démonstration");
  if (line.method === "proxy_monetary") mentions.push("monétaire");
  return finish("significant_post", dossier, [
    "60 à 110 mots, en prose propre à ce poste.",
    "Nomme la classe de qualité et la méthode de collecte comme deux informations distinctes. Recopie le statut temporel du dossier sans le contredire.",
    "Ne cite pas le pourcentage d'incertitude. Ne le présente pas comme une précision, une fiabilité ou une marge d'erreur.",
    "Ne termine pas par une recommandation.",
    "Si la méthode est un proxy monétaire, dire qu'il ne mesure pas une quantité physique.",
    "Ne pas expliquer le seuil de 5 % ni la cible de 80 %. L'incertitude déclarée n'est pas un intervalle de confiance.",
    selection ? "Personnalise modeleReference. S'il dit que la donnée est incertaine ou secondaire, ne la présente pas comme une mesure fiable." : "",
    "Respecte la méthode du dossier : une facture n'est pas une dépense, un proxy monétaire n'est pas une facture.",
    "Si la méthode est une facture, la quantité est déjà physique. Ne propose ni compteur, ni relevé, ni suivi supplémentaire.",
    line.scope === 2
      ? "La facture et le facteur de réseau couvrent déjà la production de l'électricité achetée. Ne décris ni profil de charge, ni saison, ni relevé."
      : "",
  ], [
    "Quelle est l'importance du poste ?",
    "Quelle limite pèse sur la donnée ?",
    "Quelle information manque ?",
  ], mentions);
}

function recommendationBrief(item: ReductionItem): NarrativeBrief {
  const dossier = {
    poste: item.postLabel,
    emissionsTco2e: item.emissionsTonnes,
    partDuTotalPct: item.shareDisplayPct,
    levier: item.lever,
    priorite: item.priority,
    nature: item.basisLabel,
    conditions: item.conditions,
    informationsManquantes: item.missing,
    potentielTco2e: item.potentialTonnes,
    horizon: item.horizon,
    indicateur: item.indicator,
    objectifConnu: item.action,
    regle: "Le gain n'est pas soustrait de l'inventaire. La proposition n'est pas un engagement. N'invente ni équipement, ni budget, ni date.",
  };
  const mentions = item.factorTime === "jeu_fictif" ? ["démonstration"] : [];
  return finish("recommendation", dossier, [
    "50 à 90 mots. Formule seulement le levier déjà écrit dans le dossier. N'en ajoute pas un autre.",
    "Ne présente pas la proposition comme une solution déjà mise en œuvre ni comme un engagement.",
    "Ne cite ni budget, ni coût, ni équipement absent du dossier.",
    "Ne répète pas le gain, l'horizon ni l'indicateur : le plan d'action les porte.",
    item.factorTime === "jeu_fictif" ? "Écris le mot démonstration. Ne calcule aucun gain." : "",
    item.method === "proxy_monetary" ? "Dis que le proxy monétaire ne mesure pas une quantité physique." : "",
    "Ne termine pas par une seconde recommandation.",
  ], [
    "Quel levier est justifié par les données disponibles ?",
    "Quelle condition reste ouverte ?",
    "Quelle information manque ?",
  ], mentions);
}

function lineCard(line: RankedLine) {
  return {
    nom: line.label,
    categorie: line.category,
    site: line.site,
    emissionsTco2e: line.tonnes,
    partDuTotalPct: line.share.displayPct,
    qualite: QUALITY[line.dataQuality],
    methode: METHOD[line.method],
    sourceFacteur: line.factorSource,
    statutTemporel: factorTimeLabel(line.factorTime),
    facteurDemonstration: isDemo(line),
    incertitudePct: line.uncertaintyPct,
    lectureIncertitude: line.uncertaintyPct
      ? "Incertitude déclarée sur la ligne, pas un intervalle de confiance et pas une mesure métrologique."
      : "Aucune incertitude documentée sur cette ligne.",
    lectureElectricite:
      line.scope === 2
        ? "Le location-based couvre la production de l'électricité achetée. Ne pas écrire qu'elle est hors site ou hors périmètre."
        : null,
  };
}

function isDemo(line: RankedLine): boolean {
  return isDemonstrationFactor(line.factorSource, line.factorVersion);
}

function finish(
  slot: NarrativeSlot,
  dossier: Record<string, unknown>,
  consigne: string[],
  questions: string[],
  mustMention: string[],
): NarrativeBrief {
  const chiffres = [...collectNumericFacts(dossier), ...yearsIn(dossier)];
  return {
    consigne: consigne.filter(Boolean).join(" "),
    questions,
    dossier,
    chiffresAutorises: [...new Set(chiffres)],
    mustMention,
  };
}

function yearsIn(value: unknown): string[] {
  if (typeof value === "string") return value.match(/\b20\d{2}\b/g) ?? [];
  if (Array.isArray(value)) return value.flatMap(yearsIn);
  if (value && typeof value === "object") return Object.values(value).flatMap(yearsIn);
  return [];
}

export function allowedFacts(brief: NarrativeBrief): Record<string, string> {
  return Object.fromEntries(brief.chiffresAutorises.map((value, index) => [`n${index}`, value]));
}
