/**
 * Service pont ACV → PCF (Product Carbon Footprint)
 * Convertit les composants et résultats ACV en données PCF
 */

import { supabase } from "@/integrations/api/client";
import type { ACVProductComponent, ACVMaterial, ACVProcess, ACVTransportMode } from '../types';
import type { ACVProductResult } from '../engine/acvCalculationEngine';

interface EnrichedComponent extends ACVProductComponent {
  material?: ACVMaterial;
  process?: ACVProcess;
  transport_mode?: ACVTransportMode;
}

/**
 * Exporte les composants ACV vers une étude PCF existante
 */
export async function exportACVToPCF(
  studyId: string,
  components: EnrichedComponent[],
  result: ACVProductResult
): Promise<{ materialsInserted: number; transportInserted: number; manufacturingInserted: number }> {
  let materialsInserted = 0;
  let transportInserted = 0;
  let manufacturingInserted = 0;

  // 1. Exporter les matériaux ACV → pcf_bom
  const bomRows = components
    .filter(c => c.material)
    .map((c, i) => ({
      study_id: studyId,
      material_name: c.material!.name,
      quantity: c.quantity,
      unit: c.unit,
      supplier: null,
      country_origin: c.supplier_country || null,
      emission_factor_value: c.material!.carbon_factor,
      is_estimated: false,
      emissions_kg: result.components.find(rc => rc.component_id === c.id)?.material_impact.carbon ?? 0,
      sort_order: i,
    }));

  if (bomRows.length > 0) {
    const { error } = await (supabase as any)
      .from('pcf_bom')
      .insert(bomRows);
    if (!error) materialsInserted = bomRows.length;
  }

  // 2. Exporter le transport ACV → pcf_transport
  const transportRows = components
    .filter(c => c.transport_mode && c.transport_distance_km > 0)
    .map(c => ({
      study_id: studyId,
      transport_type: 'inbound' as const,
      material_ref: c.material?.name || c.component_name,
      mode: mapTransportMode(c.transport_mode!.mode_type),
      distance_km: c.transport_distance_km,
      weight_kg: c.quantity,
      emission_factor_value: c.transport_mode!.emission_factor_tkm,
      is_estimated: false,
      emissions_kg: result.components.find(rc => rc.component_id === c.id)?.transport_impact.carbon ?? 0,
    }));

  if (transportRows.length > 0) {
    const { error } = await (supabase as any)
      .from('pcf_transport')
      .insert(transportRows);
    if (!error) transportInserted = transportRows.length;
  }

  // 3. Exporter les procédés ACV → pcf_manufacturing
  const mfgRows = components
    .filter(c => c.process)
    .map(c => ({
      study_id: studyId,
      energy_type: c.process!.sector,
      quantity: c.quantity,
      unit: c.unit,
      process_type: c.process!.name,
      emission_factor_value: c.process!.emission_factor,
      is_estimated: false,
      emissions_kg: result.components.find(rc => rc.component_id === c.id)?.process_impact.carbon ?? 0,
    }));

  if (mfgRows.length > 0) {
    const { error } = await (supabase as any)
      .from('pcf_manufacturing')
      .insert(mfgRows);
    if (!error) manufacturingInserted = mfgRows.length;
  }

  return { materialsInserted, transportInserted, manufacturingInserted };
}

function mapTransportMode(acvMode: string): string {
  const mapping: Record<string, string> = {
    road: 'road',
    rail: 'rail',
    sea: 'sea',
    air: 'air',
    inland_waterway: 'sea',
  };
  return mapping[acvMode] || 'road';
}

/**
 * Liste les études PCF disponibles pour l'export
 */
export async function getAvailablePCFStudies(): Promise<Array<{ id: string; name: string; status: string }>> {
  const { data } = await (supabase as any)
    .from('pcf_studies')
    .select('id, name, status')
    .order('created_at', { ascending: false });
  return data || [];
}
