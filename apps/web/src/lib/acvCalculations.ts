import { supabase } from "@/integrations/api/client";
import { InventoryItem } from '@/hooks/useACVInventory';

export interface ImpactFactor {
  id: string;
  item: string;
  unit: string;
  category: string;
  climate_co2e: number;
  acidification_so2e: number;
  water_m3: number;
}

export interface CalculatedImpact {
  inventoryItemId: string;
  item: string;
  category: string;
  quantity: number;
  unit: string;
  climate: number;
  acidification: number;
  water: number;
  factor?: ImpactFactor;
  warning?: string;
}

export interface ImpactSummary {
  climate: { value: number; unit: string };
  acidification: { value: number; unit: string };
  water: { value: number; unit: string };
}

export interface CategoryBreakdown {
  item: string;
  category: string;
  climate: number;
  acidification: number;
  water: number;
  percentage_climate: number;
  percentage_acidification: number;
  percentage_water: number;
}

export async function calculateProjectImpacts(projectId: string) {
  try {
    // Récupérer les données d'inventaire
    const { data: inventoryData, error: inventoryError } = await supabase
      .from('acv_inventory')
      .select('*')
      .eq('project_id', projectId);

    if (inventoryError) throw inventoryError;

    // Récupérer tous les facteurs d'impact
    const { data: factorsData, error: factorsError } = await supabase
      .from('impact_factors')
      .select('*');

    if (factorsError) throw factorsError;

    const calculatedImpacts: CalculatedImpact[] = [];
    const missingFactors: string[] = [];

    // Calculer les impacts pour chaque ligne d'inventaire
    for (const inventoryItem of inventoryData || []) {
      // Normalisation des unités et des noms pour un matching robuste
      const normalizeUnit = (u: string) => {
        const val = (u || '').toLowerCase().replace(/\s+/g, '');
        if (val === 'm3' || val === 'm³') return 'm3';
        if (val === 't' || val === 'ton' || val === 'tonne' || val === 'tonnes') return 't';
        if (val === 't.km' || val === 'ton.km' || val === 'tonne.km' || val === 't⋅km') return 't.km';
        if (val === 'kwh') return 'kwh';
        if (val === 'l') return 'l';
        return val;
      };

      const canonicalItem = (name: string) => {
        const n = (name || '').toLowerCase().trim();
        if (['aluminum', 'aluminium', 'aluminum_t'].includes(n)) return 'aluminum';
        if (['glass', 'glass_t'].includes(n)) return 'glass';
        if (['wood', 'bois'].includes(n)) return 'wood';
        if (['natural_gas', 'gaz_naturel'].includes(n)) return 'natural_gas';
        if (['tap_water', 'eau_potable', 'eau_robinet'].includes(n)) return 'tap_water';
        if (['truck_tkm', 'transport_camion_tkm'].includes(n)) return 'truck_tkm';
        if (['steel', 'steel_metric_ton'].includes(n)) return 'steel';
        if (['plastic_pp'].includes(n)) return 'plastic_pp';
        if (['cardboard', 'carton'].includes(n)) return 'cardboard';
        return n;
      };

      // 1) Essai: correspondance exacte item + unité
      let factor = factorsData?.find(f => 
        f.item === inventoryItem.item && f.unit === inventoryItem.unit
      );

      // 2) Essai: correspondance via noms/units normalisés (gère t vs ton, m³ vs m3, etc.)
      if (!factor) {
        const invItemCanon = canonicalItem(inventoryItem.item);
        const invUnitCanon = normalizeUnit(inventoryItem.unit);
        factor = factorsData?.find(f => 
          canonicalItem(f.item) === invItemCanon && normalizeUnit(f.unit) === invUnitCanon
        );
      }

      if (!factor) {
        missingFactors.push(`${inventoryItem.item} (${inventoryItem.unit})`);
        calculatedImpacts.push({
          inventoryItemId: inventoryItem.id,
          item: inventoryItem.item,
          category: inventoryItem.category,
          quantity: inventoryItem.quantity,
          unit: inventoryItem.unit,
          climate: 0,
          acidification: 0,
          water: 0,
          warning: `Facteur manquant pour ${inventoryItem.item}`
        });
        continue;
      }

      // Calculer les impacts
      const climate = inventoryItem.quantity * (factor.climate_co2e || 0);
      const acidification = inventoryItem.quantity * (factor.acidification_so2e || 0);
      const water = inventoryItem.quantity * (factor.water_m3 || 0);

      calculatedImpacts.push({
        inventoryItemId: inventoryItem.id,
        item: inventoryItem.item,
        category: inventoryItem.category,
        quantity: inventoryItem.quantity,
        unit: inventoryItem.unit,
        climate,
        acidification,
        water,
        factor
      });
    }

    // Calculer les totaux par catégorie d'impact
    const totals = calculatedImpacts.reduce(
      (acc, impact) => ({
        climate: acc.climate + impact.climate,
        acidification: acc.acidification + impact.acidification,
        water: acc.water + impact.water,
      }),
      { climate: 0, acidification: 0, water: 0 }
    );

    const summary: ImpactSummary = {
      climate: { value: totals.climate, unit: 'tCO2e' },
      acidification: { value: totals.acidification, unit: 'kg SO2e' },
      water: { value: totals.water, unit: 'm³' }
    };

    // Créer le breakdown par item
    const breakdown: CategoryBreakdown[] = calculatedImpacts.map(impact => ({
      item: impact.item,
      category: impact.category,
      climate: impact.climate,
      acidification: impact.acidification,
      water: impact.water,
      percentage_climate: totals.climate > 0 ? (impact.climate / totals.climate) * 100 : 0,
      percentage_acidification: totals.acidification > 0 ? (impact.acidification / totals.acidification) * 100 : 0,
      percentage_water: totals.water > 0 ? (impact.water / totals.water) * 100 : 0,
    }));

    return {
      calculatedImpacts,
      summary,
      breakdown,
      missingFactors
    };

  } catch (error) {
    console.error('Error calculating project impacts:', error);
    throw error;
  }
}

