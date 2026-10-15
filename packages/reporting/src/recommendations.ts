import type { ActionResult, Analysis, RankedLine } from "./analyze.js";
import { percentPhrase, tonnesPhrase } from "./format.js";

export type RecommendationBasis = "justifiee" | "conditionnelle";
export type RecommendationPriority = "Haute" | "Moyenne" | "Basse";

export interface ReductionItem {
  id: string;
  slotKey: string | null;
  postLabel: string;
  significant: boolean;
  basis: RecommendationBasis;
  basisLabel: "Justifiée par les données" | "Conditionnelle";
  priority: RecommendationPriority;
  lever: string;
  conditions: string;
  missing: string;
  action: string;
  objective: string;
  horizon: string;
  owner: "À désigner";
  indicator: string;
  /** Libellé du gain. Aucun montant n'est inventé. */
  gainLabel: string;
  potentialTonnes: string | null;
  emissionsTonnes: string | null;
  shareDisplayPct: string | null;
  factorTime: RankedLine["factorTime"] | null;
  method: RankedLine["method"] | null;
  prose: string;
}

/**
 * Propositions déduites des postes significatifs et des fiches déjà enregistrées.
 * Aucun équipement, aucun budget et aucun gain ne sont créés ici.
 */
export function buildReductionPlan(analysis: Analysis): ReductionItem[] {
  const used = new Set<string>();
  const items = analysis.significant.map((line) => {
    const action = analysis.actions.find((item) => matches(item, line));
    if (action) used.add(action.id);
    return fromLine(line, action);
  });
  for (const action of analysis.actions) {
    if (used.has(action.id)) continue;
    const line = analysis.ranked.find((item) => matches(action, item)) ?? analysis.zeros.find((item) => matches(action, item)) ?? null;
    items.push(fromRecordedAction(action, line));
  }
  return items;
}

function matches(action: ActionResult, line: RankedLine): boolean {
  if (action.lineId === line.id) return true;
  if (line.method === "proxy_monetary" && /proxy monétaire des achats|données physiques d'achats/i.test(`${action.title} ${action.text}`)) {
    return true;
  }
  return false;
}

function fromLine(line: RankedLine, action: ActionResult | undefined): ReductionItem {
  const emissions = tonnesPhrase(line.tonnes);
  const share = percentPhrase(line.share.displayPct);
  const relevance = `« ${line.label} » représente ${emissions}, soit ${share} du total.`;
  if (line.factorTime === "jeu_fictif") {
    return item({
      id: `reco-${line.id}`,
      slotKey: `reco-${line.id}`,
      postLabel: line.label,
      significant: true,
      basis: "justifiee",
      priority: "Basse",
      lever: "Le facteur est un facteur de démonstration. Le levier est de le remplacer avant toute décision de réduction.",
      conditions: "Aucun gain n'est calculable sur un facteur de jeu fictif.",
      missing: "Facteur applicable à l'exercice et quantité de transport documentée.",
      action: "Remplacer le facteur de démonstration avant toute décision.",
      objective: "Rendre le poste utilisable avant une décision de réduction.",
      horizon: action?.horizon ?? "Non fixé",
      indicator: action?.indicator ?? "Facteur de démonstration remplacé : oui ou non",
      gain: null,
      line,
      prose: `${relevance} Le facteur est un facteur de démonstration. Le levier est de le remplacer avant toute décision de réduction. Priorité basse. Aucun gain n'est calculable. Information manquante : un facteur applicable et une quantité de transport documentée.`,
    });
  }
  if (line.method === "proxy_monetary") {
    return item({
      id: `reco-${line.id}`,
      slotKey: `reco-${line.id}`,
      postLabel: line.label,
      significant: true,
      basis: "justifiee",
      priority: "Haute",
      lever: "La méthode est un proxy monétaire. Le levier est de collecter des quantités physiques fournisseurs avant toute substitution.",
      conditions: "Aucun gain n'est calculable tant que la quantité physique est absente. La proposition n'est pas une solution déjà mise en œuvre.",
      missing: "Quantités physiques et facteurs fournisseurs.",
      action: "Collecter les quantités physiques fournisseurs.",
      objective: "Quantifier le poste avant toute substitution.",
      horizon: action?.horizon ?? "Non fixé",
      indicator: action?.indicator ?? "Part des achats couverte par une donnée physique fournisseur",
      gain: null,
      line,
      prose: `${relevance} La méthode est un proxy monétaire : elle ne mesure pas une quantité physique. Le levier est la collecte de quantités physiques fournisseurs. Priorité haute. Aucun gain n'est calculable. Information manquante : quantités physiques et facteurs fournisseurs.`,
    });
  }
  if (action?.quantified && action.potentialTonnes) {
    return item({
      id: `reco-${line.id}`,
      slotKey: `reco-${line.id}`,
      postLabel: line.label,
      significant: true,
      basis: "conditionnelle",
      priority: "Haute",
      lever: "Le dossier enregistre un scénario sur ce poste. Ce n'est pas un équipement constaté.",
      conditions: "Le market-based n'est pas documenté. Le gain du scénario n'est pas une baisse du résultat location-based et n'est pas soustrait de l'inventaire.",
      missing: "Technologie du scénario, répartition entre les voies citées dans la fiche, et instruments.",
      action: "Reprendre le scénario enregistré, sans le compter dans l'inventaire.",
      objective: "Documenter le scénario sans modifier l'inventaire.",
      horizon: action.horizon,
      indicator: action.indicator,
      gain: action.potentialTonnes,
      line,
      prose: `${relevance} Le dossier enregistre un scénario sur ce poste. Ce n'est pas un équipement constaté. Priorité haute. Le market-based n'est pas documenté. Le gain calculé est reporté dans le plan d'action : il n'est pas soustrait de l'inventaire. Informations manquantes : technologie, répartition du scénario et instruments.`,
    });
  }
  return item({
    id: `reco-${line.id}`,
    slotKey: `reco-${line.id}`,
    postLabel: line.label,
    significant: true,
    basis: "conditionnelle",
    priority: "Moyenne",
    lever: "Aucun levier n'est enregistré. La donnée documente le résultat, pas un équipement ni un procédé.",
    conditions: "Aucune solution technique n'est proposée. Une étude ne s'ouvre qu'après identification du levier.",
    missing: "Usage du poste, équipement concerné, et donnée permettant un calcul de gain.",
    action: "Aucun levier enregistré. Étude seulement après identification.",
    objective: "Savoir si un levier est documentable.",
    horizon: "Non fixé",
    indicator: "Levier identifié dans le dossier : oui ou non",
    gain: null,
    line,
    prose: `${relevance} Classe ${line.dataQuality === "primary" ? "primaire" : line.dataQuality === "estimated" ? "estimée" : "défaut"}, méthode ${methodLabel(line.method)}. Aucun levier n'est enregistré et aucun équipement n'est documenté. Priorité moyenne. Aucune solution technique n'est proposée. Le gain n'est pas calculable. Information manquante : l'usage du poste et un levier identifié.`,
  });
}

