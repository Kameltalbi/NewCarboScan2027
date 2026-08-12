import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from "@/integrations/api/client";
import { BilanCarboneCalculator, BilanCarboneResult } from '@/lib/calculators/BilanCarboneCalculator';
import { useOrganizationId } from '@/hooks/useOrganizationId';
import { useOrganizationData } from '@/hooks/useOrganizationData';
import {
  FileText,
  Eye,
  TrendingUp,
  BarChart3,
  Leaf,
  Loader2,
  Download,
  Presentation,
  FileDown,
  ChevronDown,
} from 'lucide-react';
import { BilanReportViewer } from '@/components/bilan-carbone/BilanReportViewer';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { generateBilanPPTX } from '@/lib/exports/generateBilanPPTX';
import { generateBilanCondensedPDF } from '@/lib/exports/generateBilanCondensedPDF';
import { toast } from 'sonner';


export const CarboScanReports: React.FC = () => {
  const { organizationId } = useOrganizationId();
  const { referenceYear } = useOrganizationData();
  const [employees, setEmployees] = useState<number | null>(null);
  const [orgName, setOrgName] = useState<string>('Mon Organisation');
  const [sector, setSector] = useState<string | undefined>(undefined);
  const [revenue, setRevenue] = useState<number | null>(null);
  const [currency, setCurrency] = useState<string>('TND');
  const [exporting, setExporting] = useState<null | 'pptx' | 'pdf'>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [showReport, setShowReport] = useState(false);
  const [bilanResult, setBilanResult] = useState<BilanCarboneResult | null>(null);
  const [year, setYear] = useState(2025);

  useEffect(() => {
    if (organizationId) {
      loadData(organizationId);
    }
  }, [organizationId, referenceYear]);

  const loadData = async (orgId: string) => {
    setIsLoading(true);
    try {
      const dataYear = referenceYear || 2025;
      setYear(dataYear);
      const periodStart = `${dataYear}-01-01`;
      const periodEnd = `${dataYear}-12-31`;

      // Charger les méta-données de l'organisation
      const { data: orgData } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', orgId)
        .maybeSingle();
      const og: any = orgData || {};
      setEmployees(og.employees ?? null);
      if (og.name) setOrgName(og.name);
      setSector(og.sector ?? undefined);
      setRevenue(og.annual_revenue ?? og.revenue ?? null);
      if (og.currency) setCurrency(og.currency);

      const result = await BilanCarboneCalculator.calculate(orgId, periodStart, periodEnd);
      setBilanResult(result);
    } catch (error) {
      console.error('Erreur chargement rapport:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Le calculateur retourne des valeurs en kgCO₂e (cf. BilanCarboneResult interface)
  // Convertir en tonnes pour l'affichage
  const formatEmissions = (kgValue: number) => {
    const tonnes = kgValue / 1000;
    if (tonnes >= 1) {
      return `${tonnes.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} tCO₂e`;
    }
    return `${kgValue.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} kgCO₂e`;
  };

  if (isLoading) {
    return (
      <div className="flex-1 p-8 bg-gray-50">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-3 text-gray-600">Calcul des émissions en cours...</span>
        </div>
      </div>
    );
  }

  if (showReport && organizationId) {
    return (
      <BilanReportViewer
        formData={{}}
        emissionsResult={{}}
        companyInfo={{}}
        onClose={() => setShowReport(false)}
        organizationId={organizationId}
        year={year}
      />
    );
  }

  const total = bilanResult?.totalEmissions || 0;
  const s1 = bilanResult?.scope1 || 0;
  const s2 = bilanResult?.scope2 || 0;
  const s3 = bilanResult?.scope3 || 0;
  const pctS1 = total > 0 ? ((s1 / total) * 100).toFixed(1) : '0';
  const pctS2 = total > 0 ? ((s2 / total) * 100).toFixed(1) : '0';
  const pctS3 = total > 0 ? ((s3 / total) * 100).toFixed(1) : '0';

  const dominantScope = s1 >= s2 && s1 >= s3 ? 'Scope 1' : s2 >= s3 ? 'Scope 2' : 'Scope 3';

  return (
    <div className="flex-1 p-8 bg-gray-50">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Mes Rapports</h1>
          <p className="text-gray-600">Consultez et téléchargez vos rapports de bilan carbone</p>
        </div>

        {/* Statistiques rapides */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Émissions totales</p>
                  <p className="text-2xl font-bold text-gray-900">{formatEmissions(total)}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Dernière mesure</p>
                  <p className="text-2xl font-bold text-gray-900">{formatEmissions(total)}</p>
                </div>
                <BarChart3 className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Émissions par employé</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {employees && total > 0
                      ? `${(total / 1000 / employees).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} tCO₂e`
                      : '---'}
                  </p>
                </div>
                <Leaf className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {total === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Aucune donnée</h3>
              <p className="text-gray-600 mb-6">Saisissez des données d'activité pour générer votre rapport.</p>
            </CardContent>
          </Card>
        ) : (
          <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6 space-y-6">
              {/* Bouton consulter en haut */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-primary/10 rounded-lg">
                    <FileText className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">
                      Bilan Carbone — Année {year}
                    </h3>
                    <p className="text-sm text-muted-foreground">Calculé en temps réel depuis vos données d'activité</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Button size="sm" variant="outline" onClick={() => setShowReport(true)}>
                    <Eye className="h-4 w-4 mr-2" />
                    Consulter
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="sm" disabled={!bilanResult || exporting !== null} className="bg-primary hover:bg-primary/90 text-primary-foreground">
                        {exporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
                        {exporting === 'pptx' ? 'Export PPT…' : exporting === 'pdf' ? 'Export PDF…' : 'Exporter'}
                        <ChevronDown className="h-4 w-4 ml-2" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-72">
                      <DropdownMenuLabel>Format de restitution</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        disabled={!bilanResult || exporting !== null}
                        onClick={async () => {
                          if (!bilanResult) return;
                          setExporting('pptx');
                          try {
                            await generateBilanPPTX({
                              result: bilanResult, organizationName: orgName, year,
                              employees, sector, revenue, currency,
                            });
                            toast.success('Présentation PowerPoint générée');
                          } catch (e) {
                            console.error(e);
                            toast.error('Erreur lors de la génération PowerPoint');
                          } finally { setExporting(null); }
                        }}
                      >
                        <Presentation className="h-4 w-4 mr-2 text-orange-600" />
                        <div className="flex flex-col">
                          <span className="font-medium">Présentation PowerPoint</span>
                        </div>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        disabled={!bilanResult || exporting !== null}
                        onClick={async () => {
                          if (!bilanResult) return;
                          setExporting('pdf');
                          try {
                            await generateBilanCondensedPDF({
                              result: bilanResult, organizationName: orgName, year,
                              employees, sector, revenue, currency,
                            });
                            toast.success('Rapport PDF condensé généré');
                          } catch (e) {
                            console.error(e);
                            toast.error('Erreur lors de la génération PDF');
                          } finally { setExporting(null); }
                        }}
                      >
                        <FileDown className="h-4 w-4 mr-2 text-emerald-600" />
                        <div className="flex flex-col">
                          <span className="font-medium">Rapport PDF condensé</span>
                        </div>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {/* Scopes breakdown */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-muted rounded-lg">
                  <p className="text-sm font-medium text-muted-foreground mb-1">Total</p>
                  <p className="text-lg font-semibold text-foreground">{formatEmissions(total)}</p>
                </div>
                <div className="text-center p-4 bg-red-50 rounded-lg">
                  <p className="text-sm font-medium text-red-700 mb-1">Scope 1</p>
                  <p className="text-lg font-semibold text-red-800">{formatEmissions(s1)}</p>
                  <p className="text-xs text-red-600">{pctS1}%</p>
                </div>
                <div className="text-center p-4 bg-orange-50 rounded-lg">
                  <p className="text-sm font-medium text-orange-700 mb-1">Scope 2</p>
                  <p className="text-lg font-semibold text-orange-800">{formatEmissions(s2)}</p>
                  <p className="text-xs text-orange-600">{pctS2}%</p>
                </div>
                {s3 > 0 && (
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <p className="text-sm font-medium text-blue-700 mb-1">Scope 3</p>
                    <p className="text-lg font-semibold text-blue-800">{formatEmissions(s3)}</p>
                    <p className="text-xs text-blue-600">{pctS3}%</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};
