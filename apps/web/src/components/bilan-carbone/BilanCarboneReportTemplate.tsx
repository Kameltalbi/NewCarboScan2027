import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Download, Loader2 } from 'lucide-react';
import { generateEmpreinteProduitReportSections } from '@/lib/empreinteProduitReportTemplates';
import { generateAutomaticProfessionalRecommendations } from '@/shared/services/professionalRecommendations';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { Bar, Doughnut } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  ChartDataLabels
);

interface BilanCarboneReportTemplateProps {
  bilanData: {
    year: number;
    totalEmissions: number;
    scope1: number;
    scope2: number;
    scope3: number;
    breakdown: Array<{ category: string; emissions: number; scope: string }>;
  };
  organizationData: {
    name: string;
    sector?: string;
    employees?: number;
    sites?: number;
    surface?: number;
    logo?: string;
  };
  onClose?: () => void;
}

export const BilanCarboneReportTemplate: React.FC<BilanCarboneReportTemplateProps> = ({
  bilanData,
  organizationData,
  onClose
}) => {
  const reportRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [professionalRecommendations, setProfessionalRecommendations] = useState('');

  // Générer les recommandations automatiquement
  useEffect(() => {
    const loadRecommendations = async () => {
      try {
        const emissionsResult = {
          totalEmissions: bilanData.totalEmissions,
          scope1: bilanData.scope1,
          scope2: bilanData.scope2,
          scope3: bilanData.scope3,
          categoryBreakdown: bilanData.breakdown.map(b => ({ name: b.category, value: b.emissions, scope: parseInt(b.scope) || 1 })),
          majorityScope: bilanData.scope1 > bilanData.scope2 ? (bilanData.scope1 > bilanData.scope3 ? 1 : 3) : (bilanData.scope2 > bilanData.scope3 ? 2 : 3)
        };
        
        const recommendations = await generateAutomaticProfessionalRecommendations(
          emissionsResult,
          organizationData
        );
        setProfessionalRecommendations(recommendations);
      } catch (error) {
        console.error('Erreur génération recommandations:', error);
      }
    };
    
    loadRecommendations();
  }, [bilanData, organizationData]);

  // Générer les sections de texte
  const sections = generateEmpreinteProduitReportSections({
    entreprise: organizationData.name,
    annee: bilanData.year.toString(),
    secteur: organizationData.sector || 'Services',
    nb_sites: organizationData.sites || 1,
    surface_m2: organizationData.surface || 180,
    nb_employes: organizationData.employees || 1,
    total_global: bilanData.totalEmissions,
    scope1_total: bilanData.scope1,
    scope2_total: bilanData.scope2,
    intensite_etp: organizationData.employees ? bilanData.totalEmissions / organizationData.employees : 0,
    principal_poste1: bilanData.breakdown[0]?.category || 'Énergie',
    principal_poste2: bilanData.breakdown[1]?.category || 'Transport',
    pourcentage_postes_principaux: Math.round(((bilanData.breakdown[0]?.emissions || 0) + (bilanData.breakdown[1]?.emissions || 0)) / bilanData.totalEmissions * 100) || 0,
    prix_baril_min: 80,
    prix_baril_max: 150,
    cout_energie_min: 10000,
    cout_energie_max: 25000,
  });

  // Données pour le graphique donut
  const donutData = {
    labels: ['Scope 1', 'Scope 2', 'Scope 3'],
    datasets: [{
      data: [bilanData.scope1, bilanData.scope2, bilanData.scope3],
      backgroundColor: ['#5F9E6B', '#4C7D7F', '#87C6A0'],
      borderWidth: 0,
    }]
  };

  const donutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          font: { size: 12 },
          padding: 15
        }
      },
      datalabels: {
        color: '#fff',
        font: { size: 14, weight: 'bold' as const },
        formatter: (value: number, context: any) => {
          const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
          const percentage = ((value / total) * 100).toFixed(1);
          return `${percentage}%`;
        }
      }
    }
  };

  // Données pour le graphique barres (top 10 postes)
  const topPosts = bilanData.breakdown
    .sort((a, b) => b.emissions - a.emissions)
    .slice(0, 10);

  const barData = {
    labels: topPosts.map(p => p.category),
    datasets: [{
      label: 'Émissions (tCO₂e)',
      data: topPosts.map(p => p.emissions),
      backgroundColor: '#5F9E6B',
    }]
  };

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'y' as const,
    plugins: {
      legend: { display: false },
      datalabels: {
        color: '#fff',
        anchor: 'end' as const,
        align: 'start' as const,
        font: { size: 11, weight: 'bold' as const },
        formatter: (value: number) => `${value.toFixed(2)} t`
      }
    },
    scales: {
      x: {
        beginAtZero: true,
        title: { display: true, text: 'tCO₂e' }
      }
    }
  };

  // Générer le PDF
  const generatePDF = async () => {
    if (!reportRef.current) return;
    
    setIsGenerating(true);
    
    try {
      const element = reportRef.current;
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      const imgWidth = 210; // A4 width in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;
      
      // Ajouter la première page
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= 297; // A4 height
      
      // Ajouter des pages supplémentaires si nécessaire
      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= 297;
      }
      
      pdf.save(`bilan-carbone-${organizationData.name}-${bilanData.year}.pdf`);
      
    } catch (error) {
      console.error('Erreur génération PDF:', error);
      alert('Erreur lors de la génération du PDF');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 overflow-auto">
      <div className="min-h-screen p-4">
        <div className="max-w-6xl mx-auto bg-white rounded-lg shadow-xl">
          {/* Header avec actions */}
          <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center z-10">
            <h3 className="text-lg font-semibold">
              Rapport Bilan Carbone - {organizationData.name}
            </h3>
            <div className="flex gap-2">
              <Button
                onClick={generatePDF}
                disabled={isGenerating}
                className="bg-[#5F9E6B] hover:bg-[#4C7D7F]"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Génération...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Télécharger PDF
                  </>
                )}
              </Button>
              {onClose && (
                <Button variant="outline" onClick={onClose}>
                  Fermer
                </Button>
              )}
            </div>
          </div>

          {/* Contenu du rapport */}
          <div ref={reportRef} className="p-8 bg-white">
            {/* Page 1 : Couverture */}
            <div className="text-center mb-12 min-h-[800px] flex flex-col justify-center">
              {organizationData.logo && (
                <img 
                  src={organizationData.logo} 
                  alt="Logo" 
                  className="h-24 mx-auto mb-8 object-contain"
                />
              )}
              <h1 className="text-5xl font-bold text-[#5F9E6B] mb-6">
                Bilan Carbone {bilanData.year}
              </h1>
              <h2 className="text-3xl text-gray-700 mb-8">
                {organizationData.name}
              </h2>
              <div className="text-gray-500 text-lg">
                Généré le {new Date().toLocaleDateString('fr-FR', { 
                  day: 'numeric', 
                  month: 'long', 
                  year: 'numeric' 
                })}
              </div>
              <div className="mt-12 text-sm text-gray-400">
                Conforme au GHG Protocol
              </div>
            </div>

            {/* Page 2 : Synthèse exécutive */}
            <div className="mb-12 page-break">
              <h2 className="text-3xl font-bold text-[#5F9E6B] mb-6 border-b-2 border-[#5F9E6B] pb-2">
                Synthèse exécutive
              </h2>
              
              <Card className="p-6 mb-6 bg-[#5F9E6B] text-white">
                <div className="text-center">
                  <p className="text-lg mb-2 opacity-90">Total des émissions</p>
                  <p className="text-6xl font-bold">
                    {bilanData.totalEmissions.toFixed(1)}
                  </p>
                  <p className="text-2xl mt-2">tCO₂e</p>
                </div>
              </Card>

              <div className="grid grid-cols-3 gap-4 mb-8">
                <Card className="p-4 text-center border-l-4 border-l-[#5F9E6B]">
                  <p className="text-gray-600 text-sm mb-1">Scope 1</p>
                  <p className="text-3xl font-bold text-[#5F9E6B]">
                    {bilanData.scope1.toFixed(1)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {((bilanData.scope1 / bilanData.totalEmissions) * 100).toFixed(0)}% du total
                  </p>
                </Card>
                <Card className="p-4 text-center border-l-4 border-l-[#4C7D7F]">
                  <p className="text-gray-600 text-sm mb-1">Scope 2</p>
                  <p className="text-3xl font-bold text-[#4C7D7F]">
                    {bilanData.scope2.toFixed(1)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {((bilanData.scope2 / bilanData.totalEmissions) * 100).toFixed(0)}% du total
                  </p>
                </Card>
                <Card className="p-4 text-center border-l-4 border-l-[#87C6A0]">
                  <p className="text-gray-600 text-sm mb-1">Scope 3</p>
                  <p className="text-3xl font-bold text-[#87C6A0]">
                    {bilanData.scope3.toFixed(1)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {((bilanData.scope3 / bilanData.totalEmissions) * 100).toFixed(0)}% du total
                  </p>
                </Card>
              </div>

              {/* Graphique donut */}
              <div className="mb-8">
                <h3 className="text-xl font-semibold mb-4">Répartition par scope</h3>
                <div className="h-80">
                  <Doughnut data={donutData} options={donutOptions} />
                </div>
              </div>
            </div>

            {/* Page 3 : Contexte entreprise */}
            <div className="mb-12 page-break">
              <h2 className="text-3xl font-bold text-[#5F9E6B] mb-6 border-b-2 border-[#5F9E6B] pb-2">
                Contexte de l'entreprise
              </h2>
              <div className="prose max-w-none text-justify leading-relaxed" dangerouslySetInnerHTML={{ __html: sections.introduction_contexte }} />
            </div>

            {/* Page 4 : Méthodologie */}
            <div className="mb-12 page-break">
              <h2 className="text-3xl font-bold text-[#5F9E6B] mb-6 border-b-2 border-[#5F9E6B] pb-2">
                Méthodologie
              </h2>
              <div className="prose max-w-none text-justify leading-relaxed" dangerouslySetInnerHTML={{ __html: sections.methodologie_perimetre }} />
            </div>

            {/* Page 5 : Principaux postes d'émission */}
            <div className="mb-12 page-break">
              <h2 className="text-3xl font-bold text-[#5F9E6B] mb-6 border-b-2 border-[#5F9E6B] pb-2">
                Principaux postes d'émission
              </h2>
              <div className="h-96 mb-8">
                <Bar data={barData} options={barOptions} />
              </div>
            </div>

            {/* Page 6 : Analyse détaillée par scope */}
            <div className="mb-12 page-break">
              <h2 className="text-3xl font-bold text-[#5F9E6B] mb-6 border-b-2 border-[#5F9E6B] pb-2">
                Analyse détaillée par scope
              </h2>
              
              <div className="mb-6">
                <h3 className="text-xl font-semibold text-[#5F9E6B] mb-3">Scope 1 - Émissions directes</h3>
                <div className="prose max-w-none text-justify leading-relaxed" dangerouslySetInnerHTML={{ __html: sections.resultats_scopes }} />
              </div>

              <div className="mb-6">
                <h3 className="text-xl font-semibold text-[#4C7D7F] mb-3">Scope 2 - Émissions indirectes énergétiques</h3>
                <div className="prose max-w-none text-justify leading-relaxed" dangerouslySetInnerHTML={{ __html: sections.analyse_postes_emetteurs }} />
              </div>

              <div className="mb-6">
                <h3 className="text-xl font-semibold text-[#87C6A0] mb-3">Plan d'actions</h3>
                <div className="prose max-w-none text-justify leading-relaxed" dangerouslySetInnerHTML={{ __html: sections.plan_actions }} />
              </div>
            </div>

            {/* Page 7 : Analyse économique */}
            <div className="mb-12 page-break">
              <h2 className="text-3xl font-bold text-[#5F9E6B] mb-6 border-b-2 border-[#5F9E6B] pb-2">
                Analyse économique
              </h2>
              <div className="prose max-w-none text-justify leading-relaxed" dangerouslySetInnerHTML={{ __html: sections.analyse_economique }} />
            </div>

            {/* Page 8 : Recommandations */}
            <div className="mb-12 page-break">
              <h2 className="text-3xl font-bold text-[#5F9E6B] mb-6 border-b-2 border-[#5F9E6B] pb-2">
                Recommandations professionnelles
              </h2>
              <div className="prose max-w-none">
                <div 
                  className="text-gray-700 leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: professionalRecommendations }}
                />
              </div>
            </div>

            {/* Footer */}
            <div className="mt-12 pt-6 border-t text-center text-sm text-gray-500">
              <p>Rapport généré par CarboScan - {new Date().toLocaleDateString('fr-FR')}</p>
              <p className="mt-1">Conforme au GHG Protocol et à la norme ISO 14064-1</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
