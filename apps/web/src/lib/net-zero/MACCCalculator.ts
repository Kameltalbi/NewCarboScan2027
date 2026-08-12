// Service de calcul de la MACC (Marginal Abatement Cost Curve)
// Priorise les leviers de réduction par coût marginal (€/tCO₂e)

import { ReductionLever, PriorityLevel } from './types';
import { MACCPoint, MACCStats } from './macc-types';

export class MACCCalculator {
  /**
   * Calculer la MACC depuis une liste de leviers de réduction
   */
  static calculateMACC(levers: ReductionLever[]): MACCPoint[] {
    // Filtrer les leviers qui ont un coût et un impact
    const validLevers = levers.filter(
      (lever) =>
        lever.estimated_impact > 0 &&
        lever.estimated_cost !== undefined &&
        lever.estimated_cost !== null
    );

    if (validLevers.length === 0) {
      return [];
    }

    // Calculer le coût par tonne pour chaque levier
    const maccPoints: MACCPoint[] = validLevers.map((lever) => {
      const costPerTonne = this.calculateCostPerTonne(
        lever.estimated_cost!,
        lever.estimated_impact,
        lever.annual_savings || 0,
        lever.end_year - lever.start_year + 1
      );

      const durationYears = lever.end_year - lever.start_year + 1;

      return {
        lever_id: lever.id,
        lever_name: lever.name,
        lever_category: lever.category,
        reduction_potential: lever.estimated_impact,
        cost_total: lever.estimated_cost!,
        cost_per_tonne: costPerTonne,
        annual_savings: lever.annual_savings || 0,
        macc_rank: 0, // Sera calculé après tri
        cumulative_reduction: 0, // Sera calculé après tri
        cumulative_cost: 0, // Sera calculé après tri
        priority: this.calculatePriority(costPerTonne, lever.estimated_impact),
        is_quick_win: costPerTonne < 0,
        is_no_regret: costPerTonne < 100,
        start_year: lever.start_year,
        end_year: lever.end_year,
        duration_years: durationYears,
      };
    });

    // Trier par coût par tonne (croissant)
    // Les coûts négatifs (économies) viennent en premier
    maccPoints.sort((a, b) => a.cost_per_tonne - b.cost_per_tonne);

    // Calculer le rang, les cumuls et les priorités
    let cumulativeReduction = 0;
    let cumulativeCost = 0;

    return maccPoints.map((point, index) => {
      cumulativeReduction += point.reduction_potential;
      cumulativeCost += point.cost_total;

      return {
        ...point,
        macc_rank: index + 1,
        cumulative_reduction: cumulativeReduction,
        cumulative_cost: cumulativeCost,
      };
    });
  }

  /**
   * Calculer le coût marginal par tonne de CO₂e évitée
   * Prend en compte les économies annuelles sur la durée
   */
  static calculateCostPerTonne(
    investmentCost: number,
    reductionPotential: number, // tCO₂e/an
    annualSavings: number, // €/an
    durationYears: number
  ): number {
    if (reductionPotential <= 0) {
      return Infinity;
    }

    // Coût total actualisé = Investissement - (Économies * Durée)
    // Simplification : pas de taux d'actualisation pour v1
    const totalNetCost = investmentCost - annualSavings * durationYears;

    // Réduction totale sur la durée
    const totalReduction = reductionPotential * durationYears;

    // Coût marginal = Coût net / Réduction totale
    return totalNetCost / totalReduction;
  }

  /**
   * Calculer la priorité automatiquement depuis le coût par tonne
   */
  static calculatePriority(
    costPerTonne: number,
    reductionPotential: number
  ): PriorityLevel {
    // Quick Wins : Coûts négatifs (économies)
    if (costPerTonne < 0) {
      return 'quick_win';
    }

    // Haute priorité : Coût < 100 €/tCO₂e
    if (costPerTonne < 100) {
      return 'high';
    }

    // Moyenne priorité : Coût < 500 €/tCO₂e
    if (costPerTonne < 500) {
      return 'medium';
    }

    // Basse priorité : Coût >= 500 €/tCO₂e
    return 'low';
  }

