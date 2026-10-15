import type { Analysis, RankedLine, ScopeResult } from "./analyze.js";
import { analyze } from "./analyze.js";
import { SCOPE_COLOR, compositionBar, rankedPosts, scopeDonut, yearComparison } from "./charts.js";
import { factorTimeLabel } from "./factorTime.js";
import { ateliersDuSahel } from "./fixtures/ateliersDuSahel.js";
import { formatFr, frenchList, percentPhrase, tonnesPhrase } from "./format.js";
import { buildReductionPlan } from "./recommendations.js";
import { DEFAULT_ANALYSIS_OPTIONS, type AnalysisOptions, type ReportData, type Scope } from "./types.js";

export interface Paragraph {
  text: string;
  factIds: string[];
  slot?: "executive_summary" | "scope_analysis" | "significant_post" | "recommendation";
  slotKey?: string;
}

export interface Column {
  key: string;
  label: string;
  align: "left" | "right";
  width?: string;
}

export type Block =
  | { type: "paragraphs"; items: Paragraph[] }
  | { type: "kpis"; items: { label: string; value: string; unit: string }[] }
  | { type: "chart"; title: string; svg: string; caption: string; compact?: boolean }
  | {
      type: "cards";
      items: {
        title: string;
        comment: string;
        slot?: "recommendation";
        slotKey?: string;
        rows: { label: string; value: string }[];
      }[];
    }
  | { type: "table"; dense?: boolean; columns: Column[]; rows: Record<string, string>[]; note: string | null }
  | { type: "callout"; kind: "method" | "limit" | "hypothesis"; title: string; text: string }
  | { type: "list"; items: string[] }
  | { type: "subhead"; text: string }
  | { type: "pair"; left: Block; right: Block; emphasis?: "right" }
  | { type: "messages"; items: { title: string; text: string }[] };

export interface Section {
  id: string;
  number: string;
  title: string;
  blocks: Block[];
  /** Page dédiée, le sommaire vient ensuite. */
  breakAfter?: boolean;
  /** Annexes plus serrées, pour éviter une page résiduelle. */
  compact?: boolean;
}

export interface ReportViewModel {
  schemaVersion: "1.0";
  document: {
    companyName: string;
    year: string;
    exerciseLabel: string;
    coverMeta: string;
    totalDisplay: string;
    totalUnit: string;
    coverFoot: string;
    footerLeft: string;
    pdfTitle: string;
    pdfDescription: string;
    periodLabel: string;
    methodology: string;
    methodologyVersion: string;
    consolidation: string;
    electricityAccounting: string;
    country: string;
    sector: string;
    sites: string;
    version: string;
    status: string;
    preparedOn: string;
  };
  sections: Section[];
}

const QUALITY_LABEL = { primary: "Primaire", estimated: "Estimée", default: "Défaut" } as const;
const STATUS_LABEL = {
  not_reported: "Non évalué",
  excluded: "Exclu",
  not_applicable: "Non applicable",
} as const;
const METHOD_LABEL = {
  invoice: "Facture",
  measured_zero: "Mesure nulle",
  proxy_monetary: "Proxy monétaire",
  modeled: "Modélisé",
  extrapolated: "Extrapolation",
  maintenance_estimate: "Estimation",
} as const;

export function buildViewModel(
  data: ReportData = ateliersDuSahel,
  options: AnalysisOptions = DEFAULT_ANALYSIS_OPTIONS,
): ReportViewModel {
  const analysis = analyze(data, options);
  const chapters = [
    synthese(data, analysis),
    entreprise(data),
    objectifs(data),
    methodologie(data, analysis),
    resultats(data, analysis),
    scopes(data, analysis),
    postes(analysis),
    recommandations(analysis),
    planAction(analysis),
    qualite(analysis),
    evolution(data, analysis),
    pilotage(),
    limites(),
  ].filter((section): section is Section => section !== null);
  chapters.forEach((section, index) => {
    section.number = String(index + 1).padStart(2, "0");
  });
  const annex = annexes(data, analysis);
  annex.number = "A";
  const sections = [...chapters, annex];

  return {
    schemaVersion: "1.0",
    document: {
      companyName: data.company.name,
      year: String(data.inventory.year),
      exerciseLabel: `Exercice ${data.inventory.year}`,
      coverMeta: `${data.company.country} · ${data.inventory.consolidation} · GHG Protocol`,
      totalDisplay: formatFr(analysis.totalTonnes),
      totalUnit: "tCO₂e inventoriées",
      coverFoot: "Version 1.5 · Brouillon · Données fictives contrôlées · Validation humaine requise · Inventaire non vérifié par un tiers",
      footerLeft: `${data.company.name} · Exercice ${data.inventory.year} · Données fictives`,
      pdfTitle: `Bilan GES ${data.inventory.year} — ${data.company.name}`,
      pdfDescription: "Rapport standard de référence, jeu fictif contrôlé, sans rédaction par IA.",
      periodLabel: data.inventory.periodLabel,
      methodology: data.inventory.methodology,
      methodologyVersion: data.inventory.methodologyVersion,
      consolidation: data.inventory.consolidation,
      electricityAccounting: data.inventory.electricityAccounting,
      country: data.company.country,
      sector: data.company.sector,
      sites: data.company.sites
        .map((site) => `${site.charAt(0).toUpperCase()}${site.slice(1)}`)
        .join(" ; "),
      version: "1.5",
      status: "Brouillon de référence",
      preparedOn: "14 octobre 2026",
    },
    sections,
  };
}

export function buildReferenceModel(): ReportViewModel {
  return buildViewModel();
}

function proseCompany(legalName: string): string {
  if (legalName.startsWith("Les ")) return `des ${legalName.slice(4)}`;
  if (legalName.startsWith("Le ")) return `du ${legalName.slice(3)}`;
  return legalName;
}

