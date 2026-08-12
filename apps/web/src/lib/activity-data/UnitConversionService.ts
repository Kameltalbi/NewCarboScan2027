// Service de conversion automatique d'unités pour la collecte de données

export interface ConversionFactor {
  from: string;
  to: string;
  factor: number;
  description?: string;
  category?: string;
}

export interface ConversionResult {
  value: number;
  unit: string;
  original_value: number;
  original_unit: string;
  factor: number;
  confidence: 'exact' | 'approximate' | 'estimated';
}

/**
 * Service de conversion d'unités pour activity_data
 */
export class UnitConversionService {
  /**
   * Facteurs de conversion prédéfinis
   */
  private static readonly CONVERSION_FACTORS: ConversionFactor[] = [
    // Énergie
    { from: 'kWh', to: 'MWh', factor: 0.001, description: 'Kilowattheure vers Mégawattheure', category: 'energy' },
    { from: 'MWh', to: 'kWh', factor: 1000, description: 'Mégawattheure vers Kilowattheure', category: 'energy' },
    { from: 'kWh', to: 'GWh', factor: 0.000001, description: 'Kilowattheure vers Gigawattheure', category: 'energy' },
    { from: 'GWh', to: 'kWh', factor: 1000000, description: 'Gigawattheure vers Kilowattheure', category: 'energy' },
    { from: 'MWh', to: 'GWh', factor: 0.001, description: 'Mégawattheure vers Gigawattheure', category: 'energy' },
    { from: 'GWh', to: 'MWh', factor: 1000, description: 'Gigawattheure vers Mégawattheure', category: 'energy' },
    
    // Gaz naturel (m³ → kWh)
    { from: 'm³', to: 'kWh', factor: 10.5, description: 'm³ gaz naturel vers kWh (PCI moyen)', category: 'energy' },
    { from: 'm3', to: 'kWh', factor: 10.5, description: 'm³ gaz naturel vers kWh (variante)', category: 'energy' },
    { from: 'Nm³', to: 'kWh', factor: 10.5, description: 'Nm³ gaz naturel vers kWh', category: 'energy' },
    
    // Carburants (litres → kWh)
    { from: 'L', to: 'kWh', factor: 10, description: 'Litres essence vers kWh (approximatif)', category: 'fuel' },
    { from: 'l', to: 'kWh', factor: 10, description: 'Litres essence vers kWh (variante)', category: 'fuel' },
    { from: 'litres', to: 'kWh', factor: 10, description: 'Litres essence vers kWh', category: 'fuel' },
    { from: 'L', to: 'MWh', factor: 0.01, description: 'Litres essence vers MWh', category: 'fuel' },
    
    // Diesel (légèrement différent)
    { from: 'L diesel', to: 'kWh', factor: 9.8, description: 'Litres diesel vers kWh', category: 'fuel' },
    { from: 'L essence', to: 'kWh', factor: 10, description: 'Litres essence vers kWh', category: 'fuel' },
    
    // Masse
    { from: 'kg', to: 'tonnes', factor: 0.001, description: 'Kilogrammes vers tonnes', category: 'mass' },
    { from: 'tonnes', to: 'kg', factor: 1000, description: 'Tonnes vers kilogrammes', category: 'mass' },
    { from: 't', to: 'tonnes', factor: 1, description: 'Tonnes (abrégé) vers tonnes', category: 'mass' },
    { from: 'tonnes', to: 't', factor: 1, description: 'Tonnes vers tonnes (abrégé)', category: 'mass' },
    
    // Distance
    { from: 'km', to: 'm', factor: 1000, description: 'Kilomètres vers mètres', category: 'distance' },
    { from: 'm', to: 'km', factor: 0.001, description: 'Mètres vers kilomètres', category: 'distance' },
    
    // Surface
    { from: 'm²', to: 'ha', factor: 0.0001, description: 'm² vers hectares', category: 'surface' },
    { from: 'ha', to: 'm²', factor: 10000, description: 'Hectares vers m²', category: 'surface' },
    { from: 'm2', to: 'm²', factor: 1, description: 'm2 vers m² (variante)', category: 'surface' },
    
    // Volume
    { from: 'L', to: 'm³', factor: 0.001, description: 'Litres vers m³', category: 'volume' },
    { from: 'm³', to: 'L', factor: 1000, description: 'm³ vers litres', category: 'volume' },
    { from: 'l', to: 'L', factor: 1, description: 'l vers L (normalisation)', category: 'volume' },
  ];

