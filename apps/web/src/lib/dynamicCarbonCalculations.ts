import { DynamicQuestionnaireData, QuestionnaireResponse, EmissionFactor } from '@/types/dynamicQuestionnaire';
import { logger } from '@/utils/logger';
import { DynamicEmissionFactorsService } from './dynamicEmissionFactorsService';

export interface DynamicEmissionsResult {
  totalEmissions: number;
  emissionsByCategory: { [category: string]: number };
  emissionsByScope: {
    scope1: number;
    scope2: number;
    scope3: number;
  };
  emissionsBreakdown: {
    questionId: string;
    questionText: string;
    emissions: number;
    unit: string;
    category: string;
    emissionFactorSlug: string;
    value: number;
  }[];
  recommendations: string[];
  calculationDetails: {
    questionsAnswered: number;
    totalQuestions: number;
    missingFactors: string[];
    calculationDate: Date;
  };
}

export class DynamicCarbonCalculator {
  private emissionFactors: { [slug: string]: EmissionFactor };

  constructor(emissionFactors: { [slug: string]: EmissionFactor }) {
    this.emissionFactors = emissionFactors;
  }

  /**
   * Calculate total carbon emissions from questionnaire responses
   */
  calculateEmissions(
    responses: { [questionId: string]: QuestionnaireResponse },
    questions: any[]
  ): DynamicEmissionsResult {
    const emissionsBreakdown: DynamicEmissionsResult['emissionsBreakdown'] = [];
    const emissionsByCategory: { [category: string]: number } = {};
    const emissionsByScope = { scope1: 0, scope2: 0, scope3: 0 };
    let totalEmissions = 0;
    const missingFactors: string[] = [];
    let questionsAnswered = 0;

    // Process each response
    Object.entries(responses).forEach(([questionId, response]) => {
      const question = questions.find(q => q.id === questionId);
      if (!question || !response.value || response.value <= 0) {
        return;
      }

      questionsAnswered++;
      const emissionFactor = this.emissionFactors[response.emissionFactorSlug];

      if (!emissionFactor) {
        missingFactors.push(response.emissionFactorSlug);
        logger.warn(`Missing emission factor for slug: ${response.emissionFactorSlug}`);
        return;
      }

      // Calculate emissions for this response
      let emissions: number;
      
      // Use specialized calculation for CarboStart enhanced questions
      if (['refrigerant_recharge_kg', 'electricity_consumption', 'coal_consumption_kg', 'biomass_consumption_kg', 'biofuel_consumption_litres'].includes(questionId)) {
        emissions = this.calculateSpecializedEmission(questionId, response.value, responses);
      } else {
        emissions = this.calculateSingleEmission(response.value, emissionFactor);
      }
      
      // Add to breakdown
      emissionsBreakdown.push({
        questionId,
        questionText: question.questionText,
        emissions,
        unit: response.unit,
        category: question.category,
        emissionFactorSlug: response.emissionFactorSlug,
        value: response.value
      });

      // Add to category totals
      if (!emissionsByCategory[question.category]) {
        emissionsByCategory[question.category] = 0;
      }
      emissionsByCategory[question.category] += emissions;

      // Add to scope totals (simplified mapping)
      const scope = this.mapCategoryToScope(question.category);
      emissionsByScope[scope] += emissions;

      totalEmissions += emissions;
    });

    // Generate recommendations
    const recommendations = this.generateRecommendations(emissionsByCategory, emissionsBreakdown);

    return {
      totalEmissions,
      emissionsByCategory,
      emissionsByScope,
      emissionsBreakdown,
      recommendations,
      calculationDetails: {
        questionsAnswered,
        totalQuestions: questions.length,
        missingFactors,
        calculationDate: new Date()
      }
    };
  }

  /**
   * Calculate emissions for a single response
   */
  private calculateSingleEmission(value: number, emissionFactor: EmissionFactor): number {
    return value * emissionFactor.emission_factor;
  }

  /**
   * Calculate specialized emissions for CarboStart enhanced questions
   */
  private calculateSpecializedEmission(
    questionId: string, 
    value: number, 
    responses: { [questionId: string]: QuestionnaireResponse }
  ): number {
    switch (questionId) {
      // Fluides frigorigènes - Formule: Quantité(kg) × PRG
      case 'refrigerant_recharge_kg':
        const refrigerantType = String(responses['refrigerant_type']?.value || 'R134a');
        const prg = this.getRefrigerantPRG(refrigerantType);
        return (value * prg); // Résultat en kg CO₂e
      
      // Électricité avec part verte - Formule: Consommation × FE × (1 - %_vert/100)
      case 'electricity_consumption':
        const greenPercentage = responses['green_electricity_percentage']?.value || 0;
        const electricityFactor = this.emissionFactors['electricite_kwh']?.emission_factor || 0.5; // kgCO₂/kWh par défaut
        const adjustedFactor = electricityFactor * (1 - greenPercentage / 100);
        return (value * adjustedFactor); // Résultat en kg CO₂e
      
      // Charbon - Formule: Consommation(kg) × FE_charbon
      case 'coal_consumption_kg':
        const coalFactor = 2.93; // kgCO₂/kg selon les spécifications
        return (value * coalFactor); // Résultat en kg CO₂e
      
      // Biomasse - Formule: Consommation(kg) × FE_biomasse  
      case 'biomass_consumption_kg':
        const biomassFactor = 0.1; // kgCO₂/kg (faible émission, incluant CH₄ et N₂O)
        return (value * biomassFactor); // Résultat en kg CO₂e
      
      // Biocarburants - Formule: Consommation(litres) × FE_biocarburant
      case 'biofuel_consumption_litres':
        const biofuelType = String(responses['biofuel_type']?.value || 'E85 (éthanol)');
        const biofuelFactor = this.getBiofuelFactor(biofuelType);
        return (value * biofuelFactor); // Résultat en kg CO₂e
      
      default:
        // Calcul standard
        const standardEmissionFactor = this.emissionFactors[responses[questionId]?.emissionFactorSlug];
        if (standardEmissionFactor) {
          return (value * standardEmissionFactor.emission_factor); // Résultat en kg CO₂e
        }
        return 0;
    }
  }

