/**
 * Tests — PEF Normalization & Weighting
 */

import { describe, it, expect } from 'vitest';
import {
  normalizeImpact,
  weightImpact,
  calculatePEFNormalization,
  formatPEFScore,
  PEF_NORMALIZATION_FACTORS,
  PEF_WEIGHTING_FACTORS,
} from '../pefNormalization';

describe('normalizeImpact', () => {
  it('normalizes carbon correctly', () => {
    // 810 kgCO2e / 8100 PE = 0.1 PE
    expect(normalizeImpact(810, 'carbon')).toBeCloseTo(0.1, 4);
  });

  it('normalizes energy correctly', () => {
    // 6500 MJ / 65000 PE = 0.1 PE
    expect(normalizeImpact(6500, 'energy')).toBeCloseTo(0.1, 4);
  });

  it('returns 0 for zero value', () => {
    expect(normalizeImpact(0, 'carbon')).toBe(0);
  });
});

describe('weightImpact', () => {
  it('applies weighting factor', () => {
    // 0.1 PE * 0.2106 * 1e6 = 21060 µPt
    const result = weightImpact(0.1, 'carbon');
    expect(result).toBeCloseTo(21060, 0);
  });
});

describe('calculatePEFNormalization', () => {
  const totals = { carbon: 210, energy: 2500, water: 5, acidification: 0.8 };

  it('returns all 4 impact categories', () => {
    const result = calculatePEFNormalization(totals);
    expect(result.impacts).toHaveLength(4);
  });

  it('percentages sum to 100', () => {
    const result = calculatePEFNormalization(totals);
    const totalPct = result.impacts.reduce((s, i) => s + i.percentage_of_total, 0);
    expect(totalPct).toBeCloseTo(100, 0);
  });

  it('total weighted score is positive', () => {
    const result = calculatePEFNormalization(totals);
    expect(result.total_weighted_score).toBeGreaterThan(0);
  });

  it('identifies dominant category', () => {
    const result = calculatePEFNormalization(totals);
    expect(result.dominant_category).toBeDefined();
  });

  it('includes benchmark when sector provided', () => {
    const result = calculatePEFNormalization(totals, 'metals');
    expect(result.benchmark_comparison).toBeDefined();
    expect(result.benchmark_comparison!.sector).toBe('Métaux & métallurgie');
    expect(result.benchmark_comparison!.rating).toBeDefined();
  });

  it('no benchmark when no sector', () => {
    const result = calculatePEFNormalization(totals);
    expect(result.benchmark_comparison).toBeUndefined();
  });
});

describe('formatPEFScore', () => {
  it('formats micro-points', () => {
    expect(formatPEFScore(500)).toBe('500.00 µPt');
  });

  it('formats milli-points for large values', () => {
    expect(formatPEFScore(1500)).toBe('1.50 mPt');
  });
});

describe('PEF factors consistency', () => {
  it('weighting factors are positive', () => {
    Object.values(PEF_WEIGHTING_FACTORS).forEach(w => {
      expect(w).toBeGreaterThan(0);
    });
  });

  it('normalization factors are positive', () => {
    Object.values(PEF_NORMALIZATION_FACTORS).forEach(f => {
      expect(f.value).toBeGreaterThan(0);
    });
  });
});