function synthese(data: ReportData, analysis: Analysis): Section {
  const byScope = Object.fromEntries(analysis.scopes.map((scope) => [scope.scope, scope])) as Record<Scope, ScopeResult>;
  const reported = analysis.scopes.filter((scope) => scope.status === "reported" && scope.share && scope.tonnes);
  const top = analysis.ranked.slice(0, 5);
  const messages: { title: string; text: string }[] = [];
  const purchases = analysis.ranked.find((line) => line.method === "proxy_monetary");
  if (purchases) {
    messages.push({
      title: "Le premier poste n'est pas une mesure physique",
      text: `« ${purchases.label} » représente ${tonnesPhrase(purchases.tonnes)}, soit ${percentPhrase(purchases.share.displayPct)} du total. Le facteur est monétaire : il ne décrit pas les tonnes de carton. Avant toute substitution matière, il faut des données physiques fournisseurs.`,
    });
  }
  if (analysis.comparison.status === "available" && analysis.comparison.rateDisplayPct) {
    messages.push({
      title: "La variation ne se déduit pas d'un poste",
      text: `Le total varie de ${percentPhrase(analysis.comparison.rateDisplayPct)} par rapport à ${analysis.comparison.priorYear}. ${analysis.comparison.basis ?? ""} Ce n'est pas une réduction attribuable à des actions. Les scénarios ne sont pas soustraits de l'inventaire.`,
    });
  }
  return {
    id: "synthese",
    number: "",
    title: "Synthèse exécutive",
    blocks: [
      {
        type: "kpis",
        items: [
          { label: "Émissions inventoriées", value: formatFr(analysis.totalTonnes), unit: "tCO₂e" },
          {
            label: "Part du scope 3",
            value: byScope[3].share ? formatFr(byScope[3].share.displayPct) : "—",
            unit: byScope[3].share ? "%" : "non évalué",
          },
          {
            label: "Variation du total",
            value: analysis.comparison.rateDisplayPct ? formatFr(analysis.comparison.rateDisplayPct) : "—",
            unit: analysis.comparison.status === "available" ? `% vs ${analysis.comparison.priorYear}` : "non disponible",
          },
        ],
      },
      {
        type: "paragraphs",
        items: [
          {
            factIds: ["inventory.total"],
            slot: "executive_summary",
            slotKey: "executive",
            text: `Les émissions inventoriées ${proseCompany(data.company.name)} pour l'exercice ${data.inventory.year} s'élèvent à ${tonnesPhrase(analysis.totalTonnes)}. ${scopeSentence(byScope)} Les critères internes de sélection des postes sont expliqués avec leur classement.`.trim(),
          },
        ],
      },
      {
        type: "paragraphs",
        items: [
          {
            factIds: analysis.intensities.filter((item) => item.executiveDisplay).map((item) => `intensity.${item.id}`),
            text: `Les intensités de lecture, arrondies à une décimale, sont ${frenchList(
              analysis.intensities
                .filter((item) => item.executiveDisplay)
                .map((item) => `${formatFr(item.executiveDisplay!)} ${item.displayUnit}`),
            )}.`,
          },
        ],
      },
      {
        type: "pair",
        emphasis: "right",
        left: {
          type: "chart",
          title: "Répartition par scope",
          caption: "Parts à une décimale. La somme est commentée avec les résultats.",
          svg: scopeDonut({
            label: "Répartition par scope",
            center: formatFr(analysis.totalTonnes),
            centerUnit: "tCO₂e",
            slices: reported.map((scope) => ({
              label: `Scope ${scope.scope}`,
              share: scope.share!.displayPct,
              color: SCOPE_COLOR[scope.scope],
            })),
          }),
        },
        right: {
          type: "chart",
          title: "Cinq premiers postes",
          caption: "Classement décroissant. Le seuil de qualification est traité plus loin.",
          svg: rankedPosts({
            label: "Cinq premiers postes",
            rows: top.map((line) => ({
              label: line.label,
              display: `${formatFr(line.tonnes)} t`,
              share: line.share.displayPct,
              magnitude: line.kgCo2e,
              color: SCOPE_COLOR[line.scope],
            })),
          }),
        },
      },
      { type: "messages", items: messages },
    ],
  };
}

function entreprise(data: ReportData): Section {
  const employees = data.denominators.find((item) => item.id === "employees");
  const revenue = data.denominators.find((item) => item.id === "revenue");
  const production = data.denominators.find((item) => item.id === "production");
  const facts: string[] = [];
  if (employees?.value) facts.push(`L'effectif déclaré est de ${formatFr(employees.value)} personnes.`);
  if (revenue?.value) facts.push(`Le chiffre d'affaires déclaré est de ${formatFr(revenue.value)} ${revenue.unit}.`);
  if (production?.value) facts.push(`La production déclarée est de ${formatFr(production.value)} ${production.unit}.`);
  const sector = data.company.sector.trim() || "secteur non renseigné";
  const sites = data.company.sites.length
    ? `Les sites décrits sont ${frenchList(data.company.sites)}.`
    : "Aucun site n'est décrit.";
  return {
    id: "entreprise",
    number: "",
    title: "Présentation de l'entreprise",
    blocks: [
      {
        type: "paragraphs",
        items: [
          {
            factIds: ["company.employees", "company.revenue", "company.production"],
            text: `État du chapitre : partiel. ${data.company.name} est présentée par son secteur déclaré, ${sector}, en ${data.company.country}. ${sites} ${facts.join(" ")} Les procédés et les équipements ne sont pas décrits : les émissions ne peuvent pas être reliées à une étape de fabrication. À collecter : la description des procédés et la liste des équipements énergétiques.`.trim(),
          },
        ],
      },
      {
        type: "table",
        note: null,
        columns: [
          { key: "label", label: "Élément", align: "left", width: "36%" },
          { key: "value", label: "Déclaré", align: "left", width: "64%" },
        ],
        rows: [
          { label: "Pays", value: data.company.country },
          { label: "Secteur", value: data.company.sector },
          { label: "Sites", value: data.company.sites.join(" ; ") },
          { label: "Période", value: data.inventory.periodLabel },
          { label: "Consolidation", value: data.inventory.consolidation },
          { label: "Électricité", value: data.inventory.electricityAccounting },
        ],
      },
    ],
  };
}

