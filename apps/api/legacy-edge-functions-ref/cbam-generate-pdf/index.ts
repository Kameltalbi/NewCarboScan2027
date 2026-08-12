/**
 * CBAM PDF Generator Edge Function
 * Génère un rapport PDF CBAM professionnel en 4 pages
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { PDFDocument, rgb, StandardFonts } from 'https://esm.sh/pdf-lib@1.17.1';

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

    // Créer le PDF
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const pageWidth = 595;
    const pageHeight = 842;
    const margin = 50;
    const contentWidth = pageWidth - (margin * 2);

    // Fonction helper pour ajouter du texte
    const addText = (
      page: any,
      text: string,
      x: number,
      y: number,
      size: number = 12,
      isBold: boolean = false,
      color: [number, number, number] = [0, 0, 0]
    ) => {
      page.drawText(text, {
        x,
        y,
        size,
        font: isBold ? boldFont : font,
        color: rgb(color[0], color[1], color[2]),
      });
    };

    // Fonction helper pour ajouter une ligne
    const addLine = (page: any, y: number) => {
      page.drawLine({
        start: { x: margin, y },
        end: { x: pageWidth - margin, y },
        thickness: 0.5,
        color: rgb(0.8, 0.8, 0.8),
      });
    };

    // PAGE 1 - Informations générales
    const page1 = pdfDoc.addPage([pageWidth, pageHeight]);
    let yPos = pageHeight - margin - 50;

    // En-tête
    addText(page1, 'Rapport CBAM — CarboScan', margin, yPos, 24, true, [0, 0.6, 0.47]);
    yPos -= 40;
    addLine(page1, yPos);
    yPos -= 30;

    // Titre section
    addText(page1, 'Informations Générales', margin, yPos, 18, true);
    yPos -= 30;

    // Informations
    const infoFields = [
      ['Entreprise importatrice:', data.general.company_name || 'Non spécifié'],
      ['Produit:', data.general.product_name],
      ['Code HS:', data.general.hs_code],
      ['Pays d\'origine:', data.general.country_origin],
      ['Quantité importée:', `${data.general.imported_quantity_tons.toFixed(2)} tonnes`],
      ['Production totale:', `${data.general.total_production_tons.toFixed(2)} tonnes`],
      ['Période de déclaration:', data.general.reporting_period],
    ];

    infoFields.forEach(([label, value]) => {
      addText(page1, label, margin, yPos, 12, true);
      addText(page1, value, margin + 200, yPos, 12);
      yPos -= 25;
    });

    // PAGE 2 - Analyse des émissions
    const page2 = pdfDoc.addPage([pageWidth, pageHeight]);
    yPos = pageHeight - margin - 50;

    addText(page2, 'Rapport CBAM — CarboScan', margin, yPos, 24, true, [0, 0.6, 0.47]);
    yPos -= 40;
    addLine(page2, yPos);
    yPos -= 30;

    addText(page2, 'Analyse des Émissions', margin, yPos, 18, true);
    yPos -= 30;

    // Émissions directes
    addText(page2, 'Émissions Directes', margin, yPos, 14, true);
    yPos -= 20;
    addText(page2, `Processus industriels: ${data.process.reduce((sum, p) => sum + p.emissions_tco2e, 0).toFixed(4)} tCO₂e`, margin + 20, yPos, 11);
    yPos -= 15;
    if (data.energy.total_fuel_emissions) {
      addText(page2, `Combustion: ${data.energy.total_fuel_emissions.toFixed(4)} tCO₂e`, margin + 20, yPos, 11);
      yPos -= 15;
    }
    addText(page2, `Total Direct: ${data.results.directEmissions.toFixed(4)} tCO₂e`, margin, yPos, 12, true);
    yPos -= 30;

    // Émissions indirectes
    addText(page2, 'Émissions Indirectes', margin, yPos, 14, true);
    yPos -= 20;
    addText(page2, `Électricité consommée: ${data.energy.electricity_kwh.toLocaleString('fr-FR')} kWh`, margin + 20, yPos, 11);
    yPos -= 15;
    addText(page2, `Facteur d'émission: ${data.energy.electricity_emission_factor.toFixed(6)} tCO₂e/kWh`, margin + 20, yPos, 11);
    yPos -= 15;
    addText(page2, `Total Indirect: ${data.results.indirectEmissions.toFixed(4)} tCO₂e`, margin, yPos, 12, true);
    yPos -= 30;

    // Émissions totales
    addText(page2, 'Émissions Totales', margin, yPos, 14, true);
    yPos -= 20;
    addText(page2, `Direct + Indirect: ${data.results.totalPlantEmissions.toFixed(4)} tCO₂e`, margin + 20, yPos, 11);
    yPos -= 15;
    addText(page2, `Émissions par tonne: ${data.results.emissionsPerTon.toFixed(4)} tCO₂e/t`, margin + 20, yPos, 11);
    yPos -= 15;
    addText(page2, `Émissions déclarables CBAM: ${data.results.declarableEmissions.toFixed(4)} tCO₂e`, margin, yPos, 12, true, [0, 0.6, 0.47]);

    // PAGE 3 - Calcul CBAM
    const page3 = pdfDoc.addPage([pageWidth, pageHeight]);
    yPos = pageHeight - margin - 50;

    addText(page3, 'Rapport CBAM — CarboScan', margin, yPos, 24, true, [0, 0.6, 0.47]);
    yPos -= 40;
    addLine(page3, yPos);
    yPos -= 30;

    addText(page3, 'Calcul CBAM', margin, yPos, 18, true);
    yPos -= 30;

    // Tableau récapitulatif
    const tableData = [
      ['Prix ETS', `${data.results.etsPrice.toFixed(2)} €/tCO₂e`],
      ['Prix carbone local', `${data.results.localCarbonPrice.toFixed(2)} €/tCO₂e`],
      ['Émissions déclarables', `${data.results.declarableEmissions.toFixed(4)} tCO₂e`],
    ];

    tableData.forEach(([label, value]) => {
      addText(page3, label, margin, yPos, 12);
      addText(page3, value, margin + 300, yPos, 12);
      yPos -= 25;
    });

    yPos -= 20;
    addLine(page3, yPos);
    yPos -= 30;

    // Montant final
    addText(page3, 'Montant CBAM dû', margin, yPos, 16, true);
    yPos -= 30;
    addText(page3, `${data.results.cbamDue.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} €`, margin, yPos, 32, true, [0, 0.6, 0.47]);

    // PAGE 4 - Annexe
    const page4 = pdfDoc.addPage([pageWidth, pageHeight]);
    yPos = pageHeight - margin - 50;

    addText(page4, 'Rapport CBAM — CarboScan', margin, yPos, 24, true, [0, 0.6, 0.47]);
    yPos -= 40;
    addLine(page4, yPos);
    yPos -= 30;

    addText(page4, 'Annexe — Détails', margin, yPos, 18, true);
    yPos -= 30;

    // Tableau Énergie
    addText(page4, 'Énergie', margin, yPos, 14, true);
    yPos -= 20;
    addText(page4, 'kWh', margin, yPos, 10);
    addText(page4, 'FE (tCO₂e/kWh)', margin + 150, yPos, 10);
    addText(page4, 'Émissions (tCO₂e)', margin + 300, yPos, 10);
    yPos -= 15;
    addText(page4, `${data.energy.electricity_kwh.toLocaleString('fr-FR')}`, margin, yPos, 10);
    addText(page4, `${data.energy.electricity_emission_factor.toFixed(6)}`, margin + 150, yPos, 10);
    addText(page4, `${data.results.indirectEmissions.toFixed(4)}`, margin + 300, yPos, 10);
    yPos -= 30;

    // Tableau Processus
    if (data.process.length > 0) {
      addText(page4, 'Processus Industriels', margin, yPos, 14, true);
      yPos -= 20;
      data.process.forEach((proc) => {
        addText(page4, proc.process_name, margin, yPos, 10);
        addText(page4, `${proc.emissions_tco2e.toFixed(4)} tCO₂e`, margin + 300, yPos, 10);
        yPos -= 15;
      });
      yPos -= 15;
    }

    // Footer
    yPos = margin + 30;
    addText(page4, 'Rapport généré automatiquement par CarboScan — CBAM Compliance Module', margin, yPos, 9, false, [0.5, 0.5, 0.5]);

    // Générer le PDF
    const pdfBytes = await pdfDoc.save();

    // Retourner le PDF en base64
    const base64Pdf = btoa(String.fromCharCode(...pdfBytes));

    return new Response(
      JSON.stringify({
        success: true,
        pdf: base64Pdf,
        filename: `CBAM_${data.general.product_name}_${data.general.reporting_period}.pdf`,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error generating PDF:', error);
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

