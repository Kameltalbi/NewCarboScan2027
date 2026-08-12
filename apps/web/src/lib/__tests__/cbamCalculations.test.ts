/**
 * Tests de robustesse pour cbamCalculations.ts
 * 
 * Ces tests vérifient les INVARIANTS et la COHÉRENCE des calculs CBAM.
 * Ils ne cassent PAS quand on modifie un facteur d'émission.
 * Ils cassent seulement si la LOGIQUE est brisée (formule, structure, division par zéro).
 */
import { describe, it, expect, vi } from 'vitest';

// Mock Supabase AVANT l'import du module
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: () => ({
      select: () => Promise.resolve({ data: null, error: { message: 'mocked' } }),
    }),
  },
}));

// Import APRÈS le mock
const { calculateCBAMEmissions, formatCurrency, formatEmissions } = await import('../cbamCalculations');

// ============================================================
// Helper
// ============================================================
const makeData = (overrides: Record<string, any> = {}) => ({
  sector: 'cement' as const,
  annualVolume: 1000,
  exportCountry: 'tunisia',
  useDefaultData: false,
  useAverageTransport: false,
  electricity: 0,
  gas: 0,
  fuel: 0,
  truckDistance: 0,
  shipDistance: 0,
  airDistance: 0,
  ...overrides,
});

// ============================================================
// Invariants fondamentaux — ne cassent JAMAIS si on change un FE
// ============================================================
describe('CBAM — Invariants', () => {
  it('totalEmissions = production + energy + transport', async () => {
    const result = await calculateCBAMEmissions(makeData({
      sector: 'steel', annualVolume: 5000,
      electricity: 500000, gas: 10000, fuel: 5000,
      truckDistance: 200, shipDistance: 3000, airDistance: 100,
    }));
    const sum = result.emissionsBySource.production + result.emissionsBySource.energy + result.emissionsBySource.transport;
    expect(result.totalEmissions).toBeCloseTo(sum, 4);
  });

  it('emissionsPerTonne = totalEmissions / annualVolume', async () => {
    const result = await calculateCBAMEmissions(makeData({ annualVolume: 2000 }));
    expect(result.emissionsPerTonne).toBeCloseTo(result.totalEmissions / 2000, 4);
  });

  it('emissionsPerTonne = 0 si annualVolume = 0 (pas de division par zéro)', async () => {
    const result = await calculateCBAMEmissions(makeData({ annualVolume: 0 }));
    expect(result.emissionsPerTonne).toBe(0);
    expect(Number.isFinite(result.emissionsPerTonne)).toBe(true);
  });

  it('cbamCost est proportionnel à totalEmissions', async () => {
    const r1 = await calculateCBAMEmissions(makeData({ annualVolume: 1000 }));
    const r2 = await calculateCBAMEmissions(makeData({ annualVolume: 2000 }));
    // Le ratio cbamCost/totalEmissions doit être le même (= prix carbone)
    if (r1.totalEmissions > 0 && r2.totalEmissions > 0) {
      expect(r1.cbamCost / r1.totalEmissions).toBeCloseTo(r2.cbamCost / r2.totalEmissions, 2);
    }
  });

  it('savings >= 0 (jamais négatif)', async () => {
    const result = await calculateCBAMEmissions(makeData({
      electricity: 9999999, gas: 9999999, fuel: 9999999,
      truckDistance: 99999, shipDistance: 99999, airDistance: 99999,
    }));
    expect(result.comparisonWithDefaults.savings).toBeGreaterThanOrEqual(0);
  });

  it('recommendations est un tableau non vide', async () => {
    const result = await calculateCBAMEmissions(makeData());
    expect(Array.isArray(result.recommendations)).toBe(true);
    expect(result.recommendations.length).toBeGreaterThan(0);
  });

  it('toutes les émissions sont >= 0', async () => {
    const result = await calculateCBAMEmissions(makeData({ sector: 'steel', annualVolume: 5000 }));
    expect(result.totalEmissions).toBeGreaterThanOrEqual(0);
    expect(result.emissionsBySource.production).toBeGreaterThanOrEqual(0);
    expect(result.emissionsBySource.energy).toBeGreaterThanOrEqual(0);
    expect(result.emissionsBySource.transport).toBeGreaterThanOrEqual(0);
  });
});

