/**
 * Moteur de calcul ACV conforme ISO 14040/14044 & EN 15804
 * 
 * Règle de calcul : impact = activité × facteur environnemental
 * 
 * Calculs produits :
 * - Par composant (matériau + procédé + transport)
 * - Par étape du cycle de vie (A1-D)
 * - Par produit (agrégation)
 * - Hotspots automatiques
 * - Scénarios de comparaison
 */

import type {
  ACVProductComponent,
  ACVMaterial,
  ACVProcess,
  ACVTransportMode,
  ACVLifecycleModule,
  ACVImpactResult,
  ACVComponentImpact,
  ACVLifecycleImpact,
  ACVHotspot,
  LifecycleModuleCode,
} from '../types';

// ============================================
// RÉSULTAT VIDE
// ============================================
const ZERO_IMPACT: ACVImpactResult = { carbon: 0, energy: 0, water: 0, acidification: 0 };

function addImpacts(a: ACVImpactResult, b: ACVImpactResult): ACVImpactResult {
  return {
    carbon: a.carbon + b.carbon,
    energy: a.energy + b.energy,
    water: a.water + b.water,
    acidification: a.acidification + b.acidification,
  };
}

function scaleImpact(impact: ACVImpactResult, factor: number): ACVImpactResult {
  return {
    carbon: impact.carbon * factor,
    energy: impact.energy * factor,
    water: impact.water * factor,
    acidification: impact.acidification * factor,
  };
}

// ============================================
// CALCUL PAR COMPOSANT
// ============================================

/**
 * Calcule l'impact matériau d'un composant
 * A1 — Matières premières
 */
export function calculateMaterialImpact(
  component: ACVProductComponent,
  material?: ACVMaterial
): ACVImpactResult {
  if (!material) return { ...ZERO_IMPACT };

  const qty = component.quantity;
  const recycledRatio = (component.recycled_percentage ?? 0) / 100;

  // Réduction proportionnelle pour matériaux recyclés (approx -70% d'impact)
  const recycledReduction = recycledRatio * 0.7;
  const effectiveFactor = 1 - recycledReduction;

  return {
    carbon: qty * material.carbon_factor * effectiveFactor,
    energy: qty * material.energy_factor * effectiveFactor,
    water: qty * material.water_factor * effectiveFactor,
    acidification: qty * material.acidification_factor * effectiveFactor,
  };
}

/**
 * Calcule l'impact transport d'un composant
 * A2 — Transport matières
 */
export function calculateTransportImpact(
  component: ACVProductComponent,
  transportMode?: ACVTransportMode
): ACVImpactResult {
  if (!transportMode || !component.transport_distance_km) return { ...ZERO_IMPACT };

  // t.km = masse (tonnes) × distance (km)
  const masseTonnes = component.quantity / 1000; // kg → tonnes
  const tkm = masseTonnes * component.transport_distance_km;

  return {
    carbon: tkm * transportMode.emission_factor_tkm,
    energy: tkm * transportMode.energy_factor_tkm,
    water: 0, // Transport n'a pas d'impact eau significatif
    acidification: tkm * transportMode.emission_factor_tkm * 0.015, // Approximation SO2e
  };
}

/**
 * Calcule l'impact procédé d'un composant
 * A3 — Fabrication
 */
export function calculateProcessImpact(
  component: ACVProductComponent,
  process?: ACVProcess
): ACVImpactResult {
  if (!process) return { ...ZERO_IMPACT };

  const qty = component.quantity;
  return {
    carbon: qty * process.emission_factor,
    energy: qty * process.energy_consumption,
    water: qty * process.water_consumption,
    acidification: qty * process.emission_factor * 0.012, // Approximation
  };
}

/**
 * Calcule l'impact total d'un composant (A1 + A2 + A3)
 */
export function calculateComponentImpact(
  component: ACVProductComponent,
  material?: ACVMaterial,
  process?: ACVProcess,
  transportMode?: ACVTransportMode
): ACVComponentImpact {
  const materialImpact = calculateMaterialImpact(component, material);
  const transportImpact = calculateTransportImpact(component, transportMode);
  const processImpact = calculateProcessImpact(component, process);
  const total = addImpacts(addImpacts(materialImpact, transportImpact), processImpact);

  return {
    component_id: component.id,
    component_name: component.component_name,
    material_impact: materialImpact,
    process_impact: processImpact,
    transport_impact: transportImpact,
    total,
    percentage: 0, // Calculé après agrégation
  };
}

