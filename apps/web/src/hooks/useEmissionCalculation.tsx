import { useState, useCallback } from 'react';
import { supabase } from "@/integrations/api/client";
import { QuestionnaireItem } from './useQuestionnaire';

interface EmissionResult {
  questionKey: string;
  emission: number;
  factor: number;
  unit: string;
  category: string;
  scope?: number;
}

interface EmissionSummary {
  totalEmissions: number;
  scope1: number;
  scope2: number;
  scope3: number;
  byCategory: { [category: string]: number };
  details: EmissionResult[];
}

export const useEmissionCalculation = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const calculateEmissions = useCallback(async (
    questions: QuestionnaireItem[],
    responses: { [questionKey: string]: string | number | boolean | string[] }
  ): Promise<EmissionSummary> => {
    try {
      setLoading(true);
      setError(null);

      // Récupérer tous les facteurs d'émissions
      const { data: emissionFactors, error: factorsError } = await supabase
        .from('emission_factors')
        .select('*');

      if (factorsError) {
        throw factorsError;
      }

      const factorsMap = emissionFactors?.reduce((acc, factor) => {
        acc[factor.slug] = factor;
        return acc;
      }, {} as { [slug: string]: any }) || {};

      const results: EmissionResult[] = [];
      let totalEmissions = 0;
      let scope1 = 0;
      let scope2 = 0;
      let scope3 = 0;
      const byCategory: { [category: string]: number } = {};

      // Calculer les émissions pour chaque question avec facteur d'émission
      for (const question of questions) {
        if (!question.emission_factor_slug) continue;
        
        const response = responses[question.question_key];
        if (response === undefined || response === null || response === '') continue;

        const factor = factorsMap[question.emission_factor_slug];
        if (!factor) continue;

        let emission = 0;
        const responseValue = typeof response === 'number' ? response : parseFloat(String(response));
        
        if (!isNaN(responseValue) && responseValue > 0) {
          // Logique spéciale pour l'électricité
          if (question.category === 'electricite') {
            emission = calculateElectricityEmissions(question, responseValue, responses, factorsMap);
          } else {
            // Conversion des unités si nécessaire
            emission = responseValue * factor.emission_factor;
            
            // Appliquer la conversion d'unité si nécessaire
            emission = convertUnits(emission, question.unit, factor.unit);
          }
        }

        if (emission > 0) {
          results.push({
            questionKey: question.question_key,
            emission,
            factor: factor.emission_factor,
            unit: factor.unit,
            category: question.category,
            scope: question.scope
          });

          totalEmissions += emission;
          
          // Répartir par scope
          if (question.scope === 1) {
            scope1 += emission;
          } else if (question.scope === 2) {
            scope2 += emission;
          } else if (question.scope === 3) {
            scope3 += emission;
          }

          // Répartir par catégorie
          byCategory[question.category] = (byCategory[question.category] || 0) + emission;
        }
      }

      return {
        totalEmissions,
        scope1,
        scope2,
        scope3,
        byCategory,
        details: results
      };

    } catch (err) {
      console.error('Erreur calcul émissions:', err);
      setError(err instanceof Error ? err.message : 'Erreur de calcul');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    calculateEmissions,
    loading,
    error
  };
};

// Fonction utilitaire pour la conversion d'unités
const convertUnits = (value: number, fromUnit?: string, toUnit?: string): number => {
  if (!fromUnit || !toUnit) return value;
  
  // Conversions énergétiques courantes
  const conversions: { [key: string]: { [key: string]: number } } = {
    'm³': {
      'kWh': 10.83, // Gaz naturel: 1 m³ ≈ 10.83 kWh
      'MWh': 0.01083
    },
    'litres': {
      'kWh': 10, // Fioul: 1 litre ≈ 10 kWh
      'MWh': 0.01
    },
    'kg': {
      'kWh': 5, // Biomasse moyenne: 1 kg ≈ 5 kWh
      'MWh': 0.005
    }
  };

  if (conversions[fromUnit]?.[toUnit]) {
    return value * conversions[fromUnit][toUnit];
  }

  return value;
};

// Fonction spécialisée pour calculer les émissions d'électricité
const calculateElectricityEmissions = (
  question: QuestionnaireItem, 
  responseValue: number, 
  allResponses: { [questionKey: string]: string | number | boolean | string[] },
  factorsMap: { [slug: string]: any }
): number => {
  // Pour la consommation totale d'électricité, prendre en compte l'électricité verte et les panneaux solaires
  if (question.question_key === 'total_electricity_consumption') {
    let totalConsumption = responseValue;
    let emission = 0;
    
    // Facteur d'émission standard de l'électricité
    const standardElectricityFactor = factorsMap['electricite']?.emission_factor || 0.69;
    
    // Déduire la production solaire si présente
    const hasSolarPanels = allResponses['has_solar_panels'];
    if (hasSolarPanels === 'true' || hasSolarPanels === true) {
      // Estimation: les panneaux solaires couvrent environ 10% de la consommation
      // En réalité, il faudrait demander la production exacte
      const solarProduction = totalConsumption * 0.1;
      totalConsumption = Math.max(0, totalConsumption - solarProduction);
    }
    
    // Calculer les émissions en tenant compte de l'électricité verte
    const hasGreenElectricity = allResponses['has_green_electricity_option'];
    if (hasGreenElectricity === 'true' || hasGreenElectricity === true) {
      const greenPercentage = parseFloat(String(allResponses['green_electricity_percentage'] || 0));
      
      if (greenPercentage > 0) {
        // Partie électricité verte (facteur très faible)
        const greenConsumption = totalConsumption * (greenPercentage / 100);
        const greenEmission = greenConsumption * (factorsMap['electricite_verte']?.emission_factor || 0.05);
        
        // Partie électricité standard
        const standardConsumption = totalConsumption * (1 - greenPercentage / 100);
        const standardEmission = standardConsumption * standardElectricityFactor;
        
        emission = greenEmission + standardEmission;
      } else {
        emission = totalConsumption * standardElectricityFactor;
      }
    } else {
      emission = totalConsumption * standardElectricityFactor;
    }
    
    return emission;
  }
  
  // Pour les autres questions d'électricité, calcul standard
  const factor = factorsMap[question.emission_factor_slug];
  return responseValue * (factor?.emission_factor || 0);
};