function objectifs(data: ReportData): Section {
  return {
    id: "objectifs",
    number: "",
    title: "Objectifs et périmètre du bilan",
    blocks: [
      {
        type: "paragraphs",
        items: [
          {
            factIds: ["inventory.year", "inventory.period"],
            text: `État du chapitre : partiel. Le document présente l'inventaire de l'exercice ${data.inventory.year}, sur la période déclarée. Le périmètre organisationnel retient les sites décrits, en consolidation par ${data.inventory.consolidation.toLowerCase()}. Aucune année de référence n'est désignée pour un objectif : ${data.comparison.priorYear ? `l'exercice ${data.comparison.priorYear} n'est qu'un total antérieur` : "aucun total antérieur n'est disponible"}. Ce total ne peut donc pas ancrer une trajectoire. Le périmètre opérationnel distingue les postes inclus des catégories exclues, non applicables ou non évaluées. À collecter : une année de référence explicitement adoptée, et la liste des entités incluses dans le contrôle opérationnel.`,
          },
        ],
      },
      {
        type: "callout",
        kind: "method",
        title: "Investissements",
            text: "Les investissements ne sont pas déclarés non applicables au seul motif que l'entreprise n'est pas une institution financière. Aucune participation n'a été examinée dans ce jeu : la catégorie reste non évaluée.",
      },
      {
        type: "callout",
        kind: "method",
        title: "Absence n'égale pas zéro",
        text: "Une catégorie absente, exclue ou non applicable n'est pas convertie en émission nulle. Le seul zéro du jeu est un poste mesuré : le fioul domestique du siège. Le CO₂ biogénique n'est pas évalué.",
      },
      {
        type: "table",
        note: null,
        columns: [
          { key: "label", label: "Catégorie", align: "left", width: "34%" },
          { key: "status", label: "Statut", align: "left", width: "22%" },
          { key: "reason", label: "Motif", align: "left", width: "44%" },
        ],
        rows: data.boundary.map((item) => ({
          label: item.label,
          status: STATUS_LABEL[item.status],
          reason: item.reason,
        })),
      },
    ],
  };
}

function resultats(data: ReportData, analysis: Analysis): Section {
  const blocks: Block[] = [
    {
      type: "paragraphs",
      items: [
        {
          factIds: ["inventory.total", "rounding.sum"],
          text: `Le total retenu est la somme des postes inclus : ${tonnesPhrase(analysis.totalTonnes)}. ${scopeSentence(byScope(analysis))} ${roundingSentence(analysis.scopeShareSumDisplayPct, analysis.scopeShareResidualDisplayPct)}`,
        },
      ],
    },
    {
      type: "table",
      note: "Parts arrondies indépendamment, sans réajustement de la dernière ligne.",
      columns: [
        { key: "scope", label: "Scope", align: "left" },
        { key: "emissions", label: "Émissions (tCO₂e)", align: "right" },
        { key: "share", label: "Part", align: "right" },
        { key: "status", label: "Statut", align: "left" },
      ],
      rows: analysis.scopes.map((scope) => ({
        scope: `Scope ${scope.scope}`,
        emissions: scope.tonnes ? formatFr(scope.tonnes) : "Non évalué",
        share: scope.share ? percentPhrase(scope.share.displayPct) : "—",
        status: scope.status === "reported" ? "Évalué" : "Non évalué",
      })),
    },
  ];

  const computed = analysis.intensities.filter((item) => item.status === "computed" && item.executiveDisplay);
  if (computed.length > 0) {
    blocks.push({
      type: "paragraphs",
      items: [
        {
          factIds: computed.map((item) => `intensity.${item.id}`),
          text: `Rapportées aux dénominateurs fournis, les intensités se lisent à ${frenchList(computed.map((item) => `${formatFr(item.executiveDisplay!)} ${item.displayUnit}`))}. L'arrondi de lecture est à une décimale. L'annexe conserve l'arrondi fin. Un dénominateur absent ou nul ne produit pas d'intensité.`,
        },
      ],
    });
    blocks.push({
      type: "table",
      note: "Lecture du corps du rapport. L'annexe donne l'arrondi fin.",
      columns: [
        { key: "label", label: "Indicateur", align: "left" },
        { key: "denominator", label: "Dénominateur", align: "right" },
        { key: "display", label: "Intensité", align: "right" },
      ],
      rows: computed.map((item) => ({
        label: item.label,
        denominator: `${formatFr(item.denominator!)} ${data.denominators.find((entry) => entry.id === item.id)?.unit ?? ""}`.trim(),
        display: `${formatFr(item.executiveDisplay!)} ${item.displayUnit}`,
      })),
    });
  }

  const unavailable = analysis.intensities.filter((item) => item.status === "not_available");
  if (unavailable.length > 0) {
    blocks.push({
      type: "list",
      items: unavailable.map((item) => `${item.label} : ${item.reason}`),
    });
  }

  return { id: "resultats", number: "", title: "Résultats consolidés", blocks };
}

