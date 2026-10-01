import { EmissionsResult } from '@/types/empreinteProduit';

export interface RecommendedAction {
  id: string;
  titre: string;
  description: string;
  scope_cible: '1' | '2' | '3' | 'tous';
  seuil_emission_kgco2e: number;
  categorie: string;
  impact_estime_pourcent: string;
  priorite: 'haute' | 'moyenne' | 'basse';
  created_at: string;
}

const PRIORITY_ORDER = { haute: 1, moyenne: 2, basse: 3 } as const;

/**
 * Catalogue de recommandations (seuils en kgCO₂e).
 * Remplace l'ancienne table legacy actions_recommandees (schéma incompatible / vide en prod).
 */
const CATALOG: Omit<RecommendedAction, 'created_at'>[] = [
  {
    id: 'rec-led',
    titre: "Optimiser l'éclairage LED",
    description:
      'Remplacer les éclairages par des LED haute efficacité et installer des détecteurs de présence.',
    scope_cible: '2',
    seuil_emission_kgco2e: 5000,
    categorie: 'Énergie',
    impact_estime_pourcent: '15-25%',
    priorite: 'haute',
  },
  {
    id: 'rec-green-power',
    titre: "Choisir un fournisseur d'énergie verte",
    description: "Souscrire à un contrat d'électricité 100 % renouvelable (market-based).",
    scope_cible: '2',
    seuil_emission_kgco2e: 3000,
    categorie: 'Énergie',
    impact_estime_pourcent: '30-50%',
    priorite: 'haute',
  },
  {
    id: 'rec-mobility',
    titre: 'Mettre en place un plan de mobilité durable',
    description:
      'Encourager le télétravail, le covoiturage et les transports en commun pour les déplacements professionnels.',
    scope_cible: '3',
    seuil_emission_kgco2e: 10000,
    categorie: 'Mobilité',
    impact_estime_pourcent: '20-30%',
    priorite: 'haute',
  },
  {
    id: 'rec-insulation',
    titre: "Améliorer l'isolation thermique",
    description:
      'Renforcer isolation et régulation pour réduire chauffage et climatisation.',
    scope_cible: '1',
    seuil_emission_kgco2e: 8000,
    categorie: 'Énergie',
    impact_estime_pourcent: '10-20%',
    priorite: 'moyenne',
  },
  {
    id: 'rec-it',
    titre: 'Optimiser les équipements informatiques',
    description:
      'Veille automatique, renouvellement basse consommation, rationalisation des serveurs.',
    scope_cible: '2',
    seuil_emission_kgco2e: 2000,
    categorie: 'Énergie',
    impact_estime_pourcent: '10-15%',
    priorite: 'moyenne',
  },
  {
    id: 'rec-digital',
    titre: 'Digitaliser les processus',
    description: "Réduire l'impression papier et dématérialiser les documents administratifs.",
    scope_cible: '3',
    seuil_emission_kgco2e: 2000,
    categorie: 'Achats',
    impact_estime_pourcent: '5-10%',
    priorite: 'moyenne',
  },
  {
    id: 'rec-waste',
    titre: 'Optimiser la gestion des déchets',
    description: 'Tri sélectif efficace et réduction des déchets à la source.',
    scope_cible: 'tous',
    seuil_emission_kgco2e: 1000,
    categorie: 'Déchets',
    impact_estime_pourcent: '5-15%',
    priorite: 'basse',
  },
  {
    id: 'rec-training',
    titre: 'Former les équipes aux écogestes',
    description:
      'Sensibiliser et former les collaborateurs aux bonnes pratiques environnementales.',
    scope_cible: 'tous',
    seuil_emission_kgco2e: 500,
    categorie: 'Formation',
    impact_estime_pourcent: '5-10%',
    priorite: 'basse',
  },
];

/**
 * @param emissionsResult valeurs en **kgCO₂e** (comme le moteur DashboardAggregator)
 */
export async function getRecommendedActions(
  emissionsResult: EmissionsResult,
): Promise<RecommendedAction[]> {
  const now = new Date().toISOString();
  const actions: RecommendedAction[] = CATALOG.map((a) => ({ ...a, created_at: now }));

  const recommended = actions.filter((action) => {
    if (action.scope_cible === 'tous') {
      return emissionsResult.totalEmissions >= action.seuil_emission_kgco2e;
    }
    const scopeValue =
      action.scope_cible === '1'
        ? emissionsResult.scope1
        : action.scope_cible === '2'
          ? emissionsResult.scope2
          : emissionsResult.scope3;
    return scopeValue >= action.seuil_emission_kgco2e;
  });

  return recommended.sort((a, b) => {
    const priorityDiff = PRIORITY_ORDER[a.priorite] - PRIORITY_ORDER[b.priorite];
    if (priorityDiff !== 0) return priorityDiff;
    const getMaxImpact = (impact: string) => {
      const match = impact.match(/(\d+)-?(\d+)?%/);
      return match ? parseInt(match[2] || match[1], 10) : 0;
    };
    return getMaxImpact(b.impact_estime_pourcent) - getMaxImpact(a.impact_estime_pourcent);
  });
}

export function getPriorityActions(actions: RecommendedAction[], limit: number = 5): RecommendedAction[] {
  return actions.slice(0, limit);
}

export function getCategoryIcon(categorie: string): string {
  const icons: Record<string, string> = {
    Énergie: '⚡',
    Mobilité: '🚗',
    Achats: '🛒',
    Déchets: '♻️',
    Sensibilisation: '📚',
    Formation: '📚',
    Bâtiment: '🏢',
  };
  return icons[categorie] || '🎯';
}