  /**
   * Convertir une valeur d'une unité à une autre
   */
  static convert(
    value: number,
    fromUnit: string,
    toUnit: string,
    category?: string
  ): ConversionResult | null {
    // Normaliser les unités
    const normalizedFrom = this.normalizeUnit(fromUnit);
    const normalizedTo = this.normalizeUnit(toUnit);

    // Si les unités sont identiques, pas de conversion
    if (normalizedFrom === normalizedTo) {
      return {
        value,
        unit: toUnit,
        original_value: value,
        original_unit: fromUnit,
        factor: 1,
        confidence: 'exact',
      };
    }

    // Chercher un facteur de conversion direct
    let factor = this.findConversionFactor(normalizedFrom, normalizedTo, category);

    // Si pas trouvé, essayer une conversion inverse
    if (!factor) {
      const inverseFactor = this.findConversionFactor(normalizedTo, normalizedFrom, category);
      if (inverseFactor) {
        factor = {
          from: inverseFactor.to,
          to: inverseFactor.from,
          factor: 1 / inverseFactor.factor,
          description: `Inverse de ${inverseFactor.description}`,
          category: inverseFactor.category,
        };
      }
    }

    // Si toujours pas trouvé, essayer une conversion en chaîne (ex: L → m³ → kWh)
    if (!factor) {
      factor = this.findChainConversion(normalizedFrom, normalizedTo, category);
    }

    if (!factor) {
      return null; // Conversion impossible
    }

    const convertedValue = value * factor.factor;
    const confidence = this.determineConfidence(factor);

    return {
      value: convertedValue,
      unit: toUnit,
      original_value: value,
      original_unit: fromUnit,
      factor: factor.factor,
      confidence,
    };
  }