function methodologie(data: ReportData, analysis: Analysis): Section {
  const methods = [...new Set(analysis.ranked.map((line) => METHOD_LABEL[line.method]))];
  return {
    id: "methodologie",
    number: "",
    title: "Méthodologie de quantification",
    blocks: [
      {
        type: "paragraphs",
        items: [
          {
            factIds: ["inventory.method"],
            text: `État du chapitre : partiel. Le référentiel déclaré est le ${data.inventory.methodology}. Le tableau ci-dessous dit ce qui est déclaré et ce qui n'est pas vérifié. Aucune conformité n'est constatée. Chaque ligne incluse est quantifiée par quantité d'activité multipliée par un facteur d'émission. Les méthodes de collecte présentes sont ${frenchList(methods.map((method) => method.toLowerCase()))}. L'incertitude déclarée sur une ligne n'est pas décomposée entre l'activité et le facteur : aucun résultat d'incertitude combinée n'est produit. À collecter : ces deux incertitudes, la zone du facteur et sa période de validité.`,
          },
        ],
      },
      {
        type: "table",
        note: "Les noms de référentiels situent la méthode. Ils ne constatent pas une conformité.",
        columns: [
          { key: "ref", label: "Référentiel", align: "left", width: "42%" },
          { key: "status", label: "Statut dans ce rapport", align: "left", width: "58%" },
        ],
        rows: [
          { ref: "GHG Protocol Corporate Standard", status: "Référentiel déclaré. Exigences non toutes vérifiées." },
          { ref: "GHG Protocol Scope 3 Standard", status: "Grille de lecture des catégories. Conformité non vérifiée." },
          { ref: "ISO 14064-1", status: "Non déclaré. Non utilisé pour affirmer une conformité." },
        ],
      },
      {
        type: "callout",
        kind: "method",
        title: "Électricité",
        text: `La méthode documentée est ${data.inventory.electricityAccounting.toLowerCase()} : le facteur du réseau, sans instrument contractuel. Aucune donnée market-based n'est fournie, donc aucun résultat market-based n'est calculé.`,
      },
      {
        type: "callout",
        kind: "method",
        title: "Facteurs",
        text: "Les facteurs du catalogue interne Core TN sont distingués des facteurs de démonstration. Un facteur de démonstration appartient à ce jeu fictif : ce n'est pas un facteur publié pour une entreprise réelle. Lorsque le millésime de version est postérieur à l'exercice, l'annexe signale que l'applicabilité temporelle n'est pas démontrée. Les facteurs ne sont pas remplacés. La zone géographique et la méthode de construction du facteur ne sont pas des champs du modèle : elles ne sont pas déduites du nom de la source.",
      },
    ],
  };
}

function scopes(data: ReportData, analysis: Analysis): Section {
  const blocks: Block[] = [];
  for (const scope of analysis.scopes) {
    blocks.push({ type: "subhead", text: `Scope ${scope.scope}` });
    if (scope.status !== "reported" || !scope.tonnes || !scope.share) {
      blocks.push({
        type: "paragraphs",
        items: [
          {
            factIds: [`scope.${scope.scope}`],
            text: `Le scope ${scope.scope} n'est pas évalué. Aucune émission n'est inscrite pour ce scope, et cette absence n'est pas convertie en zéro.`,
          },
        ],
      });
      continue;
    }
    const lines = analysis.ranked.filter((line) => line.scope === scope.scope);
    const zero = analysis.zeros.filter((line) => line.scope === scope.scope);
    blocks.push({
      type: "paragraphs",
          items: [{
            factIds: [`scope.${scope.scope}`],
            slot: "scope_analysis",
            slotKey: `scope-${scope.scope}`,
            text: scopeComment(scope, lines, zero),
          }],
    });
    blocks.push(lineTable([...lines, ...zero]));
    if (scope.scope === 2) {
      blocks.push({
        type: "paragraphs",
        items: [
          {
            factIds: ["scope.2.boundary"],
            text: "Le résultat location-based couvre les émissions de production de l'électricité achetée et consommée, avec le facteur du réseau. Le market-based n'est pas calculé. Les émissions amont des combustibles et de l'énergie, lorsqu'elles relèvent du scope 3, ne forment pas une ligne distincte ici. Cette absence ne retire pas la production de l'électricité achetée du scope 2.",
          },
        ],
      });
    }
    if (scope.scope === 3) {
      const outside = data.boundary.filter((item) => item.id !== "heat");
      blocks.push({
        type: "paragraphs",
        items: [
          {
            factIds: ["boundary.scope3"],
            text: `Catégories de chaîne de valeur hors somme : ${frenchList(outside.map((item) => `${item.label}, ${STATUS_LABEL[item.status].toLowerCase()}`))}. Leur motif est dans le tableau du périmètre. La chaleur et la vapeur achetées relèvent de l'énergie achetée : elles sont non applicables dans ce jeu, pas une catégorie du scope 3. Conséquence : le scope 3 publié ne couvre pas les biens d'équipement ni les investissements. À collecter : les immobilisations de l'exercice et les participations examinées.`,
          },
        ],
      });
    }
  }
  return { id: "scopes", number: "", title: "Analyse détaillée des scopes", blocks };
}

function postes(analysis: Analysis): Section {
  const coverage = analysis.significantCoverage;
  const blocks: Block[] = [
    {
      type: "paragraphs",
      items: [
        {
          factIds: ["analysis.threshold", "analysis.coverage"],
          text: coverage
            ? `État du chapitre : complet. Le seuil individuel de ${percentPhrase(analysis.thresholdDisplayPct)} et la cible cumulative de ${percentPhrase(analysis.coverageTargetDisplayPct)} sont des critères internes de sélection. Ils ne reprennent pas une exigence du GHG Protocol. ${significantSentence(analysis, coverage.displayPct)} ${nextBelowThreshold(analysis)} Le classement priorise la collecte. Il ne déclare pas le bilan couvert. Le cumul du tableau est calculé sur les parts exactes, puis arrondi : il peut différer de la somme des parts affichées.`
            : "Le total inclus est nul. Aucune part n'est calculée.",
        },
      ],
    },
  ];
  const posterior = analysis.significant.filter((line) => line.factorTime === "posterieur");
  if (posterior.length > 0) {
    const subject = frenchList(posterior.map((line) => `« ${line.label} »`));
    const verb = posterior.length > 1 ? "utilisent" : "utilise";
    blocks.push({
      type: "paragraphs",
      items: [
        {
          factIds: posterior.map((line) => line.factId),
          text: `${subject} ${verb} un facteur dont le millésime est postérieur à l'exercice. L'applicabilité temporelle ${posterior.length > 1 ? "de ces facteurs" : "de ce facteur"} n'est pas démontrée.`,
        },
      ],
    });
  }
  for (const [index, line] of analysis.significant.entries()) {
    blocks.push({
      type: "paragraphs",
      items: [
        {
          factIds: [line.factId],
          slot: "significant_post",
          slotKey: `post-${line.id}`,
          text: postComment(line, index + 1),
        },
      ],
    });
  }
  blocks.push(rankingTable(analysis.ranked));
  return { id: "postes", number: "", title: "Postes significatifs", blocks };
}

