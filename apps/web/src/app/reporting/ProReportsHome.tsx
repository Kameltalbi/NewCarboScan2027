import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, Globe2, Loader2 } from 'lucide-react';
import { useOrganizationId } from '@/hooks/useOrganizationId';
import { useOrganizationYears } from '@/hooks/useOrganizationYears';
import { useToast } from '@/hooks/use-toast';
import { useBilanReport } from '@/hooks/useBilanReport';
import { BilanReportViewer } from '@/components/bilan-carbone/BilanReportViewer';

export const ProReportsHome: React.FC = () => {
  const { organizationId } = useOrganizationId();
  const years = useOrganizationYears();
  const yearsLoading = years.isLoading;
  const { toast } = useToast();
  const [year, setYear] = useState<number | null>(null);
  const [language, setLanguage] = useState<'fr' | 'en'>('fr');
  const {
    isGenerating,
    reportData,
    showReport,
    organizationId: reportOrgId,
    year: reportYear,
    generateReport,
    closeReport,
  } = useBilanReport();

  React.useEffect(() => {
    if (!year && years?.defaultYear) setYear(years.defaultYear);
  }, [years, year]);

  const handleGenerate = async () => {
    if (!organizationId || !year) {
      toast({
        title: 'Données manquantes',
        description: 'Choisissez une année et vérifiez que votre organisation est bien chargée.',
        variant: 'destructive',
      });
      return;
    }
    try {
      await generateReport(organizationId, year);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Échec de génération';
      toast({ title: 'Erreur', description: message, variant: 'destructive' });
    }
  };


  const allowedYears = years?.allowedYears || [];

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8">
      {/* Header sobre */}
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Rapport annuel</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Bilan carbone conforme GHG Protocol / ISO 14064, prêt à partager.
          </p>
        </div>
        <div className="flex items-end gap-3">
          {!yearsLoading && (
            <Select value={year?.toString() || ''} onValueChange={(v) => setYear(Number(v))}>
              <SelectTrigger className="w-[120px]"><SelectValue placeholder="Année" /></SelectTrigger>
              <SelectContent>
                {allowedYears.length === 0 && year && (
                  <SelectItem value={year.toString()}>{year}</SelectItem>
                )}
                {allowedYears.map(y => (
                  <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Select value={language} onValueChange={(v) => setLanguage(v as 'fr' | 'en')}>
            <SelectTrigger className="w-[110px]">
              <Globe2 className="h-4 w-4 mr-1.5" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="fr">FR</SelectItem>
              <SelectItem value="en">EN</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={() => void handleGenerate()} disabled={!year || !organizationId || isGenerating} size="lg">
            {isGenerating ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Génération…</>
            ) : (
              <><FileText className="h-4 w-4 mr-2" /> Générer le rapport</>
            )}
          </Button>
        </div>
      </div>

      {/* Historique */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium">Rapports générés</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground text-center py-10">
            Le rapport est construit à partir des données saisies pour {year ?? 'l’année choisie'}. Cliquez sur « Générer le rapport ».
          </div>
        </CardContent>
      </Card>

      {showReport && reportData && (
        <BilanReportViewer
          formData={reportData.formData}
          emissionsResult={reportData.emissionsResult}
          companyInfo={reportData.companyInfo}
          organizationId={reportOrgId}
          year={reportYear}
          onClose={closeReport}
        />
      )}
    </div>
  );
};

export default ProReportsHome;
