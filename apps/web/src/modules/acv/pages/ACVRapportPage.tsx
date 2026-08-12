import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { FileText, Download, CheckCircle2, FileDown, ArrowRight, Loader2 } from 'lucide-react';
import { useACVProjects } from '@/hooks/useACVProjects';
import { useACVCalculation } from '../hooks/useACVCalculation';
import { formatImpact } from '../engine/acvCalculationEngine';
import { generateACVPdfReport } from '../services/acvPdfExport';
import { exportACVToPCF, getAvailablePCFStudies } from '../services/acvToPcfBridge';
import { exportACVToCBAM, getAvailableCBAMInstallations, getAvailableCBAMProducts } from '../services/acvToCbamBridge';
import { toast } from 'sonner';

export const ACVRapportPage: React.FC = () => {
  const { projects } = useACVProjects();
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const { baselineResult, enrichedComponents, isLoading } = useACVCalculation(selectedProjectId || undefined);
  const project = projects.find(p => p.id === selectedProjectId);

  // PCF integration state
  const [pcfStudies, setPcfStudies] = useState<Array<{ id: string; name: string; status: string }>>([]);
  const [selectedPcfStudy, setSelectedPcfStudy] = useState('');
  const [pcfExporting, setPcfExporting] = useState(false);

  // CBAM integration state
  const [cbamInstallations, setCbamInstallations] = useState<Array<{ id: string; name: string; country: string }>>([]);
  const [cbamProducts, setCbamProducts] = useState<Array<{ id: string; name: string; cn_code: string }>>([]);
  const [selectedInstallation, setSelectedInstallation] = useState('');
  const [selectedProduct, setSelectedProduct] = useState('');
  const [cbamExporting, setCbamExporting] = useState(false);

  useEffect(() => {
    if (selectedProjectId && baselineResult) {
      getAvailablePCFStudies().then(setPcfStudies);
      getAvailableCBAMInstallations().then(setCbamInstallations);
      getAvailableCBAMProducts().then(setCbamProducts);
    }
  }, [selectedProjectId, baselineResult]);

  const reportSections = [
    { id: 'info', title: '1. Informations generales', status: !!project },
    { id: 'methodology', title: '2. Methodologie (ISO 14040/14044)', status: true },
    { id: 'scope', title: '3. Perimetre & Unite fonctionnelle', status: !!project?.functional_unit },
    { id: 'inventory', title: '4. Inventaire du cycle de vie (ICV)', status: !!baselineResult?.components.length },
    { id: 'results', title: '5. Resultats multi-impacts', status: !!baselineResult },
    { id: 'hotspots', title: '6. Analyse des hotspots', status: !!baselineResult?.hotspots.length },
    { id: 'lifecycle', title: '7. Repartition par phase', status: !!baselineResult?.lifecycle.length },
    { id: 'recommendations', title: '8. Recommandations', status: !!baselineResult },
  ];

  const completionRate = Math.round((reportSections.filter(s => s.status).length / reportSections.length) * 100);

  const handleExportPDF = () => {
    if (!baselineResult || !project) return;
    generateACVPdfReport(project, baselineResult);
    toast.success('Rapport PDF ISO 14040 genere avec succes');
  };

  const handleExportCSV = () => {
    if (!baselineResult || !project) return;
    const lines = [
      ['Rapport ACV — ' + project.name],
      ['Norme', 'ISO 14040 / 14044 / 14067'],
      ['Unite fonctionnelle', project.functional_unit],
      [''],
      ['Indicateur', 'Valeur', 'Unite'],
      ['Empreinte carbone', baselineResult.totals.carbon.toFixed(3), 'kgCO2e'],
      ['Energie primaire', baselineResult.totals.energy.toFixed(3), 'MJ'],
      ['Consommation eau', baselineResult.totals.water.toFixed(3), 'm3'],
      ['Acidification', baselineResult.totals.acidification.toFixed(6), 'kgSO2e'],
      [''],
      ['Composant', 'Carbone (kgCO2e)', 'Energie (MJ)', 'Eau (m3)', 'Contribution (%)'],
      ...baselineResult.components.map(c => [
        c.component_name, c.total.carbon.toFixed(3), c.total.energy.toFixed(3), c.total.water.toFixed(3), c.percentage.toFixed(1),
      ]),
      [''],
      ['Phase', 'Carbone (kgCO2e)', 'Contribution (%)'],
      ...baselineResult.lifecycle.map(l => [`${l.module_code} ${l.module_name}`, l.impact.carbon.toFixed(3), l.percentage.toFixed(1)]),
    ];
    const csvContent = lines.map(l => l.join(';')).join('\n');
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rapport-acv-${project.name.replace(/\s+/g, '-')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportToPCF = async () => {
    if (!baselineResult || !selectedPcfStudy || enrichedComponents.length === 0) return;
    setPcfExporting(true);
    try {
      const result = await exportACVToPCF(selectedPcfStudy, enrichedComponents, baselineResult);
      toast.success(`Export PCF : ${result.materialsInserted} materiaux, ${result.transportInserted} transports, ${result.manufacturingInserted} procedes`);
    } catch (e) {
      toast.error("Erreur lors de l'export vers PCF");
    } finally {
      setPcfExporting(false);
    }
  };

  const handleExportToCBAM = async () => {
    if (!baselineResult || !selectedInstallation || !selectedProduct) return;
    setCbamExporting(true);
    try {
      const result = await exportACVToCBAM(baselineResult, enrichedComponents, {
        installationId: selectedInstallation,
        productId: selectedProduct,
        year: new Date().getFullYear(),
        quarter: Math.ceil((new Date().getMonth() + 1) / 3),
      });
      if (result.success) {
        toast.success(`Export CBAM : ${result.emissionsAllocated.toFixed(3)} tCO2e allouees`);
      } else {
        toast.error('Erreur CBAM');
      }
    } catch (e) {
      toast.error("Erreur lors de l'export vers CBAM");
    } finally {
      setCbamExporting(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" />
            Rapport ACV
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Rapport conforme ISO 14040/14044 — Export PDF, CSV et integrations PCF/CBAM
          </p>
        </div>
        {baselineResult && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExportCSV} className="gap-2">
              <Download className="h-4 w-4" /> CSV
            </Button>
            <Button onClick={handleExportPDF} className="gap-2">
              <FileDown className="h-4 w-4" /> Export PDF
            </Button>
          </div>
        )}
      </div>

      <Card>
        <CardContent className="pt-4">
          <Label className="text-sm font-medium">Projet ACV</Label>
          <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
            <SelectTrigger className="mt-1"><SelectValue placeholder="Selectionnez un projet" /></SelectTrigger>
            <SelectContent>
              {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selectedProjectId && (
        <>
          {/* Progression */}
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Completion du rapport</span>
                <span className="text-sm font-mono font-bold">{completionRate}%</span>
              </div>
              <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${completionRate}%` }} />
              </div>
            </CardContent>
          </Card>

          {/* Sections du rapport */}
          <div className="space-y-2">
            {reportSections.map(section => (
              <Card key={section.id} className={section.status ? 'border-primary/20' : 'opacity-60'}>
                <CardContent className="py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className={`h-5 w-5 ${section.status ? 'text-primary' : 'text-muted-foreground'}`} />
                    <span className="text-sm font-medium">{section.title}</span>
                  </div>
                  <Badge variant={section.status ? 'default' : 'secondary'}>
                    {section.status ? 'Pret' : 'Incomplet'}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Résumé */}
          {baselineResult && project && (
            <Card>
              <CardHeader><CardTitle className="text-sm">Resume des resultats</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: 'Carbone total', value: formatImpact(baselineResult.totals.carbon, 'carbon') },
                    { label: 'Energie', value: formatImpact(baselineResult.totals.energy, 'energy') },
                    { label: 'Eau', value: formatImpact(baselineResult.totals.water, 'water') },
                    { label: 'Composants', value: String(baselineResult.components.length) },
                  ].map(item => (
                    <div key={item.label} className="text-center p-3 rounded-lg bg-muted/30">
                      <p className="text-xs text-muted-foreground mb-1">{item.label}</p>
                      <p className="font-mono font-bold">{item.value}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Integrations */}
          {baselineResult && (
            <div className="grid md:grid-cols-2 gap-4">
              {/* Pont ACV → PCF */}
              <Card className="border-accent/30">
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <ArrowRight className="h-4 w-4 text-accent" />
                    Export vers Empreinte Produit (PCF)
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-xs text-muted-foreground">
                    Injecter automatiquement les composants ACV dans une etude PCF existante (BOM, transport, fabrication).
                  </p>
                  <Select value={selectedPcfStudy} onValueChange={setSelectedPcfStudy}>
                    <SelectTrigger><SelectValue placeholder="Etude PCF cible" /></SelectTrigger>
                    <SelectContent>
                      {pcfStudies.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleExportToPCF}
                    disabled={!selectedPcfStudy || pcfExporting}
                    className="w-full gap-2"
                  >
                    {pcfExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                    Exporter vers PCF
                  </Button>
                </CardContent>
              </Card>

              {/* Pont ACV → CBAM */}
              <Card className="border-accent/30">
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <ArrowRight className="h-4 w-4 text-accent" />
                    Export vers CBAM
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-xs text-muted-foreground">
                    Injecter les emissions ACV dans une declaration CBAM (installation + produit).
                  </p>
                  <Select value={selectedInstallation} onValueChange={setSelectedInstallation}>
                    <SelectTrigger><SelectValue placeholder="Installation CBAM" /></SelectTrigger>
                    <SelectContent>
                      {cbamInstallations.map(i => <SelectItem key={i.id} value={i.id}>{i.name} ({i.country})</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                    <SelectTrigger><SelectValue placeholder="Produit CBAM" /></SelectTrigger>
                    <SelectContent>
                      {cbamProducts.map(p => <SelectItem key={p.id} value={p.id}>{p.name} ({p.cn_code})</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleExportToCBAM}
                    disabled={!selectedInstallation || !selectedProduct || cbamExporting}
                    className="w-full gap-2"
                  >
                    {cbamExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                    Exporter vers CBAM
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}
        </>
      )}
    </div>
  );
};
