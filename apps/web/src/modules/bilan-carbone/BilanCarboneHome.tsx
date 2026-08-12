// Page d'accueil du module Bilan Carbone - flux unifié activity_data
import { logger } from '@/utils/logger';

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Database, ArrowRight, FileText, BarChart3, Plus, TrendingUp, Calendar, Download, Presentation, ChevronDown, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useOrganizationData } from '@/hooks/useOrganizationData';
import { BilanCarboneCalculator } from '@/lib/calculators/BilanCarboneCalculator';
import { Loader2 } from 'lucide-react';
import { useBilanReport } from '@/hooks/useBilanReport';
import { BilanReportViewer } from '@/components/bilan-carbone/BilanReportViewer';
import { supabase } from "@/integrations/api/client";
import { ReportGeneratorService } from '@/lib/services/ReportGeneratorService';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { generateBilanPPTX } from '@/lib/exports/generateBilanPPTX';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

import { toast } from 'sonner';


export const BilanCarboneHome: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { organizationId, referenceYear, loading: orgLoading } = useOrganizationData();
  const [bilanData, setBilanData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [orgMeta, setOrgMeta] = useState<{ name: string; employees: number | null; sector?: string; revenue: number | null; currency: string }>({ name: 'Mon Organisation', employees: null, sector: undefined, revenue: null, currency: 'TND' });
  const [exporting, setExporting] = useState<null | 'pptx'>(null);
  const [showGenerateConfirm, setShowGenerateConfirm] = useState(false);

  const { 
    isGenerating, 
    reportData, 
    showReport, 
    generationProgress, 
    generationStep, 
    organizationId: reportOrgId,
    year: reportYear,
    generateReport, 
    closeReport 
  } = useBilanReport();

  useEffect(() => {
    const loadBilan = async () => {
      if (!organizationId || orgLoading) return;
      
      try {
        setLoading(true);
        const periodStart = `${referenceYear}-01-01`;
        const periodEnd = `${referenceYear}-12-31`;
        
        const result = await BilanCarboneCalculator.calculate(
          organizationId,
          periodStart,
          periodEnd
        );
        
        setBilanData(result);

        // Charger les méta-données de l'organisation pour les exports
        const { data: orgData } = await supabase
          .from('organizations')
          .select('*')
          .eq('id', organizationId)
          .maybeSingle();
        const og: any = orgData || {};
        setOrgMeta({
          name: og.name || 'Mon Organisation',
          employees: og.employees ?? null,
          sector: og.sector ?? undefined,
          revenue: og.annual_revenue ?? og.revenue ?? null,
          currency: og.currency || 'TND',
        });
        
        // Sauvegarder automatiquement le bilan dans bilans_carbone
        if (result && result.totalEmissions > 0 && user) {
          await saveBilanToHistory(result, organizationId, referenceYear);
        }
      } catch (error) {
        console.error('Erreur chargement bilan:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadBilan();
  }, [organizationId, orgLoading, referenceYear, user]);

  // Fonction pour sauvegarder le bilan dans l'historique
  const saveBilanToHistory = async (bilanData: any, orgId: string, year: number) => {
    try {
      // Vérifier si un bilan existe déjà pour cette année
      const { data: existing } = await supabase
        .from('bilans_carbone')
        .select('id, status')
        .eq('organization_id', orgId)
        .eq('reference_year', year)
        .maybeSingle();

      // Ne pas écraser un bilan soumis ou validé
      if (existing && (existing.status === 'submitted' || existing.status === 'validated')) {
        return;
      }

      const bilanRecord = {
        user_id: user?.id,
        organization_id: orgId,
        total_emission: bilanData.totalEmissions / 1000,
        scope1_emission: bilanData.scope1 / 1000,
        scope2_emission: bilanData.scope2 / 1000,
        scope3_emission: bilanData.scope3 / 1000,
        date_bilan: `${year}-12-31`,
        reference_year: year,
        status: existing ? existing.status : 'draft',
        questionnaire_data: {
          year,
          calculatedFrom: 'activity_data',
          timestamp: new Date().toISOString()
        }
      };

      if (existing) {
        // Mettre à jour le bilan existant (draft ou revision uniquement)
        await supabase
          .from('bilans_carbone')
          .update(bilanRecord)
          .eq('id', existing.id);
      } else {
        // Créer un nouveau bilan
        await supabase
          .from('bilans_carbone')
          .insert(bilanRecord);
      }
    } catch (error) {
      console.error('Erreur sauvegarde bilan historique:', error);
    }
  };

  const hasBilanData = bilanData && bilanData.totalEmissions > 0;

  if (loading || orgLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-[#5F9E6B]" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Bilan actuel (calculé depuis activity_data) */}
      {hasBilanData ? (
        <Card className="bg-white border-[#E5E5E5] rounded-xl shadow-sm border-l-4 border-l-[#5F9E6B]">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-[#5F9E6B]/10 rounded-lg">
                    <BarChart3 className="h-5 w-5 text-[#5F9E6B]" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">Bilan Carbone {referenceYear}</h2>
                    <Badge className="bg-[#87C6A0]/20 text-[#5F9E6B] border-[#87C6A0]/50 mt-1">
                      Calculé depuis vos données
                    </Badge>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6 pt-2">
                  <div className="min-w-0">
                    <div className="text-2xl font-bold text-[#5F9E6B] truncate">
                      {Math.round(bilanData.totalEmissions / 1000)}
                    </div>
                    <div className="text-xs text-muted-foreground whitespace-nowrap">Total tCO₂e</div>
                  </div>
                  <div className="min-w-0">
                    <div className="text-xl font-bold text-[#5F9E6B] truncate">
                      {Math.round(bilanData.scope1 / 1000)}
                    </div>
                    <div className="text-xs text-muted-foreground whitespace-nowrap">Scope 1</div>
                  </div>
                  <div className="min-w-0">
                    <div className="text-xl font-bold text-[#4C7D7F] truncate">
                      {Math.round(bilanData.scope2 / 1000)}
                    </div>
                    <div className="text-xs text-muted-foreground whitespace-nowrap">Scope 2</div>
                  </div>
                  <div className="min-w-0">
                    <div className="text-xl font-bold text-[#87C6A0] truncate">
                      {Math.round(bilanData.scope3 / 1000)}
                    </div>
                    <div className="text-xs text-muted-foreground whitespace-nowrap">Scope 3</div>
                  </div>
                </div>
              </div>
              
              <div className="flex flex-col gap-2">
                <Button
                  onClick={() => setShowGenerateConfirm(true)}
                  disabled={isGenerating}
                  className="bg-[#4C7D7F] hover:bg-[#5F9E6B] text-white"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Générer le rapport
                </Button>
              </div>

            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-white border-[#E5E5E5] rounded-xl shadow-sm">
          <CardContent className="p-8 text-center">
            <Database className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-bold text-slate-900 mb-2">Aucune donnée disponible</h2>
            <p className="text-muted-foreground mb-6">
              Commencez par collecter vos données d'activité pour calculer votre bilan carbone.
            </p>
            <Button 
              onClick={() => navigate('/app/collecte')}
              className="bg-[#5F9E6B] hover:bg-[#4C7D7F] text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              Aller à la collecte de données
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Actions principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-white border-[#E5E5E5] rounded-xl shadow-sm hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/app/collecte')}>
          <CardContent className="p-5">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-[#5F9E6B]/10 rounded-lg">
                <Database className="h-5 w-5 text-[#5F9E6B]" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-slate-900 mb-1">Collecter les données</h3>
                <p className="text-xs text-muted-foreground mb-3">
                  Saisissez vos consommations et activités
                </p>
                <div className="flex items-center text-[#5F9E6B] text-sm font-medium">
                  Accéder <ArrowRight className="h-4 w-4 ml-1" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-[#E5E5E5] rounded-xl shadow-sm hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/app/dashboard')}>
          <CardContent className="p-5">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-[#4C7D7F]/10 rounded-lg">
                <BarChart3 className="h-5 w-5 text-[#4C7D7F]" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-slate-900 mb-1">Voir le dashboard</h3>
                <p className="text-xs text-muted-foreground mb-3">
                  Vue consolidée et graphiques détaillés
                </p>
                <div className="flex items-center text-[#4C7D7F] text-sm font-medium">
                  Accéder <ArrowRight className="h-4 w-4 ml-1" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>


      {/* Info méthodologie */}
      <Card className="bg-[#F8F8F8] border-[#E5E5E5] rounded-xl">
        <CardContent className="p-5">
          <div className="flex items-start gap-3">
            <TrendingUp className="h-5 w-5 text-[#5F9E6B] mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-slate-900 mb-2">Flux de calcul unifié</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Votre bilan carbone est calculé automatiquement à partir des données saisies dans le module 
                <strong> Collecte de données</strong>. Les émissions sont mises à jour en temps réel et utilisent 
                vos facteurs d'émission personnalisés ou la base ADEME Base Carbone 2024.
              </p>
              <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>Période : {referenceYear}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Barre de progression génération IA */}
      {isGenerating && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-[#5F9E6B]/10 rounded-full mb-4">
                <Loader2 className="h-8 w-8 text-[#5F9E6B] animate-spin" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-2">
                Génération de votre rapport
              </h3>
              <p className="text-sm text-slate-600">
                L'IA analyse vos données et génère votre rapport personnalisé
              </p>
            </div>

            {/* Barre de progression */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-slate-700">
                  {generationStep}
                </span>
                <span className="text-sm font-semibold text-[#5F9E6B]">
                  {generationProgress}%
                </span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-[#4C7D7F] to-[#5F9E6B] h-2.5 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${generationProgress}%` }}
                />
              </div>
            </div>

            {/* Étapes */}
            <div className="space-y-2 mt-6">
              <div className={`flex items-center gap-2 text-sm ${generationProgress >= 15 ? 'text-[#5F9E6B]' : 'text-slate-400'}`}>
                <div className={`w-5 h-5 rounded-full flex items-center justify-center ${generationProgress >= 15 ? 'bg-[#5F9E6B]' : 'bg-slate-200'}`}>
                  {generationProgress >= 15 && <span className="text-white text-xs">✓</span>}
                </div>
                <span>Analyse des données</span>
              </div>
              <div className={`flex items-center gap-2 text-sm ${generationProgress >= 50 ? 'text-[#5F9E6B]' : 'text-slate-400'}`}>
                <div className={`w-5 h-5 rounded-full flex items-center justify-center ${generationProgress >= 50 ? 'bg-[#5F9E6B]' : 'bg-slate-200'}`}>
                  {generationProgress >= 50 && <span className="text-white text-xs">✓</span>}
                </div>
                <span>Calcul des émissions</span>
              </div>
              <div className={`flex items-center gap-2 text-sm ${generationProgress >= 85 ? 'text-[#5F9E6B]' : 'text-slate-400'}`}>
                <div className={`w-5 h-5 rounded-full flex items-center justify-center ${generationProgress >= 85 ? 'bg-[#5F9E6B]' : 'bg-slate-200'}`}>
                  {generationProgress >= 85 && <span className="text-white text-xs">✓</span>}
                </div>
                <span>Génération des recommandations</span>
              </div>
              <div className={`flex items-center gap-2 text-sm ${generationProgress >= 100 ? 'text-[#5F9E6B]' : 'text-slate-400'}`}>
                <div className={`w-5 h-5 rounded-full flex items-center justify-center ${generationProgress >= 100 ? 'bg-[#5F9E6B]' : 'bg-slate-200'}`}>
                  {generationProgress >= 100 && <span className="text-white text-xs">✓</span>}
                </div>
                <span>Finalisation du rapport</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de rapport - 12 pages avec navigation */}
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

      {/* Avertissement avant génération */}
      <AlertDialog open={showGenerateConfirm} onOpenChange={setShowGenerateConfirm}>
        <AlertDialogContent className="border-t-4 border-t-amber-500 bg-white shadow-2xl">
          <AlertDialogHeader className="sm:text-left">
            <div className="flex items-start gap-3">
              <div className="shrink-0 w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-amber-600" />
              </div>
              <div className="flex-1">
                <AlertDialogTitle className="text-amber-600 text-xl">
                  Document préliminaire
                </AlertDialogTitle>
                <AlertDialogDescription className="space-y-3 text-left mt-2 text-slate-700">
                  <span className="block">
                    Ce rapport est généré automatiquement par intelligence artificielle à partir
                    de vos données saisies dans le module Collecte de données.
                  </span>
                  <span className="block">
                    Il sera vérifié et validé par un expert en comptabilité carbone avant de vous
                    être transmis par e-mail dans sa version définitive.
                  </span>
                </AlertDialogDescription>
              </div>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-[#4C7D7F] hover:bg-[#5F9E6B] text-white"
              onClick={() => generateReport(organizationId, referenceYear)}
            >
              Générer le rapport
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>

  );
};
