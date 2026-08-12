import { describe, it, expect } from 'vitest';
import {
  convertUnit,
  normalizeUnit,
  areUnitsCompatible,
  convertToBase,
  getConversionFactor,
  autoConvertForFactor,
  formatWithUnit,
} from '../unitConversion';

describe('unitConversion', () => {
  describe('normalizeUnit', () => {
    it('normalise les alias courants', () => {
      expect(normalizeUnit('tonne')).toBe('t');
      expect(normalizeUnit('kilogramme')).toBe('kg');
      expect(normalizeUnit('litre')).toBe('L');
      expect(normalizeUnit('kilomètre')).toBe('km');
    });

    it('retourne le symbole tel quel si déjà normalisé', () => {
      expect(normalizeUnit('kg')).toBe('kg');
      expect(normalizeUnit('MJ')).toBe('MJ');
    });
  });

  describe('convertUnit', () => {
    it('convertit kg → tonnes', () => {
      expect(convertUnit(1000, 'kg', 't')).toBeCloseTo(1);
    });

    it('convertit tonnes → kg', () => {
      expect(convertUnit(2, 't', 'kg')).toBeCloseTo(2000);
    });

    it('convertit kWh → MJ', () => {
      expect(convertUnit(1, 'kWh', 'MJ')).toBeCloseTo(3.6);
    });

    it('convertit MJ → kWh', () => {
      expect(convertUnit(3.6, 'MJ', 'kWh')).toBeCloseTo(1);
    });

    it('convertit m³ → L', () => {
      expect(convertUnit(1, 'm3', 'L')).toBeCloseTo(1000);
    });

    it('retourne null pour unités incompatibles', () => {
      expect(convertUnit(1, 'kg', 'MJ')).toBeNull();
    });

    it('retourne la même valeur si même unité', () => {
      expect(convertUnit(42, 'kg', 'kg')).toBe(42);
    });

    it('convertit g → kg', () => {
      expect(convertUnit(500, 'g', 'kg')).toBeCloseTo(0.5);
    });

    it('convertit GWh → MJ', () => {
      expect(convertUnit(1, 'GWh', 'MJ')).toBeCloseTo(3_600_000);
    });
  });

  describe('areUnitsCompatible', () => {
    it('kg et tonnes sont compatibles', () => {
      expect(areUnitsCompatible('kg', 't')).toBe(true);
    });

    it('kg et MJ ne sont pas compatibles', () => {
      expect(areUnitsCompatible('kg', 'MJ')).toBe(false);
    });

    it('kWh et MJ sont compatibles', () => {
      expect(areUnitsCompatible('kWh', 'MJ')).toBe(true);
    });
  });

  describe('convertToBase', () => {
    it('convertit tonnes vers kg (base masse)', () => {
      const result = convertToBase(5, 't');
      expect(result).not.toBeNull();
      expect(result!.value).toBeCloseTo(5000);
      expect(result!.baseUnit).toBe('kg');
    });

    it('convertit kWh vers MJ (base énergie)', () => {
      const result = convertToBase(10, 'kWh');
      expect(result).not.toBeNull();
      expect(result!.value).toBeCloseTo(36);
      expect(result!.baseUnit).toBe('MJ');
    });
  });

  describe('autoConvertForFactor', () => {
    it('convertit automatiquement pour correspondre au facteur', () => {
      const result = autoConvertForFactor(2, 't', 'kg');
      expect(result).not.toBeNull();
      expect(result!.convertedQuantity).toBeCloseTo(2000);
    });

    it('retourne null si incompatible', () => {
      expect(autoConvertForFactor(1, 'kg', 'MJ')).toBeNull();
    });
  });

  describe('formatWithUnit', () => {
    it('formate les grandes valeurs', () => {
      expect(formatWithUnit(1500, 'kg')).toContain('k');
    });

    it('formate les valeurs normales', () => {
      expect(formatWithUnit(42.5, 'kg')).toBe('42.50 kg');
    });
  });
});
