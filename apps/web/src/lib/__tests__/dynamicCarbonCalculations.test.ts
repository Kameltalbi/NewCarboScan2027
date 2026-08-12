/**
 * Tests de robustesse pour dynamicCarbonCalculations.ts
 * 
 * Ces tests vérifient la LOGIQUE, pas les valeurs exactes.
 * Un admin peut changer n'importe quel FE ou quantité sans casser ces tests.
 * Ils cassent seulement si : formule brisée, crash, structure cassée.
 */
import { describe, it, expect } from 'vitest';
import { DynamicCarbonCalculator } from '../dynamicCarbonCalculations';
import type { EmissionFactor } from '@/types/dynamicQuestionnaire';

// ============================================================
// Helpers
// ============================================================
const makeFactor = (slug: string, factor: number, unit = 'kgCO2e/unit'): EmissionFactor => ({
  id: slug,
  slug,
  nom_affiche: slug,
  factor_name: slug,
  emission_factor: factor,
  unit,
  category: 'test',
  subcategory: 'test',
  source: 'test',
  year: 2024,
});

const makeResponse = (value: number, slug: string, unit = 'unit', questionId = '') => ({
  questionId,
  value,
  unit,
  emissionFactorSlug: slug,
});

const makeQuestion = (id: string, category = 'other') => ({
  id,
  questionText: `Question ${id}`,
  category,
});

// ============================================================
// Calcul standard — logique
// ============================================================
describe('DynamicCarbonCalculator — Calcul standard', () => {
  it('émissions proportionnelles à la quantité (doubler value → doubler émissions)', () => {
    const factors = { 'f1': makeFactor('f1', 2.0) };
    const calc = new DynamicCarbonCalculator(factors);

    const r1 = calc.calculateEmissions({ q1: makeResponse(100, 'f1') }, [makeQuestion('q1')]);
    const r2 = calc.calculateEmissions({ q1: makeResponse(200, 'f1') }, [makeQuestion('q1')]);
    expect(r2.totalEmissions).toBeCloseTo(r1.totalEmissions * 2, 4);
  });

  it('émissions proportionnelles au FE (doubler FE → doubler émissions)', () => {
    const calc1 = new DynamicCarbonCalculator({ 'f1': makeFactor('f1', 1.0) });
    const calc2 = new DynamicCarbonCalculator({ 'f1': makeFactor('f1', 2.0) });

    const responses = { q1: makeResponse(100, 'f1') };
    const questions = [makeQuestion('q1')];

    const r1 = calc1.calculateEmissions(responses, questions);
    const r2 = calc2.calculateEmissions(responses, questions);
    expect(r2.totalEmissions).toBeCloseTo(r1.totalEmissions * 2, 4);
  });

  it('2 réponses → 2 lignes dans le breakdown', () => {
    const factors = { 'f1': makeFactor('f1', 1.0), 'f2': makeFactor('f2', 1.0) };
    const calc = new DynamicCarbonCalculator(factors);
    const result = calc.calculateEmissions(
      { q1: makeResponse(100, 'f1'), q2: makeResponse(200, 'f2') },
      [makeQuestion('q1'), makeQuestion('q2')],
    );
    expect(result.emissionsBreakdown).toHaveLength(2);
  });

  it('ignore les réponses avec value <= 0', () => {
    const factors = { 'f1': makeFactor('f1', 2.0) };
    const calc = new DynamicCarbonCalculator(factors);
    const result = calc.calculateEmissions(
      { q1: makeResponse(0, 'f1'), q2: makeResponse(-5, 'f1') },
      [makeQuestion('q1'), makeQuestion('q2')],
    );
    expect(result.totalEmissions).toBe(0);
    expect(result.emissionsBreakdown).toHaveLength(0);
  });

  it('signale les facteurs manquants dans missingFactors', () => {
    const calc = new DynamicCarbonCalculator({});
    const result = calc.calculateEmissions(
      { q1: makeResponse(100, 'missing_slug') },
      [makeQuestion('q1')],
    );
    expect(result.totalEmissions).toBe(0);
    expect(result.calculationDetails.missingFactors).toContain('missing_slug');
  });
});

