// Page principale du module Bilan Carbone - flux unifié activity_data

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useOrganizationData } from '@/hooks/useOrganizationData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { api } from '@/integrations/api/client';
import { BilanCarboneCalculator } from '@/lib/calculators/BilanCarboneCalculator';
import { 
  Loader2, 
  AlertCircle, 
  Plus, 
  Settings, 
  BarChart3, 
  FileText, 
  Download,
  Calendar,
  Database,
  Clock,
  CheckCircle2,
  Copy,
  Eye,
  FileWarning,
  Save
} from 'lucide-react';

type BilanStatus = 'brouillon' | 'en_cours' | 'calcule' | 'verrouille';

interface BilanData {
  id: string;
  year: number;
  status: BilanStatus;
  totalEmissions: number;
  scope1: number;
  scope2: number;
  scope3: number;
  lastUpdated: string;
  calculatedAt?: string;
}

interface DataInfo {
  source: string;
  periodStart: string;
  periodEnd: string;
  completionRate: number;
  lastUpdated: string;
}

const STATUS_CONFIG: Record<BilanStatus, { label: string; color: string; bgColor: string }> = {
  brouillon: { label: 'Brouillon', color: 'text-gray-600', bgColor: 'bg-gray-100' },
  en_cours: { label: 'En cours', color: 'text-blue-600', bgColor: 'bg-blue-100' },
  calcule: { label: 'Calculé', color: 'text-emerald-600', bgColor: 'bg-emerald-100' },
  verrouille: { label: 'Verrouillé', color: 'text-purple-600', bgColor: 'bg-purple-100' },
};

