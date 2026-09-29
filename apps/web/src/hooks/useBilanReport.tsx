import { useState } from 'react';
import { BilanCarboneCalculator } from '@/lib/calculators/BilanCarboneCalculator';
import { api } from "@/integrations/api/client";

export const useBilanReport = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [reportData, setReportData] = useState<any>(null);
  const [showReport, setShowReport] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generationStep, setGenerationStep] = useState('');
  const [organizationId, setOrganizationId] = useState<string>('');
  const [year, setYear] = useState<number>(new Date().getFullYear());

  const generateReport = async (orgId: string, reportYear: number) => {
    if (!orgId) {
      throw new Error('Organisation introuvable. Reconnectez-vous pour générer le rapport.');
    }
    setIsGenerating(true);
    setGenerationProgress(0);
    setGenerationStep('Initialisation...');
    setOrganizationId(orgId);
    setYear(reportYear);
    
    try {
      // Étape 1: Analyse des données
      setGenerationStep('📊 Analyse des données d\'activité...');
      setGenerationProgress(15);
      await new Promise(resolve => setTimeout(resolve, 600));
      
      // 1. Calculer le bilan depuis activity_data
      const periodStart = `${reportYear}-01-01`;
      const periodEnd = `${reportYear}-12-31`;
      
      setGenerationStep('🔢 Calcul des émissions Scope 1, 2 et 3...');
      setGenerationProgress(30);
      
      const bilanCalculated = await BilanCarboneCalculator.calculate(
        orgId,
        periodStart,
        periodEnd
      );

      setGenerationStep('🏢 Récupération des informations entreprise...');
      setGenerationProgress(50);
      await new Promise(resolve => setTimeout(resolve, 400));

      // 2. Récupérer les infos de l'organisation via l'API
      const [{ organization: org }, sitesResult, profileResult] = await Promise.all([
        api.getOrganization(),
        api.listSites().catch(() => ({ items: [] as Array<Record<string, unknown>> })),
        api.getProfile().catch(() => ({ profile: null })),
      ]);
      const sites = sitesResult.items || [];
      const profile = (profileResult.profile ?? null) as {
        company_name?: string | null;
        sector?: string | null;
        company_size?: string | null;
      } | null;
      const employeesFromSites = sites.reduce(
        (total, site) => total + (Number(site.employees_count ?? site.employees) || 0),
        0,
      );
      const surfaceFromSites = sites.reduce(
        (total, site) => total + (Number(site.surface_m2 ?? site.surface) || 0),
        0,
      );

      setGenerationStep('📈 Analyse des postes d\'émission...');
      setGenerationProgress(70);
      await new Promise(resolve => setTimeout(resolve, 500));

      // 4. Préparer les données pour le rapport
      // Préparer les données au format CompactEmpreinteProduitReport
      const companyName = org?.name || profile?.company_name || 'Organisation';
      const sector = org?.sector || profile?.sector || 'Services';
      const employees = employeesFromSites || org?.employees || (profile?.company_size === '1-10' ? 5 : 20);
      const siteCount = sites.length || 1;
      const surface = surfaceFromSites || org?.totalSurface || 180;

      const formData = {
        company_name: companyName,
        companyName: companyName,
        sector,
        secteur_activite: sector,
        employees,
        nb_employes: employees,
        sites: siteCount,
        nb_sites: siteCount,
        surface,
        annee_etude: reportYear.toString(),
        revenue: org?.annualRevenue,
        organization_id: orgId
      };

      const emissionsResult = {
        scope1: bilanCalculated.scope1,
        scope2: bilanCalculated.scope2,
        scope3: bilanCalculated.scope3,
        total: bilanCalculated.totalEmissions,
        categoryBreakdown: bilanCalculated.breakdown.map((item: any) => ({
          name: item.category,
          value: item.emissions
        }))
      };

      const companyInfo = {
        companyName: companyName,
        name: companyName,
        sector: sector,
        employees: employees.toString(),
        studiedYear: reportYear.toString(),
        logo: org?.logoUrl
      };

      setGenerationStep('✨ Génération des recommandations...');
      setGenerationProgress(85);
      await new Promise(resolve => setTimeout(resolve, 600));

      setGenerationStep('📄 Finalisation du rapport...');
      setGenerationProgress(95);
      await new Promise(resolve => setTimeout(resolve, 400));

      setGenerationProgress(100);
      setGenerationStep('✅ Rapport généré avec succès !');
      await new Promise(resolve => setTimeout(resolve, 300));

      setReportData({ formData, emissionsResult, companyInfo });
      setShowReport(true);

      return { formData, emissionsResult, companyInfo };
      
    } catch (error) {
      console.error('Erreur génération rapport:', error);
      throw error;
    } finally {
      setIsGenerating(false);
    }
  };

  const closeReport = () => {
    setShowReport(false);
    setReportData(null);
    setGenerationProgress(0);
    setGenerationStep('');
  };

  return {
    isGenerating,
    reportData,
    showReport,
    generationProgress,
    generationStep,
    organizationId,
    year,
    generateReport,
    closeReport
  };
};
