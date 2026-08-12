/**
 * Helpers pour préparer les données d'export CBAM
 */

import type { CBAMPayload } from '../types';
import type { CbamResult } from './cbamCalculator';
import type { CBAMExportData } from '../types/export';

export function prepareExportData(
  formData: CBAMPayload,
  cbamResult: CbamResult,
  etsPrice: number,
  localCarbonPrice: number,
  totalProduction: number
): CBAMExportData {
  // Extraire les données d'énergie
  const electricityData = formData.energy.find(e => e.type === 'electricity') || formData.energy[0];
  const fuelData = formData.energy.find(e => e.type !== 'electricity' && e.type !== 'electricity');

  // Calculer les émissions de carburant depuis les processus
  const fuelProcess = formData.process.find(p => 
    p.process_name.toLowerCase().includes('carburant') || 
    p.process_name.toLowerCase().includes('combustion') ||
    p.process_name.toLowerCase().includes('fuel')
  );
  const fuelEmissions = fuelProcess?.value || 0;

  return {
    general: {
      company_name: undefined, // À récupérer depuis l'organisation de l'utilisateur
      product_name: formData.general.product_name,
      hs_code: formData.general.hs_code,
      country_origin: formData.general.country,
      imported_quantity_tons: formData.general.quantity_imported,
      total_production_tons: totalProduction,
      reporting_period: formData.general.period,
    },
    energy: {
      electricity_kwh: electricityData?.quantity || 0,
      electricity_emission_factor: electricityData?.FE || 0,
      fuel_type: fuelData?.type,
      fuel_quantity: fuelData?.quantity,
      fuel_emission_factor: fuelData?.FE,
      total_fuel_emissions: fuelEmissions,
    },
    materials: formData.materials.map(m => ({
      material_name: m.type,
      quantity: m.quantity,
      emission_factor: m.FE || 0,
      total_emissions: m.quantity * (m.FE || 0),
    })),
    transport: formData.transport.map(t => ({
      transport_mode: t.mode,
      distance_km: t.distance_km,
      emission_factor: t.FE || 0,
      emissions_tco2e: t.distance_km * t.tonnage * (t.FE || 0),
    })),
    process: formData.process.map(p => ({
      process_name: p.process_name,
      emissions_tco2e: p.value,
    })),
    results: {
      directEmissions: cbamResult.directEmissions,
      indirectEmissions: cbamResult.indirectEmissions,
      totalPlantEmissions: cbamResult.totalPlantEmissions,
      emissionsPerTon: cbamResult.emissionsPerTon,
      declarableEmissions: cbamResult.declarableEmissions,
      cbamDue: cbamResult.cbamDue,
      etsPrice,
      localCarbonPrice,
    },
  };
}

/**
 * Télécharge un fichier depuis une réponse base64
 */
export function downloadBase64File(base64: string, filename: string, mimeType: string) {
  // Convertir base64 en blob
  const byteCharacters = atob(base64);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  const blob = new Blob([byteArray], { type: mimeType });

  // Créer un lien de téléchargement
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

