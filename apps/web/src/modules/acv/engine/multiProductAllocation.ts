/**
 * Moteur d'allocation multi-produits
 * ISO 14044 § 4.3.4 — Allocation des impacts entre co-produits
 * 
 * Méthodes supportées :
 * - Allocation par masse
 * - Allocation énergétique
 * - Allocation économique
 * - Extension de système (évitement)
 */

import type { ACVImpactResult } from '../types';

// ============================================
// TYPES
// ============================================

export type AllocationMethod = 'mass' | 'energy' | 'economic' | 'system_expansion' | 'none';

export interface CoProduct {
  id: string;
  product_name: string;
  mass_kg: number;
  economic_value: number;      // Valeur économique (€)
  energy_content_mj: number;   // Contenu énergétique (MJ)
  is_main_product: boolean;
}

export interface AllocationResult {
  product_id: string;
  product_name: string;
  allocation_factor: number;        // 0–1 (fraction des impacts allouée)
  allocation_percentage: number;     // 0–100%
  allocated_impact: ACVImpactResult;
}

export interface AllocationSummary {
  method: AllocationMethod;
  method_label: string;
  total_impact: ACVImpactResult;
  allocations: AllocationResult[];
  warnings: string[];
}

// ============================================
// CALCUL DES FACTEURS D'ALLOCATION
// ============================================

/**
 * Calcule les facteurs d'allocation par masse (ISO 14044 préféré)
 */
function allocateByMass(products: CoProduct[]): Map<string, number> {
  const totalMass = products.reduce((sum, p) => sum + p.mass_kg, 0);
  const factors = new Map<string, number>();
  
  if (totalMass <= 0) {
    // Répartition égale si pas de données de masse
    products.forEach(p => factors.set(p.id, 1 / products.length));
    return factors;
  }

  products.forEach(p => {
    factors.set(p.id, p.mass_kg / totalMass);
  });
  return factors;
}

/**
 * Calcule les facteurs d'allocation par contenu énergétique
 */
function allocateByEnergy(products: CoProduct[]): Map<string, number> {
  const totalEnergy = products.reduce((sum, p) => sum + p.energy_content_mj, 0);
  const factors = new Map<string, number>();

  if (totalEnergy <= 0) {
    products.forEach(p => factors.set(p.id, 1 / products.length));
    return factors;
  }

  products.forEach(p => {
    factors.set(p.id, p.energy_content_mj / totalEnergy);
  });
  return factors;
}

/**
 * Calcule les facteurs d'allocation par valeur économique
 */
function allocateByEconomicValue(products: CoProduct[]): Map<string, number> {
  const totalValue = products.reduce((sum, p) => sum + p.economic_value, 0);
  const factors = new Map<string, number>();

  if (totalValue <= 0) {
    products.forEach(p => factors.set(p.id, 1 / products.length));
    return factors;
  }

  products.forEach(p => {
    factors.set(p.id, p.economic_value / totalValue);
  });
  return factors;
}

/**
 * Extension de système : tout l'impact va au produit principal
 */
function allocateBySystemExpansion(products: CoProduct[]): Map<string, number> {
  const factors = new Map<string, number>();
  const mainProduct = products.find(p => p.is_main_product);

  if (mainProduct) {
    products.forEach(p => {
      factors.set(p.id, p.id === mainProduct.id ? 1 : 0);
    });
  } else {
    // Fallback : premier produit = principal
    products.forEach((p, i) => {
      factors.set(p.id, i === 0 ? 1 : 0);
    });
  }

  return factors;
}

// ============================================
// FONCTION PRINCIPALE
// ============================================

function scaleImpact(impact: ACVImpactResult, factor: number): ACVImpactResult {
  return {
    carbon: impact.carbon * factor,
    energy: impact.energy * factor,
    water: impact.water * factor,
    acidification: impact.acidification * factor,
  };
}

/**
 * Applique l'allocation multi-produits aux impacts totaux
 */