function qualite(analysis: Analysis): Section {
  const reported = analysis.quality.filter((slice) => slice.status === "reported" && slice.share && slice.tonnes);
  const missing = analysis.quality.filter((slice) => slice.status === "not_reported");
  const qualityList = frenchList(
    reported.map((slice) => `les données ${QUALITY_LABEL[slice.quality].toLowerCase()}s représentent ${percentPhrase(slice.share!.displayPct)}`),
  );
  const blocks: Block[] = [
    {
      type: "paragraphs",
      items: [
        {
          factIds: reported.map((slice) => `quality.${slice.quality}`),
          text: `État du chapitre : partiel. En part des kilogrammes inclus, ${qualityList}. ${missing.map((slice) => `Classe ${QUALITY_LABEL[slice.quality].toLowerCase()} : aucune ligne.`).join(" ")} Cette répartition décrit la classe unique déclarée sur chaque ligne. Elle n'est pas un indice de fiabilité du bilan. Le modèle ne sépare pas la qualité du facteur, ni l'incertitude de l'activité, ni celle du facteur, ni celle du résultat. Les pourcentages présents sont des incertitudes déclarées sur les lignes, pas des intervalles de confiance. Aucun autre n'est calculé. La représentativité temporelle, géographique et technologique n'est pas renseignée. À collecter : la provenance de chaque incertitude, ces trois représentativités et les deux incertitudes séparées.`,
        },
      ],
    },
    {
      type: "table",
      note: "Une case « non séparée » ou « non renseignée » n'est pas convertie en pourcentage.",
      columns: [
        { key: "item", label: "Élément", align: "left", width: "46%" },
        { key: "status", label: "Dans ce jeu", align: "left", width: "54%" },
      ],
      rows: [
        { item: "Nature de la donnée d'activité", status: "Une classe par ligne : primaire, estimée ou défaut" },
        { item: "Méthode de collecte", status: "Renseignée sur chaque ligne incluse" },
        { item: "Qualité du facteur", status: "Non séparée de la classe de la ligne" },
        { item: "Représentativité temporelle, géographique, technologique", status: "Non renseignée" },
        { item: "Incertitude de l'activité", status: "Non séparée" },
        { item: "Incertitude du facteur", status: "Non séparée" },
        { item: "Incertitude du résultat", status: "Non calculée" },
      ],
    },
  ];
  if (reported.length > 0) {
    blocks.push({
      type: "chart",
      title: "Qualité des données, en part des émissions",
      caption: "Part des kilogrammes par classe déclarée. Ce graphique n'est pas un indice de fiabilité.",
      svg: compositionBar({
        label: "Qualité des données",
        segments: reported.map((slice) => ({
          label: QUALITY_LABEL[slice.quality],
          share: slice.share!.displayPct,
          color: slice.quality === "estimated" ? "#8C7340" : "#073F35",
        })),
      }),
    });
  }
  return { id: "qualite", number: "", title: "Qualité des données", blocks };
}

function recommandations(analysis: Analysis): Section {
  const plan = buildReductionPlan(analysis);
  const significant = plan.filter((item) => item.slotKey);
  const extras = plan.filter((item) => !item.significant);
  const blocks: Block[] = [
    {
      type: "callout",
      kind: "hypothesis",
      title: "Propositions, pas des engagements",
      text: "Ces propositions sont déduites des postes au-dessus du seuil interne et des fiches déjà enregistrées. Ce ne sont pas des engagements, ni des solutions déjà mises en œuvre. Aucun budget n'est estimé. Aucun gain n'est soustrait de l'inventaire.",
    },
  ];
  if (significant.length === 0 && extras.length === 0) {
    blocks.push({
      type: "paragraphs",
      items: [
        {
          factIds: ["actions.none"],
          text: "État du chapitre : non documenté. Aucun poste significatif et aucune fiche ne sont enregistrés. Aucune recommandation n'est déduite.",
        },
      ],
    });
  }
  for (const item of significant) {
    blocks.push({ type: "subhead", text: item.postLabel });
    blocks.push({
      type: "paragraphs",
      items: [
        {
          factIds: [`recommendation.${item.id}`],
          slot: "recommendation",
          slotKey: item.slotKey ?? undefined,
          text: item.prose,
        },
      ],
    });
  }
  if (extras.length > 0) {
    blocks.push({
      type: "paragraphs",
      items: [
        {
          factIds: extras.map((item) => `recommendation.${item.id}`),
          text: `Des fiches existent hors des postes significatifs : ${frenchList(extras.map((item) => `« ${item.postLabel} »`))}. Elles sont reprises dans le plan d'action. Elles ne deviennent pas significatives pour autant.`,
        },
      ],
    });
  }
  return { id: "recommandations", number: "", title: "Recommandations de décarbonation", blocks };
}

