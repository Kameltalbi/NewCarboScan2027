// Convertisseur : Réponses questionnaire → activity_data
// Transforme les réponses du questionnaire Bilan Carbone en données d'activité normalisées

import { ActivityDataInput, ActivityType, ActivityCategory, DataQuality } from '../activity-data/types';

export interface QuestionnaireResponse {
  [key: string]: any;
}

/**
 * Convertit les réponses d'un questionnaire Bilan Carbone en entrées activity_data
 * Chaque réponse devient une ou plusieurs lignes dans activity_data
 */
export class QuestionnaireToActivityData {
  /**
   * Convertir les réponses du questionnaire en activity_data
   */
  static convert(
    responses: QuestionnaireResponse,
    organizationId: string,
    periodStart: string,
    periodEnd: string
  ): ActivityDataInput[] {
    const activities: ActivityDataInput[] = [];

    // SCOPE 1 - Combustibles
    // Gaz naturel (questionnaire: gaz_naturel boolean + gaz_naturel_quantite number en m³)
    if (responses.gaz_naturel_quantite || responses.gaz_naturel_m3) {
      const quantity = parseFloat(responses.gaz_naturel_quantite || responses.gaz_naturel_m3) || 0;
      if (quantity > 0) {
        activities.push({
          organization_id: organizationId,
          activity_type: 'fuel',
          category: 'scope1',
          subcategory: 'gaz_naturel',
          quantity,
          unit: 'm3',
          period_start: periodStart,
          period_end: periodEnd,
          data_quality: this.inferDataQuality(quantity),
          scope_hint: 1,
          notes: 'Gaz naturel - Scope 1',
        });
      }
    }

    // Fioul (questionnaire: fioul boolean + fioul_quantite number en litres)
    if (responses.fioul_quantite || responses.fioul_tonnes) {
      const quantity = parseFloat(responses.fioul_quantite || responses.fioul_tonnes) || 0;
      if (quantity > 0) {
        // Convertir litres en tonnes si nécessaire (1 L ≈ 0.00085 tonnes pour fioul)
        const unit = responses.fioul_quantite ? 'L' : 'tonnes';
        const finalQuantity = unit === 'L' ? quantity : quantity;
        activities.push({
          organization_id: organizationId,
          activity_type: 'fuel',
          category: 'scope1',
          subcategory: 'fioul',
          quantity: finalQuantity,
          unit,
          period_start: periodStart,
          period_end: periodEnd,
          data_quality: this.inferDataQuality(quantity),
          scope_hint: 1,
          notes: 'Fioul - Scope 1',
        });
      }
    }

    // Charbon (questionnaire: charbon boolean + charbon_quantite number)
    if (responses.charbon_quantite || responses.charbon_tonnes) {
      const quantity = parseFloat(responses.charbon_quantite || responses.charbon_tonnes) || 0;
      if (quantity > 0) {
        activities.push({
          organization_id: organizationId,
          activity_type: 'fuel',
          category: 'scope1',
          subcategory: 'charbon',
          quantity,
          unit: 'tonnes',
          period_start: periodStart,
          period_end: periodEnd,
          data_quality: this.inferDataQuality(quantity),
          scope_hint: 1,
          notes: 'Charbon - Scope 1',
        });
      }
    }

    // Carburants véhicules (questionnaire: carburant_flotte select + carburant_litres number)
    if (responses.carburant_litres || responses.carburant_consommation) {
      const quantity = parseFloat(responses.carburant_litres || responses.carburant_consommation) || 0;
      if (quantity > 0) {
        const fuelType = responses.carburant_flotte || responses.type_carburant || 'diesel';
        activities.push({
          organization_id: organizationId,
          activity_type: 'fuel',
          category: 'scope1',
          subcategory: fuelType,
          quantity,
          unit: 'L',
          period_start: periodStart,
          period_end: periodEnd,
          data_quality: this.inferDataQuality(quantity),
          scope_hint: 1,
          notes: `Carburant véhicules (${fuelType}) - Scope 1`,
        });
      }
    }

    // Fluides frigorigènes (questionnaire: recharge_gaz number en kg)
    if (responses.recharge_gaz || responses.fluides_recharge_kg || responses.fluides_fuites_kg) {
      const recharge = parseFloat(responses.recharge_gaz || responses.fluides_recharge_kg) || 0;
      const fuites = parseFloat(responses.fluides_fuites_kg) || 0;
      const totalFluids = recharge + fuites;
      if (totalFluids > 0) {
        activities.push({
          organization_id: organizationId,
          activity_type: 'service',
          category: 'scope1',
          subcategory: 'fluides_frigorigenes',
          quantity: totalFluids,
          unit: 'kg',
          period_start: periodStart,
          period_end: periodEnd,
          data_quality: this.inferDataQuality(totalFluids),
          scope_hint: 1,
          notes: 'Fluides frigorigènes - Scope 1',
        });
      }
    }

    // SCOPE 2 - Énergie
    // Électricité (questionnaire: electricite_consommation number en kWh)
    if (responses.electricite_consommation || responses.electricite_kwh || responses.electricite) {
      const quantity = parseFloat(
        responses.electricite_consommation || 
        responses.electricite_kwh || 
        responses.electricite
      ) || 0;
      if (quantity > 0) {
        activities.push({
          organization_id: organizationId,
          activity_type: 'energy',
          category: 'scope2',
          subcategory: 'electricite',
          quantity,
          unit: 'kWh',
          period_start: periodStart,
          period_end: periodEnd,
          data_quality: this.inferDataQuality(quantity),
          scope_hint: 2,
          notes: 'Électricité - Scope 2',
        });
      }
    }

    // Vapeur/chaleur (questionnaire: autres_energies_achetees number en MWh)
    if (responses.autres_energies_achetees || responses.vapeur_tonnes) {
      const quantity = parseFloat(responses.autres_energies_achetees || responses.vapeur_tonnes) || 0;
      if (quantity > 0) {
        // Le questionnaire utilise MWh, on garde cette unité
        const unit = responses.autres_energies_achetees ? 'MWh' : 'tonnes';
        activities.push({
          organization_id: organizationId,
          activity_type: 'energy',
          category: 'scope2',
          subcategory: 'vapeur_chaleur',
          quantity,
          unit,
          period_start: periodStart,
          period_end: periodEnd,
          data_quality: this.inferDataQuality(quantity),
          scope_hint: 2,
          notes: 'Vapeur/chaleur achetée - Scope 2',
        });
      }
    }

    // SCOPE 3 - Transport
    // Déplacements voiture (questionnaire: deplacements_voiture number en km)
    if (responses.deplacements_voiture || responses.deplacements_voiture_km) {
      const quantity = parseFloat(responses.deplacements_voiture || responses.deplacements_voiture_km) || 0;
      if (quantity > 0) {
        activities.push({
          organization_id: organizationId,
          activity_type: 'transport',
          category: 'scope3_upstream',
          subcategory: 'voiture',
          quantity,
          unit: 'km',
          period_start: periodStart,
          period_end: periodEnd,
          data_quality: this.inferDataQuality(quantity),
          scope_hint: 3,
          notes: 'Déplacements voiture - Scope 3',
        });
      }
    }

    // Déplacements train
    if (responses.deplacements_train || responses.deplacements_train_km) {
      const quantity = parseFloat(responses.deplacements_train || responses.deplacements_train_km) || 0;
      if (quantity > 0) {
        activities.push({
          organization_id: organizationId,
          activity_type: 'transport',
          category: 'scope3_upstream',
          subcategory: 'train',
          quantity,
          unit: 'km',
          period_start: periodStart,
          period_end: periodEnd,
          data_quality: this.inferDataQuality(quantity),
          scope_hint: 3,
          notes: 'Déplacements train - Scope 3',
        });
      }
    }

    // Déplacements avion
    if (responses.deplacements_avion || responses.deplacements_avion_km) {
      const quantity = parseFloat(responses.deplacements_avion || responses.deplacements_avion_km) || 0;
      if (quantity > 0) {
        activities.push({
          organization_id: organizationId,
          activity_type: 'transport',
          category: 'scope3_upstream',
          subcategory: 'avion',
          quantity,
          unit: 'km',
          period_start: periodStart,
          period_end: periodEnd,
          data_quality: this.inferDataQuality(quantity),
          scope_hint: 3,
          notes: 'Déplacements avion - Scope 3',
        });
      }
    }

    // SCOPE 3 - Achats
    if (responses.achats_biens_services) {
      activities.push({
        organization_id: organizationId,
        activity_type: 'purchase',
        category: 'scope3_upstream',
        subcategory: 'biens_services',
        quantity: parseFloat(responses.achats_biens_services) || 0,
        unit: 'EUR', // ou autre unité monétaire
        period_start: periodStart,
        period_end: periodEnd,
        data_quality: this.inferDataQuality(responses.achats_biens_services),
        scope_hint: 3,
        notes: 'Achats biens et services - Scope 3',
      });
    }

    // SCOPE 3 - Déchets
    if (responses.dechets_tonnes) {
      activities.push({
        organization_id: organizationId,
        activity_type: 'waste',
        category: 'scope3_upstream',
        subcategory: 'dechets',
        quantity: parseFloat(responses.dechets_tonnes) || 0,
        unit: 'tonnes',
        period_start: periodStart,
        period_end: periodEnd,
        data_quality: this.inferDataQuality(responses.dechets_tonnes),
        scope_hint: 3,
        notes: 'Déchets - Scope 3',
      });
    }

    return activities.filter(a => a.quantity > 0);
  }

