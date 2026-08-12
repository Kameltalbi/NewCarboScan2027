// Service de calcul de trajectoire Net Zéro alignée SBTi
// Utilise exclusivement les données de activity_data

import { DashboardAggregator } from '../calculators/DashboardAggregator';
import {
  NetZeroTrajectory,
  NetZeroReference,
  NetZeroObjective,
  AnnualTrajectoryPoint,
  ReductionLever,
  NetZeroScenario,
  ObjectiveType,
  ObjectiveHorizon,
  ScopeInclusion,
} from './types';

export class NetZeroTrajectoryCalculator {
  /**
   * Récupérer les émissions historiques depuis activity_data
   */
  static async getHistoricalEmissions(
    organizationId: string,
    startYear: number,
    endYear: number,
    scopes: ScopeInclusion
  ): Promise<Array<{ year: number; emissions: number }>> {
    const historicalData: Array<{ year: number; emissions: number }> = [];

    for (let year = startYear; year <= endYear; year++) {
      const periodStart = new Date(year, 0, 1).toISOString();
      const periodEnd = new Date(year, 11, 31, 23, 59, 59).toISOString();

      try {
        const aggregated = await DashboardAggregator.aggregate(
          organizationId,
          periodStart,
          periodEnd
        );

        // Filtrer par scopes selon la configuration
        let totalEmissions = 0;
        if (scopes === 1) {
          totalEmissions = aggregated.bilanCarbone.scope1 / 1000; // Conversion en tonnes
        } else if (scopes === 2) {
          totalEmissions = aggregated.bilanCarbone.scope2 / 1000;
        } else if (scopes === 3) {
          totalEmissions = aggregated.bilanCarbone.scope3 / 1000;
        } else if (scopes === '1,2') {
          totalEmissions = (aggregated.bilanCarbone.scope1 + aggregated.bilanCarbone.scope2) / 1000;
        } else {
          // '1,2,3'
          totalEmissions = aggregated.bilanCarbone.totalEmissions / 1000;
        }

        historicalData.push({
          year,
          emissions: totalEmissions,
        });
      } catch (error) {
        // Année sans données, ignorer
        // Année sans données, ignorer
      }
    }

    return historicalData;
  }

  /**
   * Calculer une trajectoire linéaire vers l'objectif
   */
  static calculateLinearTrajectory(
    referenceYear: number,
    referenceEmissions: number,
    targetYear: number,
    targetReductionPercent: number
  ): AnnualTrajectoryPoint[] {
    const trajectory: AnnualTrajectoryPoint[] = [];
    const targetEmissions = referenceEmissions * (1 - targetReductionPercent / 100);
    const years = targetYear - referenceYear;
    const annualReduction = (referenceEmissions - targetEmissions) / years;

    for (let year = referenceYear; year <= targetYear; year++) {
      const target = referenceEmissions - annualReduction * (year - referenceYear);
      trajectory.push({
        year,
        target_emissions: Math.max(0, target),
        reduction_percent: ((referenceEmissions - target) / referenceEmissions) * 100,
      });
    }

    return trajectory;
  }

  /**
   * Calculer une trajectoire avec leviers de réduction
   */
  static calculateTrajectoryWithLevers(
    baseTrajectory: AnnualTrajectoryPoint[],
    levers: ReductionLever[],
    enabledLeverIds: string[]
  ): AnnualTrajectoryPoint[] {
    const enabledLevers = levers.filter((l) => enabledLeverIds.includes(l.id) && l.enabled);

    return baseTrajectory.map((point) => {
      let adjustedEmissions = point.target_emissions;

      // Appliquer les leviers actifs pour cette année
      enabledLevers.forEach((lever) => {
        if (point.year >= lever.start_year && point.year <= lever.end_year) {
          adjustedEmissions = Math.max(0, adjustedEmissions - lever.estimated_impact);
        }
      });

      return {
        ...point,
        target_emissions: adjustedEmissions,
      };
    });
  }

  /**
   * Créer un scénario Net Zero
   */
  static createScenario(
    name: string,
    type: 'conservative' | 'ambitious' | 'accelerated',
    baseTrajectory: AnnualTrajectoryPoint[],
    levers: ReductionLever[],
    enabledLeverIds: string[]
  ): NetZeroScenario {
    const trajectory = this.calculateTrajectoryWithLevers(
      baseTrajectory,
      levers,
      enabledLeverIds
    );

    const totalReduction = trajectory.reduce(
      (sum, point) => sum + (baseTrajectory[0].target_emissions - point.target_emissions),
      0
    );

    // Score de faisabilité basé sur le type de scénario
    const feasibilityScore =
      type === 'conservative' ? 85 : type === 'ambitious' ? 65 : 45;

    return {
      id: `scenario-${Date.now()}`,
      name,
      type,
      levers_enabled: enabledLeverIds,
      trajectory,
      total_reduction: totalReduction,
      feasibility_score: feasibilityScore,
    };
  }

  /**
   * Calculer l'écart vs trajectoire cible
   */
  static calculateGap(
    actualEmissions: number,
    targetEmissions: number
  ): { gap: number; gapPercent: number; status: 'on-track' | 'at-risk' | 'achieved' } {
    const gap = actualEmissions - targetEmissions;
    const gapPercent = targetEmissions > 0 ? (gap / targetEmissions) * 100 : 0;

    let status: 'on-track' | 'at-risk' | 'achieved';
    if (gap <= 0) {
      status = 'achieved';
    } else if (gapPercent <= 5) {
      status = 'on-track';
    } else {
      status = 'at-risk';
    }

    return { gap, gapPercent, status };
  }

  /**
   * Vérifier si l'organisation peut accéder au module Net Zero
   */
  static async canAccessNetZero(organizationId: string): Promise<{
    canAccess: boolean;
    reason?: string;
    availableYears: number[];
  }> {
    const currentYear = new Date().getFullYear();
    const historicalData = await this.getHistoricalEmissions(
      organizationId,
      currentYear - 3,
      currentYear,
      '1,2,3'
    );

    if (historicalData.length === 0) {
      return {
        canAccess: false,
        reason: 'Aucune donnée de bilan carbone disponible. Veuillez d\'abord collecter vos données.',
        availableYears: [],
      };
    }

    return {
      canAccess: true,
      availableYears: historicalData.map((d) => d.year),
    };
  }
}

