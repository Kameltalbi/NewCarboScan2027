// Convertisseur : ProductCalculation → activity_data
// Transforme les données du wizard Empreinte Produit en données d'activité normalisées

import { ActivityDataInput, ActivityType, ActivityCategory, DataQuality } from '../activity-data/types';
import { ProductCalculation } from '../../modules/empreinte-produit/types';

/**
 * Convertit les données du wizard ProductCalculation en entrées activity_data
 * Chaque phase du cycle de vie devient une ou plusieurs lignes dans activity_data
 */
export class ProductCalculationToActivityData {
  /**
   * Convertir ProductCalculation en activity_data
   */
  static convert(
    calculation: ProductCalculation,
    organizationId: string,
    productId: string,
    periodStart: string,
    periodEnd: string
  ): ActivityDataInput[] {
    const activities: ActivityDataInput[] = [];

    // 1. MATIÈRES PREMIÈRES (lifecycle_material)
    calculation.materials.forEach((material) => {
      activities.push({
        organization_id: organizationId,
        product_id: productId,
        activity_type: 'material',
        category: 'lifecycle_material',
        subcategory: material.name.toLowerCase().replace(/\s+/g, '_'),
        quantity: material.quantity,
        unit: material.unit,
        period_start: periodStart,
        period_end: periodEnd,
        data_quality: material.isEstimated ? 'estimated' : 'real',
        scope_hint: 3, // Scope 3 pour les matières premières
        notes: `Matière première: ${material.name}${material.origin ? ` (origine: ${material.origin})` : ''}`,
        // Note: emission_factor_id devrait être associé automatiquement depuis la base de facteurs
        // Pour l'instant, on stocke le facteur dans les notes
        source_document: `Facteur d'émission: ${material.emissionFactor} kg CO₂e/${material.unit}`,
      });
    });

    // 2. FABRICATION (lifecycle_manufacturing)
    if (calculation.manufacturing.electricity > 0) {
      activities.push({
        organization_id: organizationId,
        product_id: productId,
        activity_type: 'energy',
        category: 'lifecycle_manufacturing',
        subcategory: 'electricite',
        quantity: calculation.manufacturing.electricity,
        unit: 'kWh',
        period_start: periodStart,
        period_end: periodEnd,
        data_quality: calculation.manufacturing.isEstimated ? 'estimated' : 'real',
        scope_hint: 2, // Scope 2 pour l'électricité
        notes: 'Consommation électrique - Phase fabrication',
      });
    }

    if (calculation.manufacturing.otherEnergy) {
      activities.push({
        organization_id: organizationId,
        product_id: productId,
        activity_type: 'energy',
        category: 'lifecycle_manufacturing',
        subcategory: calculation.manufacturing.otherEnergy.type.toLowerCase().replace(/\s+/g, '_'),
        quantity: calculation.manufacturing.otherEnergy.quantity,
        unit: calculation.manufacturing.otherEnergy.unit,
        period_start: periodStart,
        period_end: periodEnd,
        data_quality: calculation.manufacturing.isEstimated ? 'estimated' : 'real',
        scope_hint: 2,
        notes: `Autre énergie fabrication: ${calculation.manufacturing.otherEnergy.type}`,
      });
    }

    // 3. TRANSPORT (lifecycle_transport)
    if (calculation.transport.distance > 0 && calculation.transport.weight > 0) {
      activities.push({
        organization_id: organizationId,
        product_id: productId,
        activity_type: 'transport',
        category: 'lifecycle_transport',
        subcategory: calculation.transport.mode,
        quantity: calculation.transport.distance,
        unit: 'km',
        period_start: periodStart,
        period_end: periodEnd,
        data_quality: calculation.transport.isEstimated ? 'estimated' : 'real',
        scope_hint: 3,
        notes: `Transport ${calculation.transport.mode} - Distance: ${calculation.transport.distance} km, Poids: ${calculation.transport.weight} kg`,
        // Le poids est stocké dans les notes car l'unité de activity_data est "km"
        // Dans le futur, on pourrait avoir un champ supplémentaire pour le poids
      });
    }

    // 4. UTILISATION (lifecycle_usage) - optionnel
    if (calculation.usage) {
      const lifetimeYears = calculation.usage.lifetime || 1;
      const usesPerYear = calculation.usage.numberOfUses || 1;
      const consumptionPerUse = calculation.usage.consumptionPerUse || 0;
      const totalConsumption = lifetimeYears * usesPerYear * consumptionPerUse;

      if (totalConsumption > 0) {
        activities.push({
          organization_id: organizationId,
          product_id: productId,
          activity_type: 'usage',
          category: 'lifecycle_usage',
          subcategory: 'consommation_utilisation',
          quantity: totalConsumption,
          unit: 'kWh', // Par défaut, on suppose kWh
          period_start: periodStart,
          period_end: periodEnd,
          data_quality: calculation.usage.isEstimated ? 'estimated' : 'real',
          scope_hint: 2,
          notes: `Utilisation - Durée de vie: ${lifetimeYears} ans, ${usesPerYear} usages/an, ${consumptionPerUse} kWh/usage`,
        });
      }
    }

    // 5. FIN DE VIE (lifecycle_eol) - optionnel
    if (calculation.endOfLife) {
      const totalWeight = calculation.materials.reduce((sum, m) => sum + m.quantity, 0);
      const weightForScenario = totalWeight * (calculation.endOfLife.percentage / 100);

      if (weightForScenario > 0) {
        activities.push({
          organization_id: organizationId,
          product_id: productId,
          activity_type: 'waste',
          category: 'lifecycle_eol',
          subcategory: calculation.endOfLife.scenario,
          quantity: weightForScenario,
          unit: 'kg', // Poids traité selon le scénario
          period_start: periodStart,
          period_end: periodEnd,
          data_quality: calculation.endOfLife.isEstimated ? 'estimated' : 'real',
          scope_hint: 3,
          notes: `Fin de vie - Scénario: ${calculation.endOfLife.scenario}, ${calculation.endOfLife.percentage}% du poids total`,
        });
      }
    }

    return activities.filter(a => a.quantity > 0);
  }
}

