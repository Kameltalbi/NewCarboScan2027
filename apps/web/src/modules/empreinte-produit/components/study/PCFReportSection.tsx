// Section Rapport dans une étude PCF – avec export PDF/Excel
import React, { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { FileText, Loader2, Download, FileSpreadsheet } from 'lucide-react';
import { usePCFMaterials, usePCFTransport, usePCFManufacturing, usePCFWastes, usePCFPackaging, usePCFUsage, usePCFEndOfLife, usePCFSubcontracting, usePCFCoProductAllocations } from '../../hooks/usePCFData';
import { EmpreinteProduitReportContent } from '@/components/empreinte-produit-report/EmpreinteProduitReportContent';
import type { ProductReportData } from '@/components/empreinte-produit-report/ProPlanEmpreinteProduitReport';
import type { PCFStudy } from '../../types';
import { toast } from 'sonner';

const TRANSPORT_EF: Record<string, number> = { road: 0.062, sea: 0.015, air: 0.602, rail: 0.022, mixed: 0.04 };
const ELECTRICITY_EF = 0.057;
const WASTE_EF: Record<string, number> = { recycling: -0.5, incineration: 0.5, landfill: 0.1 };
const EOL_EF: Record<string, number> = { recycling: -0.5, incineration: 0.5, landfill: 0.1, reuse: -1.0 };

const PHASE_LABELS: Record<string, string> = {
  materials: 'Matières premières', transport: 'Transport', manufacturing: 'Fabrication',
  wastes: 'Déchets', packaging: 'Emballage', usage: 'Utilisation', endOfLife: 'Fin de vie',
};

const PCFReportSection: React.FC<{ studyId: string; study: PCFStudy }> = ({ studyId, study }) => {
  const { data: materials, isLoading: l1 } = usePCFMaterials(studyId);
  const { data: transport, isLoading: l2 } = usePCFTransport(studyId);
  const { data: manufacturing, isLoading: l3 } = usePCFManufacturing(studyId);
  const { data: wastes, isLoading: l4 } = usePCFWastes(studyId);
  const { data: packaging, isLoading: l5 } = usePCFPackaging(studyId);
  const { data: usage, isLoading: l6 } = usePCFUsage(studyId);
  const { data: endOfLife, isLoading: l7 } = usePCFEndOfLife(studyId);
  const { data: subcontracting, isLoading: l8 } = usePCFSubcontracting(studyId);
  const { data: coProducts, isLoading: l9 } = usePCFCoProductAllocations(studyId);

  const [showReport, setShowReport] = React.useState(false);
  const isLoading = l1 || l2 || l3 || l4 || l5 || l6 || l7 || l8 || l9;

  const reportData = useMemo<ProductReportData | null>(() => {
    if (isLoading) return null;

    const matEmissions = materials?.reduce((s, m) => {
      const effective = m.quantity * (1 + (m.scrap_rate || 0) / 100);
      return s + (m.emissions_kg || effective * (m.emission_factor_value || 2.0));
    }, 0) || 0;
    const transEmissions = transport?.reduce((s, t) => s + (t.emissions_kg || (t.distance_km * t.weight_kg / 1000) * (TRANSPORT_EF[t.mode] || 0.04)), 0) || 0;
    const mfgEmissions = manufacturing?.reduce((s, m) => s + (m.emissions_kg || m.quantity * (m.emission_factor_value || ELECTRICITY_EF)), 0) || 0;
    const wasteEmissions = wastes?.reduce((s, w) => s + (w.emissions_kg || w.quantity_kg * (WASTE_EF[w.treatment] || 0.1)), 0) || 0;
    const packEmissions = packaging?.reduce((s, p) => s + (p.emissions_kg || p.weight_kg * 1.5), 0) || 0;
    const useEmissions = usage?.reduce((s, u) => s + (u.emissions_kg || (u.lifetime_years || 1) * (u.uses_per_year || 1) * (u.consumption_per_use || 0) * ELECTRICITY_EF), 0) || 0;
    const subEmissions = subcontracting?.reduce((s, sc) => s + (sc.emissions_kg || 0), 0) || 0;
    const totalMaterialWeight = materials?.reduce((w, m) => w + m.quantity, 0) || 0;
    const eolEmissions = endOfLife?.reduce((s, e) => s + (e.emissions_kg || totalMaterialWeight * (e.percentage / 100) * (EOL_EF[e.scenario] || 0.1)), 0) || 0;

    const breakdown = [
      { phase: 'materials', emissions: matEmissions, percentage: 0, isEstimated: materials?.some(m => m.is_estimated) || !materials?.length },
      { phase: 'manufacturing', emissions: mfgEmissions, percentage: 0, isEstimated: manufacturing?.some(m => m.is_estimated) || !manufacturing?.length },
      { phase: 'transport', emissions: transEmissions, percentage: 0, isEstimated: transport?.some(t => t.is_estimated) || !transport?.length },
      { phase: 'subcontracting', emissions: subEmissions, percentage: 0, isEstimated: subcontracting?.some(s => s.is_estimated) || false },
      { phase: 'usage', emissions: useEmissions, percentage: 0, isEstimated: true },
      { phase: 'endOfLife', emissions: eolEmissions, percentage: 0, isEstimated: true },
    ].filter(b => Math.abs(b.emissions) > 0);

    const total = breakdown.reduce((s, b) => s + b.emissions, 0);
    breakdown.forEach(b => { b.percentage = total > 0 ? (b.emissions / total) * 100 : 0; });
    const dominantPhase = [...breakdown].sort((a, b) => b.emissions - a.emissions)[0]?.phase || 'materials';

    const realCount = [
      ...(materials?.filter(m => !m.is_estimated) || []),
      ...(transport?.filter(t => !t.is_estimated) || []),
      ...(manufacturing?.filter(m => !m.is_estimated) || []),
    ].length;
    const totalCount = (materials?.length || 0) + (transport?.length || 0) + (manufacturing?.length || 0) + (wastes?.length || 0) + (packaging?.length || 0);
    const realPct = totalCount > 0 ? (realCount / totalCount) * 100 : 30;

    return {
      productName: study.name,
      productCategory: study.product_category,
      functionalUnit: study.functional_unit,
      description: study.description || undefined,
      companyName: study.country || 'Entreprise',
      sector: study.sector || 'Industrie',
      year: new Date(study.created_at).getFullYear(),
      perimeterType: study.perimeter_type,
      cbamMode: study.cbam_mode || false,
      hsCode: study.hs_code || undefined,
      studyMode: study.study_mode || 'pcf',
      totalEmissions: total,
      totalEnergyMj: study.total_energy_mj || undefined,
      totalWaterM3: study.total_water_m3 || undefined,
      totalAcidificationKgso2e: study.total_acidification_kgso2e || undefined,
      acvBreakdown: study.study_mode === 'acv' ? breakdown.map(b => ({
        phase: b.phase,
        energy_mj: 0, // Will be populated from results if available
        water_m3: 0,
        acidification_kgso2e: 0,
      })) : undefined,
      breakdown, dominantPhase,
      dataQuality: { realData: Math.round(realPct), estimatedData: Math.round(100 - realPct) },
      methodology: study.study_mode === 'acv'
        ? 'Analyse de Cycle de Vie multi-indicateurs conforme ISO 14040/14044, catégories d\'impact PEF (EU).'
        : 'Méthodologie ACV simplifiée basée sur les facteurs d\'émission de la Base Carbone ADEME, conforme aux principes ISO 14067.',
      materials: materials?.map(m => ({ name: m.material_name, quantity: m.quantity, unit: m.unit, emissionFactor: m.emission_factor_value || 2.0, origin: m.country_origin || undefined, scrapRate: m.scrap_rate || 0 })),
      transport: transport?.[0] ? { distance: transport[0].distance_km, mode: transport[0].mode, weight: transport[0].weight_kg } : undefined,
      manufacturing: manufacturing?.[0] ? { electricity: manufacturing.reduce((s, m) => s + m.quantity, 0) } : undefined,
      wastes: wastes?.map(w => ({ name: w.waste_type, quantity: w.quantity_kg, unit: 'kg' })),
      endOfLife: endOfLife?.[0] ? { scenario: endOfLife[0].scenario, percentage: endOfLife[0].percentage } : undefined,
      subcontracting: subcontracting?.map(s => ({ processName: s.process_name, supplierName: s.supplier_name || undefined, country: s.country || undefined, emissionsKg: s.emissions_kg || 0, isEstimated: s.is_estimated })),
      coProducts: coProducts?.map(cp => ({ productName: cp.product_name, method: cp.allocation_method, allocationPct: cp.allocation_percentage, isMain: cp.is_main_product })),
    };
  }, [materials, transport, manufacturing, wastes, packaging, usage, endOfLife, subcontracting, coProducts, study, isLoading]);

  const handleExportExcel = async () => {
    if (!reportData) return;
    try {
      const ExcelJS = await import('exceljs');
      const wb = new ExcelJS.Workbook();

      // Sheet 1: Résumé
      const ws1 = wb.addWorksheet('Résumé');
      ws1.columns = [{ header: 'Champ', key: 'field', width: 30 }, { header: 'Valeur', key: 'value', width: 40 }];
      ws1.addRow({ field: 'Produit', value: reportData.productName });
      ws1.addRow({ field: 'Catégorie', value: reportData.productCategory });
      ws1.addRow({ field: 'Unité fonctionnelle', value: reportData.functionalUnit });
      ws1.addRow({ field: 'Entreprise', value: reportData.companyName });
      ws1.addRow({ field: 'Secteur', value: reportData.sector });
      ws1.addRow({ field: 'Année', value: reportData.year });
      ws1.addRow({ field: 'Empreinte totale (kg CO₂e)', value: reportData.totalEmissions.toFixed(2) });
      ws1.addRow({ field: 'Phase dominante', value: PHASE_LABELS[reportData.dominantPhase] || reportData.dominantPhase });
      ws1.addRow({ field: 'Mode CBAM', value: reportData.cbamMode ? 'Oui' : 'Non' });
      if (reportData.hsCode) ws1.addRow({ field: 'Code SH', value: reportData.hsCode });

      // Sheet 2: Répartition
      const ws2 = wb.addWorksheet('Répartition');
      ws2.columns = [
        { header: 'Phase', key: 'phase', width: 25 },
        { header: 'Émissions (kg CO₂e)', key: 'emissions', width: 20 },
        { header: 'Part (%)', key: 'percentage', width: 15 },
        { header: 'Estimé', key: 'estimated', width: 10 },
      ];
      reportData.breakdown.forEach(b => {
        ws2.addRow({ phase: PHASE_LABELS[b.phase] || b.phase, emissions: b.emissions.toFixed(2), percentage: b.percentage.toFixed(1), estimated: b.isEstimated ? 'Oui' : 'Non' });
      });

      // Sheet 3: Matériaux
      if (reportData.materials?.length) {
        const ws3 = wb.addWorksheet('Matériaux');
        ws3.columns = [
          { header: 'Matériau', key: 'name', width: 25 },
          { header: 'Quantité', key: 'quantity', width: 15 },
          { header: 'Unité', key: 'unit', width: 10 },
          { header: 'Perte (%)', key: 'scrap', width: 12 },
          { header: 'FE', key: 'ef', width: 15 },
          { header: 'Origine', key: 'origin', width: 20 },
        ];
        reportData.materials.forEach(m => ws3.addRow({ name: m.name, quantity: m.quantity, unit: m.unit, scrap: m.scrapRate || 0, ef: m.emissionFactor, origin: m.origin || '–' }));
      }

      // Sheet 4: Sous-traitance
      if (reportData.subcontracting?.length) {
        const ws4 = wb.addWorksheet('Sous-traitance');
        ws4.columns = [
          { header: 'Processus', key: 'process', width: 25 },
          { header: 'Fournisseur', key: 'supplier', width: 20 },
          { header: 'Pays', key: 'country', width: 15 },
          { header: 'Émissions (kg CO₂e)', key: 'emissions', width: 20 },
        ];
        reportData.subcontracting.forEach(s => ws4.addRow({ process: s.processName, supplier: s.supplierName || '–', country: s.country || '–', emissions: s.emissionsKg.toFixed(2) }));
      }

      // Sheet 5: Coproduits
      if (reportData.coProducts?.length) {
        const ws5 = wb.addWorksheet('Coproduits');
        ws5.columns = [
          { header: 'Coproduit', key: 'name', width: 25 },
          { header: 'Méthode', key: 'method', width: 15 },
          { header: 'Part allouée (%)', key: 'pct', width: 18 },
          { header: 'Principal', key: 'main', width: 10 },
        ];
        reportData.coProducts.forEach(cp => ws5.addRow({ name: cp.productName, method: cp.method === 'mass' ? 'Massique' : 'Économique', pct: cp.allocationPct.toFixed(1), main: cp.isMain ? 'Oui' : 'Non' }));
      }

      const buffer = await wb.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `PCF_${reportData.productName.replace(/\s+/g, '_')}_${reportData.year}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Export Excel téléchargé');
    } catch (err) {
      toast.error('Erreur lors de l\'export Excel');
    }
  };

  const handleExportPDF = async () => {
    try {
      const html2pdf = (await import('html2pdf.js')).default;
      const reportEl = document.getElementById('pcf-report-content');
      if (!reportEl) {
        toast.error('Générez d\'abord le rapport');
        return;
      }
      await html2pdf().set({
        margin: 10,
        filename: `PCF_${study.name.replace(/\s+/g, '_')}.pdf`,
        image: { type: 'jpeg', quality: 0.95 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      }).from(reportEl).save();
      toast.success('Export PDF téléchargé');
    } catch {
      toast.error('Erreur lors de l\'export PDF');
    }
  };

  if (isLoading) {
    return <div className="flex justify-center p-12"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  if (showReport && reportData) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Button variant="outline" size="sm" onClick={() => setShowReport(false)}>← Retour</Button>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="gap-1.5" onClick={handleExportPDF}>
              <Download className="w-3.5 h-3.5" /> PDF
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={handleExportExcel}>
              <FileSpreadsheet className="w-3.5 h-3.5" /> Excel
            </Button>
          </div>
        </div>
        <div id="pcf-report-content">
          <EmpreinteProduitReportContent productReportData={reportData} />
        </div>
      </div>
    );
  }

  const hasData = study.status === 'calculated' || study.status === 'locked' || (study.total_emissions && study.total_emissions > 0);

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-xl font-bold text-foreground">
          {study.study_mode === 'acv' ? 'Rapport ACV Multi-indicateurs' : 'Rapport PCF'}
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          {study.study_mode === 'acv'
            ? 'Générez le rapport ACV complet conforme ISO 14040/14044 avec 4 indicateurs environnementaux.'
            : 'Générez le rapport 15 sections conforme ISO 14067 à partir des données de cette étude.'}
        </p>
      </div>

      {hasData ? (
        <Card className="p-8 text-center space-y-4">
          <FileText className="w-12 h-12 text-primary mx-auto" />
          <p className="text-foreground font-semibold">Rapport prêt à être généré</p>
          <p className="text-sm text-muted-foreground">
            Empreinte calculée : <strong>{(study.total_emissions || reportData?.totalEmissions || 0).toFixed(2)} kg CO₂e</strong> / {study.functional_unit}
          </p>
          <div className="flex gap-3 justify-center">
            <Button onClick={() => setShowReport(true)} className="gap-2">
              <FileText className="w-4 h-4" /> Générer le rapport
            </Button>
            <Button variant="outline" className="gap-2" onClick={handleExportExcel}>
              <FileSpreadsheet className="w-4 h-4" /> Export Excel
            </Button>
          </div>
        </Card>
      ) : (
        <Card className="p-12 text-center">
          <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Veuillez d'abord calculer l'empreinte dans l'onglet « Résultats ».</p>
        </Card>
      )}
    </div>
  );
};

export default PCFReportSection;