// ============================================================
// Calculs spécialisés — cohérence logique (pas de valeurs exactes)
// ============================================================
describe('DynamicCarbonCalculator — Calculs spécialisés', () => {
  describe('Fluides frigorigènes (PRG)', () => {
    it('chaque type de réfrigérant produit des émissions > 0', () => {
      for (const type of ['R134a', 'R410a', 'R32', 'R404a', 'R22 (ancien)', 'Autres']) {
        const factors = { 'refrigerant': makeFactor('refrigerant', 1) };
        const calc = new DynamicCarbonCalculator(factors);
        const responses: Record<string, any> = {
          refrigerant_recharge_kg: makeResponse(10, 'refrigerant'),
          refrigerant_type: { questionId: 'refrigerant_type', value: type, unit: '', emissionFactorSlug: '' },
        };
        const result = calc.calculateEmissions(responses, [makeQuestion('refrigerant_recharge_kg', 'refrigerants')]);
        expect(result.totalEmissions).toBeGreaterThan(0);
      }
    });

    it('R404a émet plus que R32 (PRG plus élevé)', () => {
      const factors = { 'refrigerant': makeFactor('refrigerant', 1) };
      const makeCalc = (type: string) => {
        const calc = new DynamicCarbonCalculator(factors);
        return calc.calculateEmissions(
          {
            refrigerant_recharge_kg: makeResponse(10, 'refrigerant'),
            refrigerant_type: { questionId: 'refrigerant_type', value: type, unit: '', emissionFactorSlug: '' },
          } as any,
          [makeQuestion('refrigerant_recharge_kg', 'refrigerants')],
        );
      };
      expect(makeCalc('R404a').totalEmissions).toBeGreaterThan(makeCalc('R32').totalEmissions);
    });

    it('type inconnu ne crash pas et produit des émissions > 0', () => {
      const factors = { 'refrigerant': makeFactor('refrigerant', 1) };
      const calc = new DynamicCarbonCalculator(factors);
      const responses: Record<string, any> = {
        refrigerant_recharge_kg: makeResponse(5, 'refrigerant'),
        refrigerant_type: { questionId: 'rt', value: 'TypeInconnu', unit: '', emissionFactorSlug: '' },
      };
      const result = calc.calculateEmissions(responses, [makeQuestion('refrigerant_recharge_kg', 'refrigerants')]);
      expect(result.totalEmissions).toBeGreaterThan(0);
    });
  });

  describe('Électricité avec part verte', () => {
    it('100% vert → émissions = 0', () => {
      const factors = { 'electricite_kwh': makeFactor('electricite_kwh', 0.5) };
      const calc = new DynamicCarbonCalculator(factors);
      const responses: Record<string, any> = {
        electricity_consumption: makeResponse(100000, 'electricite_kwh'),
        green_electricity_percentage: { questionId: 'gep', value: 100, unit: '%', emissionFactorSlug: '' },
      };
      const result = calc.calculateEmissions(responses, [makeQuestion('electricity_consumption', 'energy')]);
      expect(result.totalEmissions).toBeCloseTo(0, 0);
    });

    it('50% vert émet moins que 0% vert', () => {
      const factors = { 'electricite_kwh': makeFactor('electricite_kwh', 0.5) };
      const makeCalc = (pct: number) => {
        const calc = new DynamicCarbonCalculator(factors);
        return calc.calculateEmissions(
          {
            electricity_consumption: makeResponse(100000, 'electricite_kwh'),
            green_electricity_percentage: { questionId: 'gep', value: pct, unit: '%', emissionFactorSlug: '' },
          } as any,
          [makeQuestion('electricity_consumption', 'energy')],
        );
      };
      expect(makeCalc(50).totalEmissions).toBeLessThan(makeCalc(0).totalEmissions);
    });

    it('FE electricite_kwh absent → signalé dans missingFactors', () => {
      const calc = new DynamicCarbonCalculator({});
      const responses: Record<string, any> = {
        electricity_consumption: makeResponse(100000, 'electricite_kwh'),
      };
      const result = calc.calculateEmissions(responses, [makeQuestion('electricity_consumption', 'energy')]);
      expect(result.calculationDetails.missingFactors).toContain('electricite_kwh');
    });
  });

  describe('Charbon', () => {
    it('produit des émissions > 0', () => {
      const factors = { 'coal': makeFactor('coal', 1) };
      const calc = new DynamicCarbonCalculator(factors);
      const result = calc.calculateEmissions(
        { coal_consumption_kg: makeResponse(500, 'coal') },
        [makeQuestion('coal_consumption_kg', 'stationary_energy')],
      );
      expect(result.totalEmissions).toBeGreaterThan(0);
    });
  });

  describe('Biomasse', () => {
    it('produit des émissions >= 0', () => {
      const factors = { 'biomass': makeFactor('biomass', 1) };
      const calc = new DynamicCarbonCalculator(factors);
      const result = calc.calculateEmissions(
        { biomass_consumption_kg: makeResponse(2000, 'biomass') },
        [makeQuestion('biomass_consumption_kg', 'stationary_energy')],
      );
      expect(result.totalEmissions).toBeGreaterThanOrEqual(0);
    });

    it('biomasse émet moins que charbon (à quantité égale)', () => {
      const factors = { 'coal': makeFactor('coal', 1), 'biomass': makeFactor('biomass', 1) };
      const calc = new DynamicCarbonCalculator(factors);
      const coal = calc.calculateEmissions(
        { coal_consumption_kg: makeResponse(1000, 'coal') },
        [makeQuestion('coal_consumption_kg', 'stationary_energy')],
      );
      const bio = calc.calculateEmissions(
        { biomass_consumption_kg: makeResponse(1000, 'biomass') },
        [makeQuestion('biomass_consumption_kg', 'stationary_energy')],
      );
      expect(bio.totalEmissions).toBeLessThan(coal.totalEmissions);
    });
  });

  describe('Biocarburants', () => {
    it('chaque type de biocarburant produit des émissions > 0', () => {
      for (const type of ['E85 (éthanol)', 'B30/B100 (biodiesel)', 'HVO (diesel renouvelable)', 'Autres']) {
        const factors = { 'biofuel': makeFactor('biofuel', 1) };
        const calc = new DynamicCarbonCalculator(factors);
        const responses: Record<string, any> = {
          biofuel_consumption_litres: makeResponse(1000, 'biofuel'),
          biofuel_type: { questionId: 'bt', value: type as any, unit: '', emissionFactorSlug: '' },
        };
        const result = calc.calculateEmissions(responses, [makeQuestion('biofuel_consumption_litres', 'fuel')]);
        expect(result.totalEmissions).toBeGreaterThan(0);
      }
    });

    it('HVO émet moins que biodiesel (facteur plus bas)', () => {
      const factors = { 'biofuel': makeFactor('biofuel', 1) };
      const makeCalc = (type: string) => {
        const calc = new DynamicCarbonCalculator(factors);
        return calc.calculateEmissions(
          {
            biofuel_consumption_litres: makeResponse(1000, 'biofuel'),
            biofuel_type: { questionId: 'bt', value: type as any, unit: '', emissionFactorSlug: '' },
          } as any,
          [makeQuestion('biofuel_consumption_litres', 'fuel')],
        );
      };
      expect(makeCalc('HVO (diesel renouvelable)').totalEmissions)
        .toBeLessThan(makeCalc('B30/B100 (biodiesel)').totalEmissions);
    });

    it('type inconnu ne crash pas', () => {
      const factors = { 'biofuel': makeFactor('biofuel', 1) };
      const calc = new DynamicCarbonCalculator(factors);
      const responses: Record<string, any> = {
        biofuel_consumption_litres: makeResponse(1000, 'biofuel'),
        biofuel_type: { questionId: 'bt', value: 'TypeInconnu' as any, unit: '', emissionFactorSlug: '' },
      };
      const result = calc.calculateEmissions(responses, [makeQuestion('biofuel_consumption_litres', 'fuel')]);
      expect(result.totalEmissions).toBeGreaterThan(0);
    });
  });
});