export const BilanOverview: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { organizationId, referenceYear, loading: orgLoading } = useOrganizationData();
  const [loading, setLoading] = useState(true);
  const [currentBilan, setCurrentBilan] = useState<BilanData | null>(null);
  const [recentBilans, setRecentBilans] = useState<BilanData[]>([]);
  const [dataInfo, setDataInfo] = useState<DataInfo | null>(null);

  useEffect(() => {
    if (user && organizationId && !orgLoading) {
      loadData();
    }
  }, [user, organizationId, orgLoading, referenceYear]);

  const loadData = async () => {
    if (!organizationId) return;
    
    try {
      setLoading(true);

      // Calculer le bilan actuel depuis activity_data (flux unifié)
      const periodStart = `${referenceYear}-01-01`;
      const periodEnd = `${referenceYear}-12-31`;
      
      const bilanCalculated = await BilanCarboneCalculator.calculate(
        organizationId,
        periodStart,
        periodEnd
      );

      if (bilanCalculated.totalEmissions > 0) {
        setCurrentBilan({
          id: 'current', // Pas d'ID car calculé en direct
          year: referenceYear,
          status: 'calcule',
          totalEmissions: bilanCalculated.totalEmissions,
          scope1: bilanCalculated.scope1,
          scope2: bilanCalculated.scope2,
          scope3: bilanCalculated.scope3,
          lastUpdated: new Date().toISOString(),
          calculatedAt: new Date().toISOString(),
        });
      }

      // Charger l'historique des snapshots (bilans figés)
      const { items: bilans } = await api.listBilans();

      if (bilans && bilans.length > 0) {
        setRecentBilans((bilans || []).slice(0, 5).map(b => ({
          id: String(b.id),
          year: Number(b.year) || new Date(String(b.date_bilan || b.created_at)).getFullYear(),
          status: 'verrouille' as BilanStatus,
          totalEmissions: Number(b.total_emission ?? b.total_kgco2e ?? 0) || 0,
          scope1: Number(b.scope1_emission ?? 0) || 0,
          scope2: Number(b.scope2_emission ?? 0) || 0,
          scope3: Number(b.scope3_emission ?? 0) || 0,
          lastUpdated: String(b.updated_at ?? b.created_at ?? ''),
          calculatedAt: String(b.date_bilan ?? b.created_at ?? ''),
        })));
      }

      // Info sur la source des données
      setDataInfo({
        source: 'Collecte de données (activity_data)',
        periodStart,
        periodEnd,
        completionRate: bilanCalculated.totalEmissions > 0 ? 100 : 0,
        lastUpdated: new Date().toISOString(),
      });

    } catch (error) {
      console.error('Error loading bilan data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const hasData = currentBilan && currentBilan.totalEmissions > 0;
  const bilanStatus = currentBilan?.status || 'brouillon';
  const statusConfig = STATUS_CONFIG[bilanStatus];

  if (loading || orgLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* 1. Bilan actuel (calculé depuis activity_data) */}
      <Card className="bg-white border-[#E5E5E5] rounded-xl shadow-sm border-l-4 border-l-[#5F9E6B]">
        <CardContent className="py-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-slate-900">
                  Bilan Carbone – Année {currentBilan?.year || referenceYear}
                </h1>
                <Badge className="bg-[#87C6A0]/20 text-[#5F9E6B] border-[#87C6A0]/50">
                  {hasData ? 'Calculé' : 'En attente de données'}
                </Badge>
              </div>
              <p className="text-muted-foreground text-sm max-w-2xl">
                Bilan calculé automatiquement à partir de vos données de collecte (activity_data).
              </p>
            </div>
            <div className="flex items-center gap-2">
              {hasData && (
                <Button 
                  onClick={async () => {
                    // Créer un snapshot dans bilans_carbone
                    if (!user?.id || !currentBilan) return;
                    
                    try {
                      await api.createBilan({
                        dateBilan: new Date().toISOString(),
                        year: new Date().getFullYear(),
                        totalEmission: currentBilan.totalEmissions,
                        scope1Emission: currentBilan.scope1,
                        scope2Emission: currentBilan.scope2,
                        scope3Emission: currentBilan.scope3,
                      });
                      alert('✅ Snapshot créé avec succès !');
                      loadData();
                    } catch (err) {
                      console.error('Erreur création snapshot:', err);
                    }
                  }}
                  variant="outline" 
                  size="sm"
                  className="border-[#5F9E6B] text-[#5F9E6B] hover:bg-[#5F9E6B]/10"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Créer un snapshot
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={() => navigate('/app/collecte')}>
                <Database className="h-4 w-4 mr-2" />
                Modifier les données
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 2. KPIs - Palette verte */}
      {hasData ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-[#5F9E6B] border-[#5F9E6B] rounded-xl shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-white/90 flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Total
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white">
                {currentBilan.totalEmissions.toFixed(1)}
              </div>
              <p className="text-xs text-white/80 mt-1">t CO₂e</p>
            </CardContent>
          </Card>

          <Card className="bg-white border-[#E5E5E5] rounded-xl shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Scope 1</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-[#5F9E6B]">{currentBilan.scope1.toFixed(1)}</div>
              <p className="text-xs text-muted-foreground">
                {currentBilan.totalEmissions > 0 
                  ? `${((currentBilan.scope1 / currentBilan.totalEmissions) * 100).toFixed(0)}% du total`
                  : 't CO₂e'}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white border-[#E5E5E5] rounded-xl shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Scope 2</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-[#4C7D7F]">{currentBilan.scope2.toFixed(1)}</div>
              <p className="text-xs text-muted-foreground">
                {currentBilan.totalEmissions > 0 
                  ? `${((currentBilan.scope2 / currentBilan.totalEmissions) * 100).toFixed(0)}% du total`
                  : 't CO₂e'}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white border-[#E5E5E5] rounded-xl shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Scope 3</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-[#87C6A0]">{currentBilan.scope3.toFixed(1)}</div>
              <p className="text-xs text-muted-foreground">
                {currentBilan.totalEmissions > 0 
                  ? `${((currentBilan.scope3 / currentBilan.totalEmissions) * 100).toFixed(0)}% du total`
                  : 't CO₂e'}
              </p>
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card className="border-2 border-dashed border-amber-300 bg-amber-50/50">
          <CardContent className="py-8">
            <div className="flex flex-col items-center text-center gap-4">
              <div className="h-12 w-12 rounded-full bg-amber-100 flex items-center justify-center">
                <FileWarning className="h-6 w-6 text-amber-600" />
              </div>
              <div className="space-y-1">
                <h3 className="font-semibold text-foreground">Données insuffisantes pour une analyse complète</h3>
                <p className="text-sm text-muted-foreground max-w-md">
                  Complétez la collecte de données pour obtenir votre bilan carbone.
                </p>
              </div>
              <Button onClick={() => navigate('/app/collecte')} className="mt-2">
                <Plus className="h-4 w-4 mr-2" />
                Compléter la collecte
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions block removed - now in HorizontalNav */}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 4. Data Usage Information Block */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Database className="h-5 w-5" />
              Données utilisées pour le calcul
            </CardTitle>
          </CardHeader>
          <CardContent>
            {dataInfo ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Source</p>
                    <p className="text-sm font-medium">{dataInfo.source}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Période couverte</p>
                    <p className="text-sm font-medium">
                      {formatDate(dataInfo.periodStart)} - {formatDate(dataInfo.periodEnd)}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Taux de complétude</p>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary rounded-full transition-all"
                          style={{ width: `${dataInfo.completionRate}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium">{dataInfo.completionRate}%</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Dernière mise à jour</p>
                    <p className="text-sm font-medium flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDate(dataInfo.lastUpdated)}
                    </p>
                  </div>
                </div>

                <Separator />

                <p className="text-xs text-muted-foreground">
                  Les données utilisées proviennent du module Collecte de données.
                </p>

                <Button variant="outline" size="sm" onClick={() => navigate('/app/collecte')}>
                  Voir les données collectées
                </Button>
              </div>
            ) : (
              <div className="text-center py-6">
                <AlertCircle className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
                <p className="text-sm text-muted-foreground mb-4">Aucune donnée collectée</p>
                <Button variant="outline" size="sm" onClick={() => navigate('/app/collecte')}>
                  Commencer la collecte
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 5. Recent History Block */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Derniers bilans carbone
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentBilans.length > 0 ? (
              <div className="space-y-3">
                {recentBilans.map((bilan) => {
                  const config = STATUS_CONFIG[bilan.status];
                  return (
                    <div 
                      key={bilan.id} 
                      className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="text-lg font-bold">{bilan.year}</div>
                        <Badge className={`${config.bgColor} ${config.color} border-0`}>
                          {config.label}
                        </Badge>
                        {bilan.calculatedAt && (
                          <span className="text-xs text-muted-foreground">
                            Calculé le {formatDate(bilan.calculatedAt)}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" onClick={() => navigate(`/app/bilan-carbone/resultats?id=${bilan.id}`)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-6">
                <FileText className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Aucun bilan carbone n'a encore été finalisé.
                </p>
              </div>
            )}

            <Separator className="my-4" />

            <Button 
              variant="outline" 
              className="w-full" 
              onClick={() => navigate('/app/bilan-carbone/bilans')}
            >
              Voir tout l'historique
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
