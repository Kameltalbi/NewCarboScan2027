export type SolutionSector = {
  key: string;
  slug: string;
  path: string;
  label: string;
  blurb: string;
};

export type SolutionModule = {
  path: string;
  label: string;
  blurb: string;
};

/** Sector marketing pages linked from Solutions */
export const SOLUTION_SECTORS: SolutionSector[] = [
  {
    key: "industrie",
    slug: "industrie",
    path: "/bilan-carbone-industrie",
    label: "Industrie",
    blurb: "Process, énergie, Scope 3 amont et plan de décarbonation industrielle.",
  },
  {
    key: "transport",
    slug: "transport",
    path: "/bilan-carbone-transport",
    label: "Transport",
    blurb: "Flottes, fret, carburants et logistique multi-modale.",
  },
  {
    key: "btp",
    slug: "btp",
    path: "/bilan-carbone-btp",
    label: "Construction",
    blurb: "Chantiers, matériaux, engins et reporting pour appels d’offres.",
  },
  {
    key: "agroalimentaire",
    slug: "agroalimentaire",
    path: "/bilan-carbone-agroalimentaire",
    label: "Agroalimentaire",
    blurb: "Agriculture, process, froid, packaging et chaîne d’approvisionnement.",
  },
  {
    key: "energie",
    slug: "energie",
    path: "/bilan-carbone-energie",
    label: "Énergie",
    blurb: "Production, réseaux et reporting énergétique.",
  },
];

/** Product / module marketing pages */
export const SOLUTION_MODULES: SolutionModule[] = [
  {
    path: "/bilan-carbone",
    label: "Bilan Carbone",
    blurb: "Inventaire GES Scopes 1, 2 et 3, facteurs d’émission et rapports.",
  },
  {
    path: "/facteurs-emission",
    label: "Facteurs d’émission",
    blurb: "Catalogue multi-sources documenté pour documenter vos calculs carbone.",
  },
  {
    path: "/collect",
    label: "Collecte de données",
    blurb: "Centralisez énergie, déplacements, achats et preuves d’activité.",
  },
  {
    path: "/empreinte-produit",
    label: "Empreinte Produit",
    blurb: "Product Carbon Footprint pour vos références et clients.",
  },
  {
    path: "/acv-landing",
    label: "Analyse du Cycle de Vie",
    blurb: "ACV produit : inventaires, impacts et exports d’étude.",
  },
  {
    path: "/cbam",
    label: "CBAM / MACF",
    blurb: "Préparez les déclarations d’export vers l’Union européenne.",
  },
  {
    path: "/decarbotech",
    label: "Monitoring & Réduction",
    blurb: "Leviers d’action et suivi des réductions après le bilan.",
  },
  {
    path: "/wattbim",
    label: "WattBim",
    blurb: "Suivi énergétique des bâtiments et Scope 2.",
  },
  {
    path: "/solutions/accompagnement",
    label: "Accompagnement",
    blurb: "Diagnostic, plan d’actions et suivi avec nos équipes.",
  },
];

export const SOLUTION_HUB_FAQS: { question: string; answer: string }[] = [
  {
    question: "Qu’est-ce qu’un bilan carbone d’entreprise ?",
    answer:
      "C’est l’inventaire des gaz à effet de serre liés à votre activité, généralement structuré en Scopes 1, 2 et 3 selon le GHG Protocol. CarboScan vous aide à collecter les données d’activité, appliquer des facteurs d’émission et produire un rapport exploitable.",
  },
  {
    question: "Quels secteurs CarboScan couvre-t-il ?",
    answer:
      "Des pages dédiées existent pour l’industrie, le transport, la construction, l’agroalimentaire et l’énergie. Les modules (bilan, collecte, empreinte produit, ACV, CBAM, WattBim) s’adaptent ensuite à votre organisation.",
  },
  {
    question: "Quelle est la différence entre bilan carbone, empreinte produit et ACV ?",
    answer:
      "Le bilan carbone porte sur l’organisation (année, sites, scopes). L’empreinte produit (PCF) porte sur une référence. L’ACV élargit l’analyse du cycle de vie au-delà du seul indicateur GES. Ces modules s’appuient sur la même collecte de données.",
  },
  {
    question: "Comment démarrer ?",
    answer:
      "Vous pouvez estimer un premier ordre de grandeur via le bilan gratuit, demander une démo, ou démarrer une collecte guidée. Un accompagnement humain reste disponible pour cadrer le périmètre et la méthodologie.",
  },
];