function planAction(analysis: Analysis): Section {
  const plan = buildReductionPlan(analysis);
  const recorded = analysis.actions.length > 0;
  const blocks: Block[] = [
    {
      type: "paragraphs",
      items: [
        {
          factIds: ["actions.plan"],
          text: recorded
            ? "Les lignes justifiées par les données suivent la méthode ou le statut du facteur. Les lignes conditionnelles exigent une étude ou un scénario qui n'est pas acquis. Une fiche enregistrée n'est pas une décision. Un horizon enregistré n'est pas une date d'engagement. Le responsable n'est pas désigné. Les gains existent seulement lorsqu'une hypothèse de part est déjà dans le dossier : ils ne s'additionnent pas et ne sont pas soustraits de l'inventaire."
            : "Aucune action de réduction n'est enregistrée. Les lignes ci-dessous, lorsqu'il y en a, sont des propositions déduites des postes. Aucun gain n'est calculé. Ce ne sont pas des engagements.",
        },
      ],
    },
  ];
  if (plan.length === 0) {
    blocks.push({
      type: "paragraphs",
      items: [
        {
          factIds: ["actions.empty"],
          text: "Aucun poste significatif n'est disponible. Le plan d'action reste vide.",
        },
      ],
    });
    return { id: "plan-action", number: "", title: "Plan d'action de réduction des émissions", blocks };
  }
  blocks.push(
    { type: "subhead", text: "Lecture" },
    planTable(
      [
        { key: "post", label: "Poste", align: "left", width: "28%" },
        { key: "basis", label: "Nature", align: "left", width: "24%" },
        { key: "priority", label: "Priorité", align: "left", width: "14%" },
        { key: "gain", label: "Gain potentiel", align: "left", width: "34%" },
      ],
      plan.map((item) => ({
        post: item.postLabel,
        basis: item.basisLabel,
        priority: item.priority,
        gain: item.gainLabel,
      })),
      "Un gain affiché est le produit déjà calculé d'une hypothèse de part par les émissions du poste. Il n'est pas une réduction constatée.",
    ),
    { type: "subhead", text: "Mise en œuvre" },
    planTable(
      [
        { key: "post", label: "Poste", align: "left", width: "22%" },
        { key: "action", label: "Action proposée", align: "left", width: "30%" },
        { key: "objective", label: "Objectif", align: "left", width: "24%" },
        { key: "indicator", label: "Indicateur de suivi", align: "left", width: "24%" },
      ],
      plan.map((item) => ({
        post: item.postLabel,
        action: item.action,
        objective: item.objective,
        indicator: item.indicator,
      })),
      null,
    ),
    { type: "subhead", text: "Suivi" },
    planTable(
      [
        { key: "post", label: "Poste", align: "left", width: "24%" },
        { key: "horizon", label: "Horizon indicatif", align: "left", width: "18%" },
        { key: "owner", label: "Responsable", align: "left", width: "16%" },
        { key: "missing", label: "Données nécessaires", align: "left", width: "42%" },
      ],
      plan.map((item) => ({
        post: item.postLabel,
        horizon: item.horizon,
        owner: item.owner,
        missing: item.missing,
      })),
      "L'horizon indicatif reprend la fiche lorsqu'elle existe. Il ne crée pas de date d'engagement. Le responsable reste à désigner.",
      false,
    ),
  );
  return { id: "plan-action", number: "", title: "Plan d'action de réduction des émissions", blocks };
}

function planTable(
  columns: { key: string; label: string; align: "left" | "right"; width: string }[],
  rows: Record<string, string>[],
  note: string | null,
  dense = true,
): Block {
  return { type: "table", dense, columns, rows, note };
}

function evolution(data: ReportData, analysis: Analysis): Section {
  const blocks: Block[] = [
    {
      type: "paragraphs",
      items: [
        {
          factIds: ["comparison.rate"],
          text:
            analysis.comparison.status === "available" && analysis.comparison.rateDisplayPct
              ? `État du chapitre : partiel. Le total varie de ${percentPhrase(analysis.comparison.rateDisplayPct)} entre ${analysis.comparison.priorYear} et ${data.inventory.year}. ${analysis.comparison.basis ?? ""} Cette variation n'est pas une réduction attribuable à des actions de décarbonation. Aucun changement de périmètre, de méthode ou de facteur n'est documenté. Aucune cause n'est donc attribuée. À collecter : l'inventaire antérieur par poste, avec le même périmètre et les mêmes méthodes.`
              : "État du chapitre : non documenté. Aucun total antérieur comparable n'est fourni. Aucune évolution n'est calculée.",
        },
      ],
    },
  ];
  if (analysis.comparison.status === "available" && analysis.comparison.priorTonnes && data.comparison.priorTotalKgCo2e) {
    blocks.push({
      type: "chart",
      title: "Total de l'exercice et total précédent",
      caption: "Comparaison limitée au total. Les postes ne sont pas mis en regard.",
      svg: yearComparison({
        label: "Comparaison des totaux",
        priorYear: String(analysis.comparison.priorYear),
        prior: `${formatFr(analysis.comparison.priorTonnes)} tCO₂e`,
        priorMagnitude: data.comparison.priorTotalKgCo2e,
        currentYear: String(data.inventory.year),
        current: `${formatFr(analysis.totalTonnes)} tCO₂e`,
        currentMagnitude: analysis.totalKgCo2e,
      }),
    });
  }
  return { id: "evolution", number: "", title: "Évolution des émissions", blocks };
}

function pilotage(): Section {
  return {
    id: "pilotage",
    number: "",
    title: "Objectifs, trajectoire et pilotage",
    blocks: [
      {
        type: "paragraphs",
        items: [
          {
            factIds: ["targets.none"],
            text: "État du chapitre : non documenté. Aucun objectif climatique adopté, aucune échéance et aucun indicateur de pilotage ne sont enregistrés. Aucune trajectoire n'est générée. Les propositions et le plan d'action ne tiennent pas lieu d'objectif.",
          },
        ],
      },
    ],
  };
}

function limites(): Section {
  return {
    id: "limites",
    number: "",
    title: "Limites et perspectives",
    blocks: [
      {
        type: "paragraphs",
        items: [
          {
            factIds: ["limits.summary"],
            text: "État du chapitre : partiel. Le bilan n'est pas vérifié par un tiers et n'est pas présenté comme conforme à un référentiel. Les catégories du tableau de périmètre restent hors somme. Le CO₂ biogénique n'est pas évalué. Les procédés, la représentativité des facteurs et le market-based ne sont pas documentés.",
          },
        ],
      },
      {
        type: "list",
        items: [
          "À collecter : procédés et équipements énergétiques.",
          "Une année de référence explicitement adoptée, si l'entreprise en décide une.",
          "Instruments d'électricité, zone et période de validité des facteurs, incertitudes séparées de l'activité et du facteur.",
          "L'inventaire de l'exercice précédent par poste.",
          "Des données physiques d'achats, des immobilisations et des participations examinées.",
        ],
      },
    ],
  };
}

