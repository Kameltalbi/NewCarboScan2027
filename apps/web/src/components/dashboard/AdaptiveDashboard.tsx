import React, { useState, useEffect, useMemo } from 'react';
import { usePlanAccess } from '@/shared/hooks/usePlanAccess';
import { DashboardLayout } from './DashboardLayout';
import { HeroStyleDashboard } from './HeroStyleDashboard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, CreditCard } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { useOrganizationData } from '@/hooks/useOrganizationData';
import { useOrganizationId } from '@/hooks/useOrganizationId';
import { useOrganizationModules } from '@/hooks/useOrganizationModules';
import { supabase } from "@/integrations/api/client";
import { toast } from 'sonner';
import { WattBimExecutiveDashboard } from '@/modules/wattbim/WattBimExecutiveDashboard';

export const AdaptiveDashboard: React.FC = () => {
  const { userPlan, loading, error } = usePlanAccess();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useAuth();
  const { referenceYear } = useOrganizationData();
  const { organizationId } = useOrganizationId();
  const { hasModule, loading: modulesLoading } = useOrganizationModules();
  const [companyData, setCompanyData] = useState<{ nom_entreprise: string } | null>(null);
  const [loadingCompany, setLoadingCompany] = useState(true);
  const [selectedYear, setSelectedYear] = useState<number>(referenceYear);
  const [lastBilanYear, setLastBilanYear] = useState<number | null>(null);

  // Fetch the year of the most recent bilan to default the dashboard to it
  useEffect(() => {
    const fetchLastBilanYear = async () => {
      if (!user) return;

      // Priorité 1 : année de référence du dernier bilan carbone (par organisation)
      let bilanQuery = supabase
        .from('bilans_carbone')
        .select('reference_year, date_bilan')
        .order('created_at', { ascending: false })
        .limit(1);
      if (organizationId) {
        bilanQuery = bilanQuery.eq('organization_id', organizationId);
      } else {
        bilanQuery = bilanQuery.eq('user_id', user.id);
      }
      const { data: bilanData } = await bilanQuery.maybeSingle();

      if (bilanData) {
        const year = bilanData.reference_year || (bilanData.date_bilan ? new Date(bilanData.date_bilan).getFullYear() : null);
        if (year) {
          setLastBilanYear(year);
          setSelectedYear(year);
          return;
        }
      }

      // Fallback : dernière période avec des données d'activité (par organisation)
      let activityQuery = supabase
        .from('activity_data')
        .select('period_start')
        .order('period_start', { ascending: false })
        .limit(1);
      if (organizationId) {
        activityQuery = activityQuery.eq('organization_id', organizationId);
      }
      const { data: actData } = await activityQuery.maybeSingle();

      if (actData?.period_start) {
        const year = new Date(actData.period_start).getFullYear();
        setLastBilanYear(year);
        setSelectedYear(year);
      }
    };
    fetchLastBilanYear();
  }, [user, organizationId]);

  // Sync selectedYear when referenceYear loads (only if no bilan found yet)
  useEffect(() => {
    if (!lastBilanYear) {
      setSelectedYear(referenceYear);
    }
  }, [referenceYear, lastBilanYear]);

  // Generate available years (2022 to current year)
  const availableYears = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const startYear = 2022;
    const years: number[] = [];
    for (let y = startYear; y <= currentYear; y++) {
      years.push(y);
    }
    return years;
  }, []);

  useEffect(() => {
    const fetchCompanyData = async () => {
      if (!user) return;
      
      try {
        const { data } = await supabase
          .from('companies')
          .select('nom_entreprise')
          .eq('user_id', user.id)
          .limit(1)
          .single();
        
        if (data) {
          setCompanyData(data);
        }
      } catch (error) {
        console.error('Erreur récupération entreprise:', error);
      } finally {
        setLoadingCompany(false);
      }
    };

    fetchCompanyData();
  }, [user]);

  const handleExport = () => {
    toast.info('Export du rapport en cours...');
    navigate('/carbo-start/rapports');
  };

  const handleCompare = () => {
    toast.info('Fonctionnalité de comparaison bientôt disponible');
  };

  // Écran de chargement
  if (loading) {
    return (
      <DashboardLayout title={t("dashboard.adaptive.loading")}>
        <div className="space-y-6">
          <div className="grid md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-4 w-32" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-20 mb-2" />
                  <Skeleton className="h-3 w-24" />
                </CardContent>
              </Card>
            ))}
          </div>
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-48" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-64 w-full" />
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  // Écran d'erreur
  if (error) {
    return (
      <DashboardLayout title={t("dashboard.adaptive.error")}>
        <Card>
          <CardContent className="p-6 text-center">
            <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-red-500" />
            <h3 className="text-lg font-semibold mb-2">
              {t("dashboard.adaptive.cannotLoadPlan")}
            </h3>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={() => window.location.reload()}>
              {t("dashboard.adaptive.retry")}
            </Button>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  // Pas de plan actif
  if (!userPlan.isActive) {
    return (
      <DashboardLayout title={t("dashboard.adaptive.noActivePlan")}>
        <Card>
          <CardContent className="p-8 text-center">
            <CreditCard className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-xl font-semibold mb-2">
              {t("dashboard.adaptive.noActivePlan")}
            </h3>
            <p className="text-muted-foreground mb-6">
              {t("dashboard.adaptive.noActivePlanDesc")}
            </p>
            <div className="space-y-3">
              <Button 
                onClick={() => navigate('/pricing')}
                className="w-full max-w-sm"
                size="lg"
              >
                {t("dashboard.adaptive.choosePlan")}
              </Button>
              <Button 
                variant="outline"
                onClick={() => navigate('/payment')}
                className="w-full max-w-sm"
              >
                {t("dashboard.adaptive.alreadyOrdered")}
              </Button>
            </div>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  // Sélection du dashboard selon les modules actifs
  const getDashboardContent = () => {
    // WattBim est prioritaire : dès qu'il est actif, on affiche le dashboard exécutif énergie.
    // (Le module Bilan Carbone reste accessible depuis la sidebar.)
    if (!modulesLoading && hasModule('wattbim')) {
      return <WattBimExecutiveDashboard />;
    }
    return <HeroStyleDashboard selectedYear={selectedYear} />;
  };


  const getDashboardTitle = () => {
    switch (userPlan.planType) {
      case 'essential':
        return t("dashboard.adaptive.titles.start");
      case 'carbo_pro':
        return t("dashboard.adaptive.titles.complete");
      case 'carbo_expert':
        return t("dashboard.adaptive.titles.pro");
      default:
        return t("dashboard.adaptive.titles.default");
    }
  };

  const getDashboardSubtitle = () => {
    const planType = userPlan.planType === 'carbo_expert' ? 'pro' : 'essential';
    return t(`dashboard.adaptive.subtitles.${planType}`, { planName: userPlan.planName });
  };

  return (
    <DashboardLayout 
      title={getDashboardTitle()}
      subtitle={getDashboardSubtitle()}
      companyName={companyData?.nom_entreprise || undefined}
      period={selectedYear.toString()}
      onExport={handleExport}
      onCompare={handleCompare}
      selectedYear={selectedYear}
      onYearChange={setSelectedYear}
      availableYears={availableYears}
    >
      {getDashboardContent()}
    </DashboardLayout>
  );
};