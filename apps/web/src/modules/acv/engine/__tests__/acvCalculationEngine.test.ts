/**
 * Tests unitaires — Moteur de calcul ACV ISO 14040/14044
 * Couvre : impacts matériaux, transport, procédés, agrégation, hotspots, scénarios, formatage
 */

import { describe, it, expect } from 'vitest';
import {
  calculateMaterialImpact,
  calculateTransportImpact,
  calculateProcessImpact,
  calculateComponentImpact,
  calculateProductImpacts,
  calculateScenarioImpacts,
  calculateVariation,
  formatImpact,
} from '../acvCalculationEngine';
import type {
  ACVProductComponent,
  ACVMaterial,
  ACVProcess,
  ACVTransportMode,
  ACVLifecycleModule,
} from '../../types';

// ── FIXTURES ──────────────────────────────────────────────────────

const baseMaterial: ACVMaterial = {
  id: 'mat-1',
  name: 'Acier laminé',
  category: 'metals',
  unit: 'kg',
  carbon_factor: 2.1,
  energy_factor: 25.0,
  water_factor: 0.05,
  acidification_factor: 0.008,
  source: 'ADEME',
  is_default: true,
  created_at: '',
  updated_at: '',
};

const baseProcess: ACVProcess = {
  id: 'proc-1',
  name: 'Formage à chaud',
  sector: 'steel',
  energy_consumption: 3.5,
  emission_factor: 0.45,
  water_consumption: 0.02,
  unit: 'kg',
  source: 'ADEME',
  is_default: true,
  created_at: '',
  updated_at: '',
};

const baseTransport: ACVTransportMode = {
  id: 'tr-1',
  name: 'Camion 40t',
  mode_type: 'road',
  emission_factor_tkm: 0.062,
  energy_factor_tkm: 0.85,
  source: 'ADEME',
  is_default: true,
  created_at: '',
  updated_at: '',
};

const makeComponent = (overrides: Partial<ACVProductComponent> = {}): ACVProductComponent => ({
  id: 'comp-1',
  project_id: 'proj-1',
  component_name: 'Châssis',
  quantity: 100,
  unit: 'kg',
  recycled_percentage: 0,
  transport_distance_km: 500,
  sort_order: 0,
  created_at: '',
  updated_at: '',
  ...overrides,
});

const makeLifecycleModules = (): ACVLifecycleModule[] => [
  { id: 'lm-1', project_id: 'proj-1', module_code: 'A1', module_name: 'Matières premières', module_group: 'production', is_included: true, carbon_impact: 0, energy_impact: 0, water_impact: 0, acidification_impact: 0, data_quality_score: 3, created_at: '', updated_at: '' },
  { id: 'lm-2', project_id: 'proj-1', module_code: 'A2', module_name: 'Transport matières', module_group: 'production', is_included: true, carbon_impact: 0, energy_impact: 0, water_impact: 0, acidification_impact: 0, data_quality_score: 3, created_at: '', updated_at: '' },
  { id: 'lm-3', project_id: 'proj-1', module_code: 'A3', module_name: 'Fabrication', module_group: 'production', is_included: true, carbon_impact: 0, energy_impact: 0, water_impact: 0, acidification_impact: 0, data_quality_score: 3, created_at: '', updated_at: '' },
];

// ── TESTS : IMPACT MATÉRIAU ──────────────────────────────────────

describe('calculateMaterialImpact', () => {
  it('returns zero impact when no material provided', () => {
    const result = calculateMaterialImpact(makeComponent(), undefined);
    expect(result.carbon).toBe(0);
    expect(result.energy).toBe(0);
    expect(result.water).toBe(0);
    expect(result.acidification).toBe(0);
  });

  it('calculates correct impact for virgin material', () => {
    const comp = makeComponent({ quantity: 100, recycled_percentage: 0 });
    const result = calculateMaterialImpact(comp, baseMaterial);
    // 100 * 2.1 = 210 kgCO2e
    expect(result.carbon).toBeCloseTo(210, 2);
    // 100 * 25.0 = 2500 MJ
    expect(result.energy).toBeCloseTo(2500, 2);
    // 100 * 0.05 = 5 m³
    expect(result.water).toBeCloseTo(5, 2);
    // 100 * 0.008 = 0.8 kgSO2e
    expect(result.acidification).toBeCloseTo(0.8, 2);
  });

  it('applies recycled percentage reduction correctly', () => {
    const comp = makeComponent({ quantity: 100, recycled_percentage: 50 });
    const result = calculateMaterialImpact(comp, baseMaterial);
    // recycledReduction = 0.5 * 0.7 = 0.35 → effectiveFactor = 0.65
    // 100 * 2.1 * 0.65 = 136.5
    expect(result.carbon).toBeCloseTo(136.5, 2);
  });

  it('applies 100% recycled correctly', () => {
    const comp = makeComponent({ quantity: 100, recycled_percentage: 100 });
    const result = calculateMaterialImpact(comp, baseMaterial);
    // effectiveFactor = 1 - (1.0 * 0.7) = 0.3
    // 100 * 2.1 * 0.3 = 63
    expect(result.carbon).toBeCloseTo(63, 2);
  });

  it('scales linearly with quantity', () => {
    const comp10 = makeComponent({ quantity: 10 });
    const comp100 = makeComponent({ quantity: 100 });
    const r10 = calculateMaterialImpact(comp10, baseMaterial);
    const r100 = calculateMaterialImpact(comp100, baseMaterial);
    expect(r100.carbon / r10.carbon).toBeCloseTo(10, 5);
  });
});

