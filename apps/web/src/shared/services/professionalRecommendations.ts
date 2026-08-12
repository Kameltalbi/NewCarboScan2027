import { EmissionsResult } from '@/types/empreinteProduit';
import { supabase } from "@/integrations/api/client";

interface RecommendationAction {
  id: string;
  titre: string;
  description: string;
  categorie: string;
  scope_cible: string;
  seuil_emission_kgco2e: number;
  impact_estime_pourcent: string;
  priorite: string;
}

export async function generateAutomaticProfessionalRecommendations(
  emissionsResult: EmissionsResult,
  companyInfo?: any
): Promise<string> {
  try {
    // Récupérer toutes les recommandations depuis la table actions_recommandees
    const { data: actions, error } = await supabase
      .from('actions_recommandees')
      .select('*')
      .in('scope_cible', ['scope1', 'Scope 1', 'scope2', 'Scope 2']) // Seulement scopes 1 et 2
      .order('priorite', { ascending: true });

    if (error) {
      console.error('Erreur lors de la récupération des recommandations:', error);
      return generateFallbackRecommendations(emissionsResult);
    }

    const selectedRecommendations: RecommendationAction[] = [];
    
    // Convertir les émissions en kg CO2e pour la comparaison
    const scope1Kg = emissionsResult.scope1 * 1000;
    const scope2Kg = emissionsResult.scope2 * 1000;

    // Sélectionner les recommandations pertinentes selon les seuils (scopes 1 et 2 seulement)
    actions?.forEach((action: RecommendationAction) => {
      let shouldInclude = false;
      
      switch (action.scope_cible) {
        case 'scope1':
        case 'Scope 1':
          shouldInclude = scope1Kg >= action.seuil_emission_kgco2e;
          break;
        case 'scope2':
        case 'Scope 2':
          shouldInclude = scope2Kg >= action.seuil_emission_kgco2e;
          break;
      }
      
      if (shouldInclude && selectedRecommendations.length < 10) { // Limiter à 10 recommandations
        selectedRecommendations.push(action);
      }
    });

    // Générer le paragraphe structuré
    return buildRecommendationsParagraph(selectedRecommendations, emissionsResult);
    
  } catch (error) {
    console.error('Erreur lors de la génération des recommandations:', error);
    return generateFallbackRecommendations(emissionsResult);
  }
}

function buildRecommendationsParagraph(
  recommendations: RecommendationAction[],
  emissionsResult: EmissionsResult
): string {
  // Convertir de kg vers tonnes si nécessaire
  const scope1Value = (emissionsResult.scope1 / 1000).toFixed(1);
  const scope2Value = (emissionsResult.scope2 / 1000).toFixed(1);
  const scope2Reduction = Math.round((emissionsResult.scope2 / 1000) * 0.6);

  return `Au regard des résultats obtenus, il apparaît que les émissions directes du Scope 1 s'élèvent à ${scope1Value} tCO₂e, tandis que les émissions indirectes liées au Scope 2 atteignent ${scope2Value} tCO₂e. Ces niveaux indiquent que l'organisation doit concentrer ses efforts sur les postes énergétiques et de mobilité les plus significatifs.

Pour le Scope 1, il est essentiel de réduire la dépendance aux combustibles fossiles utilisés dans les installations fixes et la flotte de véhicules. Des pistes existent à travers l'amélioration de la performance des équipements, le recours à des solutions de substitution et l'optimisation de l'usage des moyens de transport.

La flotte de véhicules constitue un facteur clé : une stratégie progressive de transition vers des motorisations hybrides ou électriques contribuerait à diminuer notablement les émissions tout en réduisant la consommation de carburants fossiles. La mise en place de mesures de sensibilisation et de suivi de la consommation renforcerait cette dynamique.

Concernant les installations fixes, il est recommandé d'engager des actions sur l'efficacité énergétique, notamment via la maintenance optimisée, le remplacement progressif des équipements énergivores et l'intégration de technologies plus performantes. Ces actions permettraient d'abaisser les émissions annuelles de plusieurs dizaines de tonnes de CO₂e.

Pour le Scope 2, l'électricité reste le poste le plus déterminant. Le choix de contrats d'approvisionnement en énergie renouvelable ainsi que l'installation de solutions locales de production (photovoltaïque, cogénération) représentent des leviers stratégiques. Ces mesures contribueraient à réduire significativement les émissions, de l'ordre de ${scope2Reduction} tCO₂e, en fonction des volumes consommés.

Il conviendrait également de renforcer la gestion active de la consommation électrique par la mise en place d'outils de suivi, la sensibilisation des collaborateurs et l'intégration de systèmes intelligents de régulation. Ces leviers, combinés à une politique d'achat responsable, permettraient de diminuer l'empreinte carbone tout en générant des économies.

Dans cette perspective, l'organisation doit bâtir un plan d'actions triennal qui hiérarchise les priorités selon leur potentiel de réduction et leur faisabilité. Ce plan devra inclure des objectifs chiffrés, des responsables identifiés, des budgets définis et des indicateurs précis de suivi (tCO₂e évitées, kWh économisés, retour sur investissement).`;
}

function calculateEstimatedImpact(
  recommendation: RecommendationAction,
  emissionsResult: EmissionsResult
): number {
  // Extraire le pourcentage d'impact (ex: "15%" -> 15)
  const impactPercent = parseFloat(recommendation.impact_estime_pourcent.replace('%', '')) || 10;
  
  let baseEmission = 0;
  switch (recommendation.scope_cible) {
    case 'scope1':
    case 'Scope 1':
      baseEmission = emissionsResult.scope1;
      break;
    case 'scope2':
    case 'Scope 2':
      baseEmission = emissionsResult.scope2;
      break;
    default:
      baseEmission = emissionsResult.scope1 + emissionsResult.scope2; // Seulement scopes 1 et 2
      break;
  }
  
  return Math.round(baseEmission * (impactPercent / 100));
}

function generateFallbackRecommendations(emissionsResult: EmissionsResult): string {
  const majorityScope = emissionsResult.majorityScope;
  
  // Convertir en tonnes pour l'affichage
  const scope1Tonnes = emissionsResult.scope1 / 1000;
  const scope2Tonnes = emissionsResult.scope2 / 1000;
  
  let paragraph = "Au regard des résultats obtenus, plusieurs leviers prioritaires de réduction des émissions ont été identifiés.\n\n";
  
  if (majorityScope === 1 || scope1Tonnes > (scope1Tonnes + scope2Tonnes) * 0.3) {
    paragraph += `Concernant les émissions directes (Scope 1), représentant ${scope1Tonnes.toFixed(1)} tCO₂e, il est recommandé d'optimiser l'utilisation des combustibles fossiles et d'améliorer l'efficacité énergétique des équipements, ce qui pourrait permettre d'éviter environ ${Math.round(scope1Tonnes * 0.2)} tCO₂e par an.\n`;
  }
  
  if (majorityScope === 2 || scope2Tonnes > (scope1Tonnes + scope2Tonnes) * 0.3) {
    paragraph += `Pour les émissions indirectes liées à l'énergie (Scope 2), s'élevant à ${scope2Tonnes.toFixed(1)} tCO₂e, la souscription à un contrat d'énergie verte et l'amélioration de l'efficacité énergétique sont préconisées, avec un potentiel de réduction estimé à ${Math.round(scope2Tonnes * 0.3)} tCO₂e.\n`;
  }
  
  paragraph += "\nCes mesures doivent être planifiées sur un horizon de trois ans, intégrées dans un plan d'actions avec responsables désignés, budgets associés et indicateurs de performance.";
  
  return paragraph;
}