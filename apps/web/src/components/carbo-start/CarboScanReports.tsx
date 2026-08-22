
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase, sessionAuth} from "@/integrations/api/client";
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  FileText, 
  Eye, 
  Calendar, 
  TrendingUp, 
  BarChart3,
  Leaf,
  Clock,
  Plus
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface BilanCarbone {
  id: string;
  date_creation: string;
  total_emission: number;
  scope1_emission: number;
  scope2_emission: number;
  scope3_emission: number;
  questionnaire_data?: any;
  analyse_commentaire?: string;
  fichier_pdf?: string;
}

export const CarboScanReports: React.FC = () => {
  const [bilans, setBilans] = useState<BilanCarbone[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { t } = useTranslation();

  useEffect(() => {
    fetchBilans();
  }, []);

  const fetchBilans = async () => {
    try {
      const { data: { user } } = await sessionAuth.getUser();
      
      if (!user) {
        toast({
          title: t("assessment.messages.error"),
          description: t("assessment.reports.mustBeLoggedIn"),
          variant: "destructive"
        });
        return;
      }

      const { data, error } = await supabase
        .from('bilans_carbone')
        .select('*')
        .eq('user_id', user.id)
        .order('date_creation', { ascending: false });

      if (error) {
        console.error('Erreur récupération bilans:', error);
        toast({
          title: t("assessment.messages.error"),
          description: t("assessment.reports.retrieveError"),
          variant: "destructive"
        });
        return;
      }

      setBilans(data || []);
    } catch (error) {
      console.error('Erreur:', error);
      toast({
        title: t("assessment.messages.error"),
        description: t("assessment.messages.unexpectedError"),
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getDominantScope = (bilan: BilanCarbone) => {
    const scopes = [
      { name: 'Scope 1', value: bilan.scope1_emission, color: 'bg-red-100 text-red-800' },
      { name: 'Scope 2', value: bilan.scope2_emission, color: 'bg-orange-100 text-orange-800' },
      { name: 'Scope 3', value: bilan.scope3_emission, color: 'bg-blue-100 text-blue-800' }
    ];
    
    return scopes.reduce((max, scope) => scope.value > max.value ? scope : max);
  };

  const formatEmission = (value: number) => {
    if (value >= 1000) {
      return `${(value / 1000).toFixed(1)} t CO₂e`;
    }
    return `${value.toFixed(0)} kg CO₂e`;
  };

  const handleConsulterRapport = (bilan: BilanCarbone) => {
    if (!bilan || !bilan.questionnaire_data) {
      toast({
        title: t("assessment.messages.error"),
        description: t("assessment.messages.missingData"),
        variant: "destructive"
      });
      return;
    }

    // Préparer les données pour la page de rapport
    const formData = bilan.questionnaire_data;
    const emissionsResult = {
      totalEmissions: bilan.total_emission,
      scope1: bilan.scope1_emission,
      scope2: bilan.scope2_emission,
      scope3: bilan.scope3_emission,
      categoryBreakdown: bilan.questionnaire_data.categoryBreakdown || [],
      majorityScope: bilan.scope1_emission > bilan.scope2_emission && bilan.scope1_emission > bilan.scope3_emission ? 1 :
                     bilan.scope2_emission > bilan.scope3_emission ? 2 : 3
    };

    // Navigation vers la page de rapport avec les données
    navigate('/empreinte-produit-report', {
      state: {
        formData,
        emissionsResult
      }
    });
  };

  if (isLoading) {
    return (
      <div className="flex-1 p-8 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin h-8 w-8 border border-primary border-t-transparent rounded-full" />
            <span className="ml-3 text-gray-600">{t("assessment.reports.loading")}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-8 bg-gray-50">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{t("assessment.reports.title")}</h1>
              <p className="text-gray-600">
                {t("assessment.reports.subtitle")}
              </p>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <FileText className="h-4 w-4" />
              <span>{bilans.length} {t("assessment.reports.count", { count: bilans.length })}</span>
            </div>
          </div>
        </div>

        {/* Statistiques rapides */}
        {bilans.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">{t("assessment.reports.totalEmissions")}</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {formatEmission(bilans.reduce((sum, bilan) => sum + bilan.total_emission, 0))}
                    </p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-primary" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">{t("assessment.reports.lastMeasurement")}</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {formatEmission(bilans[0]?.total_emission || 0)}
                    </p>
                  </div>
                  <BarChart3 className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">{t("assessment.reports.emissionsPerEmployee")}</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {bilans[0]?.questionnaire_data?.employeeCount 
                        ? formatEmission(bilans[0].total_emission / bilans[0].questionnaire_data.employeeCount)
                        : '---'
                      }
                    </p>
                  </div>
                  <Leaf className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Liste des rapports */}
        {bilans.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {t("assessment.reports.empty.title")}
              </h3>
              <p className="text-gray-600 mb-6">
                {t("assessment.reports.empty.description")}
              </p>
              <Button onClick={() => navigate('/app/collecte')}>
                <BarChart3 className="h-4 w-4 mr-2" />
                {t("assessment.reports.empty.button")}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Bouton pour créer un nouveau rapport */}
            <Card className="bg-gradient-to-r from-[#5F9E6B]/10 to-[#4C7D7F]/10 border-[#5F9E6B]/20">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-slate-900 mb-1">
                      {t("assessment.reports.newReport.title")}
                    </h3>
                    <p className="text-sm text-slate-600">
                      {t("assessment.reports.newReport.description")}
                    </p>
                  </div>
                  <Button 
                    onClick={() => navigate('/app/bilan-carbone')}
                    className="bg-[#5F9E6B] hover:bg-[#4A7D56] text-white"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    {t("assessment.reports.newReport.button")}
                  </Button>
                </div>
              </CardContent>
            </Card>
            {bilans.map((bilan) => {
              const dominantScope = getDominantScope(bilan);
              
              return (
                <Card key={bilan.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-primary/10 rounded-lg">
                          <FileText className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">
                            {t("assessment.card.title")} - {format(new Date(bilan.date_creation), 'MMMM yyyy', { locale: fr })}
                          </CardTitle>
                          <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              <span>{format(new Date(bilan.date_creation), 'dd MMMM yyyy', { locale: fr })}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              <span>{format(new Date(bilan.date_creation), 'HH:mm', { locale: fr })}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <Badge variant="secondary" className={dominantScope.color}>
                        {dominantScope.name} {t("assessment.reports.dominant")}
                      </Badge>
                    </div>
                  </CardHeader>
                  
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                      {/* Total des émissions */}
                      <div className="text-center p-4 bg-gray-50 rounded-lg">
                        <p className="text-sm font-medium text-gray-600 mb-1">{t("assessment.reports.total")}</p>
                        <p className="text-xl font-bold text-gray-900">
                          {formatEmission(bilan.total_emission)}
                        </p>
                      </div>

                      {/* Scope 1 */}
                      <div className="text-center p-4 bg-red-50 rounded-lg">
                        <p className="text-sm font-medium text-red-700 mb-1">{t("assessment.scopes.scope1")}</p>
                        <p className="text-lg font-semibold text-red-800">
                          {formatEmission(bilan.scope1_emission)}
                        </p>
                        <p className="text-xs text-red-600">
                          {((bilan.scope1_emission / bilan.total_emission) * 100).toFixed(1)}%
                        </p>
                      </div>

                  {/* Scope 2 */}
                  <div className="text-center p-4 bg-orange-50 rounded-lg">
                    <p className="text-sm font-medium text-orange-700 mb-1">Scope 2</p>
                    <p className="text-lg font-semibold text-orange-800">
                      {formatEmission(bilan.scope2_emission)}
                    </p>
                    <p className="text-xs text-orange-600">
                      {((bilan.scope2_emission / bilan.total_emission) * 100).toFixed(1)}%
                    </p>
                  </div>

                  {/* Scope 3 - Seulement si le plan l'autorise */}
                  {bilan.scope3_emission > 0 && (
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <p className="text-sm font-medium text-blue-700 mb-1">Scope 3</p>
                      <p className="text-lg font-semibold text-blue-800">
                        {formatEmission(bilan.scope3_emission)}
                      </p>
                      <p className="text-xs text-blue-600">
                        {((bilan.scope3_emission / bilan.total_emission) * 100).toFixed(1)}%
                      </p>
                    </div>
                  )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-between pt-4 border-t">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        {bilan.questionnaire_data?.employeeCount && (
                          <span>
                            {bilan.questionnaire_data.employeeCount} employé{bilan.questionnaire_data.employeeCount > 1 ? 's' : ''}
                          </span>
                        )}
                        {bilan.questionnaire_data?.activitySector && (
                          <>
                            <span>•</span>
                            <span>{bilan.questionnaire_data.activitySector}</span>
                          </>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleConsulterRapport(bilan)}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          Consulter votre rapport
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