function annexes(data: ReportData, analysis: Analysis): Section {
  const inventory = [...analysis.ranked, ...analysis.zeros];
  const factors = uniqueFactors(inventory);
  return {
    id: "annexes",
    number: "",
    title: "Annexes",
    compact: true,
    blocks: [
      { type: "subhead", text: "Inventaire des postes inclus" },
      {
        type: "table",
        dense: true,
        note: "Le résultat déclaré de chaque ligne est égal à quantité × facteur. Cette égalité contrôle le jeu ; elle ne republie pas un calcul Carboscan.",
        columns: [
          { key: "label", label: "Poste", align: "left", width: "22%" },
          { key: "scope", label: "Sc.", align: "right", width: "6%" },
          { key: "activity", label: "Activité", align: "right", width: "16%" },
          { key: "factor", label: "Facteur", align: "right", width: "18%" },
          { key: "emissions", label: "tCO₂e", align: "right", width: "12%" },
          { key: "quality", label: "Qualité", align: "left", width: "12%" },
          { key: "source", label: "Source", align: "left", width: "14%" },
        ],
        rows: inventory.map((line) => ({
          label: line.label,
          scope: String(line.scope),
          activity: `${formatFr(line.quantity)} ${line.quantityUnit}`,
          factor: `${formatFr(line.factorValue)} ${line.factorUnit}`,
          emissions: formatFr(line.tonnes),
          quality: QUALITY_LABEL[line.dataQuality],
          source: line.factorSource,
        })),
      },
      { type: "subhead", text: "Sources des facteurs" },
      {
        type: "table",
        dense: true,
        note: "Démo et Jeu fictif : facteur de ce jeu, inutilisable pour une entreprise réelle. Postérieur : millésime strictement après l'exercice, applicabilité temporelle non démontrée. Non daté : millésime absent, égal ou antérieur à l'exercice. Une seule lecture par facteur. Les facteurs ne sont pas remplacés. La zone et la méthode de construction du facteur ne sont pas des champs du modèle.",
        columns: [
          { key: "id", label: "Id", align: "left", width: "18%" },
          { key: "version", label: "Version", align: "left", width: "18%" },
          { key: "value", label: "Valeur", align: "right", width: "24%" },
          { key: "source", label: "Source", align: "left", width: "14%" },
          { key: "status", label: "Statut", align: "left", width: "12%" },
          { key: "time", label: "Temps", align: "left", width: "14%" },
        ],
        rows: factors.map((line) => ({
          id: line.factorId,
          version: line.factorVersion,
          value: `${formatFr(line.factorValue)} ${line.factorUnit}`,
          source: line.factorSource,
          status: factorStatus(line),
          time: factorTimeLabel(line.factorTime),
        })),
      },
      { type: "subhead", text: "Intensités, arrondi fin" },
      {
        type: "table",
        note: "Arrondi fin, réservé à l'annexe. Le corps du rapport utilise une décimale.",
        columns: [
          { key: "label", label: "Indicateur", align: "left" },
          { key: "display", label: "Intensité", align: "right" },
        ],
        rows: analysis.intensities
          .filter((item) => item.status === "computed" && item.display)
          .map((item) => ({
            label: item.label,
            display: `${formatFr(item.display!)} ${item.displayUnit}`,
          })),
      },
      { type: "subhead", text: "Exclusions" },
      {
        type: "table",
        note: "Une exclusion, une non-applicabilité ou une absence n'est pas une émission nulle.",
        columns: [
          { key: "label", label: "Catégorie", align: "left", width: "28%" },
          { key: "status", label: "Statut", align: "left", width: "22%" },
          { key: "reason", label: "Motif", align: "left", width: "50%" },
        ],
        rows: data.boundary.map((item) => ({
          label: item.label,
          status: STATUS_LABEL[item.status],
          reason: item.reason,
        })),
      },
      { type: "subhead", text: "Hypothèses" },
      { type: "list", items: data.assumptions },
      { type: "subhead", text: "Glossaire" },
      {
        type: "table",
        dense: true,
        note: null,
        columns: [
          { key: "term", label: "Terme", align: "left", width: "28%" },
          { key: "text", label: "Sens dans ce rapport", align: "left", width: "72%" },
        ],
        rows: [
          { term: "tCO₂e", text: "Tonne d'équivalent dioxyde de carbone. Le total en kilogrammes est divisé par mille." },
          { term: "Scope 1", text: "Émissions directes des sources exploitées par l'organisation." },
          { term: "Scope 2", text: "Émissions indirectes de l'énergie achetée. Ici, électricité location-based." },
          { term: "Scope 3", text: "Autres émissions indirectes de la chaîne de valeur retenues dans le périmètre." },
          { term: "Location-based", text: "Électricité comptée avec le facteur du réseau, sans instrument contractuel." },
          { term: "Proxy monétaire", text: "Facteur appliqué à une dépense, et non à une quantité physique." },
          { term: "Non évalué", text: "Donnée absente. Ce statut n'est pas une émission nulle." },
          { term: "Investissements", text: "Catégorie qui peut concerner une organisation non financière. Ce statut ne la rend pas non applicable." },
        ],
      },
    ],
  };
}

function byScope(analysis: Analysis): Record<Scope, ScopeResult> {
  return Object.fromEntries(analysis.scopes.map((scope) => [scope.scope, scope])) as Record<Scope, ScopeResult>;
}

function nextBelowThreshold(analysis: Analysis): string {
  const next = analysis.ranked[analysis.significant.length];
  if (!next) return "";
  const crosses = Number(next.cumulative.displayPct) >= Number(analysis.coverageTargetDisplayPct);
  const cumul = crosses
    ? `Ajouté au cumul, il porte la couverture à ${percentPhrase(next.cumulative.displayPct)}, au-delà de la cible, sans devenir significatif pour autant.`
    : "Ajouté au cumul, il ne suffit pas à atteindre la cible.";
  return `Le poste suivant, « ${next.label} », est à ${percentPhrase(next.share.displayPct)} : il reste sous le seuil individuel et n'est pas qualifié de significatif. ${cumul}`;
}

