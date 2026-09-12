import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { X, ChevronLeft, ChevronRight, Download, Loader2, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { ReportGeneratorService } from '@/lib/services/ReportGeneratorService';
import { useAuth } from '@/hooks/useAuth';
import { 
  ReportPieChart, 
  ReportBarChart, 
  ReportHorizontalBarChart, 
  ReportParetoChart,
  ReportTreemapChart,
  ReportLineAreaChart,
} from '@/components/charts';
import { getChartConfigForPage, CHART_COLORS, ChartType } from '@/lib/config/reportCharts';
import '@/styles/report.css';
import { analytics } from '@/lib/analytics';

interface BilanReportViewerProps {
  formData: any;
  emissionsResult: any;
  companyInfo: any;
  onClose: () => void;
  organizationId?: string;
  year?: number;
}

interface GeneratedReport {
  pages: Array<{
    pageNumber: number;
    title: string;
    content: string;
  }>;
  metadata: {
    companyName: string;
    year: number;
    totalPages: number;
    hasScope3: boolean;
    generatedAt: Date;
  };
}

export const BilanReportViewer: React.FC<BilanReportViewerProps> = ({
  formData,
  emissionsResult,
  companyInfo,
  onClose,
  organizationId: propOrganizationId,
  year: propYear
}) => {
  const { user } = useAuth();
  const containerRef = useRef<HTMLDivElement>(null);
  const [fitScale, setFitScale] = useState(1);
  const [zoom, setZoom] = useState(1); // 1 = page A4 entière à l'écran
  const [currentPage, setCurrentPage] = useState(1);
  const [isExporting, setIsExporting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [report, setReport] = useState<GeneratedReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  const A4_W = 210 * (96 / 25.4);
  const A4_H = 297 * (96 / 25.4);
  const ZOOM_MIN = 0.5;
  const ZOOM_MAX = 3;
  const ZOOM_STEP = 0.25;
  const scale = fitScale * zoom;
  const zoomPercent = Math.round(scale * 100);

  // Générer le rapport au montage du composant (une seule fois)
  const hasStartedRef = React.useRef(false);
  useEffect(() => {
    if (hasStartedRef.current) return;
    hasStartedRef.current = true;

    const generateReport = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Récupérer l'organization_id avec plusieurs fallbacks
        const organizationId = 
          propOrganizationId || 
          user?.user_metadata?.organization_id || 
          formData?.organization_id ||
          localStorage.getItem('organization_id');

        const year = 
          propYear || 
          parseInt(formData?.annee_etude) || 
          new Date().getFullYear();


        if (!organizationId) {
          throw new Error('Organization ID manquant. Veuillez vous reconnecter ou contacter le support.');
        }

        // Générer le rapport via le service (avec userId pour le quota)
        const generatedReport = await ReportGeneratorService.generateReport(
          organizationId,
          year,
          user?.id
        );

        setReport(generatedReport);
        analytics.createCarbonReport('bilan_carbone');
      } catch (err) {
        console.error('Erreur génération rapport:', err);
        setError(err instanceof Error ? err.message : 'Erreur inconnue');
      } finally {
        setIsLoading(false);
      }
    };

    generateReport();
  }, []);

  // Fit-page : une page A4 entière visible à l'écran
  useEffect(() => {
    if (!containerRef.current || isLoading) return;
    const el = containerRef.current;
    const SIDE = 96;
    const PAD_Y = 16;

    const computeFit = () => {
      const availW = Math.max(200, el.clientWidth - SIDE);
      const availH = Math.max(200, el.clientHeight - PAD_Y);
      setFitScale(Math.max(0.2, Math.min(availW / A4_W, availH / A4_H)));
    };

    computeFit();
    const ro = new ResizeObserver(() => requestAnimationFrame(computeFit));
    ro.observe(el);
    window.addEventListener('resize', computeFit);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', computeFit);
    };
  }, [isLoading, report, A4_W, A4_H]);

  const totalPages = report ? report.pages.length + 1 : 12;

  const clampZoom = (value: number) =>
    Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Math.round(value * 100) / 100));

  const handleZoomIn = () => setZoom((z) => clampZoom(z + ZOOM_STEP));
  const handleZoomOut = () => setZoom((z) => clampZoom(z - ZOOM_STEP));
  const handleZoomFit = () => setZoom(1);

  const handlePrevPage = () => {
    setCurrentPage((p) => Math.max(1, p - 1));
  };

  const handleNextPage = () => {
    setCurrentPage((p) => Math.min(totalPages, p + 1));
  };

  // Navigation clavier ← → + zoom
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setCurrentPage((p) => Math.max(1, p - 1));
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        setCurrentPage((p) => Math.min(totalPages, p + 1));
      } else if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        handleZoomIn();
      } else if (e.key === '-' || e.key === '_') {
        e.preventDefault();
        handleZoomOut();
      } else if (e.key === '0' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        handleZoomFit();
      } else if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [totalPages, onClose]);

  // Ctrl / Cmd + molette pour zoomer
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      e.preventDefault();
      const delta = e.deltaY > 0 ? -ZOOM_STEP / 2 : ZOOM_STEP / 2;
      setZoom((z) => clampZoom(z + delta));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [isLoading, report]);


  // Fonction pour préparer les données des graphiques selon le type
  const prepareChartData = (dataKey: string): any[] => {
    if (!report) return [];

    // Récupérer les données du rapport généré
    const reportData = (report as any).reportData;
    
    switch (dataKey) {
      case 'scopeBreakdown':
        return [
          { name: 'Scope 1', value: reportData?.scope1 || 0 },
          { name: 'Scope 2', value: reportData?.scope2 || 0 },
          { name: 'Scope 3', value: reportData?.scope3 || 0 },
        ].filter(item => item.value > 0);
      
      case 'scopeEmissions':
        return [
          { name: 'Scope 1', value: reportData?.scope1 || 0 },
          { name: 'Scope 2', value: reportData?.scope2 || 0 },
          { name: 'Scope 3', value: reportData?.scope3 || 0 },
        ].filter(item => item.value > 0);
      
      case 'scope1Posts':
        return (reportData?.scope1Posts || []).map((post: any) => ({
          name: post.name || 'Poste non identifié',
          value: post.value || 0,
        }));
      
      case 'scope2Sites':
        return (reportData?.scope2Posts || []).map((post: any) => ({
          name: post.name || 'Site',
          value: post.value || 0,
        }));
      
      case 'topPostsRanking':
        return (reportData?.topPostsRanking || []).map((post: any) => ({
          name: post.name || 'Poste non identifié',
          value: post.value || 0,
          percent: post.percent || 0,
        }));
      
      case 'scope3Posts':
        return (reportData?.scope3Posts || []).map((post: any) => ({
          name: post.name || 'Poste Scope 3',
          value: post.value || 0,
        }));
      
      case 'scope3Purchases':
        return (reportData?.scope3Posts || [])
          .filter((post: any) => post.name?.toLowerCase().includes('achat'))
          .map((post: any) => ({
            name: post.name || 'Achats',
            value: post.value || 0,
          }));
      
      case 'scope3Transport':
        return (reportData?.scope3Posts || [])
          .filter((post: any) => 
            post.name?.toLowerCase().includes('transport') ||
            post.name?.toLowerCase().includes('déplacement')
          )
          .map((post: any) => ({
            name: post.name || 'Transport',
            value: post.value || 0,
          }));

      case 'trajectoryData': {
        const total = reportData?.totalEmissions ?? 0;
        const year = reportData?.year ?? new Date().getFullYear();
        const target = reportData?.reductionTarget ?? 42;
        return [
          { year: String(year), value: total, objectif: total },
          { year: '2030', value: Math.round(total * (1 - target / 100)), objectif: Math.round(total * (1 - target / 100)) },
        ];
      }
      
      default:
        return [];
    }
  };

  // Fonction pour rendre un graphique selon sa configuration
  const renderChart = (chartConfig: any, index: number) => {
    const data = prepareChartData(chartConfig.dataKey);
    
    if (!data || data.length === 0) {
      return null;
    }

    switch (chartConfig.type) {
      case ChartType.PIE:
        return (
          <ReportPieChart
            key={index}
            data={data}
            title={chartConfig.title}
            description={chartConfig.description}
            width={chartConfig.width}
            height={chartConfig.height}
            colors={chartConfig.colors}
          />
        );

      case ChartType.DOUGHNUT:
        return (
          <ReportPieChart
            key={index}
            data={data}
            title={chartConfig.title}
            description={chartConfig.description}
            width={chartConfig.width}
            height={chartConfig.height}
            colors={chartConfig.colors}
            isDoughnut
          />
        );
      
      case ChartType.BAR:
        return (
          <ReportBarChart
            key={index}
            data={data}
            title={chartConfig.title}
            description={chartConfig.description}
            width={chartConfig.width}
            height={chartConfig.height}
            color={chartConfig.colors?.[0]}
          />
        );
      
      case ChartType.HORIZONTAL_BAR:
        return (
          <ReportHorizontalBarChart
            key={index}
            data={data}
            title={chartConfig.title}
            description={chartConfig.description}
            width={chartConfig.width}
            height={chartConfig.height}
            color={chartConfig.colors?.[0]}
          />
        );
      
      case ChartType.PARETO:
        return (
          <ReportParetoChart
            key={index}
            data={data}
            title={chartConfig.title}
            description={chartConfig.description}
            width={chartConfig.width}
            height={chartConfig.height}
          />
        );

      case ChartType.TREEMAP:
        return (
          <ReportTreemapChart
            key={index}
            data={data}
            title={chartConfig.title}
            description={chartConfig.description}
            width={chartConfig.width}
            height={chartConfig.height}
            colors={chartConfig.colors}
          />
        );

      case ChartType.LINE_AREA:
        return (
          <ReportLineAreaChart
            key={index}
            data={(data || []) as Array<{ year: string; value: number; objectif?: number }>}
            title={chartConfig.title}
            description={chartConfig.description}
            width={chartConfig.width}
            height={chartConfig.height}
            colors={chartConfig.colors}
          />
        );

      case ChartType.WATERFALL:
      case ChartType.SANKEY:
        return (
          <div key={index} className="chart-container chart-placeholder">
            {chartConfig.title && <h3 className="chart-title">{chartConfig.title}</h3>}
            <div className="chart-placeholder-box" style={{ width: chartConfig.width, height: chartConfig.height }}>
              <span className="text-muted-foreground text-sm">
                {chartConfig.type === ChartType.WATERFALL && 'Waterfall Chart'}
                {chartConfig.type === ChartType.SANKEY && 'Sankey Diagram'}
                {' – à implémenter (lib dédiée ou personnalisation Recharts)'}
              </span>
            </div>
            {chartConfig.description && <p className="chart-description">{chartConfig.description}</p>}
          </div>
        );
      
      default:
        return null;
    }
  };

  // Footer discret sur la dernière page (tous types de rapport)
  const REPORT_DISCLAIMER_FOOTER = (
    <div className="report-disclaimer-footer" role="contentinfo">
      <p>
        Ce rapport a été généré automatiquement par CarboScan® sur la base des données fournies par l&apos;utilisateur.
        Bien que les calculs soient basés sur des bases de données reconnues (ex.&#8239;: ADEME), la responsabilité finale de la vérification et de l&apos;interprétation des résultats incombe à l&apos;entreprise déclarante.
      </p>
    </div>
  );

  /**
   * Nettoyage léger des styles hérités (sans casser le cadre A4 de la visionneuse).
   */
  const stripFixedPageHeights = (html: string) =>
    html
      .replace(/min-height:\s*297mm;?/gi, '')
      .replace(/height:\s*297mm;?/gi, '')
      .replace(/min-height:\s*1122px;?/gi, '');

  // Une seule page A4 à l'écran — navigation gauche / droite
  const getPageContent = () => {
    if (!report) {
      return <div className="p-8 text-slate-500">Chargement du rapport...</div>;
    }

    const scaledW = A4_W * scale;
    const scaledH = A4_H * scale;
    const isDisclaimerPage = currentPage === report.pages.length + 1;
    const pageData = isDisclaimerPage ? null : report.pages[currentPage - 1];
    const isCover = currentPage === 1;
    const chartConfig = pageData ? getChartConfigForPage(pageData.pageNumber) : null;
    const html = pageData
      ? isCover
        ? pageData.content
        : stripFixedPageHeights(pageData.content)
      : '';

    return (
      <div
        key={currentPage}
        className="relative bg-white overflow-hidden"
        style={{
          width: scaledW,
          height: scaledH,
          boxShadow:
            '0 1px 3px rgba(0,0,0,0.08), 0 8px 24px rgba(0,0,0,0.06), 0 0 0 1px rgba(15,23,42,0.06)',
        }}
      >
        <div
          id="report-content"
          className="absolute top-0 left-0 origin-top-left"
          style={{
            width: A4_W,
            height: A4_H,
            transform: `scale(${scale})`,
          }}
        >
          {html ? (
            <div
              className={isCover ? 'h-full w-full' : 'report-paged-sheet h-full w-full'}
              dangerouslySetInnerHTML={{ __html: html }}
            />
          ) : null}
          {chartConfig?.charts && chartConfig.charts.length > 0 ? (
            <div className="charts-section px-11 pb-4">
              {chartConfig.charts.map((chart, index) => renderChart(chart, index))}
            </div>
          ) : null}
          {isDisclaimerPage ? (
            <div className="flex h-full flex-col justify-end p-10">
              {REPORT_DISCLAIMER_FOOTER}
            </div>
          ) : null}
        </div>
      </div>
    );
  };


  // Fonction de fallback pour affichage simple si le service échoue
  const getFallbackPageContent = () => {
    const scope1 = emissionsResult?.scope1 || 0;
    const scope2 = emissionsResult?.scope2 || 0;
    const scope3 = emissionsResult?.scope3 || 0;
    const total = emissionsResult?.total || 0;
    const companyName = companyInfo?.companyName || formData?.company_name || 'Entreprise';
    const sector = companyInfo?.sector || formData?.sector || 'Services';
    const year = formData?.annee_etude || new Date().getFullYear();
    const employees = formData?.employees || 150;

    switch (currentPage) {
      case 1:
        // Page de couverture
        return (
          <div className="flex flex-col items-center justify-center min-h-[297mm] text-center">
            <div className="mb-8">
              <h1 className="text-5xl font-bold mb-4">
                <span className="text-[#5F9E6B]">Bilan Carbone</span>{' '}
                <span className="text-[#4C7D7F]">{year}</span>
              </h1>
              <div className="text-2xl font-semibold text-slate-700">
                {companyName}
              </div>
              <div className="text-lg text-slate-600 mt-2">
                Secteur: {sector}
              </div>
            </div>

            <div className="mt-12 space-y-6 max-w-2xl">
              <div className="bg-slate-50 p-6 rounded-lg">
                <h2 className="text-xl font-semibold text-[#5F9E6B] mb-4">Résultats Globaux</h2>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-[#4C7D7F]">
                      {scope1.toFixed(1)}
                    </div>
                    <div className="text-sm text-slate-600 mt-1">Scope 1 (tCO₂e)</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-[#5F9E6B]">
                      {scope2.toFixed(1)}
                    </div>
                    <div className="text-sm text-slate-600 mt-1">Scope 2 (tCO₂e)</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-[#7BA88D]">
                      {scope3.toFixed(1)}
                    </div>
                    <div className="text-sm text-slate-600 mt-1">Scope 3 (tCO₂e)</div>
                  </div>
                </div>
                <div className="mt-6 pt-6 border-t border-slate-200">
                  <div className="text-center">
                    <div className="text-4xl font-bold text-slate-900">
                      {total.toFixed(1)}
                    </div>
                    <div className="text-sm text-slate-600 mt-1">Total (tCO₂e)</div>
                  </div>
                </div>
              </div>

              <div className="text-sm text-slate-500 mt-8">
                <p>Rapport généré automatiquement à partir des données collectées</p>
                <p className="mt-2">
                  Conforme aux normes GHG Protocol et ISO 14064-1
                </p>
              </div>
            </div>
          </div>
        );

      case 2:
        // Introduction - Contexte de l'entreprise
        return (
          <div className="p-8 min-h-[297mm]">
            <h2 className="text-2xl font-bold text-[#5F9E6B] border-b-2 border-[#5F9E6B] pb-2 mb-6">
              1. Introduction – Contexte de l'entreprise
            </h2>
            <div className="space-y-4 text-slate-700 leading-relaxed">
              <p>
                L'entreprise <strong>{companyName}</strong> exerce son activité dans le secteur <strong>{sector}</strong>, 
                avec un effectif d'environ <strong>{employees} collaborateurs</strong>. Ses activités génèrent des impacts 
                environnementaux principalement liés à la consommation d'énergie et aux déplacements.
              </p>
              <p>
                Dans un contexte de transition énergétique et de lutte contre le changement climatique, l'entreprise 
                s'engage dans une démarche volontaire de quantification et de réduction de ses émissions de gaz à effet 
                de serre (GES).
              </p>
              <p>
                Ce Bilan Carbone® permet d'identifier les principaux postes d'émissions et de définir un plan d'actions 
                de réduction adapté aux enjeux de l'entreprise.
              </p>

              <div className="bg-slate-50 p-6 rounded-lg mt-8">
                <h3 className="text-lg font-semibold text-[#4C7D7F] mb-3">Objectifs de la démarche</h3>
                <ul className="list-disc list-inside space-y-2 text-slate-700">
                  <li>Quantifier les émissions de GES sur les Scopes 1, 2 et 3</li>
                  <li>Identifier les leviers de réduction prioritaires</li>
                  <li>Définir une trajectoire de décarbonation</li>
                  <li>Sensibiliser les collaborateurs aux enjeux climatiques</li>
                  <li>Anticiper les évolutions réglementaires</li>
                </ul>
              </div>

              <div className="bg-[#5F9E6B]/10 p-6 rounded-lg mt-8">
                <h3 className="text-lg font-semibold text-[#4C7D7F] mb-3">Périmètre organisationnel</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-slate-600">Année de référence</div>
                    <div className="text-lg font-semibold text-slate-900">{year}</div>
                  </div>
                  <div>
                    <div className="text-sm text-slate-600">Effectif</div>
                    <div className="text-lg font-semibold text-slate-900">{employees} collaborateurs</div>
                  </div>
                  <div>
                    <div className="text-sm text-slate-600">Secteur d'activité</div>
                    <div className="text-lg font-semibold text-slate-900">{sector}</div>
                  </div>
                  <div>
                    <div className="text-sm text-slate-600">Méthodologie</div>
                    <div className="text-lg font-semibold text-slate-900">GHG Protocol</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 3:
        // Méthodologie
        return (
          <div className="p-8 min-h-[297mm]">
            <h2 className="text-2xl font-bold text-[#5F9E6B] border-b-2 border-[#5F9E6B] pb-2 mb-6">
              2. Méthodologie – Périmètre et Scopes
            </h2>
            <div className="space-y-6 text-slate-700 leading-relaxed">
              <p>
                Le Bilan Carbone® est réalisé selon la méthodologie du <strong>GHG Protocol</strong> et la norme 
                <strong> ISO 14064-1</strong>. Il couvre les trois scopes d'émissions de gaz à effet de serre.
              </p>

              <div className="space-y-4">
                <div className="bg-[#4C7D7F]/10 p-6 rounded-lg">
                  <h3 className="text-lg font-semibold text-[#4C7D7F] mb-3">
                    Scope 1 – Émissions directes
                  </h3>
                  <p className="text-slate-700 mb-3">
                    Émissions directes provenant des sources détenues ou contrôlées par l'entreprise.
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-slate-600">
                    <li>Combustion de combustibles fossiles (chaudières, groupes électrogènes)</li>
                    <li>Flotte de véhicules de l'entreprise</li>
                    <li>Émissions de procédés industriels</li>
                    <li>Fuites de fluides frigorigènes</li>
                  </ul>
                  <div className="mt-4 text-center">
                    <div className="text-3xl font-bold text-[#4C7D7F]">{scope1.toFixed(1)} tCO₂e</div>
                  </div>
                </div>

                <div className="bg-[#5F9E6B]/10 p-6 rounded-lg">
                  <h3 className="text-lg font-semibold text-[#5F9E6B] mb-3">
                    Scope 2 – Émissions indirectes liées à l'énergie
                  </h3>
                  <p className="text-slate-700 mb-3">
                    Émissions indirectes associées à la production d'électricité, de chaleur ou de vapeur achetée.
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-slate-600">
                    <li>Consommation d'électricité</li>
                    <li>Réseau de chaleur urbain</li>
                    <li>Réseau de froid urbain</li>
                  </ul>
                  <div className="mt-4 text-center">
                    <div className="text-3xl font-bold text-[#5F9E6B]">{scope2.toFixed(1)} tCO₂e</div>
                  </div>
                </div>

                <div className="bg-[#7BA88D]/10 p-6 rounded-lg">
                  <h3 className="text-lg font-semibold text-[#7BA88D] mb-3">
                    Scope 3 – Autres émissions indirectes
                  </h3>
                  <p className="text-slate-700 mb-3">
                    Toutes les autres émissions indirectes de la chaîne de valeur.
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-slate-600">
                    <li>Achats de biens et services</li>
                    <li>Déplacements professionnels</li>
                    <li>Trajets domicile-travail</li>
                    <li>Déchets</li>
                  </ul>
                  <div className="mt-4 text-center">
                    <div className="text-3xl font-bold text-[#7BA88D]">{scope3.toFixed(1)} tCO₂e</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 4:
        // Résultats détaillés
        return (
          <div className="p-8 min-h-[297mm]">
            <h2 className="text-2xl font-bold text-[#5F9E6B] border-b-2 border-[#5F9E6B] pb-2 mb-6">
              3. Résultats détaillés et analyse
            </h2>
            <div className="space-y-6">
              <div className="bg-slate-50 p-6 rounded-lg">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Bilan global</h3>
                <div className="text-center mb-6">
                  <div className="text-5xl font-bold text-slate-900 mb-2">{total.toFixed(1)}</div>
                  <div className="text-lg text-slate-600">tonnes CO₂ équivalent</div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-white rounded-lg">
                    <div className="text-2xl font-bold text-[#4C7D7F]">{scope1.toFixed(1)}</div>
                    <div className="text-sm text-slate-600 mt-1">Scope 1</div>
                    <div className="text-xs text-slate-500 mt-1">
                      {((scope1 / total) * 100).toFixed(1)}%
                    </div>
                  </div>
                  <div className="text-center p-4 bg-white rounded-lg">
                    <div className="text-2xl font-bold text-[#5F9E6B]">{scope2.toFixed(1)}</div>
                    <div className="text-sm text-slate-600 mt-1">Scope 2</div>
                    <div className="text-xs text-slate-500 mt-1">
                      {((scope2 / total) * 100).toFixed(1)}%
                    </div>
                  </div>
                  <div className="text-center p-4 bg-white rounded-lg">
                    <div className="text-2xl font-bold text-[#7BA88D]">{scope3.toFixed(1)}</div>
                    <div className="text-sm text-slate-600 mt-1">Scope 3</div>
                    <div className="text-xs text-slate-500 mt-1">
                      {((scope3 / total) * 100).toFixed(1)}%
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 p-6 rounded-lg">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Indicateurs de performance</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white p-4 rounded-lg">
                    <div className="text-sm text-slate-600 mb-2">Intensité carbone par employé</div>
                    <div className="text-2xl font-bold text-[#5F9E6B]">
                      {(total / employees).toFixed(2)}
                    </div>
                    <div className="text-xs text-slate-500 mt-1">tCO₂e / employé</div>
                  </div>
                  <div className="bg-white p-4 rounded-lg">
                    <div className="text-sm text-slate-600 mb-2">Émissions annuelles</div>
                    <div className="text-2xl font-bold text-[#4C7D7F]">
                      {total.toFixed(1)}
                    </div>
                    <div className="text-xs text-slate-500 mt-1">tCO₂e / an</div>
                  </div>
                </div>
              </div>

              <div className="bg-[#5F9E6B]/10 p-6 rounded-lg">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Postes d'émissions principaux</h3>
                <div className="space-y-3">
                  {emissionsResult?.categoryBreakdown?.slice(0, 5).map((item: any, index: number) => (
                    <div key={index} className="flex items-center justify-between bg-white p-3 rounded">
                      <div className="text-sm font-medium text-slate-700">{item.name}</div>
                      <div className="text-sm font-bold text-[#5F9E6B]">
                        {item.value.toFixed(1)} tCO₂e
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );

      case 5:
        // Recommandations
        return (
          <div className="p-8 min-h-[297mm]">
            <h2 className="text-2xl font-bold text-[#5F9E6B] border-b-2 border-[#5F9E6B] pb-2 mb-6">
              4. Recommandations et plan d'actions
            </h2>
            <div className="space-y-6 text-slate-700 leading-relaxed">
              <p>
                Au regard des résultats obtenus, plusieurs leviers d'actions peuvent être activés pour réduire 
                l'empreinte carbone de l'entreprise.
              </p>

              <div className="space-y-4">
                <div className="bg-[#4C7D7F]/10 p-6 rounded-lg">
                  <h3 className="text-lg font-semibold text-[#4C7D7F] mb-3">
                    Actions prioritaires Scope 1
                  </h3>
                  <ul className="list-disc list-inside space-y-2 text-slate-700">
                    <li>Optimiser la gestion de la flotte de véhicules</li>
                    <li>Électrifier progressivement les véhicules</li>
                    <li>Améliorer l'efficacité énergétique des bâtiments</li>
                    <li>Contrôler et réduire les fuites de fluides frigorigènes</li>
                  </ul>
                </div>

                <div className="bg-[#5F9E6B]/10 p-6 rounded-lg">
                  <h3 className="text-lg font-semibold text-[#5F9E6B] mb-3">
                    Actions prioritaires Scope 2
                  </h3>
                  <ul className="list-disc list-inside space-y-2 text-slate-700">
                    <li>Souscrire à un contrat d'électricité verte</li>
                    <li>Installer des panneaux photovoltaïques</li>
                    <li>Optimiser les consommations électriques</li>
                    <li>Mettre en place un système de gestion de l'énergie</li>
                  </ul>
                </div>

                <div className="bg-[#7BA88D]/10 p-6 rounded-lg">
                  <h3 className="text-lg font-semibold text-[#7BA88D] mb-3">
                    Actions prioritaires Scope 3
                  </h3>
                  <ul className="list-disc list-inside space-y-2 text-slate-700">
                    <li>Privilégier les fournisseurs locaux et engagés</li>
                    <li>Encourager le télétravail et les visioconférences</li>
                    <li>Mettre en place un plan de mobilité durable</li>
                    <li>Optimiser la gestion des déchets et le recyclage</li>
                  </ul>
                </div>
              </div>

              <div className="bg-slate-50 p-6 rounded-lg mt-8">
                <h3 className="text-lg font-semibold text-slate-900 mb-3">Conclusion</h3>
                <p className="text-slate-700">
                  Ce Bilan Carbone® constitue une première étape dans la démarche de décarbonation de l'entreprise. 
                  Il permet d'identifier les leviers d'actions prioritaires et de définir une trajectoire de réduction 
                  des émissions cohérente avec les objectifs de l'Accord de Paris.
                </p>
                <p className="text-slate-700 mt-4">
                  La mise en œuvre du plan d'actions nécessitera l'engagement de l'ensemble des collaborateurs et 
                  un suivi régulier des indicateurs de performance.
                </p>
              </div>
            </div>
          </div>
        );

      default:
        return (
          <div className="p-8 text-center text-slate-500">
            Page {currentPage} non disponible
          </div>
        );
    }
  };

  const handleExportPDF = async () => {
    if (!report) {
      console.error('Aucun rapport à exporter');
      return;
    }

    setIsExporting(true);
    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      // Footer discret sur la dernière page (tous types)
      const disclaimerFooterHtml = '<div class="report-disclaimer-footer" role="contentinfo"><p>Ce rapport a été généré automatiquement par CarboScan® sur la base des données fournies par l\'utilisateur. Bien que les calculs soient basés sur des bases de données reconnues (ex.&#8239;: ADEME), la responsabilité finale de la vérification et de l\'interprétation des résultats incombe à l\'entreprise déclarante.</p></div>';

      

      // Prépare un conteneur hors écran, convertit les SVG en images et capture
      const renderToCanvas = async (html: string, fixedHeightPx?: number) => {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;
        tempDiv.className = 'report-page report-container';
        tempDiv.style.width = '210mm';
        if (fixedHeightPx) {
          tempDiv.style.height = `${fixedHeightPx}px`;
          tempDiv.style.overflow = 'hidden';
        }
        tempDiv.style.background = 'white';
        tempDiv.style.position = 'absolute';
        tempDiv.style.left = '-9999px';
        tempDiv.style.top = '0';
        tempDiv.style.fontFamily = 'Inter, -apple-system, BlinkMacSystemFont, sans-serif';
        document.body.appendChild(tempDiv);

        const svgElements = tempDiv.querySelectorAll('svg');
        for (const svg of Array.from(svgElements)) {
          try {
            const svgData = new XMLSerializer().serializeToString(svg);
            const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
            const url = URL.createObjectURL(svgBlob);
            const img = document.createElement('img');
            img.src = url;
            img.style.width = svg.getAttribute('width') ? `${svg.getAttribute('width')}px` : '100%';
            img.style.height = svg.getAttribute('height') ? `${svg.getAttribute('height')}px` : 'auto';
            img.style.display = 'block';
            await new Promise<void>((resolve) => {
              img.onload = () => resolve();
              img.onerror = () => resolve();
              setTimeout(() => resolve(), 500);
            });
            svg.parentNode?.replaceChild(img, svg);
            URL.revokeObjectURL(url);
          } catch {
            // conserver le SVG si la conversion échoue
          }
        }

        await new Promise(resolve => setTimeout(resolve, 200));

        const canvas = await html2canvas(tempDiv, {
          scale: 2.5,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff',
          width: tempDiv.scrollWidth,
          height: fixedHeightPx ?? tempDiv.scrollHeight,
          windowWidth: 794,
          imageTimeout: 15000,
          allowTaint: true,
        });

        document.body.removeChild(tempDiv);
        return canvas;
      };

      const A4_H_PX = 1122; // hauteur A4 en px @96dpi

      // 1) Couverture : page pleine, capturée seule
      const coverCanvas = await renderToCanvas(report.pages[0].content, A4_H_PX);
      pdf.addImage(coverCanvas.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, pageWidth, pageHeight);

      // 2) Corps du rapport : flux continu (aucun espace vide entre chapitres)
      const bodyHtml = report.pages
        .slice(1)
        .map(p => `<section style="break-inside: auto;">${stripFixedPageHeights(p.content)}</section>`)

        .join('') + disclaimerFooterHtml;

      const bodyCanvas = await renderToCanvas(bodyHtml);
      const scaleFactor = bodyCanvas.width / 794; // px canvas par px CSS
      const sliceHeight = Math.floor(A4_H_PX * scaleFactor);
      const pageCount = Math.ceil(bodyCanvas.height / sliceHeight);

      for (let i = 0; i < pageCount; i++) {
        const sliceY = i * sliceHeight;
        const currentSliceHeight = Math.min(sliceHeight, bodyCanvas.height - sliceY);

        const sliceCanvas = document.createElement('canvas');
        sliceCanvas.width = bodyCanvas.width;
        sliceCanvas.height = currentSliceHeight;
        const ctx = sliceCanvas.getContext('2d');
        if (!ctx) continue;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
        ctx.drawImage(bodyCanvas, 0, sliceY, bodyCanvas.width, currentSliceHeight, 0, 0, bodyCanvas.width, currentSliceHeight);

        pdf.addPage();
        const sliceHeightMm = (currentSliceHeight * pageWidth) / bodyCanvas.width;
        pdf.addImage(sliceCanvas.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, pageWidth, Math.min(sliceHeightMm, pageHeight));

        // Numéro de page
        pdf.setFontSize(9);
        pdf.setTextColor(100, 116, 139);
        pdf.text(`Page ${i + 2} / ${pageCount + 1}`, pageWidth - 15, pageHeight - 10, { align: 'right' });
      }


      // Métadonnées du PDF
      pdf.setProperties({
        title: `Bilan Carbone ${report.metadata.year} - ${report.metadata.companyName}`,
        subject: 'Rapport Bilan Carbone',
        author: 'CarboScan',
        keywords: 'bilan carbone, GES, émissions, environnement',
        creator: 'CarboScan - Plateforme de comptabilité carbone'
      });

      const fileName = `Bilan-Carbone-${report.metadata.companyName.replace(/\s+/g, '-')}-${report.metadata.year}.pdf`;
      pdf.save(fileName);
      analytics.exportReport('pdf', 'bilan_carbone');
    } catch (error) {
      console.error('Erreur lors de l\'export PDF:', error);
      alert('Erreur lors de l\'export PDF. Veuillez réessayer.');
    } finally {
      setIsExporting(false);
    }
  };

  // Affichage pendant le chargement
  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 text-center">
          <Loader2 className="h-12 w-12 animate-spin text-[#5F9E6B] mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-slate-900 mb-2">
            Génération du rapport en cours...
          </h3>
          <p className="text-slate-600">
            Veuillez patienter pendant que nous préparons votre rapport professionnel.
          </p>
        </div>
      </div>
    );
  }

  // Affichage en cas d'erreur
  if (error || !report) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4">
          <div className="text-center mb-6">
            <div className="h-12 w-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <X className="h-6 w-6 text-red-600" />
            </div>
            <h3 className="text-xl font-semibold text-slate-900 mb-2">
              Erreur de génération
            </h3>
            <p className="text-slate-600 mb-4">
              {error || 'Une erreur est survenue lors de la génération du rapport.'}
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              onClick={onClose}
              variant="outline"
              className="flex-1"
            >
              Fermer
            </Button>
            <Button
              onClick={() => window.location.reload()}
              className="flex-1 bg-[#5F9E6B] hover:bg-[#4A7D56] text-white"
            >
              Réessayer
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-white">
      {/* Barre d'outils compacte */}
      <header className="relative z-20 flex h-12 shrink-0 items-center justify-between gap-3 border-b border-slate-200 bg-white px-3 text-slate-800">
        <div className="flex min-w-0 items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-[4px] text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
            aria-label="Fermer"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="min-w-0 leading-tight">
            <div className="truncate text-sm font-medium">
              Rapport Bilan Carbone {report.metadata.year} — {report.metadata.companyName}
            </div>
            <div className="truncate text-[11px] text-slate-500">
              {currentPage === totalPages
                ? 'Mentions légales'
                : report.pages[currentPage - 1]?.title || `Page ${currentPage}`}
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {/* Zoom */}
          <div className="flex items-center rounded-md bg-slate-100 px-1">
            <button
              type="button"
              onClick={handleZoomOut}
              disabled={zoom <= ZOOM_MIN}
              className="inline-flex h-8 w-8 items-center justify-center rounded text-slate-600 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-30"
              aria-label="Zoom arrière"
              title="Zoom arrière (−)"
            >
              <ZoomOut className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={handleZoomFit}
              className="min-w-[3.25rem] rounded px-1 text-center text-xs font-medium tabular-nums text-slate-700 hover:bg-slate-200"
              title="Ajuster à la page (⌘0)"
            >
              {zoomPercent}%
            </button>
            <button
              type="button"
              onClick={handleZoomIn}
              disabled={zoom >= ZOOM_MAX}
              className="inline-flex h-8 w-8 items-center justify-center rounded text-slate-600 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-30"
              aria-label="Zoom avant"
              title="Zoom avant (+)"
            >
              <ZoomIn className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={handleZoomFit}
              className="inline-flex h-8 w-8 items-center justify-center rounded text-slate-600 transition hover:bg-slate-200"
              aria-label="Page entière"
              title="Page entière"
            >
              <Maximize2 className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Pages */}
          <div className="flex items-center rounded-md bg-slate-100 px-1">
            <button
              type="button"
              onClick={handlePrevPage}
              disabled={currentPage === 1}
              className="inline-flex h-8 w-8 items-center justify-center rounded text-slate-600 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-30"
              aria-label="Page précédente"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="min-w-[4.5rem] text-center text-xs font-medium tabular-nums text-slate-700">
              {currentPage} / {totalPages}
            </span>
            <button
              type="button"
              onClick={handleNextPage}
              disabled={currentPage === totalPages}
              className="inline-flex h-8 w-8 items-center justify-center rounded text-slate-600 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-30"
              aria-label="Page suivante"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <Button
            onClick={handleExportPDF}
            disabled={isExporting}
            size="sm"
            className="h-8 bg-[#5F9E6B] px-3 text-white hover:bg-[#4A7D56]"
          >
            {isExporting ? (
              <>
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                Export…
              </>
            ) : (
              <>
                <Download className="mr-1.5 h-3.5 w-3.5" />
                PDF
              </>
            )}
          </Button>
        </div>
      </header>

      {/* Une page A4 par écran — flèches gauche / droite */}
      <div className="relative z-10 min-h-0 flex-1 bg-white">
        <button
          type="button"
          onClick={handlePrevPage}
          disabled={currentPage === 1}
          className="absolute left-3 top-1/2 z-30 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-[4px] border border-slate-200 bg-white text-slate-700 shadow-md transition hover:bg-slate-50 disabled:pointer-events-none disabled:opacity-20"
          aria-label="Page précédente"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>

        <div
          ref={containerRef}
          className={`h-full w-full bg-white ${zoom > 1 ? 'overflow-auto' : 'overflow-hidden'}`}
        >
          <div
            className={`flex justify-center px-14 py-2 ${
              zoom > 1 ? '' : 'h-full items-center'
            }`}
          >
            {getPageContent()}
          </div>
        </div>

        <button
          type="button"
          onClick={handleNextPage}
          disabled={currentPage === totalPages}
          className="absolute right-3 top-1/2 z-30 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-[4px] border border-slate-200 bg-white text-slate-700 shadow-md transition hover:bg-slate-50 disabled:pointer-events-none disabled:opacity-20"
          aria-label="Page suivante"
        >
          <ChevronRight className="h-6 w-6" />
        </button>
      </div>
    </div>
  );
};
