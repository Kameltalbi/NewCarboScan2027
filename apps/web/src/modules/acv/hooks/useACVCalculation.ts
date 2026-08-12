/**
 * Hook principal d'orchestration du moteur de calcul ACV
 * Connecte les données Supabase au moteur de calcul
 * 
 * Intègre les 7 fonctions ACV professionnelles :
 * 1. Flux intermédiaires (propagation)
 * 2. Allocation multi-produits
 * 3. Données primaires/secondaires
 * 4. Conversion d'unités
 * 5. Traçabilité des sources
 * 6. Analyse de sensibilité
 * 7. Propagation des impacts
 */

import { useMemo, useCallback } from 'react';
import { useACVComponents } from './useACVComponents';
import { useACVLifecycle } from './useACVLifecycle';
import { useACVMaterials, useACVProcesses, useACVTransportModes } from './useACVLibrary';
import { useACVProcessFlows } from './useACVProcessFlows';
import { useACVCoProducts } from './useACVCoProducts';
import {
  calculateProductImpacts,
  calculateScenarioImpacts,
  calculateVariation,
  type ACVProductResult,
} from '../engine/acvCalculationEngine';
import type { ScenarioParameter } from '../engine/acvCalculationEngine';
import { allocateImpacts, type AllocationSummary } from '../engine/multiProductAllocation';
import {
  runSensitivityAnalysis,
  generateDefaultParameters,
  generateTornadoData,
  type SensitivityAnalysisResult,
} from '../engine/sensitivityAnalysis';
import {
  propagateImpacts,
  componentsToProcessNodes,
  type PropagationResult,
} from '../engine/impactPropagation';
import type { AllocationMethod, ACVImpactResult } from '../types';

