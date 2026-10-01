/**
 * Notes de méthode (ABC-09).
 * Elles décrivent le comportement actuel de CarboScan et les réserves ouvertes.
 * Elles ne publient pas une méthode validée ABC et ne portent aucun chiffre d'organisation.
 */

export type MethodNoteStatus = "en_place" | "a_valider" | "bloque";

export interface MethodNote {
  id: string;
  title: string;
  status: MethodNoteStatus;
  paragraphs: string[];
}

export const METHOD_NOTE_STATUS_LABEL: Record<MethodNoteStatus, string> = {
  en_place: "Comportement actuel",
  a_valider: "À valider ABC",
  bloque: "Bloqué",
};

export const METHOD_NOTES: MethodNote[] = [
  {
    id: "principes",
    title: "Principes",
    status: "en_place",
    paragraphs: [
      "Ces notes décrivent le comportement actuel de CarboScan et les réserves laissées ouvertes dans les chantiers déjà traités.",
      "Elles restent dans l'outil pour l'audit. Elles ne remplacent pas un texte de méthode validé ABC et ne contiennent aucun chiffre d'organisation.",
    ],
  },
  {
    id: "facteurs",
    title: "Facteurs d'émission",
    status: "en_place",
    paragraphs: [
      "Le calcul d'une ligne multiplie la quantité par le facteur résolu pour cette ligne.",
      "À la clôture, ce facteur est copié dans le snapshot publié. Un brouillon se recalcule. Un bilan clôturé conserve le facteur figé.",
      "Ces notes ne modifient aucune valeur de facteur.",
    ],
  },
  {
    id: "prg",
    title: "PRG à 100 ans",
    status: "a_valider",
    paragraphs: [
      "Le PRG est porté par la version du facteur : AR4, AR5, AR6, mixte, ou non renseigné. L'horizon retenu est celui de la base source.",
      "Le calcul de ligne utilise le facteur déjà exprimé en CO₂e. Il n'applique pas un second PRG.",
      "Une règle unique « PRG 100 ans AR5 pour tout le bilan » reste à valider ABC.",
    ],
  },
  {
    id: "ges",
    title: "Gaz à effet de serre",
    status: "en_place",
    paragraphs: [
      "Les résultats de ligne sont exprimés en équivalent CO₂.",
      "Le CO₂ biogénique signalé par le moteur reste hors des totaux de scopes.",
    ],
  },
  {
    id: "perimetres",
    title: "Périmètres",
    status: "a_valider",
    paragraphs: [
      "L'organisation enregistre un contrôle opérationnel ou un contrôle financier. Tant que ce choix reste inchangé, le rapport indique le contrôle opérationnel, comme auparavant.",
      "Ce défaut reste à valider ABC. La quote-part est expliquée et reste sans calcul.",
      "Un site peut être opéré, non opéré, ou sans statut. La suggestion Scope 3 pour un site non opéré est un affichage : une ligne Scope 1 saisie reste Scope 1.",
    ],
  },
  {
    id: "scopes",
    title: "Scopes",
    status: "en_place",
    paragraphs: [
      "Les familles Scope 1 déjà présentes restent distinctes : combustibles, véhicules, émissions fugitives, procédé.",
      "Aucune ligne n'est reclassée automatiquement d'un scope à un autre.",
    ],
  },
  {
    id: "procedes",
    title: "Procédés",
    status: "en_place",
    paragraphs: [
      "La fiche Procédé / autre émission directe accepte une quantité multipliée par un facteur, ou une émission déjà connue.",
      "Le facteur ou l'émission saisie est déjà en CO₂e.",
    ],
  },
  {
    id: "fugitives",
    title: "Émissions fugitives",
    status: "en_place",
    paragraphs: [
      "Les fluides déjà proposés restent des lignes Scope 1 : R410A, R134a, R32, R404A, R407C, et autre fluide.",
      "Leur facteur est celui du registre ou du repli déjà en place. Ces notes ne changent aucun PRG.",
    ],
  },
  {
    id: "donnees-physiques",
    title: "Données physiques",
    status: "en_place",
    paragraphs: [
      "Une ligne peut porter une méthode : physique, monétaire, émission directe, spécifique fournisseur, ou autre.",
      "Une ligne sans méthode reste non renseignée. Elle reste hors de la part physique.",
      "Les nouvelles lignes Scope 1 et Scope 2 partent en méthode physique.",
    ],
  },
  {
    id: "ratios",
    title: "Ratios monétaires",
    status: "bloque",
    paragraphs: [
      "Un ratio monétaire de repli en dinars tunisiens est libellé « Ratio monétaire non validé ABC ». Sa valeur numérique reste inchangée.",
      "La revue des ratios tunisiens est bloquée, dans l'attente d'une justification écrite.",
    ],
  },
  {
    id: "incertitude",
    title: "Incertitude et qualité",
    status: "a_valider",
    paragraphs: [
      "La qualité de la donnée reste sur trois libellés : mesurée, estimée, par défaut. La source et le taux d'incertitude sont optionnels.",
      "Sans taux, le bilan indique que l'incertitude n'est pas renseignée. Deux lignes entièrement renseignées se combinent par la racine de la somme des carrés. Dans les autres cas, le bilan reste sur « non renseigné ».",
      "Aucun pourcentage d'incertitude n'est inventé. L'échelle 1 à 5 de l'ACV et du PCAF reste séparée, à valider ABC.",
    ],
  },
  {
    id: "sources",
    title: "Sources de facteurs",
    status: "en_place",
    paragraphs: [
      "L'inventaire interne lit le registre utilisé pour le calcul : base interne, ADEME, UK, EPA et IPCC, dans le sous-ensemble déjà retenu.",
      "Agribalyse reste absente de ce registre. PCAF reste hors des bases du bilan d'organisation.",
      "Les notes stockées en base peuvent être plus anciennes que l'état actuel du calcul.",
    ],
  },
  {
    id: "doubles-comptes",
    title: "Doubles comptes",
    status: "a_valider",
    paragraphs: [
      "Chaque ligne d'activité entre une fois dans le total de l'organisation. Le résultat d'un site est la somme des lignes qui portent ce site. Une ligne sans site reste dans le total, dans l'ensemble non affecté.",
      "Une clé de répartition sur un scope déjà porté par des données du site est signalée. Elle n'est pas ajoutée à ces données. Une clé sur un scope sans donnée de site est une vue du total, pas une émission supplémentaire.",
      "Il n'y a pas d'écriture de transfert interne. Deux lignes saisies restent deux émissions. Les tags de documents ou de fournisseurs ne retirent pas une ligne du total. Une écriture qui annulerait une seconde saisie reste à valider ABC.",
    ],
  },
  {
    id: "emissions-evitees",
    title: "Émissions évitées",
    status: "en_place",
    paragraphs: [
      "Une émission évitée, un potentiel d'action ou un scénario reste hors du total du bilan.",
      "Le total affiché est celui des lignes calculées.",
    ],
  },
  {
    id: "sequestration",
    title: "Séquestration",
    status: "en_place",
    paragraphs: [
      "Une séquestration reste hors du total du bilan.",
      "Le CO₂ biogénique signalé reste hors des totaux de scopes.",
    ],
  },
  {
    id: "net-zero-initiative",
    title: "Net Zero Initiative",
    status: "a_valider",
    paragraphs: [
      "Aucune trajectoire Net Zero Initiative n'est calculée.",
      "Ce nom reste à valider ABC avant d'être présenté comme la référence du produit.",
    ],
  },
  {
    id: "trajectoire",
    title: "Trajectoire de réduction",
    status: "a_valider",
    paragraphs: [
      "La courbe demande une année de référence, des émissions de référence, une année cible et un pourcentage. Sans ces quatre informations, aucune courbe n'est tracée.",
      "La trajectoire de référence est la droite déjà calculée entre ces deux années. La trajectoire personnalisée suit les jalons enregistrés. Les émissions réalisées viennent des bilans stockés, le plus récent par année.",
      "Les tCO₂e estimées des actions restent hors de cette courbe. Une trajectoire nommée SBTi reste à valider ABC. Un pourcentage n'est enregistré que s'il est saisi.",
    ],
  },
  {
    id: "plan-de-transition",
    title: "Plan de transition",
    status: "a_valider",
    paragraphs: [
      "Le plan enregistre le titre, la description, le type, le poste, le site, le responsable, les dates, la priorité, le statut, le coût, l'indicateur, le potentiel estimé et la méthode d'estimation.",
      "Le potentiel estimé reste dans le plan. Le type fournisseurs repère une action du plan. Les plans fournisseurs détaillés restent dans le module fournisseurs.",
      "Le vocabulaire de la méthode d'estimation (mesure, facture, devis fournisseur, estimation interne) est descriptif. Une méthode nommée reste à valider ABC.",
    ],
  },
  {
    id: "amelioration-continue",
    title: "Amélioration continue",
    status: "en_place",
    paragraphs: [
      "Une action de type qualité des données peut être suivie dans le plan.",
      "L'incertitude et la méthode de la ligne peuvent rester vides. Le calcul n'impose aucun cycle d'amélioration.",
    ],
  },
  {
    id: "communication",
    title: "Communication, neutralité et contribution",
    status: "a_valider",
    paragraphs: [
      "Les formulations de neutralité, de contribution et de compensation restent à valider ABC avant toute communication publique.",
      "Ces notes ne déclarent pas de neutralité. Une compensation saisie comme type d'action reste dans le plan, hors du total du bilan.",
    ],
  },
];

export const METHOD_NOTE_IDS = METHOD_NOTES.map((note) => note.id);

export function methodNoteHref(id: string): string {
  return `/app/methode#${id}`;
}
