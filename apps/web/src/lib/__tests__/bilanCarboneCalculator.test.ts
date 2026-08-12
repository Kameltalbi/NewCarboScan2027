/**
 * Tests de robustesse pour BilanCarboneCalculator.ts
 * 
 * Ces tests vérifient la LOGIQUE, pas les valeurs exactes des FE.
 * Un admin peut changer n'importe quel facteur d'émission sans casser ces tests.
 * Ils cassent seulement si : une subcategory connue retourne 0 par erreur,
 * le scope mapping est cassé, l'indexation ne fonctionne plus, ou un crash.
 */
import { describe, it, expect, beforeEach } from 'vitest';

import { BilanCarboneCalculator, invalidateEmissionFactorCache } from '../calculators/BilanCarboneCalculator';

const Calculator = BilanCarboneCalculator as any;

// ============================================================
// getDefaultFactor — cohérence (pas de valeurs exactes)
// ============================================================
describe('BilanCarboneCalculator.getDefaultFactor — cohérence', () => {
  // Toutes les subcategories connues doivent retourner un nombre (pas undefined/NaN)
  const knownSubcategories = [
    'essence', 'diesel', 'gasoil', 'fioul', 'gpl', 'propane', 'butane',
    'gaz_naturel', 'fossil_gas', 'natural_gas',
    'electricite', 'electricity',
    'cat6_flight_short', 'cat6_flight_medium', 'cat6_flight_long',
    'train', 'hotel', 'taxi', 'rental_car',
    'cat1_outsourced_services', 'cat1_raw_materials', 'cat1_paper',
    'cat2_capex_general', 'cat2_vehicles', 'cat2_buildings',
    'cat5_used_oils', 'cat5_general_waste', 'cat5_waste_recycling', 'cat5_waste_landfill',
    'cat4_supplier_truck', 'cat4_supplier_ship', 'cat4_supplier_air',
    'cat9_delivery_truck', 'cat9_delivery_ship', 'cat9_delivery_air',
    'cat7_car_solo', 'cat7_public_transport', 'cat7_car_electric', 'cat7_bike',
    'cat8_leased_buildings', 'cat13_leased_vehicles',
  ];

  knownSubcategories.forEach(sub => {
    it(`"${sub}" retourne un nombre fini`, () => {
      const val = Calculator.getDefaultFactor(sub, '');
      expect(typeof val).toBe('number');
      expect(Number.isFinite(val)).toBe(true);
    });
  });

  // Cohérence physique : les carburants fossiles émettent > 0
  it('carburants fossiles > 0', () => {
    for (const fuel of ['essence', 'diesel', 'gasoil', 'fioul', 'gpl', 'gaz_naturel']) {
      expect(Calculator.getDefaultFactor(fuel, '')).toBeGreaterThan(0);
    }
  });

  it('électricité > 0', () => {
    expect(Calculator.getDefaultFactor('electricite', '')).toBeGreaterThan(0);
  });

  it('train émet moins que avion court-courrier', () => {
    expect(Calculator.getDefaultFactor('train', '')).toBeLessThan(Calculator.getDefaultFactor('cat6_flight_short', ''));
  });

  it('transport public émet moins que voiture solo', () => {
    expect(Calculator.getDefaultFactor('cat7_public_transport', '')).toBeLessThan(Calculator.getDefaultFactor('cat7_car_solo', ''));
  });

  it('vélo émet 0', () => {
    expect(Calculator.getDefaultFactor('cat7_bike', '')).toBe(0);
  });

  it('recyclage émet moins que décharge', () => {
    expect(Calculator.getDefaultFactor('cat5_waste_recycling', '')).toBeLessThan(Calculator.getDefaultFactor('cat5_waste_landfill', ''));
  });

  it('transport aérien émet plus que maritime', () => {
    expect(Calculator.getDefaultFactor('cat4_supplier_air', '')).toBeGreaterThan(Calculator.getDefaultFactor('cat4_supplier_ship', ''));
  });

  // Fallback
  it('subcategory inconnue + activityType fuel → retourne un nombre > 0', () => {
    expect(Calculator.getDefaultFactor('unknown_subcategory', 'fuel_consumption')).toBeGreaterThan(0);
  });

  it('subcategory et activityType totalement inconnus → 0', () => {
    expect(Calculator.getDefaultFactor('totally_unknown', 'totally_unknown')).toBe(0);
  });
});

// ============================================================
// inferScopeFromCategory
// ============================================================
describe('BilanCarboneCalculator.inferScopeFromCategory', () => {
  it('scope1* → 1', () => {
    expect(Calculator.inferScopeFromCategory('scope1')).toBe(1);
    expect(Calculator.inferScopeFromCategory('scope1_direct')).toBe(1);
  });

  it('scope2* → 2', () => {
    expect(Calculator.inferScopeFromCategory('scope2')).toBe(2);
    expect(Calculator.inferScopeFromCategory('scope2_energy')).toBe(2);
  });

  it('scope3* → 3', () => {
    expect(Calculator.inferScopeFromCategory('scope3')).toBe(3);
    expect(Calculator.inferScopeFromCategory('scope3_upstream')).toBe(3);
  });

  it('catégorie inconnue → 3 (défaut conservateur)', () => {
    expect(Calculator.inferScopeFromCategory('other')).toBe(3);
    expect(Calculator.inferScopeFromCategory('')).toBe(3);
    expect(Calculator.inferScopeFromCategory('lifecycle_material')).toBe(3);
  });
});