  /**
   * Calculer le ROI (Return on Investment) en années
   */
  static calculateROI(
    investmentCost: number,
    annualSavings: number
  ): number | null {
    if (annualSavings <= 0) {
      return null; // Pas de ROI si pas d'économies
    }

    return investmentCost / annualSavings;
  }

  /**
   * Calculer le score de priorité pour tri
   * Plus le score est élevé, plus l'action est prioritaire
   */
  static calculatePriorityScore(
    costPerTonne: number,
    reductionPotential: number
  ): number {
    // Formule : Potentiel de réduction / (|Coût par tonne| + 1)
    // Le +1 évite la division par zéro
    // Les coûts négatifs donnent un score plus élevé
    const absCost = Math.abs(costPerTonne) + 1;
    const score = reductionPotential / absCost;

    // Bonus pour les économies (coût négatif)
    return costPerTonne < 0 ? score * 2 : score;
  }

  /**
   * Filtrer les leviers par priorité
   */
  static filterByPriority(
    maccPoints: MACCPoint[],
    priorities: PriorityLevel[]
  ): MACCPoint[] {
    return maccPoints.filter((point) => priorities.includes(point.priority));
  }

  /**
   * Obtenir les Quick Wins (économies)
   */
  static getQuickWins(maccPoints: MACCPoint[]): MACCPoint[] {
    return maccPoints.filter((point) => point.is_quick_win);
  }

  /**
   * Obtenir les actions "No Regret" (coût < 100 €/tCO₂e)
   */
  static getNoRegretActions(maccPoints: MACCPoint[]): MACCPoint[] {
    return maccPoints.filter((point) => point.is_no_regret);
  }

  /**
   * Calculer les statistiques globales de la MACC
   */
  static calculateMACCStats(maccPoints: MACCPoint[]): MACCStats {
    const totalReduction = maccPoints.reduce(
      (sum, point) => sum + point.reduction_potential,
      0
    );
    const totalCost = maccPoints.reduce((sum, point) => sum + point.cost_total, 0);
    const averageCostPerTonne = totalReduction > 0 ? totalCost / totalReduction : 0;

    const quickWins = this.getQuickWins(maccPoints);
    const quickWinsReduction = quickWins.reduce(
      (sum, point) => sum + point.reduction_potential,
      0
    );
    const quickWinsSavings = quickWins.reduce(
      (sum, point) => sum + Math.abs(point.cost_total),
      0
    );

    const noRegretActions = this.getNoRegretActions(maccPoints);
    const noRegretReduction = noRegretActions.reduce(
      (sum, point) => sum + point.reduction_potential,
      0
    );

    return {
      total_reduction: totalReduction,
      total_cost: totalCost,
      average_cost_per_tonne: averageCostPerTonne,
      quick_wins_count: quickWins.length,
      quick_wins_reduction: quickWinsReduction,
      quick_wins_savings: quickWinsSavings,
      no_regret_count: noRegretActions.length,
      no_regret_reduction: noRegretReduction,
    };
  }

  /**
   * Enrichir un levier avec les calculs MACC
   */
  static enrichLeverWithMACC(lever: ReductionLever): ReductionLever {
    if (!lever.estimated_cost || lever.estimated_impact <= 0) {
      return lever;
    }

    const durationYears = lever.end_year - lever.start_year + 1;
    const costPerTonne = this.calculateCostPerTonne(
      lever.estimated_cost,
      lever.estimated_impact,
      lever.annual_savings || 0,
      durationYears
    );

    const roiYears =
      lever.annual_savings && lever.annual_savings > 0
        ? this.calculateROI(lever.estimated_cost, lever.annual_savings)
        : null;

    const priority = this.calculatePriority(costPerTonne, lever.estimated_impact);
    const priorityScore = this.calculatePriorityScore(
      costPerTonne,
      lever.estimated_impact
    );

    return {
      ...lever,
      cost_per_tonne: costPerTonne,
      roi_years: roiYears,
      priority,
      priority_score: priorityScore,
    };
  }
}
