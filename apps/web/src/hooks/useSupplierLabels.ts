// Libellés du module Fournisseurs / Émissions financées.
// Piloté par le feature flag tenant financed_emissions_enabled — jamais par le nom ou l'email.

import { useOrganizationData } from './useOrganizationData';

export interface SupplierLabels {
  /** true lorsque financed_emissions_enabled est actif sur l'organisation. */
  isBank: boolean;
  financedEmissionsEnabled: boolean;
  moduleTitle: string;        // menu latéral
  pageTitle: string;          // header de la page
  entitySingular: string;     // "fournisseur" / "contrepartie"
  entityPlural: string;       // "fournisseurs" / "contreparties"
  tabMine: string;
  tabAll: string;
  addCta: string;
  inviteCta: string;
  kpiTotal: string;
  kpiTop: string;
  kpiConfidence: string;
  kpiCountries: string;
  emptyTitle: string;
  emptyDesc: string;
  emptyCta: string;
  colCategory: string;        // "Catégorie" / "Secteur emprunteur"
  colScore: string;           // "Score" / "Score PCAF"
  colOutstanding: string;     // "Achats annuels" / "Encours prêt"
  colEmissions: string;       // "Émissions (tCO₂e)" / "Émissions financées (tCO₂e)"
  colLastBilan: string;       // "Dernier bilan"
  totalRowLabel: string;      // "Total" / "Total portefeuille"
  scoreLegend: string;
}

export function useSupplierLabels(): SupplierLabels {
  const { organization } = useOrganizationData();
  const financedEmissionsEnabled = Boolean(organization?.financed_emissions_enabled);
  const isBank = financedEmissionsEnabled;

  if (isBank) {
    return {
      isBank: true,
      financedEmissionsEnabled: true,
      moduleTitle: 'Émissions financées',
      pageTitle: 'Émissions financées — portefeuille PCAF',
      entitySingular: 'contrepartie',
      entityPlural: 'contreparties',
      tabMine: 'Mes contreparties',
      tabAll: 'Toutes les contreparties',
      addCta: 'Ajouter une contrepartie',
      inviteCta: 'Inviter une contrepartie',
      kpiTotal: 'Nombre de contreparties',
      kpiTop: 'Contreparties Net Zéro alignées',
      kpiConfidence: 'Score qualité PCAF moyen',
      kpiCountries: 'Pays couverts',
      emptyTitle: 'Aucune contrepartie référencée',
      emptyDesc: 'Ajoutez vos contreparties (emprunteurs, entreprises financées) pour calculer vos émissions financées selon le standard PCAF.',
      emptyCta: 'Ajouter votre première contrepartie',
      colCategory: 'Secteur emprunteur',
      colScore: 'Score PCAF (qualité des données)',
      colOutstanding: 'Encours prêt (TND)',
      colEmissions: 'Émissions financées (tCO₂e)',
      colLastBilan: 'Dernier bilan',
      totalRowLabel: 'Total portefeuille',
      scoreLegend: 'Score qualité PCAF (1 = données réelles / 5 = proxy sectoriel)',
    };
  }

  return {
    isBank: false,
    financedEmissionsEnabled: false,
    moduleTitle: 'Fournisseurs & Achats',
    pageTitle: 'Fournisseurs & Achats',
    entitySingular: 'fournisseur',
    entityPlural: 'fournisseurs',
    tabMine: 'Mes fournisseurs',
    tabAll: 'Tous les fournisseurs',
    addCta: 'Ajouter un fournisseur',
    inviteCta: "Demander des données",
    kpiTotal: 'Nombre de fournisseurs',
    kpiTop: 'Top contributeurs',
    kpiConfidence: 'Données primaires',
    kpiCountries: 'Pays couverts',
    emptyTitle: 'Aucun fournisseur référencé',
    emptyDesc:
      "Vous n'avez pas besoin de données carbone fournisseurs pour commencer. Importez vos achats pour une première estimation.",
    emptyCta: 'Importer mes achats',
    colCategory: 'Catégorie',
    colScore: 'Qualité donnée',
    colOutstanding: 'Achats annuels',
    colEmissions: 'Émissions (tCO₂e)',
    colLastBilan: 'Dernière mise à jour',
    totalRowLabel: 'Total',
    scoreLegend:
      'Indice de qualité des données CarboScan (A–E). N’évalue pas la performance environnementale.',
  };
}