// ============================================================
// Cohérence — les relations physiques entre secteurs/modes
// ============================================================
describe('CBAM — Cohérence physique', () => {
  it('chaque secteur connu produit des émissions > 0', async () => {
    for (const sector of ['cement', 'steel', 'aluminum', 'fertilizer', 'electricity', 'hydrogen']) {
      const result = await calculateCBAMEmissions(makeData({ sector, annualVolume: 1000 }));
      expect(result.emissionsBySource.production).toBeGreaterThan(0);
    }
  });

  it('doubler le volume double les émissions de production', async () => {
    const r1 = await calculateCBAMEmissions(makeData({ annualVolume: 1000 }));
    const r2 = await calculateCBAMEmissions(makeData({ annualVolume: 2000 }));
    expect(r2.emissionsBySource.production).toBeCloseTo(r1.emissionsBySource.production * 2, 0);
  });

  it('useDefaultData=true génère des émissions énergie > 0', async () => {
    const result = await calculateCBAMEmissions(makeData({ useDefaultData: true, annualVolume: 1000 }));
    expect(result.emissionsBySource.energy).toBeGreaterThan(0);
  });

  it('useDefaultData=true: énergie = 30% de la production', async () => {
    const result = await calculateCBAMEmissions(makeData({ useDefaultData: true, annualVolume: 1000 }));
    expect(result.emissionsBySource.energy).toBeCloseTo(result.emissionsBySource.production * 0.3, 0);
  });

  it('transport aérien émet plus que maritime (à distance et volume égaux)', async () => {
    const air = await calculateCBAMEmissions(makeData({
      useAverageTransport: false, truckDistance: 0, shipDistance: 0, airDistance: 1000,
    }));
    const ship = await calculateCBAMEmissions(makeData({
      useAverageTransport: false, truckDistance: 0, shipDistance: 1000, airDistance: 0,
    }));
    expect(air.emissionsBySource.transport).toBeGreaterThan(ship.emissionsBySource.transport);
  });

  it('plus d\'électricité → plus d\'émissions énergie', async () => {
    const r1 = await calculateCBAMEmissions(makeData({ electricity: 100000 }));
    const r2 = await calculateCBAMEmissions(makeData({ electricity: 500000 }));
    expect(r2.emissionsBySource.energy).toBeGreaterThan(r1.emissionsBySource.energy);
  });
});

// ============================================================
// Structure du résultat — le contrat de l'API ne doit pas casser
// ============================================================
describe('CBAM — Structure du résultat', () => {
  it('contient toutes les propriétés attendues', async () => {
    const result = await calculateCBAMEmissions(makeData());
    expect(result).toHaveProperty('totalEmissions');
    expect(result).toHaveProperty('emissionsPerTonne');
    expect(result).toHaveProperty('cbamCost');
    expect(result).toHaveProperty('emissionsBySource');
    expect(result).toHaveProperty('emissionsBySource.production');
    expect(result).toHaveProperty('emissionsBySource.energy');
    expect(result).toHaveProperty('emissionsBySource.transport');
    expect(result).toHaveProperty('recommendations');
    expect(result).toHaveProperty('comparisonWithDefaults');
    expect(result).toHaveProperty('comparisonWithDefaults.savings');
  });
});

// ============================================================
// Utilitaires
// ============================================================
describe('CBAM — Utilitaires', () => {
  it('formatCurrency retourne une chaîne non vide', () => {
    const formatted = formatCurrency(12345.67);
    expect(typeof formatted).toBe('string');
    expect(formatted.length).toBeGreaterThan(0);
  });

  it('formatEmissions: < 1000 → contient "t CO₂e"', () => {
    expect(formatEmissions(500)).toContain('t CO₂e');
  });

  it('formatEmissions: >= 1000 → contient "kt CO₂e"', () => {
    expect(formatEmissions(2500)).toContain('kt CO₂e');
  });
});
