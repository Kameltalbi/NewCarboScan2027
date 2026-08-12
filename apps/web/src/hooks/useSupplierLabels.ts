// Adapte les libellés du module "Fournisseurs" au secteur de l'organisation.
// Pour une banque, on parle de portefeuille de prêts / contreparties (PCAF).

import { useOrganizationData } from './useOrganizationData';

export interface SupplierLabels {
  isBank: boolean;
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

const BANK_SECTORS = ['banque', 'bank', 'finance', 'banking', 'financial services'];

export function useSupplierLabels(): SupplierLabels {
  const { organization } = useOrganizationData();
  const sector = (organization?.sector || '').toLowerCase().trim();
  const isBank = BANK_SECTORS.some(s => sector.includes(s));

  if (isBank) {
    return {
      isBank: true,
      moduleTitle: 'Portefeuille',
      pageTitle: 'Portefeuille de prêts & contreparties (PCAF)',
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
    moduleTitle: 'Fournisseurs',
    pageTitle: 'Engagement fournisseurs',
    entitySingular: 'fournisseur',
    entityPlural: 'fournisseurs',
    tabMine: 'Mes fournisseurs',
    tabAll: 'Tous les fournisseurs',
    addCta: 'Engager de nouveaux fournisseurs',
    inviteCta: "Générer un lien d'invitation",
    kpiTotal: 'Nombre de fournisseurs',
    kpiTop: 'Top Carbon Disclosure',
    kpiConfidence: 'Confiance moyenne',
    kpiCountries: 'Pays couverts',
    emptyTitle: 'Aucun fournisseur référencé',
    emptyDesc: "Commencez par ajouter vos fournisseurs pour piloter les émissions de votre chaîne d'approvisionnement.",
    emptyCta: 'Ajouter votre premier fournisseur',
    colCategory: 'Catégorie',
    colScore: 'Score',
    colOutstanding: 'Achats annuels',
    colEmissions: 'Émissions (tCO₂e)',
    colLastBilan: 'Dernier bilan',
    totalRowLabel: 'Total',
    scoreLegend: 'Score carbone du fournisseur',
  };
}