// ── TESTS : IMPACT TRANSPORT ─────────────────────────────────────

describe('calculateTransportImpact', () => {
  it('returns zero when no transport mode', () => {
    const result = calculateTransportImpact(makeComponent(), undefined);
    expect(result.carbon).toBe(0);
  });

  it('returns zero when distance is 0', () => {
    const comp = makeComponent({ transport_distance_km: 0 });
    const result = calculateTransportImpact(comp, baseTransport);
    expect(result.carbon).toBe(0);
  });

  it('calculates tkm correctly', () => {
    // 100 kg = 0.1 t, 500 km → 50 tkm
    // 50 * 0.062 = 3.1 kgCO2e
    const comp = makeComponent({ quantity: 100, transport_distance_km: 500 });
    const result = calculateTransportImpact(comp, baseTransport);
    expect(result.carbon).toBeCloseTo(3.1, 2);
  });

  it('calculates energy impact', () => {
    const comp = makeComponent({ quantity: 100, transport_distance_km: 500 });
    const result = calculateTransportImpact(comp, baseTransport);
    // 50 tkm * 0.85 = 42.5 MJ
    expect(result.energy).toBeCloseTo(42.5, 2);
  });

  it('water impact is always zero for transport', () => {
    const comp = makeComponent({ quantity: 1000, transport_distance_km: 2000 });
    const result = calculateTransportImpact(comp, baseTransport);
    expect(result.water).toBe(0);
  });
});

// ── TESTS : IMPACT PROCÉDÉ ───────────────────────────────────────

describe('calculateProcessImpact', () => {
  it('returns zero when no process', () => {
    const result = calculateProcessImpact(makeComponent(), undefined);
    expect(result.carbon).toBe(0);
  });

  it('calculates correct process emissions', () => {
    const comp = makeComponent({ quantity: 100 });
    const result = calculateProcessImpact(comp, baseProcess);
    // 100 * 0.45 = 45 kgCO2e
    expect(result.carbon).toBeCloseTo(45, 2);
    // 100 * 3.5 = 350 MJ
    expect(result.energy).toBeCloseTo(350, 2);
    // 100 * 0.02 = 2 m³
    expect(result.water).toBeCloseTo(2, 2);
  });
});

// ── TESTS : IMPACT COMPOSANT TOTAL ───────────────────────────────

describe('calculateComponentImpact', () => {
  it('sums material + transport + process', () => {
    const comp = makeComponent({ quantity: 100, transport_distance_km: 500 });
    const result = calculateComponentImpact(comp, baseMaterial, baseProcess, baseTransport);

    const expectedCarbon = 210 + 3.1 + 45; // mat + tr + proc
    expect(result.total.carbon).toBeCloseTo(expectedCarbon, 1);
    expect(result.component_name).toBe('Châssis');
    expect(result.percentage).toBe(0); // Set after aggregation
  });

  it('works with partial data (no transport)', () => {
    const comp = makeComponent({ quantity: 50, transport_distance_km: 0 });
    const result = calculateComponentImpact(comp, baseMaterial, baseProcess, undefined);
    expect(result.transport_impact.carbon).toBe(0);
    expect(result.total.carbon).toBeCloseTo(50 * 2.1 + 50 * 0.45, 2);
  });
});

// ── TESTS : AGRÉGATION PRODUIT ───────────────────────────────────

