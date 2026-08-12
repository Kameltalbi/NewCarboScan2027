import React, { useState, useEffect } from 'react';
import ProPlanEmpreinteProduitReport, { ProductReportData } from './ProPlanEmpreinteProduitReport';
import { ReportLoadingProgress } from './ReportLoadingProgress';

interface EmpreinteProduitReportContentProps {
  formData?: any;
  emissionsResult?: any;
  emissionsData?: any;
  companyInfo?: any;
  /** Direct product report data (preferred) */
  productReportData?: ProductReportData;
  onGenerate?: () => void;
  onClose?: () => void;
}

export const EmpreinteProduitReportContent: React.FC<EmpreinteProduitReportContentProps> = ({
  formData,
  emissionsResult,
  emissionsData,
  companyInfo: propCompanyInfo,
  productReportData,
}) => {
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return <ReportLoadingProgress isLoading={isLoading} />;
  }

  // If direct product data is provided, use it directly
  if (productReportData) {
    return <ProPlanEmpreinteProduitReport data={productReportData} />;
  }

  // Otherwise, build ProductReportData from legacy props
  const reportData = formData || emissionsData;
  const reportEmissions = emissionsResult || reportData;

  const totalEmissionsKg = (reportEmissions?.totalEmissions || 0) / 1000;
  const scope1 = (reportEmissions?.scope1 || 0) / 1000;
  const scope2 = (reportEmissions?.scope2 || 0) / 1000;
  const scope3 = (reportEmissions?.scope3 || 0) / 1000;

  // Build lifecycle breakdown from available data
  const breakdown = [
    { phase: 'materials', emissions: scope3 * 0.5 || totalEmissionsKg * 0.4, percentage: 0, isEstimated: true },
    { phase: 'manufacturing', emissions: scope1 + scope2 || totalEmissionsKg * 0.25, percentage: 0, isEstimated: true },
    { phase: 'transport', emissions: scope3 * 0.3 || totalEmissionsKg * 0.2, percentage: 0, isEstimated: true },
    { phase: 'usage', emissions: scope3 * 0.15 || totalEmissionsKg * 0.1, percentage: 0, isEstimated: true },
    { phase: 'endOfLife', emissions: scope3 * 0.05 || totalEmissionsKg * 0.05, percentage: 0, isEstimated: true },
  ];

  const total = breakdown.reduce((sum, b) => sum + b.emissions, 0);
  breakdown.forEach(b => { b.percentage = total > 0 ? (b.emissions / total) * 100 : 0; });

  const dominantPhase = [...breakdown].sort((a, b) => b.emissions - a.emissions)[0]?.phase || 'materials';

  const data: ProductReportData = {
    productName: reportData?.nom_produit || reportData?.nom_entreprise || propCompanyInfo?.companyName || 'Produit',
    productCategory: reportData?.categorie_produit || 'autre',
    functionalUnit: reportData?.unite_fonctionnelle || '1 unité',
    description: reportData?.description_produit,
    companyName: reportData?.nom_entreprise || propCompanyInfo?.companyName || propCompanyInfo?.name || 'Entreprise',
    sector: reportData?.secteur_activite || propCompanyInfo?.sector || 'Services',
    year: parseInt(reportData?.annee_etude) || new Date().getFullYear() - 1,
    totalEmissions: total,
    breakdown,
    dominantPhase,
    dataQuality: { realData: 30, estimatedData: 70 },
    methodology: 'Méthodologie simplifiée basée sur les facteurs d\'émission de la Base Carbone ADEME et estimations sectorielles',
  };

  return <ProPlanEmpreinteProduitReport data={data} />;
};