// ============================================
// CALCUL PAR PRODUIT (AGRÉGATION)
// ============================================

export interface ACVProductResult {
  components: ACVComponentImpact[];
  lifecycle: ACVLifecycleImpact[];
  hotspots: ACVHotspot[];
  totals: ACVImpactResult;
  totals_per_unit: ACVImpactResult; // Si unité fonctionnelle définie
  functional_unit?: string;
}

interface ComponentWithRefs extends ACVProductComponent {
  material?: ACVMaterial;
  process?: ACVProcess;
  transport_mode?: ACVTransportMode;
}

/**
 * Calcule les impacts complets d'un produit
 */
export function calculateProductImpacts(
  components: ComponentWithRefs[],
  lifecycleModules: ACVLifecycleModule[],
  functionalUnit?: string
): ACVProductResult {
  // 1. Calculer les impacts par composant
  const componentImpacts = components.map(c =>
    calculateComponentImpact(c, c.material, c.process, c.transport_mode)
  );

  // 2. Agréger le total produit
  const totals = componentImpacts.reduce(
    (acc, ci) => addImpacts(acc, ci.total),
    { ...ZERO_IMPACT }
  );

  // 3. Calculer les pourcentages par composant
  componentImpacts.forEach(ci => {
    ci.percentage = totals.carbon > 0 ? (ci.total.carbon / totals.carbon) * 100 : 0;
  });

  // 4. Répartir par phase du cycle de vie
  const lifecycle = calculateLifecycleBreakdown(componentImpacts, lifecycleModules, totals);

  // 5. Identifier les hotspots
  const hotspots = identifyHotspots(componentImpacts, totals);

  return {
    components: componentImpacts,
    lifecycle,
    hotspots,
    totals,
    totals_per_unit: totals, // TODO: diviser par unité fonctionnelle si quantifiable
    functional_unit: functionalUnit,
  };
}

// ============================================
// RÉPARTITION PAR CYCLE DE VIE
// ============================================

function calculateLifecycleBreakdown(
  componentImpacts: ACVComponentImpact[],
  lifecycleModules: ACVLifecycleModule[],
  totals: ACVImpactResult
): ACVLifecycleImpact[] {
  // Agréger A1 (matières), A2 (transport), A3 (fabrication) depuis les composants
  const a1Impact = componentImpacts.reduce((acc, ci) => addImpacts(acc, ci.material_impact), { ...ZERO_IMPACT });
  const a2Impact = componentImpacts.reduce((acc, ci) => addImpacts(acc, ci.transport_impact), { ...ZERO_IMPACT });
  const a3Impact = componentImpacts.reduce((acc, ci) => addImpacts(acc, ci.process_impact), { ...ZERO_IMPACT });

  const autoModules: Record<string, ACVImpactResult> = {
    A1: a1Impact,
    A2: a2Impact,
    A3: a3Impact,
  };

  const result: ACVLifecycleImpact[] = [];

  for (const mod of lifecycleModules) {
    if (!mod.is_included) continue;

    const impact = autoModules[mod.module_code] ?? {
      carbon: mod.carbon_impact,
      energy: mod.energy_impact,
      water: mod.water_impact,
      acidification: mod.acidification_impact,
    };

    result.push({
      module_code: mod.module_code as LifecycleModuleCode,
      module_name: mod.module_name,
      module_group: mod.module_group as any,
      impact,
      percentage: totals.carbon > 0 ? (impact.carbon / totals.carbon) * 100 : 0,
    });
  }

  return result;
}

// ============================================
// ANALYSE DES HOTSPOTS
// ============================================