  /**
   * Normaliser une unité (enlever espaces, convertir en minuscules, etc.)
   */
  private static normalizeUnit(unit: string): string {
    return unit
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '')
      .replace(/³/g, '3')
      .replace(/²/g, '2');
  }

  /**
   * Trouver un facteur de conversion direct
   */
  private static findConversionFactor(
    from: string,
    to: string,
    category?: string
  ): ConversionFactor | null {
    return this.CONVERSION_FACTORS.find(
      f => f.from === from && f.to === to && (!category || f.category === category)
    ) || null;
  }

  /**
   * Trouver une conversion en chaîne (ex: L → m³ → kWh)
   */
  private static findChainConversion(
    from: string,
    to: string,
    category?: string
  ): ConversionFactor | null {
    // Chercher un chemin de conversion via une unité intermédiaire
    for (const factor1 of this.CONVERSION_FACTORS) {
      if (factor1.from === from && (!category || factor1.category === category)) {
        // Trouver une conversion de l'unité intermédiaire vers la cible
        const factor2 = this.findConversionFactor(factor1.to, to, category);
        if (factor2) {
          return {
            from,
            to,
            factor: factor1.factor * factor2.factor,
            description: `Conversion en chaîne via ${factor1.to}`,
            category: category || factor1.category,
          };
        }
      }
    }
    return null;
  }

  /**
   * Déterminer le niveau de confiance d'une conversion
   */
  private static determineConfidence(factor: ConversionFactor): 'exact' | 'approximate' | 'estimated' {
    // Les conversions exactes sont celles avec des facteurs entiers ou décimaux simples
    if (factor.factor === Math.round(factor.factor) || 
        factor.factor === 0.001 || 
        factor.factor === 0.000001 ||
        factor.factor === 1000 ||
        factor.factor === 1000000) {
      return 'exact';
    }

    // Les conversions avec facteurs comme 10.5 sont approximatives
    if (factor.description?.includes('approximatif') || 
        factor.description?.includes('moyen') ||
        (factor.factor > 1 && factor.factor < 100 && factor.factor % 0.5 === 0)) {
      return 'approximate';
    }

    return 'estimated';
  }

  /**
   * Convertir depuis un montant en € vers une quantité physique
   * Nécessite un prix unitaire
   */
  static convertFromPrice(
    amount: number,
    currency: string,
    pricePerUnit: number,
    targetUnit: string
  ): ConversionResult | null {
    if (currency.toLowerCase() !== 'eur' && currency.toLowerCase() !== '€' && currency.toLowerCase() !== 'euro') {
      return null; // Seulement EUR supporté pour l'instant
    }

    // Calculer la quantité
    const quantity = amount / pricePerUnit;

    return {
      value: quantity,
      unit: targetUnit,
      original_value: amount,
      original_unit: currency,
      factor: 1 / pricePerUnit,
      confidence: 'estimated', // Dépend du prix unitaire fourni
    };
  }

  /**
   * Convertir vers CO2e (nécessite un facteur d'émission)
   */
  static convertToCO2e(
    value: number,
    unit: string,
    emissionFactor: number, // kg CO2e par unité
    targetUnit: 'kg' | 't' | 'tonnes' = 't'
  ): ConversionResult {
    // Convertir en kg CO2e
    const kgCO2e = value * emissionFactor;

    // Convertir vers l'unité cible
    let finalValue = kgCO2e;
    let finalUnit = 'kg CO2e';

    if (targetUnit === 't' || targetUnit === 'tonnes') {
      finalValue = kgCO2e / 1000;
      finalUnit = 't CO2e';
    }

    return {
      value: finalValue,
      unit: finalUnit,
      original_value: value,
      original_unit: unit,
      factor: emissionFactor / (targetUnit === 't' || targetUnit === 'tonnes' ? 1000 : 1),
      confidence: 'estimated', // Dépend du facteur d'émission
    };
  }

  /**
   * Obtenir toutes les conversions possibles depuis une unité
   */
  static getAvailableConversions(fromUnit: string, category?: string): ConversionFactor[] {
    const normalizedFrom = this.normalizeUnit(fromUnit);
    return this.CONVERSION_FACTORS.filter(
      f => f.from === normalizedFrom && (!category || f.category === category)
    );
  }

  /**
   * Ajouter un facteur de conversion personnalisé
   */
  static addCustomFactor(factor: ConversionFactor): void {
    // Normaliser les unités
    factor.from = this.normalizeUnit(factor.from);
    factor.to = this.normalizeUnit(factor.to);
    
    // Vérifier qu'il n'existe pas déjà
    const exists = this.CONVERSION_FACTORS.some(
      f => f.from === factor.from && f.to === factor.to && f.category === factor.category
    );

    if (!exists) {
      this.CONVERSION_FACTORS.push(factor);
    }
  }

  /**
   * Suggérer une conversion automatique basée sur le contexte
   */
  static suggestConversion(
    value: number,
    unit: string,
    activityType: string,
    category: string
  ): { targetUnit: string; reason: string } | null {
    // Suggestions basées sur le type d'activité
    const suggestions: Record<string, { targetUnit: string; reason: string }> = {
      energy: {
        targetUnit: 'kWh',
        reason: 'Unité standard pour l\'énergie',
      },
      fuel: {
        targetUnit: 'L',
        reason: 'Unité standard pour les carburants',
      },
      transport: {
        targetUnit: 'km',
        reason: 'Unité standard pour le transport',
      },
      waste: {
        targetUnit: 'tonnes',
        reason: 'Unité standard pour les déchets',
      },
    };

    const suggestion = suggestions[activityType];
    if (!suggestion) return null;

    // Vérifier si une conversion est possible
    const conversion = this.convert(value, unit, suggestion.targetUnit, category);
    if (!conversion) return null;

    return {
      targetUnit: suggestion.targetUnit,
      reason: suggestion.reason,
    };
  }
}