// ============================================================
// Mapping scope — chaque catégorie va dans le bon scope
// ============================================================
describe('DynamicCarbonCalculator — Mapping scope', () => {
  const scopeMapping: Record<string, string> = {
    'energy': 'scope2',
    'transport': 'scope1',
    'production': 'scope1',
    'refrigerants': 'scope1',
    'fuel': 'scope1',
    'stationary_energy': 'scope1',
    'materials': 'scope3',
    'waste': 'scope3',
    'other': 'scope3',
  };

  Object.entries(scopeMapping).forEach(([category, expectedScope]) => {
    it(`catégorie "${category}" → ${expectedScope}`, () => {
      const factors = { 'f1': makeFactor('f1', 1.0) };
      const calc = new DynamicCarbonCalculator(factors);
      const result = calc.calculateEmissions(
        { q1: makeResponse(100, 'f1') },
        [makeQuestion('q1', category)],
      );
      expect(result.emissionsByScope[expectedScope as keyof typeof result.emissionsByScope]).toBeGreaterThan(0);
    });
  });

  it('catégorie inconnue → scope3 par défaut', () => {
    const factors = { 'f1': makeFactor('f1', 1.0) };
    const calc = new DynamicCarbonCalculator(factors);
    const result = calc.calculateEmissions(
      { q1: makeResponse(100, 'f1') },
      [makeQuestion('q1', 'unknown_category')],
    );
    expect(result.emissionsByScope.scope3).toBeGreaterThan(0);
  });
});