// ============================================================
// normalizeForMatching
// ============================================================
describe('BilanCarboneCalculator.normalizeForMatching', () => {
  it('lowercase + suppression accents', () => {
    const result = Calculator.normalizeForMatching('Électricité');
    expect(result).toBe(result.toLowerCase());
    expect(result).not.toContain('É');
    expect(result).not.toContain('é');
  });

  it('caractères spéciaux → underscore', () => {
    const result = Calculator.normalizeForMatching('Gaz Naturel (m³)');
    expect(result).not.toContain(' ');
    expect(result).not.toContain('(');
    expect(result).not.toContain(')');
  });

  it('supprime underscores en début/fin', () => {
    const result = Calculator.normalizeForMatching('_test_');
    expect(result).not.toMatch(/^_/);
    expect(result).not.toMatch(/_$/);
  });

  it('chaîne vide → chaîne vide', () => {
    expect(Calculator.normalizeForMatching('')).toBe('');
  });
});

// ============================================================
// getSubcategoryVariations
// ============================================================
describe('BilanCarboneCalculator.getSubcategoryVariations', () => {
  it('essence dans factorName → retourne des variations non vides', () => {
    const variations = Calculator.getSubcategoryVariations('', 'essence sans plomb');
    expect(variations.length).toBeGreaterThan(0);
    expect(variations).toContain('essence');
  });

  it('diesel dans factorName → retourne des variations non vides', () => {
    const variations = Calculator.getSubcategoryVariations('', 'diesel routier');
    expect(variations.length).toBeGreaterThan(0);
    expect(variations).toContain('diesel');
  });

  it('gaz dans factorName → retourne des variations non vides', () => {
    const variations = Calculator.getSubcategoryVariations('', 'gaz naturel');
    expect(variations.length).toBeGreaterThan(0);
  });

  it('fioul dans factorName → retourne des variations non vides', () => {
    const variations = Calculator.getSubcategoryVariations('', 'fioul lourd');
    expect(variations.length).toBeGreaterThan(0);
  });

  it('aucun match → tableau vide', () => {
    const variations = Calculator.getSubcategoryVariations('', 'something random');
    expect(variations).toHaveLength(0);
  });
});

// ============================================================
// indexEmissionFactors — logique d'indexation
// ============================================================
describe('BilanCarboneCalculator.indexEmissionFactors', () => {
  beforeEach(() => {
    invalidateEmissionFactorCache();
  });

  it('indexe par subcategory et slug', () => {
    const data = [
      {
        subcategory: 'cat6_business_travel:cat6_flight_short',
        factor_name: 'Vol court-courrier',
        slug: 'cat6_flight_short',
        emission_factor: 0.158,
        unit: 'kgCO2e/km',
      },
    ];

    const map = Calculator.indexEmissionFactors(data);
    // Les deux clés doivent pointer vers la même valeur
    expect(map.get('cat6_business_travel:cat6_flight_short')).toBe(map.get('cat6_flight_short'));
  });

  it('premier arrivé gagne pour une même clé', () => {
    const data = [
      { subcategory: 'diesel', factor_name: 'A', slug: 'diesel', emission_factor: 2.68, unit: 'u' },
      { subcategory: 'diesel', factor_name: 'B', slug: 'diesel_other', emission_factor: 3.0, unit: 'u' },
    ];

    const map = Calculator.indexEmissionFactors(data);
    // Le premier "diesel" gagne, pas le second
    expect(map.get('diesel')).toBe(2.68);
    expect(map.get('diesel')).not.toBe(3.0);
  });

  it('gère les données null/undefined sans crash', () => {
    const data = [
      { subcategory: null as any, factor_name: null as any, slug: null as any, emission_factor: 1.0, unit: 'u' },
    ];
    expect(() => Calculator.indexEmissionFactors(data)).not.toThrow();
  });
});

// ============================================================
// Cache — isolation multi-tenant
// ============================================================
describe('Cache des facteurs d\'émission — isolation', () => {
  it('invalidateEmissionFactorCache ne crash pas', () => {
    expect(() => invalidateEmissionFactorCache()).not.toThrow();
    expect(() => invalidateEmissionFactorCache()).not.toThrow(); // double appel safe
  });
});

// ============================================================
// getEmptyResult — structure correcte
// ============================================================
describe('BilanCarboneCalculator.getEmptyResult', () => {
  it('retourne un résultat vide avec la bonne structure', () => {
    const result = Calculator.getEmptyResult('2024-01-01', '2024-12-31');
    expect(result.totalEmissions).toBe(0);
    expect(result.scope1).toBe(0);
    expect(result.scope2).toBe(0);
    expect(result.scope3).toBe(0);
    expect(result.breakdown).toEqual([]);
    expect(result.detailedBreakdown).toEqual([]);
    expect(result.period.start).toBe('2024-01-01');
    expect(result.period.end).toBe('2024-12-31');
    expect(result.missingFactors).toEqual([]);
  });
});