  /**
   * Inférer la qualité de la donnée depuis la valeur
   * Pour l'instant, on considère tout comme "estimated" sauf si spécifié autrement
   */
  private static inferDataQuality(value: any): DataQuality {
    // Si la valeur est numérique et > 0, on considère comme "estimated"
    // Dans le futur, on pourra ajouter une logique plus fine
    if (typeof value === 'number' && value > 0) {
      return 'estimated';
    }
    if (typeof value === 'string' && parseFloat(value) > 0) {
      return 'estimated';
    }
    return 'default';
  }

  /**
   * Mapper les anciennes clés de questionnaire vers les nouvelles
   * Pour compatibilité avec les anciens questionnaires
   */
  static normalizeResponses(responses: QuestionnaireResponse): QuestionnaireResponse {
    const normalized: QuestionnaireResponse = { ...responses };

    // Mapper les anciennes clés vers les nouvelles
    const mappings: Record<string, string> = {
      'combustibleGaz': 'gaz_naturel_m3',
      'combustibleFioul': 'fioul_tonnes',
      'electricite': 'electricite_kwh',
      'deplacementsVoiture': 'deplacements_voiture_km',
      'deplacementsTrain': 'deplacements_train_km',
      'deplacementsAvion': 'deplacements_avion_km',
    };

    Object.entries(mappings).forEach(([oldKey, newKey]) => {
      if (normalized[oldKey] && !normalized[newKey]) {
        normalized[newKey] = normalized[oldKey];
      }
    });

    return normalized;
  }
}