// ============================================================
// Intensités — protection division par zéro
// ============================================================
describe('DynamicCarbonCalculator — Intensités', () => {
  const calc = new DynamicCarbonCalculator({});

  it('getEmissionsPerEmployee: division par zéro → 0', () => {
    expect(calc.getEmissionsPerEmployee(1000, 0)).toBe(0);
    expect(calc.getEmissionsPerEmployee(1000, -1)).toBe(0);
  });

  it('getEmissionsPerSquareMeter: division par zéro → 0', () => {
    expect(calc.getEmissionsPerSquareMeter(1000, 0)).toBe(0);
    expect(calc.getEmissionsPerSquareMeter(1000, -1)).toBe(0);
  });

  it('getEmissionsPerRevenue: division par zéro → 0', () => {
    expect(calc.getEmissionsPerRevenue(1000, 0)).toBe(0);
    expect(calc.getEmissionsPerRevenue(1000, -1)).toBe(0);
  });

  it('intensité positive pour des valeurs valides', () => {
    expect(calc.getEmissionsPerEmployee(10000, 50)).toBeGreaterThan(0);
    expect(calc.getEmissionsPerSquareMeter(5, 1000)).toBeGreaterThan(0);
    expect(calc.getEmissionsPerRevenue(100, 2000000)).toBeGreaterThan(0);
  });
});

// ============================================================
// Invariants fondamentaux
// ============================================================
describe('DynamicCarbonCalculator — Invariants', () => {
  it('totalEmissions = scope1 + scope2 + scope3', () => {
    const factors = { 'f1': makeFactor('f1', 2.0), 'f2': makeFactor('f2', 0.5), 'f3': makeFactor('f3', 1.0) };
    const calc = new DynamicCarbonCalculator(factors);
    const result = calc.calculateEmissions(
      { q1: makeResponse(100, 'f1'), q2: makeResponse(200, 'f2'), q3: makeResponse(300, 'f3') },
      [makeQuestion('q1', 'fuel'), makeQuestion('q2', 'energy'), makeQuestion('q3', 'materials')],
    );
    const scopeSum = result.emissionsByScope.scope1 + result.emissionsByScope.scope2 + result.emissionsByScope.scope3;
    expect(result.totalEmissions).toBeCloseTo(scopeSum, 4);
  });

  it('totalEmissions = somme des emissionsBreakdown', () => {
    const factors = { 'f1': makeFactor('f1', 2.0), 'f2': makeFactor('f2', 3.0) };
    const calc = new DynamicCarbonCalculator(factors);
    const result = calc.calculateEmissions(
      { q1: makeResponse(100, 'f1'), q2: makeResponse(200, 'f2') },
      [makeQuestion('q1'), makeQuestion('q2')],
    );
    const breakdownSum = result.emissionsBreakdown.reduce((sum, item) => sum + item.emissions, 0);
    expect(result.totalEmissions).toBeCloseTo(breakdownSum, 4);
  });

  it('aucune émission négative', () => {
    const factors = { 'f1': makeFactor('f1', 2.0) };
    const calc = new DynamicCarbonCalculator(factors);
    const result = calc.calculateEmissions(
      { q1: makeResponse(100, 'f1') },
      [makeQuestion('q1')],
    );
    expect(result.totalEmissions).toBeGreaterThanOrEqual(0);
    expect(result.emissionsByScope.scope1).toBeGreaterThanOrEqual(0);
    expect(result.emissionsByScope.scope2).toBeGreaterThanOrEqual(0);
    expect(result.emissionsByScope.scope3).toBeGreaterThanOrEqual(0);
  });

  it('recommendations est un tableau de 1 à 5 éléments', () => {
    const factors = { 'f1': makeFactor('f1', 2.0) };
    const calc = new DynamicCarbonCalculator(factors);
    const result = calc.calculateEmissions(
      { q1: makeResponse(100, 'f1') },
      [makeQuestion('q1')],
    );
    expect(result.recommendations.length).toBeGreaterThanOrEqual(1);
    expect(result.recommendations.length).toBeLessThanOrEqual(5);
  });
});
