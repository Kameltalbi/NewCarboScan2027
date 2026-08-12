import { supabase } from "@/integrations/api/client";
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

const PRIORITY_ORDER = { 'haute': 1, 'moyenne': 2, 'basse': 3 };

export async function getRecommendedActions(emissionsResult: EmissionsResult): Promise<RecommendedAction[]> {
  try {
    const { data: actions, error } = await supabase
      .from('actions_recommandees')
      .select('*')
      .order('priorite', { ascending: true });

    if (error) {
      console.error('Erreur lors de la récupération des actions:', error);
      return [];
    }

    if (!actions) return [];

    // Filtrer les actions selon les émissions et les scopes
    const recommendedActions = actions.filter(action => {
      if (action.scope_cible === 'tous') {
        return emissionsResult.totalEmissions >= action.seuil_emission_kgco2e;
      }
      
      const scopeValue = action.scope_cible === '1' ? emissionsResult.scope1 :
                        action.scope_cible === '2' ? emissionsResult.scope2 :
                        emissionsResult.scope3;
      
      return scopeValue >= action.seuil_emission_kgco2e;
    });

    // Trier par priorité puis par impact estimé
    return recommendedActions.sort((a, b) => {
      const priorityDiff = PRIORITY_ORDER[a.priorite as keyof typeof PRIORITY_ORDER] - 
                          PRIORITY_ORDER[b.priorite as keyof typeof PRIORITY_ORDER];
      
      if (priorityDiff !== 0) return priorityDiff;
      
      // Si même priorité, trier par impact (extraire le pourcentage max)
      const getMaxImpact = (impact: string) => {
        const match = impact.match(/(\d+)-?(\d+)?%/);
        return match ? parseInt(match[2] || match[1]) : 0;
      };
      
      return getMaxImpact(b.impact_estime_pourcent) - getMaxImpact(a.impact_estime_pourcent);
    }) as RecommendedAction[];
  } catch (error) {
    console.error('Erreur lors de la récupération des actions recommandées:', error);
    return [];
  }
}

export function getPriorityActions(actions: RecommendedAction[], limit: number = 5): RecommendedAction[] {
  return actions.slice(0, limit);
}

export function getCategoryIcon(categorie: string): string {
  const icons: Record<string, string> = {
    'Énergie': '⚡',
    'Mobilité': '🚗',
    'Achats': '🛒',
    'Déchets': '♻️',
    'Formation': '📚',
    'Bâtiment': '🏢'
  };
  return icons[categorie] || '🎯';
}