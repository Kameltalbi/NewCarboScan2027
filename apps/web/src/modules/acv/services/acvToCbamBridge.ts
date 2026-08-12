/**
 * Service pont ACV → CBAM
 * Injecte les émissions ACV dans les déclarations CBAM
 */

import { supabase } from "@/integrations/api/client";
import type { ACVProductResult } from '../engine/acvCalculationEngine';
import type { ACVProductComponent, ACVMaterial } from '../types';

interface EnrichedComponent extends ACVProductComponent {
  material?: ACVMaterial;
}

export interface CBAMExportPayload {
  installationId: string;
  productId: string;
  year: number;
  quarter: number;
}

/**
 * Exporte les résultats ACV vers les tables CBAM
 */
export async function exportACVToCBAM(
  result: ACVProductResult,
  components: EnrichedComponent[],
  payload: CBAMExportPayload
): Promise<{ success: boolean; emissionsAllocated: number }> {
  const { installationId, productId, year, quarter } = payload;

  // Calculer les émissions directes (matériaux + procédés) et indirectes (énergie/transport)
  const directEmissions = result.totals.carbon / 1000; // kgCO₂e → tCO₂e
  const materialEmissions = result.components.reduce((sum, c) => sum + c.material_impact.carbon, 0) / 1000;
  const processEmissions = result.components.reduce((sum, c) => sum + c.process_impact.carbon, 0) / 1000;
  const transportEmissions = result.components.reduce((sum, c) => sum + c.transport_impact.carbon, 0) / 1000;

  // 1. Enregistrer le résumé des émissions
  const { error: summaryError } = await supabase
    .from('cbam_emissions_summary')
    .upsert({
      installation_id: installationId,
      year,
      quarter,
      direct_emissions: materialEmissions + processEmissions,
      indirect_emissions: transportEmissions,
      total_emissions: directEmissions,
    }, { onConflict: 'installation_id,year,quarter' });

  if (summaryError) {
    console.error('CBAM summary error:', summaryError);
    return { success: false, emissionsAllocated: 0 };
  }

  // 2. Allouer les émissions au produit
  const { error: allocError } = await supabase
    .from('cbam_emission_allocation')
    .upsert({
      installation_id: installationId,
      product_id: productId,
      year,
      quarter,
      allocated_emissions: directEmissions,
      allocation_method: 'acv_lifecycle',
    }, { onConflict: 'installation_id,product_id,year,quarter' });

  if (allocError) {
    console.error('CBAM allocation error:', allocError);
    return { success: false, emissionsAllocated: 0 };
  }

  return { success: true, emissionsAllocated: directEmissions };
}

/**
 * Récupère les installations CBAM disponibles
 */
export async function getAvailableCBAMInstallations(): Promise<Array<{ id: string; name: string; country: string }>> {
  const { data } = await supabase
    .from('cbam_installations')
    .select('id, name, country')
    .order('name');
  return data || [];
}

/**
 * Récupère les produits CBAM disponibles
 */
export async function getAvailableCBAMProducts(): Promise<Array<{ id: string; name: string; cn_code: string }>> {
  const { data } = await supabase
    .from('cbam_products')
    .select('id, name, cn_code')
    .order('name');
  return data || [];
}