export const useACVCalculation = (projectId?: string) => {
  const { components, isLoading: componentsLoading } = useACVComponents(projectId);
  const { modules, isLoading: lifecycleLoading } = useACVLifecycle(projectId);
  const { data: materials, isLoading: materialsLoading } = useACVMaterials();
  const { data: processes, isLoading: processesLoading } = useACVProcesses();
  const { data: transportModes, isLoading: transportLoading } = useACVTransportModes();
  const { flows, isLoading: flowsLoading } = useACVProcessFlows(projectId);
  const { coProducts, isLoading: coProductsLoading } = useACVCoProducts(projectId);

  const isLoading = componentsLoading || lifecycleLoading || materialsLoading || processesLoading || transportLoading || flowsLoading || coProductsLoading;

  // Enrichir les composants avec les données de la bibliothèque
  const enrichedComponents = useMemo(() => {
    if (!materials || !processes || !transportModes) return [];

    return components.map(c => ({
      ...c,
      material: materials.find(m => m.id === c.material_id),
      process: processes.find(p => p.id === c.process_id),
      transport_mode: transportModes.find(t => t.id === c.transport_mode_id),
    }));
  }, [components, materials, processes, transportModes]);

  // Calcul du résultat de base
  const baselineResult: ACVProductResult | null = useMemo(() => {
    if (isLoading || enrichedComponents.length === 0 || modules.length === 0) return null;
    return calculateProductImpacts(enrichedComponents, modules);
  }, [enrichedComponents, modules, isLoading]);

  // ── 1. Propagation des impacts via flux intermédiaires ──
  const propagationResult: PropagationResult | null = useMemo(() => {
    if (!baselineResult || flows.length === 0) return null;

    const componentImpactMap = new Map<string, ACVImpactResult>();
    for (const ci of baselineResult.components) {
      componentImpactMap.set(ci.component_id, ci.total);
    }

    const processNodes = componentsToProcessNodes(
      enrichedComponents.map(c => ({
        id: c.id,
        component_name: c.component_name,
        quantity: c.quantity,
        unit: c.unit,
      })),
      componentImpactMap
    );

    const processFlows = flows.map(f => ({
      id: f.id,
      source_id: f.source_component_id ?? '',
      target_id: f.target_component_id ?? '',
      flow_name: f.flow_name,
      flow_type: f.flow_type as any,
      quantity: f.quantity,
      unit: f.unit,
    }));

    return propagateImpacts(processNodes, processFlows);
  }, [baselineResult, flows, enrichedComponents]);

  // ── 2. Allocation multi-produits ──
  const getAllocation = useCallback((method: AllocationMethod): AllocationSummary | null => {
    if (!baselineResult || coProducts.length <= 1) return null;
    return allocateImpacts(
      baselineResult.totals,
      coProducts.map(p => ({
        id: p.id,
        product_name: p.product_name,
        mass_kg: p.mass_kg,
        economic_value: p.economic_value,
        energy_content_mj: p.energy_content_mj,
        is_main_product: p.is_main_product,
      })),
      method
    );
  }, [baselineResult, coProducts]);

  // ── 3. Statistiques données primaires/secondaires ──
  const dataQualityStats = useMemo(() => {
    const primary = components.filter(c => (c as any).data_type === 'primary').length;
    const secondary = components.filter(c => (c as any).data_type !== 'primary').length;
    const total = components.length;
    return {
      primary,
      secondary,
      total,
      primary_pct: total > 0 ? (primary / total) * 100 : 0,
      secondary_pct: total > 0 ? (secondary / total) * 100 : 0,
    };
  }, [components]);

  // ── 6. Analyse de sensibilité ──
  const getSensitivityAnalysis = useCallback((): SensitivityAnalysisResult | null => {
    if (!baselineResult || enrichedComponents.length === 0) return null;

    const params = generateDefaultParameters(
      enrichedComponents.map(c => ({
        id: c.id,
        component_name: c.component_name,
        quantity: c.quantity,
        recycled_percentage: c.recycled_percentage ?? 0,
        transport_distance_km: c.transport_distance_km ?? 0,
      }))
    );

    const recalcFn = (paramId: string, newValue: number): ACVImpactResult => {
      if (paramId === 'global_electricity_factor') {
        // Facteur multiplicatif global sur le carbone
        return {
          carbon: baselineResult.totals.carbon * newValue,
          energy: baselineResult.totals.energy,
          water: baselineResult.totals.water,
          acidification: baselineResult.totals.acidification,
        };
      }

      // Créer une copie modifiée des composants
      const modified = enrichedComponents.map(c => {
        const comp = { ...c };
        if (paramId === `quantity_${c.id}`) comp.quantity = newValue;
        else if (paramId === `transport_${c.id}`) comp.transport_distance_km = newValue;
        else if (paramId === `recycled_${c.id}`) comp.recycled_percentage = newValue;
        return comp;
      });

      const result = calculateProductImpacts(modified, modules);
      return result.totals;
    };

    return runSensitivityAnalysis(baselineResult, params, recalcFn);
  }, [baselineResult, enrichedComponents, modules]);

  // Fonction pour calculer un scénario
  const calculateScenario = (parameters: ScenarioParameter[]): ACVProductResult | null => {
    if (!materials || !processes || !transportModes || enrichedComponents.length === 0) return null;
    return calculateScenarioImpacts(
      enrichedComponents,
      modules,
      parameters,
      materials,
      processes,
      transportModes
    );
  };

  // Comparaison entre scénarios
  const compareScenarios = (scenarioResult: ACVProductResult) => {
    if (!baselineResult) return null;
    return calculateVariation(baselineResult.totals, scenarioResult.totals);
  };

  return {
    isLoading,
    baselineResult,
    enrichedComponents,
    modules,
    materials: materials ?? [],
    processes: processes ?? [],
    transportModes: transportModes ?? [],
    // Nouvelles fonctions
    flows,
    coProducts,
    propagationResult,
    dataQualityStats,
    getAllocation,
    getSensitivityAnalysis,
    generateTornadoData,
    // Existant
    calculateScenario,
    compareScenarios,
  };
};
