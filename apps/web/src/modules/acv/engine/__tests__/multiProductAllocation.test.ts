import { describe, it, expect } from 'vitest';
import {
  allocateImpacts,
  compareAllocationMethods,
  type CoProduct,
} from '../multiProductAllocation';
import type { ACVImpactResult } from '../../types';

const TOTAL_IMPACT: ACVImpactResult = {
  carbon: 1000,
  energy: 5000,
  water: 200,
  acidification: 50,
};

const CO_PRODUCTS: CoProduct[] = [
  { id: '1', product_name: 'Tôle acier', mass_kg: 700, economic_value: 1400, energy_content_mj: 3000, is_main_product: true },
  { id: '2', product_name: 'Barres acier', mass_kg: 200, economic_value: 600, energy_content_mj: 1500, is_main_product: false },
  { id: '3', product_name: 'Copeaux', mass_kg: 100, economic_value: 50, energy_content_mj: 500, is_main_product: false },
];

describe('multiProductAllocation', () => {
  describe('allocation par masse', () => {
    it('répartit proportionnellement à la masse', () => {
      const result = allocateImpacts(TOTAL_IMPACT, CO_PRODUCTS, 'mass');
      expect(result.allocations[0].allocation_percentage).toBeCloseTo(70);
      expect(result.allocations[1].allocation_percentage).toBeCloseTo(20);
      expect(result.allocations[2].allocation_percentage).toBeCloseTo(10);
    });

    it('impact alloué = total × facteur', () => {
      const result = allocateImpacts(TOTAL_IMPACT, CO_PRODUCTS, 'mass');
      expect(result.allocations[0].allocated_impact.carbon).toBeCloseTo(700);
    });

    it('somme des facteurs = 1', () => {
      const result = allocateImpacts(TOTAL_IMPACT, CO_PRODUCTS, 'mass');
      const sum = result.allocations.reduce((s, a) => s + a.allocation_factor, 0);
      expect(sum).toBeCloseTo(1);
    });
  });

  describe('allocation économique', () => {
    it('répartit proportionnellement à la valeur', () => {
      const result = allocateImpacts(TOTAL_IMPACT, CO_PRODUCTS, 'economic');
      // Total value = 1400 + 600 + 50 = 2050
      expect(result.allocations[0].allocation_percentage).toBeCloseTo((1400 / 2050) * 100);
    });
  });

  describe('allocation énergétique', () => {
    it('répartit proportionnellement au contenu énergétique', () => {
      const result = allocateImpacts(TOTAL_IMPACT, CO_PRODUCTS, 'energy');
      // Total energy = 3000 + 1500 + 500 = 5000
      expect(result.allocations[0].allocation_percentage).toBeCloseTo(60);
    });
  });

  describe('extension de système', () => {
    it('100% au produit principal', () => {
      const result = allocateImpacts(TOTAL_IMPACT, CO_PRODUCTS, 'system_expansion');
      expect(result.allocations[0].allocation_factor).toBe(1);
      expect(result.allocations[1].allocation_factor).toBe(0);
    });
  });

  describe('sans allocation', () => {
    it('retourne tout à chaque produit', () => {
      const result = allocateImpacts(TOTAL_IMPACT, CO_PRODUCTS, 'none');
      expect(result.allocations[0].allocated_impact.carbon).toBe(1000);
    });
  });

  describe('compareAllocationMethods', () => {
    it('retourne 3 méthodes', () => {
      const results = compareAllocationMethods(TOTAL_IMPACT, CO_PRODUCTS);
      expect(results).toHaveLength(3);
      expect(results.map(r => r.method)).toEqual(['mass', 'energy', 'economic']);
    });
  });

  describe('cas limites', () => {
    it('gère les produits sans masse', () => {
      const noMass: CoProduct[] = [
        { id: '1', product_name: 'A', mass_kg: 0, economic_value: 100, energy_content_mj: 0, is_main_product: true },
        { id: '2', product_name: 'B', mass_kg: 0, economic_value: 100, energy_content_mj: 0, is_main_product: false },
      ];
      const result = allocateImpacts(TOTAL_IMPACT, noMass, 'mass');
      // Fallback : répartition égale
      expect(result.allocations[0].allocation_factor).toBeCloseTo(0.5);
    });

    it('gère la liste vide', () => {
      const result = allocateImpacts(TOTAL_IMPACT, [], 'mass');
      expect(result.allocations).toHaveLength(0);
      expect(result.warnings).toHaveLength(1);
    });
  });
});
