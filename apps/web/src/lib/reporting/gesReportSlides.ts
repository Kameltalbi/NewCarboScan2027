import type { GesReportDataset } from "./gesReportDataset.ts";
import { OPERATIONAL_TOTAL_UNDETERMINED } from "./gesReportDataset.ts";

export interface SlidePlan {
  id: string;
  kicker: string;
  title: string;
  message: string;
}

/** Slides réellement utiles. Aucune slide n'est prévue sans donnée. */
export function planExecutiveSlides(dataset: GesReportDataset): SlidePlan[] {
  const op = dataset.operational;
  const slides: SlidePlan[] = [
    {
      id: "cover",
      kicker: "CarboScan",
      title: dataset.organizationName,
      message: `Exercice ${dataset.year} · ${dataset.perimeterLabel}`,
    },
    {
      id: "exec",
      kicker: "Synthèse",
      title: "Synthèse exécutive",
      message: op.determinable
        ? `Empreinte opérationnelle ${formatT(op.totalT)}. Les émissions financées, lorsqu'elles existent, sont présentées à part.`
        : `${OPERATIONAL_TOTAL_UNDETERMINED}. Les émissions financées restent présentées à part.`,
    },
    {
      id: "perimeter",
      kicker: "Périmètre",
      title: "Périmètre du bilan",
      message: op.determinable
        ? `${dataset.perimeterLabel}. Scope 3 catégorie 15 exclu de l'empreinte opérationnelle.`
        : `${dataset.perimeterLabel}. ${OPERATIONAL_TOTAL_UNDETERMINED}.`,
    },
  ];

  if (op.determinable && op.totalT != null && op.totalT > 0) {
    slides.push({
      id: "footprint",
      kicker: "Empreinte",
      title: "Empreinte GES de l'organisation",
      message: `${formatT(op.totalT)} sur le périmètre opérationnel.`,
    });
    slides.push({
      id: "scopes",
      kicker: "Répartition",
      title: "Scope 1, Scope 2 et Scope 3",
      message: `Scope 1 ${formatT(op.scope1T)} · Scope 2 ${formatT(op.scope2T)} · Scope 3 hors catégorie 15 ${formatT(op.scope3T)}.`,
    });
  }

  if (!op.determinable) {
    slides.push({
      id: "operational-gap",
      kicker: "Donnée manquante",
      title: "Empreinte opérationnelle",
      message: OPERATIONAL_TOTAL_UNDETERMINED,
    });
  }

  if (op.posts.length > 0) {
    slides.push({
      id: "posts",
      kicker: "Postes",
      title: "Principaux postes d'émissions",
      message: `Premier poste : ${op.posts[0].name}, ${formatT(op.posts[0].emissionsT)}.`,
    });
  }

  if (dataset.history.length >= 2) {
    const first = dataset.history[0];
    const last = dataset.history[dataset.history.length - 1];
    slides.push({
      id: "history",
      kicker: "Évolution",
      title: "Évolution de l'empreinte",
      message: `${first.year} : ${formatT(first.operationalT)} → ${last.year} : ${formatT(last.operationalT)}.`,
    });
  }

  const qualityTotal = op.quality.realPct + op.quality.estimatedPct + op.quality.defaultPct;
  if (qualityTotal > 0) {
    slides.push({
      id: "quality",
      kicker: "Qualité",
      title: "Qualité des données",
      message: `${op.quality.realPct} % de données physiques ou réelles.`,
    });
  }

  if (dataset.actions.length > 0) {
    slides.push({
      id: "actions",
      kicker: "Action",
      title: "Plan d'action",
      message: dataset.actions[0].title,
    });
  }

  const financed = dataset.financed;
  if (financed && (financed.scope12T > 0 || financed.scope3T > 0 || financed.implementedLines > 0)) {
    slides.push({
      id: "pcaf",
      kicker: "Émissions financées",
      title: "Émissions financées — PCAF",
      message: `Scope 1+2 financé ${formatT(financed.scope12T)} · Scope 3 financé ${formatT(financed.scope3T)}. Hors empreinte opérationnelle.`,
    });
    if (financed.sectors.length > 0) {
      slides.push({
        id: "sectors",
        kicker: "Portefeuille",
        title: "Répartition du portefeuille",
        message: `${financed.sectors.length} secteur${financed.sectors.length > 1 ? "s" : ""} avec une exposition calculée.`,
      });
    }
    if (financed.scope12Score != null || financed.scope3Score != null) {
      slides.push({
        id: "pcaf-quality",
        kicker: "Qualité PCAF",
        title: "Qualité des données PCAF",
        message: `Score Scope 1+2 ${formatScore(financed.scope12Score)} · Score Scope 3 ${formatScore(financed.scope3Score)}.`,
      });
    }
    const ranked = [...financed.exposures]
      .filter((row) => (row.financedScope12T ?? 0) + (row.financedScope3T ?? 0) > 0)
      .sort((a, b) => (b.financedScope12T ?? 0) + (b.financedScope3T ?? 0) - ((a.financedScope12T ?? 0) + (a.financedScope3T ?? 0)));
    if (ranked.length > 0) {
      slides.push({
        id: "counterparties",
        kicker: "Contreparties",
        title: "Principales contreparties",
        message: `${ranked[0].counterparty} concentre la première contribution financée.`,
      });
    }
    if (financed.improvements.length > 0 || financed.missingData.length > 0 || financed.notImplementedClasses.length > 0) {
      slides.push({
        id: "improvements",
        kicker: "PCAF",
        title: "Axes d'amélioration",
        message: "Leviers signalés par le moteur PCAF. Aucune formule n'est recalculée ici.",
      });
    }
  }

  return slides;
}

export function formatT(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "—";
  return `${value.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} tCO₂e`;
}

export function formatScore(value: number | null): string {
  if (value == null) return "—";
  return value.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