function fromRecordedAction(action: ActionResult, line: RankedLine | null): ReductionItem {
  const gain = action.quantified && action.potentialTonnes && line?.factorTime !== "jeu_fictif" ? action.potentialTonnes : null;
  return item({
    id: `reco-${action.id}`,
    slotKey: null,
    postLabel: line?.label ?? action.lineLabel ?? action.title,
    significant: false,
    basis: "conditionnelle",
    priority: "Basse",
    lever: "Le dossier enregistre un scénario hors des postes significatifs. Ce n'est pas une réduction constatée.",
    conditions: "La fiche ne fait pas entrer le poste dans les postes significatifs. Le gain n'est pas soustrait de l'inventaire.",
    missing: "Mesure confirmant le scénario. La fiche ne suffit pas.",
    action: "Reprendre la fiche enregistrée, sans la compter dans l'inventaire.",
    objective: "Suivre la fiche sans modifier l'inventaire.",
    horizon: action.horizon,
    indicator: action.indicator,
    gain,
    line,
    prose: "",
  });
}

function item(input: {
  id: string;
  slotKey: string | null;
  postLabel: string;
  significant: boolean;
  basis: RecommendationBasis;
  priority: RecommendationPriority;
  lever: string;
  conditions: string;
  missing: string;
  action: string;
  objective: string;
  horizon: string;
  indicator: string;
  gain: string | null;
  line: RankedLine | null;
  prose: string;
}): ReductionItem {
  return {
    id: input.id,
    slotKey: input.slotKey,
    postLabel: input.postLabel,
    significant: input.significant,
    basis: input.basis,
    basisLabel: input.basis === "justifiee" ? "Justifiée par les données" : "Conditionnelle",
    priority: input.priority,
    lever: input.lever,
    conditions: input.conditions,
    missing: input.missing,
    action: input.action,
    objective: input.objective,
    horizon: input.horizon,
    owner: "À désigner",
    indicator: input.indicator,
    gainLabel: input.gain ? `${tonnesPhrase(input.gain)} — scénario, non constaté` : "Non calculable",
    potentialTonnes: input.gain,
    emissionsTonnes: input.line?.tonnes ?? null,
    shareDisplayPct: input.line?.share.displayPct ?? null,
    factorTime: input.line?.factorTime ?? null,
    method: input.line?.method ?? null,
    prose: input.prose,
  };
}

function methodLabel(method: RankedLine["method"]): string {
  const labels: Record<RankedLine["method"], string> = {
    invoice: "facture",
    measured_zero: "mesure nulle",
    proxy_monetary: "proxy monétaire",
    modeled: "modélisé",
    extrapolated: "extrapolation",
    maintenance_estimate: "estimation de maintenance",
  };
  return labels[method];
}
