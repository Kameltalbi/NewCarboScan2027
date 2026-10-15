/** Version figée du prompt. Un changement de consigne incrémente cette valeur. */
export const PROMPT_VERSION = "2026-10-14.15";

export type NarrativeSlot = "executive_summary" | "scope_analysis" | "significant_post" | "recommendation";

export type DraftStatus = "fallback" | "generated" | "edited" | "rejected";

export interface NarrativeBrief {
  consigne: string;
  questions: string[];
  dossier: Record<string, unknown>;
  chiffresAutorises: string[];
  /** Fragments exigés lorsque le dossier les rend nécessaires. */
  mustMention: string[];
}

export interface NarrativeRequest {
  slot: NarrativeSlot;
  slotKey: string;
  /** Nombres déjà calculés. Seuls ces jetons sont autorisés dans le texte généré. */
  facts: Record<string, string>;
  /** Libellés sans rôle de preuve chiffrée. */
  context: Record<string, string>;
  /** Dossier du passage. Le modèle n'analyse que ces éléments. */
  brief: NarrativeBrief;
  /** Prose déterministe de repli, produite sans appel réseau. */
  fallbackText: string;
  /** Le serveur doit le poser explicitement. Le défaut reste le repli. */
  allowNetwork?: boolean;
}

export interface NarrativeUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface NarrativeDraft {
  slot: NarrativeSlot;
  slotKey: string;
  promptVersion: string;
  provider: "fallback" | "openai";
  status: DraftStatus;
  originalText: string;
  editedText: string | null;
  model: string | null;
  usage: NarrativeUsage | null;
  failureReason: string | null;
}

export interface NarrativeProvider {
  draft(request: NarrativeRequest): Promise<NarrativeDraft>;
}

export const BANNED_PHRASES = [
  "méthode de la ligne",
  "modification du résultat calculé",
  "ne modifie pas le résultat",
  "sans entraîner de modification",
  "n'entraîne aucune modification",
  "détail est présenté ultérieurement",
  "détail chiffré est repris",
  "détail chiffré est fourni",
  "graphiques ci-dessous",
  "graphiques suivants",
  "le commentaire associé",
  "retour sur investissement",
  "économies financières",
  "temps de retour",
  "bien documenté",
  "garantit la rigueur",
  "ne modifie pas l'inventaire",
  "fiabilité des inventaires",
  "primaire fiable",
  "optimisation de la consommation",
  "gestion de la consommation",
  "répartition horaire",
  "variabilité saisonnière",
  "relevés automatiques",
  "production d'électricité hors site",
  "ne couvre pas les émissions indirectes",
  "repose sur des données physiques",
  "mix électrique",
  "quasi-exhaustivité",
  "bonne précision",
  "bonne représentativité",
  "bonne couverture",
  "ne remet pas en cause",
  "figurent dans le tableau",
  "aucun site n'est indiqué",
  "limite la précision",
  "marge d'erreur",
  "facteur d'émission primaire",
  "garantit une mesure",
  "assure une certaine fiabilité",
  "il serait pertinent",
  "la direction devrait",
];

export const SYSTEM_PROMPT = [
  "Tu rédiges en français un passage de rapport de bilan GES pour un dirigeant non spécialiste.",
  "Tu réponds par un objet JSON. Tu peux utiliser la clé texte, ou les clés observations et interpretation.",
  "Les observations restent des faits présents dans le dossier.",
  "L'interprétation explique la structure ou la limite de la donnée, sans inventer de cause opérationnelle.",
  "Pour un passage de recommandation, tu formules uniquement le levier et les conditions déjà présents dans le dossier. Tu n'ajoutes pas un second levier, ni un équipement, ni un budget.",
  "Chaque nombre que tu écris doit appartenir à chiffresAutorises, sans troncature ni arrondi.",
  "Tu recopies les noms de postes du dossier. Tu n'inventes ni poste, ni facteur, ni site, ni année, ni pourcentage, ni coût.",
  "Tu n'affirmes pas une conformité, une vérification par un tiers, une trajectoire climatique, ni une réduction réalisée.",
  "Un potentiel de réduction est un scénario hors inventaire : il ne se soustrait pas du bilan et les fiches ne s'additionnent pas.",
  "Tu distingues une donnée absente d'une émission nulle.",
  "Tu distingues le seuil individuel de significativité de la cible de couverture cumulative.",
  "Un facteur marqué démonstration reste un facteur de jeu fictif, pas un facteur validé pour une entreprise réelle.",
  "Tu n'emploies pas ces formulations : méthode de la ligne, modification du résultat calculé, détail présenté ultérieurement, graphiques ci-dessous, retour sur investissement.",
  "Tu n'écris ni titre, ni markdown, ni liste à puces dans les chaînes.",
  "Tu es concis. Tu ne répètes pas un chiffre déjà utilement porté par le dossier si une lecture suffit.",
  "Le seuil individuel et la cible cumulative sont des critères internes. Tu ne les redéfinis pas dans chaque poste.",
  "Une incertitude déclarée sur une ligne n'est pas une mesure métrologique certifiée.",
  "Un potentiel est prospectif. Tu ne parles pas d'émissions évitées ni d'une réduction déjà réalisée.",
  "Tu écris une prose suivie, sans les étiquettes Observation, Lecture ou Piste.",
  "Tu n'affirmes pas qu'un proxy monétaire donne une mesure fiable des émissions physiques.",
  "La couverture des postes n'est pas une représentativité des données. Une incertitude ne devient pas négligeable.",
  "Tu n'inventes ni procédé industriel, ni équipement, ni cause opérationnelle absente du dossier.",
  "Tu ne répètes pas un tonnage ou une part que le dossier indique comme déjà imprimés dans un tableau.",
  "Une autoproduction n'est pas une baisse équivalente du scope 2 location-based. Une collecte de données physiques n'est pas une réduction d'émissions.",
  "Le scope 2 location-based couvre la production de l'électricité achetée. Tu ne dis pas que cette production hors site est exclue.",
  "Le market-based n'est pas le location-based. Les émissions amont des combustibles relèvent du scope 3 seulement si une catégorie distincte est dans le dossier.",
  "Une incertitude déclarée n'est pas un intervalle de confiance. Une variation annuelle n'est pas une réduction due à des actions.",
  "Tu n'affirmes pas une conformité au GHG Protocol, au Scope 3 Standard ou à l'ISO 14064-1.",
  "Si le dossier contient modeleReference, tu t'en inspires et tu le personnalises uniquement avec les faits du dossier.",
].join(" ");
