// Service de validation avancée pour les données d'activité

import { ActivityData, ActivityDataInput } from './types';
import { ActivityDataService } from './ActivityDataService';

export interface ValidationRule {
  id: string;
  name: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  rules: ValidationRule[];
  errors: ValidationRule[];
  warnings: ValidationRule[];
  infos: ValidationRule[];
}

export interface DuplicateCheck {
  isDuplicate: boolean;
  duplicateIds: string[];
  similarity: number;
}

/**
 * Service de validation avancée pour activity_data
 */
export class ActivityDataValidationService {
  /**
   * Valider une donnée d'activité avant création/mise à jour
   */
  static async validate(
    data: ActivityDataInput,
    organizationId: string,
    existingDataId?: string
  ): Promise<ValidationResult> {
    const rules: ValidationRule[] = [];

    // 1. Validation de base
    rules.push(...this.validateBasic(data));

    // 2. Validation des valeurs
    rules.push(...this.validateValues(data));

    // 3. Validation de cohérence
    rules.push(...this.validateConsistency(data));

    // 4. Vérification des doublons
    if (!existingDataId) {
      const duplicateCheck = await this.checkDuplicates(data, organizationId);
      if (duplicateCheck.isDuplicate) {
        rules.push({
          id: 'duplicate',
          name: 'Donnée dupliquée',
          severity: 'warning',
          message: `Cette donnée semble similaire à ${duplicateCheck.duplicateIds.length} autre(s) donnée(s) existante(s). Vérifiez qu'il ne s'agit pas d'un doublon.`,
        });
      }
    }

    // 5. Validation des valeurs extrêmes
    rules.push(...this.validateExtremeValues(data));

    // Séparer par sévérité
    const errors = rules.filter(r => r.severity === 'error');
    const warnings = rules.filter(r => r.severity === 'warning');
    const infos = rules.filter(r => r.severity === 'info');

    return {
      isValid: errors.length === 0,
      rules,
      errors,
      warnings,
      infos,
    };
  }

  /**
   * Validation de base
   */
  private static validateBasic(data: ActivityDataInput): ValidationRule[] {
    const rules: ValidationRule[] = [];

    // Quantité requise et positive
    if (data.quantity === undefined || data.quantity === null) {
      rules.push({
        id: 'quantity_required',
        name: 'Quantité requise',
        severity: 'error',
        message: 'La quantité est obligatoire.',
      });
    } else if (data.quantity < 0) {
      rules.push({
        id: 'quantity_negative',
        name: 'Quantité négative',
        severity: 'error',
        message: 'La quantité ne peut pas être négative.',
      });
    }

    // Unité requise
    if (!data.unit || data.unit.trim() === '') {
      rules.push({
        id: 'unit_required',
        name: 'Unité requise',
        severity: 'error',
        message: 'L\'unité est obligatoire.',
      });
    }

    // Période valide
    if (data.period_start && data.period_end) {
      const start = new Date(data.period_start);
      const end = new Date(data.period_end);
      
      if (start > end) {
        rules.push({
          id: 'period_invalid',
          name: 'Période invalide',
          severity: 'error',
          message: 'La date de début doit être antérieure à la date de fin.',
        });
      }

      // Vérifier que la période n'est pas trop longue (plus de 5 ans)
      const diffYears = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 365);
      if (diffYears > 5) {
        rules.push({
          id: 'period_too_long',
          name: 'Période trop longue',
          severity: 'warning',
          message: 'La période dépasse 5 ans. Vérifiez que c\'est correct.',
        });
      }
    }