function identifyHotspots(
  componentImpacts: ACVComponentImpact[],
  totals: ACVImpactResult
): ACVHotspot[] {
  const hotspots: ACVHotspot[] = [];

  const categories: Array<{ key: keyof ACVImpactResult; label: 'carbon' | 'energy' | 'water' | 'acidification' }> = [
    { key: 'carbon', label: 'carbon' },
    { key: 'energy', label: 'energy' },
    { key: 'water', label: 'water' },
    { key: 'acidification', label: 'acidification' },
  ];

  for (const cat of categories) {
    const totalVal = totals[cat.key];
    if (totalVal <= 0) continue;

    for (const ci of componentImpacts) {
      // Hotspot matériau
      if (ci.material_impact[cat.key] > 0) {
        const pct = (ci.material_impact[cat.key] / totalVal) * 100;
        if (pct >= 5) {
          hotspots.push({
            source: `${ci.component_name} (matériau)`,
            type: 'material',
            impact_category: cat.label,
            value: ci.material_impact[cat.key],
            percentage: pct,
          });
        }
      }

      // Hotspot procédé
      if (ci.process_impact[cat.key] > 0) {
        const pct = (ci.process_impact[cat.key] / totalVal) * 100;
        if (pct >= 5) {
          hotspots.push({
            source: `${ci.component_name} (procédé)`,
            type: 'process',
            impact_category: cat.label,
            value: ci.process_impact[cat.key],
            percentage: pct,
          });
        }
      }

      // Hotspot transport
      if (ci.transport_impact[cat.key] > 0) {
        const pct = (ci.transport_impact[cat.key] / totalVal) * 100;
        if (pct >= 5) {
          hotspots.push({
            source: `${ci.component_name} (transport)`,
            type: 'transport',
            impact_category: cat.label,
            value: ci.transport_impact[cat.key],
            percentage: pct,
          });
        }
      }
    }
  }

  // Trier par pourcentage décroissant
  return hotspots.sort((a, b) => b.percentage - a.percentage);
}

// ============================================
// CALCUL DE SCÉNARIO
// ============================================

export interface ScenarioParameter {
  type: 'replace_material' | 'change_transport' | 'change_process' | 'modify_quantity' | 'modify_recycled';
  component_id: string;
  new_value: string | number; // material_id, transport_mode_id, process_id, ou valeur numérique
}

/**
 * Applique des modifications de scénario et recalcule
 */
export function calculateScenarioImpacts(
  baseComponents: ComponentWithRefs[],
  lifecycleModules: ACVLifecycleModule[],
  parameters: ScenarioParameter[],
  materialsLib: ACVMaterial[],
  processesLib: ACVProcess[],
  transportLib: ACVTransportMode[]
): ACVProductResult {
  // Deep clone des composants
  const modifiedComponents = baseComponents.map(c => ({ ...c }));

  for (const param of parameters) {
    const comp = modifiedComponents.find(c => c.id === param.component_id);
    if (!comp) continue;

    switch (param.type) {
      case 'replace_material':
        comp.material = materialsLib.find(m => m.id === param.new_value);
        break;
      case 'change_transport':
        comp.transport_mode = transportLib.find(t => t.id === param.new_value);
        break;
      case 'change_process':
        comp.process = processesLib.find(p => p.id === param.new_value);
        break;
      case 'modify_quantity':
        comp.quantity = Number(param.new_value);
        break;
      case 'modify_recycled':
        comp.recycled_percentage = Number(param.new_value);
        break;
    }
  }

  return calculateProductImpacts(modifiedComponents, lifecycleModules);
}

// ============================================
// UTILITAIRES D'EXPORT
// ============================================

/**
 * Formate un résultat d'impact pour affichage
 */
export function formatImpact(value: number, category: keyof ACVImpactResult): string {
  const units: Record<keyof ACVImpactResult, string> = {
    carbon: 'kgCO₂e',
    energy: 'MJ',
    water: 'm³',
    acidification: 'kgSO₂e',
  };

  if (Math.abs(value) >= 1000) {
    return `${(value / 1000).toFixed(2)} t${units[category].replace('kg', '')}`;
  }
  return `${value.toFixed(3)} ${units[category]}`;
}

/**
 * Calcule la variation entre deux scénarios
 */
export function calculateVariation(baseline: ACVImpactResult, scenario: ACVImpactResult): ACVImpactResult {
  return {
    carbon: baseline.carbon > 0 ? ((scenario.carbon - baseline.carbon) / baseline.carbon) * 100 : 0,
    energy: baseline.energy > 0 ? ((scenario.energy - baseline.energy) / baseline.energy) * 100 : 0,
    water: baseline.water > 0 ? ((scenario.water - baseline.water) / baseline.water) * 100 : 0,
    acidification: baseline.acidification > 0 ? ((scenario.acidification - baseline.acidification) / baseline.acidification) * 100 : 0,
  };
}
