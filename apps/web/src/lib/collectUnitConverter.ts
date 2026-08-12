// Service de conversion automatique d'unités pour le module Collect
// € → quantités physiques, litres → kWh, m³ → kWh, tonnes → kgCO2e, etc.

export interface ConversionResult {
  value: number;
  unit: string;
  method: string;
  confidence: number; // 0-1
}

// Prix moyens pour conversion monétaire → physique (€ → unité)
const PRICE_FACTORS: Record<string, { pricePerUnit: number; unit: string; label: string }> = {
  electricite: { pricePerUnit: 0.22, unit: 'kWh', label: 'Électricité' },
  gaz_naturel: { pricePerUnit: 0.08, unit: 'kWh', label: 'Gaz naturel' },
  fioul: { pricePerUnit: 1.2, unit: 'L', label: 'Fioul' },
  diesel: { pricePerUnit: 1.7, unit: 'L', label: 'Diesel' },
  essence: { pricePerUnit: 1.8, unit: 'L', label: 'Essence' },
  propane: { pricePerUnit: 2.5, unit: 'kg', label: 'Propane' },
  eau: { pricePerUnit: 4.0, unit: 'm³', label: 'Eau' },
};

// Conversions physiques directes
const UNIT_CONVERSIONS: Record<string, Record<string, { factor: number; label: string }>> = {
  // Litres → kWh
  L: {
    kWh_fioul: { factor: 9.96, label: 'Fioul → kWh (PCI)' },
    kWh_diesel: { factor: 9.96, label: 'Diesel → kWh (PCI)' },
    kWh_essence: { factor: 9.07, label: 'Essence → kWh (PCI)' },
  },
  // m³ gaz → kWh
  'm³': {
    kWh: { factor: 10.5, label: 'Gaz naturel m³ → kWh (PCI)' },
  },
  // Tonnes → kg
  t: {
    kg: { factor: 1000, label: 'Tonnes → kg' },
  },
  kg: {
    t: { factor: 0.001, label: 'kg → Tonnes' },
  },
  // MWh → kWh
  MWh: {
    kWh: { factor: 1000, label: 'MWh → kWh' },
  },
  kWh: {
    MWh: { factor: 0.001, label: 'kWh → MWh' },
  },
  // km → m
  km: {
    m: { factor: 1000, label: 'km → m' },
  },
};

/**
 * Service de conversion automatique d'unités
 */
export class CollectUnitConverter {
  /**
   * Convertir un montant en euros vers une quantité physique
   */
  static euroToPhysical(euros: number, energyType: string): ConversionResult | null {
    const factor = PRICE_FACTORS[energyType];
    if (!factor) return null;

    return {
      value: Math.round((euros / factor.pricePerUnit) * 100) / 100,
      unit: factor.unit,
      method: `Conversion monétaire (prix moyen: ${factor.pricePerUnit} €/${factor.unit})`,
      confidence: 0.6, // Confidence moyenne car prix moyens
    };
  }

  /**
   * Convertir entre unités physiques
   */
  static convertUnit(value: number, fromUnit: string, toUnit: string, context?: string): ConversionResult | null {
    // Conversion directe
    const conversions = UNIT_CONVERSIONS[fromUnit];
    if (conversions) {
      // Chercher une correspondance exacte ou contextuelle
      const key = context ? `${toUnit}_${context}` : toUnit;
      const conv = conversions[key] || conversions[toUnit];
      if (conv) {
        return {
          value: Math.round(value * conv.factor * 1000) / 1000,
          unit: toUnit,
          method: conv.label,
          confidence: 0.95,
        };
      }
    }

    return null;
  }

  /**
   * Suggérer des conversions possibles pour une valeur donnée
   */
  static suggestConversions(value: number, unit: string, context?: string): ConversionResult[] {
    const results: ConversionResult[] = [];

    // Conversions physiques
    const conversions = UNIT_CONVERSIONS[unit];
    if (conversions) {
      for (const [targetKey, conv] of Object.entries(conversions)) {
        const targetUnit = targetKey.includes('_') ? targetKey.split('_')[0] : targetKey;
        results.push({
          value: Math.round(value * conv.factor * 1000) / 1000,
          unit: targetUnit,
          method: conv.label,
          confidence: 0.95,
        });
      }
    }

    // Conversion monétaire si l'unité est €
    if (unit === '€' && context) {
      const euroConv = this.euroToPhysical(value, context);
      if (euroConv) results.push(euroConv);
    }

    return results;
  }

  /**
   * Obtenir les types d'énergie disponibles pour la conversion monétaire
   */
  static getAvailableEnergyTypes(): Array<{ key: string; label: string; unit: string; price: number }> {
    return Object.entries(PRICE_FACTORS).map(([key, val]) => ({
      key,
      label: val.label,
      unit: val.unit,
      price: val.pricePerUnit,
    }));
  }

  /**
   * Obtenir les unités cibles possibles pour une unité source
   */
  static getTargetUnits(fromUnit: string): string[] {
    const conversions = UNIT_CONVERSIONS[fromUnit];
    if (!conversions) return [];
    return [...new Set(Object.keys(conversions).map(k => k.includes('_') ? k.split('_')[0] : k))];
  }
}
