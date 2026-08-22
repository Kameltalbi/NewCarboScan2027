
import React, { useState, useEffect } from 'react';
import { logger } from '@/utils/logger';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { api } from "@/integrations/api/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { FileText, Calendar, Zap, Building, Car } from "lucide-react";
import { BilanStatusBadge, BilanWorkflowActions } from '@/components/bilan-carbone/BilanStatusBadge';
import { BilanWorkflowInfo, BilanStatus } from '@/lib/services/BilanWorkflowService';
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";

interface BilanData {
  id: string;
  total_emission: number;
  scope1_emission: number;
  scope2_emission: number;
  scope3_emission: number;
  date_creation: string;
  questionnaire_data?: any;
  status?: BilanStatus;
  revision_count?: number;
  max_revisions?: number;
  reference_year?: number;
  
}

export const MesBilans: React.FC = () => {
  const [bilans, setBilans] = useState<BilanData[]>([]);
  const [loading, setLoading] = useState(true);
  const [workflowInfos, setWorkflowInfos] = useState<Record<string, BilanWorkflowInfo>>({});
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation();

  useEffect(() => {
    if (user) {
      fetchBilans();
    }
  }, [user]);

  const fetchBilans = async () => {
    try {
      const { items } = await api.listBilans();
      const data = (items || []).map((row) => ({
        id: String(row.id),
        total_emission: Number(row.total_emission ?? row.total_kgco2e ?? 0),
        scope1_emission: Number(row.scope1_emission ?? row.scope1_kgco2e ?? 0),
        scope2_emission: Number(row.scope2_emission ?? row.scope2_kgco2e ?? 0),
        scope3_emission: Number(row.scope3_emission ?? row.scope3_kgco2e ?? 0),
        date_creation: String(row.created_at ?? row.date_bilan ?? ''),
        questionnaire_data: row.questionnaire_data,
        status: (row.status as BilanStatus) || 'draft',
        reference_year: row.year != null ? Number(row.year) : undefined,
      }));

      const infos: Record<string, BilanWorkflowInfo> = {};
      for (const bilan of data) {
        infos[bilan.id] = {
          found: true,
          id: bilan.id,
          status: bilan.status,
          can_edit: bilan.status === 'draft' || bilan.status === 'revision',
          can_submit: bilan.status === 'draft',
          can_request_revision: bilan.status === 'validated',
          reference_year: bilan.reference_year,
        };
      }
      setWorkflowInfos(infos);
      setBilans(data);
    } catch (error) {
      console.error('Erreur lors du chargement des bilans:', error);
      toast({
        title: t("assessment.messages.error"),
        description: t("assessment.messages.loadError"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatEmission = (value: number) => {
    if (value >= 1000) {
      return `${(value / 1000).toFixed(1)} t CO₂e`;
    }
    return `${value.toFixed(0)} kg CO₂e`;
  };

  const getScopeColor = (scope: string) => {
    switch (scope) {
      case 'scope1':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'scope2':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'scope3':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const handleConsulterRapport = (bilan: BilanData) => {
    try {
      logger.debug('Consultation rapport pour bilan:', bilan);
      
      // Vérification des données requises
      if (!bilan) {
        toast({
          title: t("assessment.messages.error"),
          description: t("assessment.messages.missingData"),
          variant: "destructive",
        });
        return;
      }

      // Préparer les données du formulaire (même si questionnaire_data est null)
      const formData = bilan.questionnaire_data || {
        companyName: "Mon Entreprise",
        activitySector: "Non spécifié",
        employeeCount: 1,
        totalEmissions: bilan.total_emission
      };

      // Préparer les données d'émissions
      const emissionsResult = {
        totalEmissions: bilan.total_emission || 0,
        scope1: bilan.scope1_emission || 0,
        scope2: bilan.scope2_emission || 0,
        scope3: bilan.scope3_emission || 0,
        categoryBreakdown: [
          { name: 'Combustibles et chauffage (Scope 1)', value: bilan.scope1_emission || 0, scope: 1 },
          { name: 'Électricité (Scope 2)', value: bilan.scope2_emission || 0, scope: 2 },
          { name: 'Transport et autres (Scope 3)', value: bilan.scope3_emission || 0, scope: 3 }
        ],
        majorityScope: (bilan.scope1_emission || 0) > (bilan.scope2_emission || 0) && (bilan.scope1_emission || 0) > (bilan.scope3_emission || 0) ? 1 :
                      (bilan.scope2_emission || 0) > (bilan.scope3_emission || 0) ? 2 : 3,
        categories: {
          energy: bilan.scope2_emission || 0,
          transport: bilan.scope3_emission || 0,
          fuel: bilan.scope1_emission || 0,
        }
      };

      logger.debug('Navigation vers rapport avec données:', { formData, emissionsResult });

      // Navigation vers la page de rapport
      navigate('/empreinte-produit-report', {
        state: {
          formData,
          emissionsResult
        }
      });

      // Removed persistent loading notification

    } catch (error) {
      console.error('Erreur lors de la consultation du rapport:', error);
      toast({
        title: t("assessment.messages.error"),
        description: t("assessment.messages.consultError"),
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex-1 p-6 lg:p-8 bg-gray-50 min-h-screen">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 lg:p-8 bg-gray-50 min-h-screen">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{t("assessment.title")}</h1>
          <p className="text-gray-600">
            {t("assessment.subtitle")}
          </p>
        </div>

        {bilans.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <FileText className="h-16 w-16 mx-auto text-gray-400 mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {t("assessment.empty.title")}
              </h3>
              <p className="text-gray-600 mb-6">
                {t("assessment.empty.description")}
              </p>
              <Button onClick={() => navigate('/carbo-start/questionnaire')}>
                {t("assessment.empty.button")}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {bilans.map((bilan) => (
              <Card 
                key={bilan.id} 
                className="hover:shadow-md transition-shadow"
              >
                <CardContent className="p-6 space-y-3">
                  {/* Status badge */}
                  <BilanStatusBadge 
                    status={bilan.status || 'draft'} 
                    revisionCount={bilan.revision_count || 0}
                    maxRevisions={bilan.max_revisions || 2}
                  />

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="bg-primary/10 p-3 rounded-lg">
                        <FileText className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <div className="flex items-center space-x-2 mb-1">
                          <Calendar className="h-4 w-4 text-gray-500" />
                          <span className="text-sm text-gray-600">
                            {bilan.reference_year ? `Année ${bilan.reference_year}` : format(new Date(bilan.date_creation), 'dd MMMM yyyy', { locale: fr })}
                          </span>
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {t("assessment.card.title")} - {formatEmission(bilan.total_emission)}
                        </h3>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-4">
                      <div className="flex space-x-2">
                        <Badge variant="outline" className={getScopeColor('scope1')}>
                          <Building className="h-3 w-3 mr-1" />
                          {t("assessment.scopes.scope1")}: {formatEmission(bilan.scope1_emission)}
                        </Badge>
                        <Badge variant="outline" className={getScopeColor('scope2')}>
                          <Zap className="h-3 w-3 mr-1" />
                          {t("assessment.scopes.scope2")}: {formatEmission(bilan.scope2_emission)}
                        </Badge>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => handleConsulterRapport(bilan)}>
                        {t("assessment.actions.consult")}
                      </Button>
                    </div>
                  </div>

                  {/* Workflow actions */}
                  {workflowInfos[bilan.id]?.found && (
                    <BilanWorkflowActions
                      bilanId={bilan.id}
                      userId={user?.id || ''}
                      workflowInfo={workflowInfos[bilan.id]}
                      onStatusChange={fetchBilans}
                    />
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