  /**
   * Get Potentiel de Réchauffement Global (PRG) for refrigerants
   */
  private getRefrigerantPRG(refrigerantType: string): number {
    const prgValues: { [key: string]: number } = {
      'R134a': 1430,
      'R410a': 2088,
      'R32': 675,
      'R404a': 3922,
      'R22 (ancien)': 1810,
      'Autres': 1500 // Valeur moyenne par défaut
    };
    
    return prgValues[refrigerantType] || 1500;
  }

  /**
   * Get emission factor for biofuels  
   */
  private getBiofuelFactor(biofuelType: string): number {
    const biofuelFactors: { [key: string]: number } = {
      'E85 (éthanol)': 0.75, // kgCO₂/litre
      'B30/B100 (biodiesel)': 0.85, // kgCO₂/litre  
      'HVO (diesel renouvelable)': 0.40, // kgCO₂/litre
      'Autres': 0.75 // Valeur par défaut
    };
    
    return biofuelFactors[biofuelType] || 0.75;
  }

  /**
   * Map category to scope (simplified mapping)
   */
  private mapCategoryToScope(category: string): 'scope1' | 'scope2' | 'scope3' {
    const scopeMapping: { [category: string]: 'scope1' | 'scope2' | 'scope3' } = {
      'energy': 'scope2', // Purchased electricity
      'transport': 'scope1', // Direct fuel combustion
      'production': 'scope1', // Direct manufacturing emissions
      'refrigerants': 'scope1', // Refrigerant leaks - direct emissions
      'fuel': 'scope1', // Direct fuel combustion
      'stationary_energy': 'scope1', // Coal, biomass - direct combustion
      'materials': 'scope3', // Purchased goods
      'waste': 'scope3', // Waste generated
      'other': 'scope3' // Default to scope 3
    };

    return scopeMapping[category] || 'scope3';
  }

  /**
   * Generate recommendations based on emissions
   */
  private generateRecommendations(
    emissionsByCategory: { [category: string]: number },
    emissionsBreakdown: DynamicEmissionsResult['emissionsBreakdown']
  ): string[] {
    const recommendations: string[] = [];
    const sortedCategories = Object.entries(emissionsByCategory)
      .sort(([,a], [,b]) => b - a);

    // Top emitting category recommendations
    if (sortedCategories.length > 0) {
      const [topCategory, topEmissions] = sortedCategories[0];
      const percentage = (topEmissions / Object.values(emissionsByCategory).reduce((a, b) => a + b, 0)) * 100;

      switch (topCategory) {
        case 'energy':
          recommendations.push(
            `Votre consommation d'énergie représente ${percentage.toFixed(1)}% de vos émissions. ` +
            `Considérez l'installation de panneaux solaires ou le passage à un fournisseur d'énergie verte.`
          );
          break;
        case 'transport':
          recommendations.push(
            `Le transport représente ${percentage.toFixed(1)}% de vos émissions. ` +
            `Optimisez vos déplacements et considérez l'électrification de votre flotte.`
          );
          break;
        case 'materials':
          recommendations.push(
            `Les matières premières représentent ${percentage.toFixed(1)}% de vos émissions. ` +
            `Recherchez des fournisseurs locaux et des matériaux plus durables.`
          );
          break;
        case 'production':
          recommendations.push(
            `La production représente ${percentage.toFixed(1)}% de vos émissions. ` +
            `Optimisez vos processus de fabrication et investissez dans des technologies plus efficaces.`
          );
          break;
        case 'waste':
          recommendations.push(
            `La gestion des déchets représente ${percentage.toFixed(1)}% de vos émissions. ` +
            `Mettez en place un programme de recyclage et réduisez les déchets à la source.`
          );
          break;
      }
    }

    // Specific recommendations based on highest individual emissions
    const topEmitters = emissionsBreakdown
      .sort((a, b) => b.emissions - a.emissions)
      .slice(0, 3);

    topEmitters.forEach((emitter, index) => {
      if (emitter.emissions > 1000) { // Only for significant emissions
        recommendations.push(
          `Priorité ${index + 1}: Réduire "${emitter.questionText}" ` +
          `(${emitter.emissions.toFixed(0)} kg CO₂e). Considérez des alternatives plus durables.`
        );
      }
    });

    // General recommendations
    if (recommendations.length === 0) {
      recommendations.push(
        "Continuez à surveiller vos émissions et cherchez des opportunités d'amélioration continue."
      );
    }

    recommendations.push(
      "Fixez-vous des objectifs de réduction ambitieux et mesurez vos progrès régulièrement."
    );

    return recommendations.slice(0, 5); // Limit to 5 recommendations
  }

