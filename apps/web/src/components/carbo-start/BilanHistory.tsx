
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { api, getStoredUser } from "@/integrations/api/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { 
  Calendar, 
  BarChart3, 
  TrendingUp,
  Eye,
  FileText
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { RecoverLocalData } from "./RecoverLocalData";

interface BilanData {
  id: string;
  total_emission: number;
  scope1_emission: number;
  scope2_emission: number;
  scope3_emission: number;
  date_bilan: string;
  created_at: string;
  questionnaire_data: any;
}

export const BilanHistory: React.FC = () => {
  const [bilans, setBilans] = useState<BilanData[]>([]);
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { t } = useTranslation();

  useEffect(() => {
    fetchBilans();
  }, []);

  const fetchBilans = async () => {
    try {
      const user = getStoredUser();
      if (!user) return;

      const { items } = await api.listBilans();
      setBilans((items || []) as unknown as BilanData[]);
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setLoading(false);
    }
  };

  const getScopeColor = (scope: 'scope1' | 'scope2' | 'scope3') => {
    switch (scope) {
      case 'scope1': return 'bg-blue-100 text-blue-800';
      case 'scope2': return 'bg-green-100 text-green-800';
      case 'scope3': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'dd MMMM yyyy', { locale: fr });
    } catch {
      return dateString;
    }
  };

  const handleConsulterRapport = (bilan: BilanData) => {
    if (!bilan) {
      toast({
        title: t("assessment.messages.error"),
        description: t("assessment.messages.missingData"),
        variant: "destructive"
      });
      return;
    }

    // Préparer les données pour la page de rapport
    const formData = bilan.questionnaire_data || {};
    const emissionsResult = {
      totalEmissions: bilan.total_emission * 1000, // Convertir tonnes → kg pour les calculs
      scope1: bilan.scope1_emission * 1000,
      scope2: bilan.scope2_emission * 1000,
      scope3: bilan.scope3_emission * 1000,
      categoryBreakdown: [
        { name: 'Énergie', value: bilan.scope2_emission * 1000, scope: 2 },
        { name: 'Transport', value: bilan.scope3_emission * 1000 * 0.6, scope: 3 },
        { name: 'Combustibles', value: bilan.scope1_emission * 1000, scope: 1 },
        { name: 'Achats', value: bilan.scope3_emission * 1000 * 0.4, scope: 3 }
      ],
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

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-32 bg-gray-100 rounded-lg animate-pulse" />
        <div className="h-32 bg-gray-100 rounded-lg animate-pulse" />
        <div className="h-32 bg-gray-100 rounded-lg animate-pulse" />
      </div>
    );
  }

  if (bilans.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <FileText className="h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {t("assessment.empty.title")}
          </h3>
          <p className="text-gray-500 text-center max-w-md">
            {t("assessment.empty.description")}
          </p>
          <Button className="mt-4">
            {t("assessment.empty.button")}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <RecoverLocalData />
      
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">
          {t("assessment.history.title")}
        </h2>
        <Badge variant="secondary" className="text-sm">
          {bilans.length} {t("assessment.history.count", { count: bilans.length })}
        </Badge>
      </div>

      <div className="grid gap-6">
        {bilans.map((bilan, index) => (
          <Card key={bilan.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                    <BarChart3 className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">
                      {t("assessment.history.assessmentNumber", { number: bilans.length - index })}
                    </CardTitle>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Calendar className="h-4 w-4" />
                      <span>{t("assessment.history.completedOn", { date: formatDate(bilan.created_at) })}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-primary">
                    {bilan.total_emission?.toFixed(1) || '0.0'}
                  </div>
                  <div className="text-sm text-gray-500">{t("assessment.units.tonnesCO2e")}</div>
                </div>
              </div>
            </CardHeader>
            
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                  <div>
                    <div className="text-sm font-medium text-blue-900">{t("assessment.scopes.scope1")}</div>
                    <div className="text-xs text-blue-600">{t("assessment.scopes.directEmissions")}</div>
                  </div>
                  <div className="text-lg font-bold text-blue-900">
                    {bilan.scope1_emission?.toFixed(1) || '0.0'}
                  </div>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <div>
                    <div className="text-sm font-medium text-green-900">{t("assessment.scopes.scope2")}</div>
                    <div className="text-xs text-green-600">{t("assessment.scopes.purchasedEnergy")}</div>
                  </div>
                  <div className="text-lg font-bold text-green-900">
                    {bilan.scope2_emission?.toFixed(1) || '0.0'}
                  </div>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                  <div>
                    <div className="text-sm font-medium text-yellow-900">{t("assessment.scopes.scope3")}</div>
                    <div className="text-xs text-yellow-600">{t("assessment.scopes.otherEmissions")}</div>
                  </div>
                  <div className="text-lg font-bold text-yellow-900">
                    {bilan.scope3_emission?.toFixed(1) || '0.0'}
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleConsulterRapport(bilan)}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  {t("assessment.actions.consultReport")}
                </Button>
                <Button variant="outline" size="sm">
                  <TrendingUp className="h-4 w-4 mr-2" />
                  {t("assessment.actions.compare")}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
