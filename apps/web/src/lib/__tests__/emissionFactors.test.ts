import { describe, it, expect } from 'vitest';
import { emissionFactors, conversionFactors } from '../emissionFactors';

describe('emissionFactors — structure & cohérence', () => {
  it('all combustibles factors are positive numbers', () => {
    for (const [key, value] of Object.entries(emissionFactors.combustibles)) {
      expect(value).toBeGreaterThan(0);
      expect(typeof value).toBe('number');
    }
  });

  it('electricite factors are positive', () => {
    for (const [key, value] of Object.entries(emissionFactors.electricite)) {
      expect(value).toBeGreaterThan(0);
    }
  });

  it('transport factors follow physical logic (avion > train)', () => {
    expect(emissionFactors.transports.avion_court).toBeGreaterThan(emissionFactors.transports.train);
    expect(emissionFactors.transports.avion_long).toBeGreaterThan(emissionFactors.transports.train);
  });

  it('logistique: maritime < camion (cohérence physique)', () => {
    expect(emissionFactors.logistique.maritime).toBeLessThan(emissionFactors.logistique.camion);
  });

  it('dechets: recyclage < incineration', () => {
    expect(emissionFactors.dechets.recyclage).toBeLessThan(emissionFactors.dechets.incineration);
  });

  it('objects are frozen (immutable)', () => {
    expect(Object.isFrozen(emissionFactors)).toBe(true);
    expect(Object.isFrozen(emissionFactors.combustibles)).toBe(true);
    expect(Object.isFrozen(emissionFactors.transports)).toBe(true);
  });
});

describe('conversionFactors — valeurs raisonnables', () => {
  it('joursParAn is between 200-260', () => {
    expect(conversionFactors.joursParAn).toBeGreaterThanOrEqual(200);
    expect(conversionFactors.joursParAn).toBeLessThanOrEqual(260);
  });

  it('semainesParAn is 52', () => {
    expect(conversionFactors.semainesParAn).toBe(52);
  });

  it('aller_retour is 2', () => {
    expect(conversionFactors.aller_retour).toBe(2);
  });
});