export function allocateImpacts(
  totalImpact: ACVImpactResult,
  products: CoProduct[],
  method: AllocationMethod
): AllocationSummary {
  if (products.length === 0) {
    return {
      method,
      method_label: getMethodLabel(method),
      total_impact: totalImpact,
      allocations: [],
      warnings: ['Aucun co-produit défini'],
    };
  }

  // Pas d'allocation si un seul produit
  if (products.length === 1 || method === 'none') {
    return {
      method: 'none',
      method_label: 'Sans allocation',
      total_impact: totalImpact,
      allocations: products.map(p => ({
        product_id: p.id,
        product_name: p.product_name,
        allocation_factor: 1,
        allocation_percentage: 100,
        allocated_impact: { ...totalImpact },
      })),
      warnings: [],
    };
  }

  // Calculer les facteurs
  let factors: Map<string, number>;
  const warnings: string[] = [];

  switch (method) {
    case 'mass':
      factors = allocateByMass(products);
      if (products.some(p => p.mass_kg <= 0)) {
        warnings.push('Certains produits n\'ont pas de masse définie');
      }
      break;
    case 'energy':
      factors = allocateByEnergy(products);
      if (products.some(p => p.energy_content_mj <= 0)) {
        warnings.push('Certains produits n\'ont pas de contenu énergétique défini');
      }
      break;
    case 'economic':
      factors = allocateByEconomicValue(products);
      if (products.some(p => p.economic_value <= 0)) {
        warnings.push('Certains produits n\'ont pas de valeur économique définie');
      }
      break;
    case 'system_expansion':
      factors = allocateBySystemExpansion(products);
      if (!products.some(p => p.is_main_product)) {
        warnings.push('Aucun produit principal identifié — le premier sera utilisé');
      }
      break;
    default:
      factors = allocateByMass(products);
  }

  // Appliquer les facteurs
  const allocations: AllocationResult[] = products.map(p => {
    const factor = factors.get(p.id) ?? 0;
    return {
      product_id: p.id,
      product_name: p.product_name,
      allocation_factor: factor,
      allocation_percentage: factor * 100,
      allocated_impact: scaleImpact(totalImpact, factor),
    };
  });

  // Vérification de cohérence
  const totalAllocation = allocations.reduce((sum, a) => sum + a.allocation_factor, 0);
  if (Math.abs(totalAllocation - 1) > 0.001) {
    warnings.push(`Somme des allocations = ${(totalAllocation * 100).toFixed(1)}% (devrait être 100%)`);
  }

  return {
    method,
    method_label: getMethodLabel(method),
    total_impact: totalImpact,
    allocations,
    warnings,
  };
}

/**
 * Compare les résultats de différentes méthodes d'allocation
 */
export function compareAllocationMethods(
  totalImpact: ACVImpactResult,
  products: CoProduct[]
): AllocationSummary[] {
  const methods: AllocationMethod[] = ['mass', 'energy', 'economic'];
  return methods.map(m => allocateImpacts(totalImpact, products, m));
}

// ============================================
// UTILITAIRES
// ============================================

export function getMethodLabel(method: AllocationMethod): string {
  const labels: Record<AllocationMethod, string> = {
    mass: 'Allocation massique',
    energy: 'Allocation énergétique',
    economic: 'Allocation économique',
    system_expansion: 'Extension de système',
    none: 'Sans allocation',
  };
  return labels[method];
}

export const ALLOCATION_METHODS: { value: AllocationMethod; label: string; description: string }[] = [
  { value: 'none', label: 'Sans allocation', description: 'Tout l\'impact au produit principal' },
  { value: 'mass', label: 'Massique', description: 'Répartition proportionnelle à la masse (ISO 14044 préféré)' },
  { value: 'energy', label: 'Énergétique', description: 'Répartition par contenu énergétique' },
  { value: 'economic', label: 'Économique', description: 'Répartition par valeur économique' },
  { value: 'system_expansion', label: 'Extension de système', description: 'Évitement — impacts évités par co-produits' },
];