describe('calculateProductImpacts', () => {
  it('aggregates multiple components', () => {
    const components = [
      { ...makeComponent({ id: 'c1', component_name: 'Châssis', quantity: 100 }), material: baseMaterial, process: baseProcess, transport_mode: baseTransport },
      { ...makeComponent({ id: 'c2', component_name: 'Carrosserie', quantity: 50 }), material: baseMaterial, process: undefined, transport_mode: baseTransport },
    ];

    const result = calculateProductImpacts(components, makeLifecycleModules());

    expect(result.components).toHaveLength(2);
    expect(result.totals.carbon).toBeGreaterThan(0);
    // Percentages should sum to ~100%
    const totalPct = result.components.reduce((s, c) => s + c.percentage, 0);
    expect(totalPct).toBeCloseTo(100, 0);
  });

  it('generates lifecycle breakdown for A1/A2/A3', () => {
    const components = [
      { ...makeComponent({ quantity: 100 }), material: baseMaterial, process: baseProcess, transport_mode: baseTransport },
    ];

    const result = calculateProductImpacts(components, makeLifecycleModules());

    expect(result.lifecycle.length).toBeGreaterThanOrEqual(3);
    const a1 = result.lifecycle.find(l => l.module_code === 'A1');
    const a2 = result.lifecycle.find(l => l.module_code === 'A2');
    const a3 = result.lifecycle.find(l => l.module_code === 'A3');
    expect(a1).toBeDefined();
    expect(a1!.impact.carbon).toBeCloseTo(210, 1); // Material
    expect(a2!.impact.carbon).toBeCloseTo(3.1, 1); // Transport
    expect(a3!.impact.carbon).toBeCloseTo(45, 1);  // Process
  });

  it('identifies hotspots ≥ 5%', () => {
    const components = [
      { ...makeComponent({ id: 'c1', quantity: 100 }), material: baseMaterial, process: baseProcess, transport_mode: baseTransport },
    ];
    const result = calculateProductImpacts(components, makeLifecycleModules());

    // Material is ~81% of carbon → should be a hotspot
    const matHotspot = result.hotspots.find(h => h.type === 'material' && h.impact_category === 'carbon');
    expect(matHotspot).toBeDefined();
    expect(matHotspot!.percentage).toBeGreaterThan(50);
  });

  it('returns empty result for no components', () => {
    const result = calculateProductImpacts([], makeLifecycleModules());
    expect(result.totals.carbon).toBe(0);
    expect(result.components).toHaveLength(0);
  });
});

// ── TESTS : SCÉNARIOS ────────────────────────────────────────────

describe('calculateScenarioImpacts', () => {
  const components = [
    { ...makeComponent({ id: 'c1', quantity: 100 }), material: baseMaterial, process: baseProcess, transport_mode: baseTransport },
  ];

  it('modifies quantity correctly', () => {
    const result = calculateScenarioImpacts(
      components,
      makeLifecycleModules(),
      [{ type: 'modify_quantity', component_id: 'c1', new_value: 50 }],
      [baseMaterial],
      [baseProcess],
      [baseTransport]
    );
    // Half quantity → roughly half carbon
    const baseline = calculateProductImpacts(components, makeLifecycleModules());
    expect(result.totals.carbon).toBeCloseTo(baseline.totals.carbon / 2, 0);
  });

  it('modifies recycled percentage', () => {
    const result = calculateScenarioImpacts(
      components,
      makeLifecycleModules(),
      [{ type: 'modify_recycled', component_id: 'c1', new_value: 80 }],
      [baseMaterial],
      [baseProcess],
      [baseTransport]
    );
    const baseline = calculateProductImpacts(components, makeLifecycleModules());
    // Recycled reduces material impact → total should be lower
    expect(result.totals.carbon).toBeLessThan(baseline.totals.carbon);
  });

  it('replaces material', () => {
    const ecoMaterial: ACVMaterial = { ...baseMaterial, id: 'mat-eco', carbon_factor: 0.5 };
    const result = calculateScenarioImpacts(
      components,
      makeLifecycleModules(),
      [{ type: 'replace_material', component_id: 'c1', new_value: 'mat-eco' }],
      [baseMaterial, ecoMaterial],
      [baseProcess],
      [baseTransport]
    );
    // New material carbon: 100 * 0.5 = 50 vs 210
    expect(result.totals.carbon).toBeLessThan(100);
  });
});

// ── TESTS : VARIATION ────────────────────────────────────────────

describe('calculateVariation', () => {
  it('calculates percentage variation correctly', () => {
    const baseline = { carbon: 100, energy: 200, water: 10, acidification: 5 };
    const scenario = { carbon: 80, energy: 180, water: 12, acidification: 4 };
    const variation = calculateVariation(baseline, scenario);

    expect(variation.carbon).toBeCloseTo(-20, 2);  // -20%
    expect(variation.energy).toBeCloseTo(-10, 2);   // -10%
    expect(variation.water).toBeCloseTo(20, 2);     // +20%
    expect(variation.acidification).toBeCloseTo(-20, 2);
  });

  it('returns 0 for zero baseline', () => {
    const baseline = { carbon: 0, energy: 0, water: 0, acidification: 0 };
    const scenario = { carbon: 50, energy: 100, water: 5, acidification: 2 };
    const variation = calculateVariation(baseline, scenario);
    expect(variation.carbon).toBe(0);
  });
});

// ── TESTS : FORMATAGE ────────────────────────────────────────────

describe('formatImpact', () => {
  it('formats small values with units', () => {
    expect(formatImpact(1.234, 'carbon')).toContain('kgCO');
    expect(formatImpact(0.5, 'energy')).toContain('MJ');
    expect(formatImpact(0.1, 'water')).toContain('m');
  });

  it('converts large values to tonnes', () => {
    const result = formatImpact(1500, 'carbon');
    expect(result).toContain('1.50');
    expect(result).toContain('CO');
  });

  it('handles zero', () => {
    expect(formatImpact(0, 'carbon')).toContain('0.000');
  });
});