  /**
   * Get emissions intensity per employee (tCO2e/employé)
   */
  getEmissionsPerEmployee(totalEmissions: number, numberOfEmployees: number): number {
    if (numberOfEmployees <= 0) return 0;
    return totalEmissions / numberOfEmployees;
  }

  /**
   * Get emissions intensity per square meter (kgCO2e/m²)
   */
  getEmissionsPerSquareMeter(totalEmissions: number, surfaceArea: number): number {
    if (surfaceArea <= 0) return 0;
    return (totalEmissions * 1000) / surfaceArea; // Convert to kg/m²
  }

  /**
   * Get emissions intensity per million DT of revenue (tCO2e/MDT)
   */
  getEmissionsPerRevenue(totalEmissions: number, annualRevenue: number): number {
    if (annualRevenue <= 0) return 0;
    return totalEmissions / (annualRevenue / 1000000); // Per million DT
  }

  /**
   * Calculate carbon intensity benchmarks
   */
  calculateBenchmarks(
    totalEmissions: number,
    numberOfEmployees: number,
    surfaceArea: number,
    annualRevenue: number,
    sectors: string[]
  ): {
    emissionsPerEmployee: number;
    emissionsPerSquareMeter: number;
    emissionsPerRevenue: number;
    benchmarkComparison: string;
  } {
    const emissionsPerEmployee = this.getEmissionsPerEmployee(totalEmissions, numberOfEmployees);
    const emissionsPerSquareMeter = this.getEmissionsPerSquareMeter(totalEmissions, surfaceArea);
    const emissionsPerRevenue = this.getEmissionsPerRevenue(totalEmissions, annualRevenue);

    // Simplified benchmark ranges (kg CO₂e per employee per year)
    const sectorBenchmarks: { [sector: string]: { min: number; max: number } } = {
      'finance': { min: 2000, max: 5000 },
      'it': { min: 1500, max: 4000 },
      'retail': { min: 3000, max: 8000 },
      'tourism': { min: 5000, max: 15000 },
      'agriculture': { min: 8000, max: 25000 },
      'chemicals': { min: 15000, max: 50000 },
      'btp': { min: 10000, max: 30000 },
      'textile': { min: 8000, max: 20000 },
      'default': { min: 3000, max: 10000 }
    };

    let benchmarkComparison = '';
    const primarySector = sectors[0] || 'default';
    const benchmark = sectorBenchmarks[primarySector] || sectorBenchmarks['default'];

    if (emissionsPerEmployee < benchmark.min) {
      benchmarkComparison = `Excellent! Vos émissions par employé (${emissionsPerEmployee.toFixed(0)} kg CO₂e) sont inférieures à la moyenne du secteur.`;
    } else if (emissionsPerEmployee <= benchmark.max) {
      benchmarkComparison = `Vos émissions par employé (${emissionsPerEmployee.toFixed(0)} kg CO₂e) sont dans la moyenne du secteur.`;
    } else {
      benchmarkComparison = `Vos émissions par employé (${emissionsPerEmployee.toFixed(0)} kg CO₂e) sont supérieures à la moyenne du secteur. Des améliorations sont recommandées.`;
    }

    return {
      emissionsPerEmployee,
      emissionsPerSquareMeter,
      emissionsPerRevenue,
      benchmarkComparison
    };
  }
}

/**
 * Static helper function to calculate emissions from questionnaire data
 */
export async function calculateDynamicEmissions(
  questionnaireData: Partial<DynamicQuestionnaireData>
): Promise<DynamicEmissionsResult> {
  if (!questionnaireData.responses || !questionnaireData.companyInfo) {
    throw new Error('Missing required questionnaire data');
  }

  // Get all required emission factor slugs
  const slugs = Object.values(questionnaireData.responses)
    .map(response => response.emissionFactorSlug)
    .filter(Boolean);

  // Fetch emission factors from Supabase
  const emissionFactors = await DynamicEmissionFactorsService.fetchEmissionFactorsBySlugs(slugs);

  // Create calculator instance
  const calculator = new DynamicCarbonCalculator(emissionFactors);

  // Mock questions array (in real implementation, this would come from the questionnaire config)
  const questions = Object.keys(questionnaireData.responses).map(questionId => ({
    id: questionId,
    questionText: `Question ${questionId}`,
    category: questionnaireData.responses![questionId]?.emissionFactorSlug?.includes('energy') ? 'energy' : 'other'
  }));

  return calculator.calculateEmissions(questionnaireData.responses, questions);
} 