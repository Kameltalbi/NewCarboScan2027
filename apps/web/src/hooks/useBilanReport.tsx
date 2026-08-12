import { useState } from 'react';
import { BilanCarboneCalculator } from '@/lib/calculators/BilanCarboneCalculator';
import { supabase } from "@/integrations/api/client";

export const useBilanReport = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [reportData, setReportData] = useState<any>(null);
  const [showReport, setShowReport] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generationStep, setGenerationStep] = useState('');
  const [organizationId, setOrganizationId] = useState<string>('');
  const [year, setYear] = useState<number>(new Date().getFullYear());

  const generateReport = async (orgId: string, reportYear: number) => {
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

      // 2. Récupérer les infos de l'organisation
      const { data: org } = await supabase
        .from('organizations')
        .select('name, sector, country, reference_year')
        .eq('id', orgId)
        .single();

      // 3. Récupérer les infos complémentaires si disponibles
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_name, sector, company_size')
        .eq('id', orgId)
        .maybeSingle();

      const { data: company } = await supabase
        .from('companies')
        .select('nom_entreprise, secteur, collaborateurs, surface_totale, nb_sites, logo_url, ca_annuel')
        .eq('organization_id', orgId)
        .maybeSingle();

      setGenerationStep('📈 Analyse des postes d\'émission...');
      setGenerationProgress(70);
      await new Promise(resolve => setTimeout(resolve, 500));

      // 4. Préparer les données pour le rapport
      // Préparer les données au format CompactEmpreinteProduitReport
      const companyName = org?.name || company?.nom_entreprise || profile?.company_name || 'Organisation';
      const sector = org?.sector || company?.secteur || profile?.sector || 'Services';
      const employees = company?.collaborateurs || (profile?.company_size === '1-10' ? 5 : 20);
      const sites = company?.nb_sites || 1;
      const surface = company?.surface_totale || 180;

      const formData = {
        company_name: companyName,
        companyName: companyName,
        sector,
        secteur_activite: sector,
        employees,
        nb_employes: employees,
        sites,
        nb_sites: sites,
        surface,
        annee_etude: reportYear.toString(),
        revenue: company?.ca_annuel,
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
        logo: company?.logo_url
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
