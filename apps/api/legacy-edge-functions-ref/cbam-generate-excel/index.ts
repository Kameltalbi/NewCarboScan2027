/**
 * CBAM Excel Generator Edge Function
 * Génère un fichier Excel CBAM avec 5 onglets officiels
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import ExcelJS from 'https://esm.sh/exceljs@4.4.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CBAMExportData {
  general: {
    company_name?: string;
    product_name: string;
    hs_code: string;
    country_origin: string;
    imported_quantity_tons: number;
    total_production_tons: number;
    reporting_period: string;
  };
  energy: {
    electricity_kwh: number;
    electricity_emission_factor: number;
    fuel_type?: string;
    fuel_quantity?: number;
    fuel_emission_factor?: number;
    total_fuel_emissions?: number;
  };
  materials: Array<{
    material_name: string;
    quantity: number;
    emission_factor: number;
    total_emissions: number;
  }>;
  transport: Array<{
    transport_mode: string;
    distance_km: number;
    emission_factor: number;
    emissions_tco2e: number;
  }>;
  process: Array<{
    process_name: string;
    emissions_tco2e: number;
  }>;
  results: {
    directEmissions: number;
    indirectEmissions: number;
    totalPlantEmissions: number;
    emissionsPerTon: number;
    declarableEmissions: number;
    cbamDue: number;
    etsPrice: number;
    localCarbonPrice: number;
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const data: CBAMExportData = await req.json();

    // Créer un nouveau workbook
    const workbook = new ExcelJS.Workbook();

    // Sheet 1: general
    const generalSheet = workbook.addWorksheet('general');
    generalSheet.addRow(['company_name', 'country_origin', 'product_name', 'hs_code', 'imported_quantity_tons', 'total_production_tons', 'reporting_period']);
    generalSheet.addRow([
      data.general.company_name || '',
      data.general.country_origin,
      data.general.product_name,
      data.general.hs_code,
      data.general.imported_quantity_tons,
      data.general.total_production_tons,
      data.general.reporting_period,
    ]);

    // Sheet 2: energy
    const energySheet = workbook.addWorksheet('energy');
    energySheet.addRow(['electricity_kwh', 'electricity_emission_factor', 'fuel_type', 'fuel_quantity', 'fuel_emission_factor', 'total_fuel_emissions']);
    energySheet.addRow([
      data.energy.electricity_kwh,
      data.energy.electricity_emission_factor,
      data.energy.fuel_type || '',
      data.energy.fuel_quantity || 0,
      data.energy.fuel_emission_factor || 0,
      data.energy.total_fuel_emissions || 0,
    ]);

    // Sheet 3: materials
    const materialsSheet = workbook.addWorksheet('materials');
    materialsSheet.addRow(['material_name', 'quantity', 'emission_factor', 'total_emissions']);
    if (data.materials.length > 0) {
      data.materials.forEach((m) => {
        materialsSheet.addRow([m.material_name, m.quantity, m.emission_factor, m.total_emissions]);
      });
    } else {
      materialsSheet.addRow(['', 0, 0, 0]);
    }

    // Sheet 4: transport
    const transportSheet = workbook.addWorksheet('transport');
    transportSheet.addRow(['transport_mode', 'distance_km', 'emission_factor', 'emissions_tco2e']);
    if (data.transport.length > 0) {
      data.transport.forEach((t) => {
        transportSheet.addRow([t.transport_mode, t.distance_km, t.emission_factor, t.emissions_tco2e]);
      });
    } else {
      transportSheet.addRow(['', 0, 0, 0]);
    }

    // Sheet 5: process
    const processSheet = workbook.addWorksheet('process');
    processSheet.addRow(['process_name', 'emissions_tco2e']);
    if (data.process.length > 0) {
      data.process.forEach((p) => {
        processSheet.addRow([p.process_name, p.emissions_tco2e]);
      });
    } else {
      processSheet.addRow(['', 0]);
    }

    // Générer le fichier Excel
    const excelBuffer = await workbook.xlsx.writeBuffer();
    const uint8Array = new Uint8Array(excelBuffer);
    const base64Excel = btoa(String.fromCharCode(...uint8Array));

    return new Response(
      JSON.stringify({
        success: true,
        excel: base64Excel,
        filename: `CBAM_${data.general.product_name}_${data.general.reporting_period}.xlsx`,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error generating Excel:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