export async function saveProjectResults(projectId: string, summary: ImpactSummary) {
  try {
    // Supprimer les anciens résultats
    await supabase
      .from('results')
      .delete()
      .eq('project_id', projectId);

    // Sauvegarder les nouveaux résultats
    const resultsToInsert = [
      {
        project_id: projectId,
        impact_category: 'climate',
        value: summary.climate.value,
        unit: summary.climate.unit
      },
      {
        project_id: projectId,
        impact_category: 'acidification',
        value: summary.acidification.value,
        unit: summary.acidification.unit
      },
      {
        project_id: projectId,
        impact_category: 'water',
        value: summary.water.value,
        unit: summary.water.unit
      }
    ];

    const { error } = await supabase
      .from('results')
      .insert(resultsToInsert);

    if (error) throw error;

  } catch (error) {
    console.error('Error saving project results:', error);
    throw error;
  }
}

export function getTopContributors(breakdown: CategoryBreakdown[], threshold: number = 50) {
  const contributors = {
    climate: breakdown.filter(item => item.percentage_climate >= threshold),
    acidification: breakdown.filter(item => item.percentage_acidification >= threshold),
    water: breakdown.filter(item => item.percentage_water >= threshold),
  };

  return contributors;
}

export function generateAutomaticComments(breakdown: CategoryBreakdown[]) {
  const comments: string[] = [];
  const topContributors = getTopContributors(breakdown, 50);

  // Commentaires pour le climat
  if (topContributors.climate.length > 0) {
    topContributors.climate.forEach(item => {
      comments.push(`${item.item} représente ${item.percentage_climate.toFixed(1)}% des émissions de CO₂e.`);
    });
  }

  // Commentaires pour l'acidification
  if (topContributors.acidification.length > 0) {
    topContributors.acidification.forEach(item => {
      comments.push(`${item.item} contribue à ${item.percentage_acidification.toFixed(1)}% du potentiel d'acidification.`);
    });
  }

  // Commentaires pour l'eau
  if (topContributors.water.length > 0) {
    topContributors.water.forEach(item => {
      comments.push(`${item.item} représente ${item.percentage_water.toFixed(1)}% de la consommation d'eau.`);
    });
  }

  if (comments.length === 0) {
    comments.push("Les impacts sont répartis de manière relativement équitable entre les différents éléments.");
  }

  return comments;
}