    return rules;
  }

  /**
   * Validation des valeurs
   */
  private static validateValues(data: ActivityDataInput): ValidationRule[] {
    const rules: ValidationRule[] = [];

    if (!data.quantity || data.quantity === 0) {
      return rules; // Déjà géré dans validateBasic
    }

    // Seuils par type d'activité
    const thresholds: Record<string, { min: number; max: number; unit: string }> = {
      energy: { min: 0.1, max: 100000000, unit: 'kWh' }, // 100 GWh max
      fuel: { min: 0.1, max: 10000000, unit: 'L' }, // 10 ML max
      transport: { min: 0.1, max: 100000000, unit: 'km' }, // 100 Mkm max
      waste: { min: 0.001, max: 1000000, unit: 'tonnes' }, // 1 Mt max
    };

    const threshold = thresholds[data.activity_type];
    if (threshold) {
      // Convertir l'unité si nécessaire (simplifié)
      let normalizedQuantity = data.quantity;
      
      // Conversions basiques
      if (data.unit.toLowerCase().includes('mwh') && threshold.unit === 'kWh') {
        normalizedQuantity = data.quantity * 1000;
      } else if (data.unit.toLowerCase().includes('gwh') && threshold.unit === 'kWh') {
        normalizedQuantity = data.quantity * 1000000;
      }

      if (normalizedQuantity < threshold.min) {
        rules.push({
          id: 'value_too_small',
          name: 'Valeur très faible',
          severity: 'warning',
          message: `La quantité (${data.quantity} ${data.unit}) semble très faible pour ce type d'activité. Vérifiez l'unité.`,
        });
      }

      if (normalizedQuantity > threshold.max) {
        rules.push({
          id: 'value_too_large',
          name: 'Valeur très élevée',
          severity: 'warning',
          message: `La quantité (${data.quantity} ${data.unit}) semble très élevée. Vérifiez qu'il ne s'agit pas d'une erreur.`,
        });
      }
    }

    return rules;
  }

  /**
   * Validation de cohérence
   */
  private static validateConsistency(data: ActivityDataInput): ValidationRule[] {
    const rules: ValidationRule[] = [];

    // Cohérence scope / category
    if (data.scope_hint) {
      const expectedCategory = this.getExpectedCategoryForScope(data.scope_hint);
      if (expectedCategory && data.category !== expectedCategory) {
        rules.push({
          id: 'scope_category_mismatch',
          name: 'Incohérence scope/catégorie',
          severity: 'warning',
          message: `Le scope ${data.scope_hint} ne correspond pas à la catégorie ${data.category}. Vérifiez la cohérence.`,
        });
      }
    }

    // Cohérence activité / catégorie
    if (data.activity_type === 'energy' && !data.category.includes('scope')) {
      rules.push({
        id: 'activity_category_mismatch',
        name: 'Incohérence activité/catégorie',
        severity: 'info',
        message: 'Type d\'activité "énergie" généralement associé à scope1 ou scope2.',
      });
    }

    // Qualité de données vs confiance
    if (data.data_quality === 'real' && data.confidence_score && data.confidence_score < 80) {
      rules.push({
        id: 'quality_confidence_mismatch',
        name: 'Incohérence qualité/confiance',
        severity: 'warning',
        message: 'Donnée marquée comme "réelle" mais score de confiance faible. Vérifiez la qualité.',
      });
    }

    return rules;
  }

  /**
   * Vérifier les doublons
   */
  static async checkDuplicates(
    data: ActivityDataInput,
    organizationId: string
  ): Promise<DuplicateCheck> {
    try {
      // Récupérer les données similaires
      const similar = await ActivityDataService.list({
        organization_id: organizationId,
        activity_type: data.activity_type,
        category: data.category,
        period_start: data.period_start,
        period_end: data.period_end,
      });

      const duplicates: string[] = [];
      let maxSimilarity = 0;

      for (const existing of similar) {
        // Calculer la similarité
        const similarity = this.calculateSimilarity(data, existing);
        
        if (similarity > 0.85) { // 85% de similarité = probable doublon
          duplicates.push(existing.id);
          maxSimilarity = Math.max(maxSimilarity, similarity);
        }
      }

      return {
        isDuplicate: duplicates.length > 0,
        duplicateIds: duplicates,
        similarity: maxSimilarity,
      };
    } catch (error) {
      console.error('Erreur vérification doublons:', error);
      return {
        isDuplicate: false,
        duplicateIds: [],
        similarity: 0,
      };
    }
  }

  /**
   * Calculer la similarité entre deux données
   */
  private static calculateSimilarity(
    data1: ActivityDataInput,
    data2: ActivityData
  ): number {
    let score = 0;
    let factors = 0;

    // Type d'activité (poids 20%)
    if (data1.activity_type === data2.activity_type) {
      score += 0.2;
    }
    factors += 0.2;

    // Catégorie (poids 20%)
    if (data1.category === data2.category) {
      score += 0.2;
    }
    factors += 0.2;

    // Sous-catégorie (poids 10%)
    if (data1.subcategory === data2.subcategory) {
      score += 0.1;
    }
    factors += 0.1;

    // Quantité similaire (poids 30%) - tolérance 5%
    const qtyDiff = Math.abs(data1.quantity - data2.quantity) / Math.max(data1.quantity, data2.quantity);
    if (qtyDiff < 0.05) {
      score += 0.3;
    } else if (qtyDiff < 0.1) {
      score += 0.15; // Partiel
    }
    factors += 0.3;

    // Unité (poids 10%)
    if (data1.unit === data2.unit) {
      score += 0.1;
    }
    factors += 0.1;

    // Période (poids 10%)
    if (data1.period_start === data2.period_start && data1.period_end === data2.period_end) {
      score += 0.1;
    }
    factors += 0.1;

    return factors > 0 ? score / factors : 0;
  }

  /**
   * Validation des valeurs extrêmes
   */
  private static validateExtremeValues(data: ActivityDataInput): ValidationRule[] {
    const rules: ValidationRule[] = [];

    if (!data.quantity) return rules;

    // Valeurs zéro suspectes
    if (data.quantity === 0 && data.data_quality === 'real') {
      rules.push({
        id: 'zero_value_real',
        name: 'Valeur zéro pour donnée réelle',
        severity: 'warning',
        message: 'Une donnée réelle avec quantité 0 peut indiquer une erreur ou une donnée manquante.',
      });
    }

    // Valeurs très grandes
    if (data.quantity > 1000000) {
      rules.push({
        id: 'very_large_value',
        name: 'Valeur très élevée',
        severity: 'info',
        message: 'Valeur très élevée détectée. Vérifiez l\'unité et la cohérence.',
      });
    }

    return rules;
  }

  /**
   * Obtenir la catégorie attendue pour un scope
   */
  private static getExpectedCategoryForScope(scope: 1 | 2 | 3): string | null {
    switch (scope) {
      case 1:
        return 'scope1';
      case 2:
        return 'scope2';
      case 3:
        return 'scope3_upstream';
      default:
        return null;
    }
  }

  /**
   * Valider en batch plusieurs données
   */
  static async validateBatch(
    dataList: ActivityDataInput[],
    organizationId: string
  ): Promise<Map<number, ValidationResult>> {
    const results = new Map<number, ValidationResult>();

    for (let i = 0; i < dataList.length; i++) {
      const validation = await this.validate(dataList[i], organizationId);
      results.set(i, validation);
    }

    return results;
  }
}
