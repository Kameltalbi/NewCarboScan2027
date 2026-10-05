// Page d'accueil du module Bilan Carbone - flux unifié activity_data
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Database, ArrowRight, FileText, BarChart3, Plus, TrendingUp, Calendar } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useOrganizationData } from '@/hooks/useOrganizationData';
import { BilanCarboneCalculator } from '@/lib/calculators/BilanCarboneCalculator';
import { api } from "@/integrations/api/client";
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
import { DataMethodShare } from './DataMethodShare';
import { UncertaintyPanel } from './UncertaintyPanel';
import { ReductionTrajectoryCard } from './ReductionTrajectoryCard';
import { SiteRollupCard } from './SiteRollupCard';
import { IntensityCard } from './IntensityCard';


export const BilanCarboneHome: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { organizationId, referenceYear, loading: orgLoading } = useOrganizationData();
  const [bilanData, setBilanData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [closing, setClosing] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

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
  }, [organizationId, orgLoading, referenceYear, user, reloadKey]);

  // Fonction pour sauvegarder le bilan dans l'historique
  const saveBilanToHistory = async (bilanData: any, orgId: string, year: number) => {
    try {
      // Vérifier si un bilan existe déjà pour cette année
      const { items } = await api.listBilans();
      const existing = (items || []).find((b: any) => Number(b.year) === year) as any;

      if (existing && (existing.status === 'submitted' || existing.status === 'validated')) {
        return;
      }

      const bilanRecord = {
        year,
        status: existing ? existing.status : 'draft',
        totalEmission: bilanData.totalEmissions / 1000,
        scope1Emission: bilanData.scope1 / 1000,
        scope2Emission: bilanData.scope2 / 1000,
        scope3Emission: bilanData.scope3 / 1000,
        dateBilan: `${year}-12-31`,
        questionnaireData: {
          year,
          calculatedFrom: 'activity_data',
          timestamp: new Date().toISOString()
        }
      };

      if (existing) {
        await api.patchBilan(existing.id, bilanRecord);
      } else {
        await api.createBilan(bilanRecord);
      }
    } catch (error) {
      console.error('Erreur sauvegarde bilan historique:', error);
    }
  };

  const closeBilan = async () => {
    if (!organizationId || !bilanData?.detailedBreakdown?.length) {
      toast.error("Ce bilan n'a pas de lignes à figer.");
      return;
    }
    setClosing(true);
    try {
      const year = referenceYear;
      const { items } = await api.listBilans();
      let existing = (items || []).find((b: any) => Number(b.year) === year) as any;
      if (!existing) {
        const created = await api.createBilan({
          year,
          name: `Bilan ${year}`,
          status: "draft",
          totalEmission: bilanData.totalEmissions / 1000,
          scope1Emission: bilanData.scope1 / 1000,
          scope2Emission: bilanData.scope2 / 1000,
          scope3Emission: bilanData.scope3 / 1000,
          dateBilan: `${year}-12-31`,
        });
        existing = created.bilan;
      }
      const lines = bilanData.detailedBreakdown.map((line: any, index: number) => ({
        lineKey: `${line.scope}:${line.category}:${line.subcategory}:${index}`.slice(0, 200),
        name: line.subcategory || line.category || `Ligne ${index + 1}`,
        category: line.category || "other",
        scope: line.scope,
        quantity: Number(line.quantity) || 0,
        activityUnit: line.unit || "unité",
        factorValue: Number(line.emissionFactor) || 0,
        factorUnit: line.emissionFactorUnit || "kgCO2e",
        factorSource: line.emissionFactorSource || "Non trouvé",
        factorName: line.subcategory || line.category || `Ligne ${index + 1}`,
        resultKgCo2e: Number(line.emissions) || 0,
      }));
      await api.closeBilan(existing.id, {
        periodStart: `${year}-01-01`,
        periodEnd: `${year}-12-31`,
        lines,
      });
      toast.success("Bilan clôturé. Les facteurs utilisés sont conservés.");
      setShowCloseConfirm(false);
      setReloadKey((value) => value + 1);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Impossible de clôturer le bilan.");
    } finally {
      setClosing(false);
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
                      {bilanData.frozen
                        ? `Clôturé${bilanData.frozenAt ? ` le ${new Date(bilanData.frozenAt).toLocaleDateString("fr-FR")}` : ""}`
                        : "Calculé depuis vos données"}
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
                <DataMethodShare
                  lines={(bilanData.detailedBreakdown || []).map((line) => ({
                    method: line.dataMethod,
                    kg: line.emissions,
                    source: line.emissionFactorSource,
                  }))}
                />
                <SiteRollupCard
                  organizationKg={bilanData.totalEmissions}
                  lines={(bilanData.detailedBreakdown || []).map((line) => ({
                    siteId: line.siteId,
                    scope: line.scope,
                    kg: line.emissions,
                  }))}
                />
                <IntensityCard totalKg={bilanData.totalEmissions} />
                <UncertaintyPanel
                  lines={(bilanData.detailedBreakdown || []).map((line) => ({
                    label: line.subcategory,
                    kg: line.emissions,
                    quality: line.dataQuality,
                    uncertaintyPct: line.uncertaintyPct ?? null,
                  }))}
                />
                <ReductionTrajectoryCard />
                {bilanData.frozen && bilanData.detailedBreakdown?.length > 0 && (
                  <ul className="text-xs text-muted-foreground space-y-1 pt-2 max-w-xl">
                    {bilanData.detailedBreakdown.slice(0, 6).map((line: any, index: number) => (
                      <li key={`${line.subcategory}-${index}`}>
                        {line.subcategory} · {line.emissionFactor} {line.emissionFactorUnit} · {line.emissionFactorSource}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              
              <div className="flex flex-col gap-2">
                <Button
                  onClick={() => navigate('/app/bilan-carbone/rapports')}
                  className="bg-[#4C7D7F] hover:bg-[#5F9E6B] text-white"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Générer un rapport
                </Button>
                <p className="text-xs text-muted-foreground max-w-[220px]">
                  PDF, PowerPoint ou Excel. Les émissions financées sont proposées à part.
                </p>
                {!bilanData.frozen && bilanData.detailedBreakdown?.length > 0 && (
                  <Button
                    variant="outline"
                    onClick={() => setShowCloseConfirm(true)}
                    disabled={closing}
                  >
                    Clôturer le bilan
                  </Button>
                )}
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
                {bilanData?.frozen
                  ? "Ce bilan est clôturé. Les facteurs affichés sont ceux enregistrés à la clôture. Une mise à jour du catalogue ne les change pas."
                  : "Votre bilan carbone est calculé à partir des données saisies dans le module Collecte de données. Tant qu'il reste en brouillon, un nouveau calcul reprend les facteurs du moment. La clôture conserve le facteur de chaque ligne."}
              </p>
              <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>Période : {referenceYear}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={showCloseConfirm} onOpenChange={setShowCloseConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clôturer le bilan {referenceYear}</AlertDialogTitle>
            <AlertDialogDescription>
              Les facteurs de chaque ligne sont enregistrés tels qu'ils sont aujourd'hui.
              Une modification ultérieure du catalogue ne changera pas ce bilan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={closing}>Annuler</AlertDialogCancel>
            <AlertDialogAction disabled={closing} onClick={() => void closeBilan()}>
              {closing ? "Clôture..." : "Clôturer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>

  );
};
