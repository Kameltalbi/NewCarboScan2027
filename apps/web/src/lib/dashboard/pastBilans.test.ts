import { describe, expect, it } from 'vitest';
import { pastBilanYears } from './pastBilans';

describe('pastBilanYears', () => {
  const rows = [
    { year: 2026, value: 0 },
    { year: 2025, value: 120 },
    { year: 2024, value: 80 },
    { year: 2023, value: 0 },
  ];

  it('keeps earlier years that have emissions, most recent first', () => {
    expect(pastBilanYears(rows, 2026)).toEqual([
      { year: 2025, value: 120 },
      { year: 2024, value: 80 },
    ]);
  });

  it('returns nothing when no earlier year has a bilan', () => {
    expect(pastBilanYears(rows, 2024)).toEqual([]);
  });
});