function scopeSentence(scopes: Record<Scope, ScopeResult>): string {
  const parts = ([3, 2, 1] as const).filter((scope) => scopes[scope].share);
  if (parts.length === 0) return "Aucun scope n'est évalué.";
  const [first, ...rest] = parts;
  const head = `Le scope ${first} en représente ${percentPhrase(scopes[first].share!.displayPct)}`;
  if (rest.length === 0) return `${head}.`;
  const tail = frenchList(rest.map((scope) => `le scope ${scope} à ${percentPhrase(scopes[scope].share!.displayPct)}`));
  return `${head}, ${tail}.`;
}

function scopeComment(scope: ScopeResult, lines: RankedLine[], zeros: RankedLine[]): string {
  const lead = `Les émissions du scope ${scope.scope} s'élèvent à ${tonnesPhrase(scope.tonnes!)}, soit ${percentPhrase(scope.share!.displayPct)} du total.`;
  const main = lines[0] ? ` Le poste le plus élevé de ce scope est « ${lines[0].label} », à ${tonnesPhrase(lines[0].tonnes)}.` : "";
  const zero = zeros[0] ? ` « ${zeros[0].label} » est un poste mesuré nul, conservé dans l'inventaire.` : "";
  const reading =
    scope.scope === 1
      ? " Les fluides frigorigènes sont de classe estimée, avec une méthode d'estimation de maintenance. Ce n'est pas une facture."
      : scope.scope === 2
        ? " Les sites sont comptés avec le facteur du réseau."
        : " Les transports de ce scope utilisent des facteurs de démonstration.";
  const proxy = lines.some((line) => line.method === "proxy_monetary")
    ? " Le rang du proxy monétaire ne décrit pas une quantité physique."
    : "";
  return `${lead}${main}${reading}${zero}${proxy}`;
}

function roundingSentence(sumDisplay: string, residualDisplay: string): string {
  const base = `Les parts sont arrondies à une décimale, au plus proche, moitié vers le haut, sans ajuster la dernière ligne. Leur somme affichée est ${percentPhrase(sumDisplay)}.`;
  if (Number(residualDisplay) === 0) return base;
  return `${base} L'écart affiché est de ${percentPhrase(residualDisplay)}.`;
}

function lineTable(lines: RankedLine[]): Block {
  return {
    type: "table",
    note: null,
    columns: [
      { key: "label", label: "Poste", align: "left" },
      { key: "emissions", label: "tCO₂e", align: "right" },
      { key: "share", label: "Part du total", align: "right" },
      { key: "method", label: "Méthode", align: "left" },
    ],
    rows: lines.map((line) => ({
      label: line.label,
      emissions: formatFr(line.tonnes),
      share: percentPhrase(line.share.displayPct),
      method: METHOD_LABEL[line.method],
    })),
  };
}

function rankingTable(lines: RankedLine[]): Block {
  return {
    type: "table",
    note: null,
    columns: [
      { key: "rank", label: "#", align: "right", width: "8%" },
      { key: "label", label: "Poste", align: "left", width: "40%" },
      { key: "scope", label: "Scope", align: "right", width: "12%" },
      { key: "emissions", label: "tCO₂e", align: "right", width: "16%" },
      { key: "share", label: "Part", align: "right", width: "12%" },
      { key: "cumulative", label: "Cumul", align: "right", width: "12%" },
    ],
    rows: lines.map((line, index) => ({
      rank: String(index + 1),
      label: line.label,
      scope: String(line.scope),
      emissions: formatFr(line.tonnes),
      share: percentPhrase(line.share.displayPct),
      cumulative: percentPhrase(line.cumulative.displayPct),
    })),
  };
}

function factorStatus(line: RankedLine): string {
  return line.factorTime === "jeu_fictif" ? "Démo" : "Catalogue";
}

function postComment(line: RankedLine, rank: number): string {
  const site = line.site ? ` Site : ${line.site}.` : "";
  const monetary = line.method === "proxy_monetary" ? " Le proxy monétaire ne mesure pas une quantité physique." : "";
  const time = line.factorTime === "jeu_fictif"
    ? " Facteur de démonstration : ce résultat ne peut pas servir de base à une décision pour une entreprise réelle."
    : line.factorTime === "posterieur"
      ? " Facteur postérieur à l'exercice."
      : " Applicabilité temporelle du facteur non appréciable.";
  return `« ${line.label} » est le ${rankWord(rank)} du classement.${site} ${tonnesPhrase(line.tonnes)}, soit ${percentPhrase(line.share.displayPct)} du total, cumul ${percentPhrase(line.cumulative.displayPct)}. Classe ${QUALITY_LABEL[line.dataQuality].toLowerCase()}, méthode ${METHOD_LABEL[line.method].toLowerCase()}.${monetary}${time}`;
}

function rankWord(rank: number): string {
  return ["premier", "deuxième", "troisième", "quatrième", "cinquième", "sixième", "septième", "huitième", "neuvième", "dixième"][rank - 1] ?? String(rank);
}

function uniqueFactors(lines: RankedLine[]): RankedLine[] {
  const seen = new Set<string>();
  return lines.filter((line) => {
    const key = `${line.factorId}|${line.factorVersion}|${line.factorValue}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function significantSentence(analysis: Analysis, coverageDisplayPct: string): string {
  const count = analysis.significant.length;
  if (count === 0) return "Aucun poste ne l'atteint.";
  const word = countWord(count);
  const label = `${word.charAt(0).toUpperCase()}${word.slice(1)}`;
  const verb = count > 1 ? "dépassent" : "dépasse";
  const noun = count > 1 ? "postes" : "poste";
  const represent = count > 1 ? "représentent" : "représente";
  return `${label} ${noun} ${verb} ce seuil et ${represent} ${percentPhrase(coverageDisplayPct)} du total.`;
}

function countWord(value: number): string {
  return ["aucun", "un", "deux", "trois", "quatre", "cinq", "six", "sept", "huit", "neuf", "dix"][value] ?? String(value);
}
