/**
 * Service de génération de rapports Bilan Carbone professionnels
 * Structure unique (v3) : une seule trame de rapport, dont les pages Scope 3
 * et thématiques sont omises si le périmètre du bilan ne les concerne pas.

 * avec contenu dynamique adapté au contexte de chaque entreprise.
 * Technique du "Chunking" : appels API distincts pour Synthèse et Plan d'action, puis assemblage dans le PDF.
 */

import { api } from '@/integrations/api/client';
import { REPORT_PALETTE, applyReportPalette } from './reportPalette';
import { logger } from '@/utils/logger';
import { BilanCarboneCalculator } from '@/lib/calculators/BilanCarboneCalculator';
import {
  svgDoughnutChart,
  svgHorizontalBarChart,
  svgVerticalBarChart,
  svgTrajectoryChart,
  svgStackedBarChart,
  svgSiteComparisonChart,
  htmlScopeCards,
  htmlIntensityCards,
  htmlTopPostsTable,
} from './InlineSVGCharts';
import {
  getClimateContextTemplate as climateContextTpl,
  getObjectivesTemplate as objectivesTpl,
  getOrgPerimeterTemplate as orgPerimeterTpl,
  getOpPerimeterTemplate as opPerimeterTpl,
  getDataCollectionTemplate as dataCollectionTpl,
  getDataHypothesesTemplate as dataHypothesesTpl,
  getSiteAllocationTemplate as siteAllocationTpl,
  getScope3OverviewTemplate as scope3OverviewTpl,
  getConclusionV2Template as conclusionV2Tpl,
} from './ReportTemplatesExtra';
import {
  getGovernanceTemplate as governanceTpl,
  getFlowMappingTemplate as flowMappingTpl,
  getTemporalScopeTemplate as temporalScopeTpl,
  getEmissionFactorsTemplate as emissionFactorsTpl,
  getUncertaintyTemplate as uncertaintyTpl,
  getTransitionRisksTemplate as transitionRisksTpl,
  getTransitionVisionTemplate as transitionVisionTpl,
  getMonitoringIndicatorsTemplate as monitoringIndicatorsTpl,
  getVerificationTemplate as verificationTpl,
  getDataQualityTemplate as dataQualityTpl,
  getBaselineComparisonTemplate as baselineComparisonTpl,
  getAnnexesTemplate as annexesTpl,
} from './ReportTemplatesABC';
import { reportPageClose, reportPageFooter, reportPageHeader, reportPageOpen, PAGE_SHELL } from './reportPageChrome';

/** Toutes les sections de contenu pour lesquelles un appel IA "chunk" est effectué.
 *  Cover et TOC sont exclus (pas de contenu IA). En cas d'échec IA, le template statique est conservé. */
const CHUNKED_SECTIONS = new Set<string>([
  'executive_summary',
  'organization',
  'climate_context',
  'objectives',
  'methodology',
  'org_perimeter',
  'op_perimeter',
  'data_collection',
  'data_hypotheses',
  'site_allocation',
  'results_global',
  'scope1_detail',
  'scope2_detail',
  'scope3_overview',
  'top_emitters',
  'action_plan',
  'conclusion',
]);

/** Contexte riche envoyé à l'API generate-report-chunk (toutes les données nécessaires) */
interface FullChunkContext {
  companyName: string;
  year: number;
  sector: string;
  country: string;
  employees: number;
  sites: number;
  surface: number;
  totalEmissions: number;
  scope1: number;
  scope2: number;
  scope3: number;
  scope1Percent: number;
  scope2Percent: number;
  scope3Percent: number;
  hasScope3: boolean;
  topPoste: string;
  topPosts: string;
  intensityPerEmployee: number;
  intensityPerM2: number;
  scopeDominant: string;
  scopeDominantPercent: number;
  paretoCount: number;
  paretoPercent: number;
  remainingPercent: number;
  reductionTarget: number;
  scope1TopPoste: string;
  scope1SecondaryPostes: string;
  scope2TopPoste: string;
  scope2SecondaryPostes: string;
  scope3PurchasesEmissions: number;
  scope3PurchasesPercent: number;
  scope3TransportEmissions: number;
  scope3TransportPercent: number;
  scope3DeplacementsEmissions: number;
  scope3FinDeVieEmissions: number;
  scope3OtherEmissions: number;
  scope3AchatsTop3Details: string;
  siteNames: string;
  consolidationMethod: string;
}

interface ReportTemplate {
  id: string;
  section_key: string;
  title: string;
  content_template: string;
  page_number: number;
  order_in_page: number;
  requires_scope3: boolean;
}

interface ReportData {
  // Données entreprise
  companyName: string;
  companyFullName: string;
  sector: string;
  employees: number;
  sites: number;
  surface: number;
  revenue?: number;
  year: number;
  country: string;
  generatedDate: string;
  consolidationMethod: string;
  pilotName: string;
  sitesInScope: Array<{
    id: string;
    name: string;
    site_type: string;
    city: string;
    country: string;
    scope1_enabled: boolean;
    scope2_enabled: boolean;
    scope3_enabled: boolean;
  }>;
  
  // Résultats carbone
  totalEmissions: number;
  scope1: number;
  scope2: number;
  scope3: number;
  scope1Percent: number;
  scope2Percent: number;
  scope3Percent: number;
  
  // Intensités
  intensityPerEmployee: number;
  intensityPerM2: number;
  intensityPerRevenue?: number;
  
  // Analyse
  topPosts: string;
  topPostsPercent: number;
  topPoste: string;
  scopeDominant: string;
  scopeDominantPercent: number;
  benchmarkStatus: string;
  reductionTarget: number;
  analyticalComment: string;
  
  // Variables pour pages détaillées
  scope1TopPoste: string;
  scope1SecondaryPostes: string;
  scope2TopPoste: string;
  scope2SecondaryPostes: string;
  
  // Top 5 ranking pour analyse globale
  topPostsRanking: Array<{
    position: number;
    name: string;
    value: number;
    percent: number;
    scope: number;
    barWidth: number;
  }>;
  
  // Variables pour analyse Pareto
  paretoCount: number;
  paretoPercent: number;
  remainingPercent: number;
  
  // Variables Scope 3 pour Page 13
  scope3TopCategory1: string;
  scope3TopCategory2: string;
  scope3TopCategory3: string;
  
  // Variables Scope 3 pour Page 14 (Achats)
  scope3PurchasesEmissions: number;
  scope3PurchasesPercent: number;
  
  // Variables Scope 3 pour Page 15 (Transport)
  scope3TransportEmissions: number;
  scope3TransportPercent: number;
  
  // Variables Scope 3 pour Page 16 (Autres postes)
  scope3OtherEmissions: number;
  scope3OtherPercent: number;
  
  // Expert Scope 3 (analyse complète – chunk IA)
  scope3AchatsTop3Details: string;
  scope3DeplacementsEmissions: number;
  scope3UtilisationEmissions: number;
  scope3FinDeVieEmissions: number;
  
  // Variables pour Page 17 (Analyse consolidée)
  topPoste1: string;
  topPoste2: string;
  topPoste3: string;
  top3PostesPercent: number;
  
  // Breakdown
  scope1Posts: Array<{ name: string; value: number; percent: number; description: string }>;
  scope2Posts: Array<{ name: string; value: number; percent: number }>;
  scope3Posts: Array<{ name: string; value: number; percent: number; totalPercent: number; description: string }>;
  
  // Flags
  hasScope3: boolean;
  
  // Graphiques SVG inline et HTML cards (injectés dans les templates)
  chartScopesDoughnut: string;
  chartScopesBar: string;
  chartScope1Bars: string;
  chartScope2Bars: string;
  chartScope3Bars: string;
  chartScope3Stacked: string;
  chartTopPosts: string;
  chartTrajectory: string;
  htmlScopeCards: string;
  htmlIntensityCards: string;
  htmlTopPostsTable: string;
  chartSiteComparison: string;
  siteBreakdowns: Array<{ name: string; total: number; scope1: number; scope2: number; scope3: number; scope1Pct: number; scope2Pct: number; scope3Pct: number }>;
  hasScope1: boolean;
  hasRevenue: boolean;
  logoUrl: string | null;
  orgLogoHtml: string;
  companyInitial: string;
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
  reportData?: ReportData;
}

export class ReportGeneratorService {
  /**
   * Valide les données avant génération du rapport
   */
  static validateReportData(bilanData: any, orgData: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Vérifier que l'organisation est renseignée
    if (!orgData.name || orgData.name === 'Organisation') {
      errors.push('Le nom de l\'organisation n\'est pas renseigné');
    }
    
    // Vérifier qu'il y a des émissions
    if (!bilanData.totalEmissions || bilanData.totalEmissions <= 0) {
      errors.push('Aucune émission calculée. Veuillez saisir des données d\'activité');
    }
    
    // Vérifier que au moins un scope a des données
    if (bilanData.scope1 <= 0 && bilanData.scope2 <= 0 && (!bilanData.scope3 || bilanData.scope3 <= 0)) {
      errors.push('Aucune donnée d\'émission dans les Scopes 1, 2 ou 3');
    }
    
    // Avertissement si peu de données (non bloquant)
    if (bilanData.totalEmissions > 0 && bilanData.totalEmissions < 100) {
      logger.warn('⚠️ Émissions très faibles - vérifiez que toutes les données ont été saisies');
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Retourne une icône pour chaque section du rapport
   */
  private static getSectionIcon(sectionKey: string): string {
    const icons: Record<string, string> = {
      'executive_summary': '📋',
      'organization': '🏢',
      'objectives': '🎯',
      'methodology': '⚙️',
      'results': '📊',
      'scope1_detail': '🔥',
      'scope2_detail': '⚡',
      'scope3_detail': '🔗',
      'scope3_overview': '🔗',
      'scope3_purchases': '🛒',
      'scope3_transport': '🚛',
      'scope3_other': '📦',
      'analysis': '🔍',
      'action_plan': '📝',
      'action_plan_simple': '📝',
      'recommendations': '💡',
      'conclusion': '✅',
      'annexes': '📎',
      'annexes_end': '📎',
      'consolidated_analysis': '📈',
      'action_plan_extended': '🚀'
    };
    return icons[sectionKey] || '📄';
  }

  /**
   * Génère la table des matières du rapport
   */
  private static generateTableOfContents(templates: ReportTemplate[], hasScope3: boolean, reportData: ReportData): string {
    const tocItems = templates
      .filter(t => t.section_key !== 'cover')
      .map((t) => {
        const pageNum = t.page_number + 1;
        const isScope3Section = t.section_key.includes('scope3');
        const sectionIcon = this.getSectionIcon(t.section_key);
        return {
          title: t.title,
          page: pageNum,
          icon: sectionIcon,
          isScope3: isScope3Section
        };
      });

    const tocLogo = reportData.logoUrl
      ? `<img src="${reportData.logoUrl}" alt="${reportData.companyName}" class="report-running-logo" style="width: 28px; height: 28px; border-radius: 6px; object-fit: contain;" />`
      : `<div class="report-running-logo" style="width: 28px; height: 28px; background: linear-gradient(135deg, #0EA5E9 0%, #6366F1 100%); border-radius: 6px; display: flex; align-items: center; justify-content: center;"><span style="color: white; font-size: 13px; font-weight: 800;">${reportData.companyName.charAt(0)}</span></div>`;

    return `
      <div class="report-content-page" style="${PAGE_SHELL}">
        ${reportPageHeader('Table des matières', tocLogo)}
        <div class="report-page-body" style="padding: 12px 0;">
        <h1 style="font-size: 28px; font-weight: 700; color: #0f172a; margin: 8px 0 12px 0; letter-spacing: -0.5px;">
          Table des matières
        </h1>
        
        <p style="font-size: 14px; color: #64748b; margin-bottom: 24px; line-height: 1.6;">
          Bilan Carbone® de <strong style="color: #1e293b;">${reportData.companyName}</strong> — Année ${reportData.year}
        </p>
        
        <div style="display: flex; flex-direction: column; gap: 2px;">
          ${tocItems.map((item, idx) => `
            <div style="display: flex; align-items: center; padding: 14px 16px; background: ${idx % 2 === 0 ? '#f8fafc' : 'white'}; border-radius: 8px;">
              <span style="font-size: 18px; margin-right: 14px; opacity: 0.8;">${item.icon}</span>
              <span style="flex: 1; font-size: 14px; font-weight: 500; color: #1e293b;">
                ${item.title}
                ${item.isScope3 ? '<span style="display: inline-block; margin-left: 8px; padding: 2px 8px; background: rgba(99, 102, 241, 0.1); color: #6366F1; font-size: 10px; font-weight: 600; border-radius: 4px;">SCOPE 3</span>' : ''}
              </span>
              <span style="font-size: 14px; font-weight: 600; color: #0EA5E9; min-width: 40px; text-align: right;">${item.page}</span>
            </div>
          `).join('')}
        </div>
        
        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 24px; padding-top: 16px;">
          <div style="display: flex; gap: 24px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="width: 10px; height: 10px; background: #0EA5E9; border-radius: 50%;"></span>
              <span style="font-size: 12px; color: #64748b;">Scope 1 & 2</span>
            </div>
            ${hasScope3 ? `
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="width: 10px; height: 10px; background: #6366F1; border-radius: 50%;"></span>
              <span style="font-size: 12px; color: #64748b;">Scope 3</span>
            </div>
            ` : ''}
          </div>
          <span style="font-size: 12px; color: #94a3b8;">${tocItems.length} sections • ${tocItems.length + 2} pages</span>
        </div>
        </div>
        ${reportPageFooter().replace(/\{\{year\}\}/g, String(reportData.year)).replace(/\{\{companyName\}\}/g, reportData.companyName)}
      </div>
    `;
  }

  /**
   * Génère un rapport complet à partir des données de l'organisation
   */
  /**
   * Vérifie le quota de tokens restants pour une organisation/année.
   * Crée le quota s'il n'existe pas encore (défaut: 6 tokens).
   */
  static async getReportQuota(organizationId: string, year: number): Promise<{
    tokensTotal: number;
    tokensUsed: number;
    tokensRemaining: number;
  }> {
    return {
      tokensTotal: 20,
      tokensUsed: 0,
      tokensRemaining: 20,
    };
  }

  /**
   * Consomme un token de quota et log la génération.
   */
  private static async consumeReportToken(
    organizationId: string,
    userId: string | undefined,
    year: number,
    pagesCount: number,
    generationType: 'generation' | 'modification' = 'generation',
    tokenCost: number = 5
  ): Promise<{ success: boolean; tokensRemaining: number }> {
    return { success: true, tokensRemaining: 20 };
  }

  static async generateReport(
    organizationId: string,
    year: number,
    userId?: string
  ): Promise<GeneratedReport> {
    try {
      logger.debug('🚀 Début génération rapport pour:', organizationId, year);

      // 0. Déterminer si c'est une première génération (gratuite) ou une modification (5 tokens)
      let genCount = 0;
      let isFree = true;
      let tokenCost = 0;
      let generationType: 'generation' | 'modification' = 'generation';

      try {
        genCount = 0;
        isFree = true;
        tokenCost = 0;
        generationType = 'generation';
      } catch (e) {
        logger.warn('⚠️ Erreur accès report_generations:', e);
      }

      // Quota check removed — unlimited generations
      logger.debug(`🎫 Génération illimitée | Type: ${generationType}${isFree ? ' — gratuit' : ''}`);

      // 1. Calculer le bilan carbone
      const periodStart = `${year}-01-01`;
      const periodEnd = `${year}-12-31`;
      const bilanData = await BilanCarboneCalculator.calculate(
        organizationId,
        periodStart,
        periodEnd
      );

      logger.debug('📊 Bilan carbone calculé');

      // 2. Récupérer les données de l'organisation
      const orgData = await this.getOrganizationData(organizationId);
      logger.debug('🏢 Données organisation récupérées');

      // 3. Calculer les émissions par site
      const siteBreakdowns: Array<{ name: string; total: number; scope1: number; scope2: number; scope3: number }> = [];
      if (orgData.sitesInScope && orgData.sitesInScope.length > 0) {
        for (const site of orgData.sitesInScope) {
          try {
            const siteBilan = await BilanCarboneCalculator.calculate(
              organizationId, periodStart, periodEnd, site.id
            );
            siteBreakdowns.push({
              name: site.name || 'Site inconnu',
              total: Math.round(siteBilan.totalEmissions / 1000),
              scope1: Math.round(siteBilan.scope1 / 1000),
              scope2: Math.round(siteBilan.scope2 / 1000),
              scope3: Math.round(siteBilan.scope3 / 1000),
            });
          } catch (e) {
            logger.warn(`⚠️ Erreur calcul site ${site.name}:`, e);
          }
        }
      }
      // Fallback : si pas de sites dans report_sites_scope, essayer collect_sites
      if (siteBreakdowns.length === 0) {
        const { items: collectSites } = await api.listSites();
        if (collectSites && collectSites.length > 0) {
          for (const site of collectSites) {
            try {
              const siteBilan = await BilanCarboneCalculator.calculate(
                organizationId, periodStart, periodEnd, String(site.id)
              );
              if (siteBilan.totalEmissions > 0) {
                siteBreakdowns.push({
                  name: String(site.name || 'Site inconnu'),
                  total: Math.round(siteBilan.totalEmissions / 1000),
                  scope1: Math.round(siteBilan.scope1 / 1000),
                  scope2: Math.round(siteBilan.scope2 / 1000),
                  scope3: Math.round(siteBilan.scope3 / 1000),
                });
              }
            } catch (e) {
              logger.warn(`⚠️ Erreur calcul site ${site.name}:`, e);
            }
          }
        }
      }
      logger.debug(`📍 ${siteBreakdowns.length} sites calculés pour le rapport`);

      // 4. VALIDATION PRÉ-GÉNÉRATION
      const validation = this.validateReportData(bilanData, orgData);
      if (!validation.valid) {
        console.error('❌ Validation échouée:', validation.errors);
        throw new Error(`Données insuffisantes pour générer le rapport:\n• ${validation.errors.join('\n• ')}`);
      }
      logger.debug('✅ Validation des données réussie');

      // 5. Déterminer si on a du Scope 3
      const hasScope3 = bilanData.scope3 > 0;

      // 6. Récupérer les templates appropriés
      // Aucune page "focus" sectorielle n'est incluse en dur : chaque page thématique
      // n'apparaît que si l'organisation a réellement des émissions sur ce poste.
      const templates = await this.getTemplates(hasScope3, siteBreakdowns.length);
      logger.debug(`📄 ${templates.length} templates récupérés`);

      // 7. Préparer les données pour le rendu
      const reportData = this.prepareReportData(bilanData, orgData, year, siteBreakdowns);
      logger.debug('✅ Données rapport préparées');

      // 7. Rendre chaque page
      const chunkContext = this.buildFullChunkContext(reportData);
      const pages: Array<{ pageNumber: number; title: string; content: string }> = [];

      // 7a. Page de couverture (Page 1)
      const coverTemplate = templates.find(t => t.section_key === 'cover');
      if (coverTemplate) {
        pages.push({
          pageNumber: 1,
          title: 'Page de couverture',
          content: this.renderTemplate(coverTemplate.content_template, reportData)
        });
      }

      // 7b. Table des matieres (Page 2)
      const tocContent = this.generateTableOfContents(templates, hasScope3, reportData);
      pages.push({
        pageNumber: 2,
        title: 'Table des matieres',
        content: tocContent
      });

      // 7c. Lancer TOUS les appels IA en parallèle (au lieu de séquentiel)
      const contentTemplates = templates.filter(t => t.section_key !== 'cover');
      const chunkedKeys = contentTemplates
        .filter(t => CHUNKED_SECTIONS.has(t.section_key))
        .map(t => t.section_key);

      // Approche hybride : IA uniquement pour action_plan (recommandations personnalisées)
      // Les autres sections utilisent les templates statiques (fiables et rapides)
      const chunkResults = new Map<string, string>();
      
      // Sections éligibles pour l'IA (actuellement: action_plan uniquement)
      const AI_ENABLED_SECTIONS = new Set(['action_plan']);
      const aiSections = chunkedKeys.filter(key => AI_ENABLED_SECTIONS.has(key));
      
      if (aiSections.length > 0) {
        logger.debug(`🤖 Génération IA pour ${aiSections.length} section(s): ${aiSections.join(', ')}`);
        
        // Préparer le contexte complet pour l'IA
        const fullContext: FullChunkContext = {
          companyName: reportData.companyName,
          year: reportData.year,
          sector: reportData.sector,
          country: reportData.country,
          employees: reportData.employees,
          sites: reportData.sites,
          surface: reportData.surface,
          totalEmissions: reportData.totalEmissions,
          scope1: reportData.scope1,
          scope2: reportData.scope2,
          scope3: reportData.scope3,
          scope1Percent: reportData.scope1Percent,
          scope2Percent: reportData.scope2Percent,
          scope3Percent: reportData.scope3Percent,
          hasScope3: reportData.hasScope3,
          topPoste: reportData.topPoste,
          topPosts: reportData.topPosts,
          intensityPerEmployee: reportData.intensityPerEmployee,
          intensityPerM2: reportData.intensityPerM2,
          scopeDominant: reportData.scopeDominant,
          scopeDominantPercent: reportData.scopeDominantPercent,
          paretoCount: reportData.paretoCount,
          paretoPercent: reportData.paretoPercent,
          remainingPercent: reportData.remainingPercent,
          reductionTarget: reportData.reductionTarget,
          scope1TopPoste: reportData.scope1TopPoste || reportData.topPoste,
          scope1SecondaryPostes: reportData.scope1SecondaryPostes || '',
          scope2TopPoste: reportData.scope2TopPoste || '',
          scope2SecondaryPostes: reportData.scope2SecondaryPostes || '',
          scope3PurchasesEmissions: reportData.scope3PurchasesEmissions || 0,
          scope3PurchasesPercent: reportData.scope3PurchasesPercent || 0,
          scope3TransportEmissions: reportData.scope3TransportEmissions || 0,
          scope3TransportPercent: reportData.scope3TransportPercent || 0,
          scope3DeplacementsEmissions: reportData.scope3DeplacementsEmissions || 0,
          scope3FinDeVieEmissions: reportData.scope3FinDeVieEmissions || 0,
          scope3OtherEmissions: reportData.scope3OtherEmissions || 0,
          scope3AchatsTop3Details: reportData.scope3AchatsTop3Details || '',
          siteNames: reportData.sitesInScope?.map(s => s.name).join(', ') || '',
          consolidationMethod: reportData.consolidationMethod || 'contrôle opérationnel',
        };
        
        // Appels IA en parallèle avec timeout de 10s par section
        const aiPromises = aiSections.map(async (section) => {
          try {
            const content = await this.fetchReportChunk(section, fullContext);
            if (content) {
              chunkResults.set(section, content);
              logger.debug(`✅ IA "${section}" générée (${content.length} car.)`);
            } else {
              logger.debug(`⚠️ IA "${section}" échec — fallback template statique`);
            }
          } catch (error) {
            logger.warn(`❌ IA "${section}" erreur:`, error);
          }
        });
        
        await Promise.all(aiPromises);
      }
      
      logger.debug(`⚡ Génération hybride — ${aiSections.length} IA + ${chunkedKeys.length - aiSections.length} statiques`);

      // 7d. Mapping section → graphique SVG à injecter dans le contenu IA
      const sectionCharts: Record<string, string> = {
        executive_summary: reportData.chartScopesDoughnut,
        results_global: reportData.chartScopesBar,
        scope1_detail: reportData.chartScope1Bars,
        scope2_detail: reportData.chartScope2Bars,
        scope3_overview: reportData.chartScope3Bars,
        top_emitters: reportData.chartTopPosts,
      };

      // 7e. Assembler les pages avec le contenu IA + graphiques ou le fallback statique
      for (const template of contentTemplates) {
        let content = this.renderTemplate(template.content_template, reportData);

        const chunkContent = chunkResults.get(template.section_key);
        if (chunkContent) {
          const chartHtml = sectionCharts[template.section_key] 
            ? `<div style="margin: 24px 0; display: flex; justify-content: center;">${sectionCharts[template.section_key]}</div>` 
            : '';
          content = this.renderTemplate(
            `${reportPageOpen(template.title)}
            ${chunkContent}
            ${chartHtml}
          ${reportPageClose()}`,
            reportData
          );
          logger.debug(`📌 Chunk IA "${template.section_key}" injecté (${chunkContent.length} car.)${chartHtml ? ' + graphique' : ''}`);
        }

        pages.push({
          pageNumber: template.page_number + 1,
          title: template.title,
          content
        });
      }

      logger.debug(`✅ ${pages.length} pages generees (avec table des matieres)`);

      // 8. Consommer les tokens de quota après génération réussie
      if (tokenCost > 0) {
        try {
          const tokenResult = await this.consumeReportToken(organizationId, userId, year, pages.length, generationType, tokenCost);
          if (tokenResult.success) {
            logger.debug(`🎫 ${tokenCost} token(s) consommé(s) (${generationType}). Restant: ${tokenResult.tokensRemaining}`);
          }
        } catch (tokenError) {
          logger.warn('⚠️ Impossible de consommer les tokens (RLS?):', tokenError);
        }
      } else {
        logger.debug(`🎫 Génération gratuite (${generationType}) — pas de token consommé`);
      }

      return {
        pages,
        metadata: {
          companyName: reportData.companyName,
          year,
          totalPages: pages.length,
          hasScope3,
          generatedAt: new Date()
        },
        reportData
      };
    } catch (error) {
      console.error('❌ Erreur génération rapport:', error);
      throw new Error(`Erreur génération rapport: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    }
  }

  /**
   * Récupère les données de l'organisation depuis Supabase
   * Utilise la fonction SQL get_organization_sites_summary pour cohérence
   */
  private static async getOrganizationData(organizationId: string) {
    const { organization: org } = await api.getOrganization();
    const { items: sites } = await api.listSites().catch(() => ({ items: [] as Array<Record<string, unknown>> }));
    const siteList = sites || [];
    const totalEmployees = siteList.reduce((n, s) => n + (Number(s.employees_count ?? s.employees) || 0), 0);
    const totalSurface = siteList.reduce((n, s) => n + (Number(s.surface_m2 ?? s.surface) || 0), 0);
    const sitesInScope = siteList.map((s) => ({
      id: String(s.id),
      name: String(s.name ?? 'Site'),
    }));

    return {
      name: org?.name || 'Organisation',
      legalName: org?.legalName || org?.name || 'Organisation',
      sector: org?.sector || 'Services',
      country: org?.country || 'Tunisie',
      employees: totalEmployees || org?.employees || 0,
      sites: siteList.length,
      surface: totalSurface || org?.totalSurface || 0,
      revenue: org?.annualRevenue,
      sitesInScope,
      totalSitesCount: siteList.length,
      activeSitesCount: siteList.length,
      sitesWithScope3: 0,
      logoUrl: org?.logoUrl || null,
      pilotName: org?.pilotName || null
    };
  }

  /**
   * Récupère les templates depuis la base de données
   * Utilise la fonction SQL get_report_pages pour obtenir les bonnes pages selon le scope
   */

  private static async getTemplates(hasScope3: boolean, siteCount: number = 0): Promise<ReportTemplate[]> {
    // Utiliser systématiquement les templates intégrés (code) pour garantir
    // la cohérence du rapport 25 pages et le style professionnel.
    // Les templates DB seront réactivés une fois la base synchronisée.
    const templates = this.getDefaultTemplates(hasScope3, siteCount);
    logger.debug(`📄 ${templates.length} templates chargés (${hasScope3 ? 'S1+S2+S3' : 'S1+S2'}, ${siteCount} sites)`);
    return templates;
  }

  /**
   * Structure unique et unifiée du rapport Bilan Carbone (v3).
   * La même trame s'applique à tous les bilans : les pages Scope 3 et les
   * pages thématiques sont simplement omises si le périmètre ne les concerne pas.
   */
  private static getDefaultTemplates(hasScope3: boolean, siteCount: number = 0): ReportTemplate[] {
    const t = (id: number, key: string, title: string, tpl: string, scope3 = false): ReportTemplate => ({
      id: String(id), section_key: key, title, content_template: tpl, page_number: id, order_in_page: 1, requires_scope3: scope3,
    });

    // Trame unique — conforme au Guide méthodologique Bilan Carbone® v8 (ABC), §5.1.1
    const pages: ReportTemplate[] = [
      t(1,  'cover',             'Page de garde',                        this.getCoverTemplate()),
      t(2,  'executive_summary', 'Executive summary',                    this.getExecutiveSummaryTemplate()),
      t(3,  'organization',      'Présentation de l\'entreprise',        this.getOrganizationTemplate()),         // a
      t(4,  'governance',        'Gouvernance et pilote de la démarche', governanceTpl()),                        // b
      t(5,  'climate_context',   'Contexte et enjeux climatiques',       climateContextTpl()),
      t(6,  'objectives',        'Objectifs de la démarche',             objectivesTpl()),
      t(7,  'methodology',       'Référentiels et cadre méthodologique',  this.getMethodologyTemplate()),
      t(8,  'flow_mapping',      'Cartographie des flux',                flowMappingTpl()),                       // c
      t(9,  'org_perimeter',     'Périmètre organisationnel',            orgPerimeterTpl()),                      // e, f
      t(10, 'op_perimeter',      'Périmètre opérationnel et scopes',     opPerimeterTpl()),
      t(11, 'temporal_scope',    'Périmètre temporel et exercice de référence', temporalScopeTpl()),              // d, i, j
      t(12, 'data_collection',   'Collecte des données',                 dataCollectionTpl()),                    // g
      t(13, 'data_hypotheses',   'Traitement des données et hypothèses', dataHypothesesTpl()),
      t(14, 'emission_factors',  'Facteurs d\'émission et PRG',          emissionFactorsTpl()),                   // k
      t(15, 'site_allocation',   'Répartition des émissions par site',   siteAllocationTpl()),
      t(16, 'results_global',    'Résultats globaux — Profil GES',       this.getResultsTemplate()),              // h
      t(17, 'scope1_detail',     'Résultats Scope 1',                    this.getScope1DetailTemplate()),
      t(18, 'scope2_detail',     'Résultats Scope 2',                    this.getScope2DetailTemplate()),
      t(19, 'scope3_overview',   'Résultats Scope 3 — Vue d\'ensemble',   scope3OverviewTpl(), true),
      t(20, 'top_emitters',      'Analyse des postes les plus émetteurs', this.getAnalysisTemplate()),
      t(21, 'data_quality',      'Analyse de la qualité des données',     dataQualityTpl()),
      t(22, 'uncertainty',       'Incertitudes associées au profil GES', uncertaintyTpl()),                       // l
      t(23, 'transition_risks',  'Risques et opportunités de transition', transitionRisksTpl()),                  // n
      t(24, 'baseline_comparison', 'Comparaison avec l\'exercice de référence', baselineComparisonTpl()),          // i, j
      t(25, 'action_plan',       'Plan d\'actions et recommandations',   this.getActionPlanTemplate()),           // o
      t(26, 'monitoring_kpis',   'Indicateurs de suivi',                 monitoringIndicatorsTpl()),              // p, s
      t(27, 'transition_vision', 'Vision de transition bas carbone',     transitionVisionTpl()),                  // r
      t(28, 'verification',      'Vérification et amélioration continue', verificationTpl()),                     // t, §5.1.3
      t(29, 'conclusion',        'Synthèse et prochaines étapes',        conclusionV2Tpl()),
      t(30, 'annexes',           'Annexes',                              annexesTpl()),
    ];

    // Pages omises selon le périmètre réel du bilan
    const excluded = new Set<string>();
    if (siteCount < 2) excluded.add('site_allocation');
    if (!hasScope3) {
      pages.filter(p => p.requires_scope3).forEach(p => excluded.add(p.section_key));
    }

    const filtered = pages.filter(p => !excluded.has(p.section_key));
    filtered.forEach((tp, i) => { tp.id = String(i + 1); tp.page_number = i + 1; });
    return filtered;
  }



  /**
   * Construit le contexte riche envoyé à l'API generate-report-chunk pour toutes les sections.
   */
  private static buildFullChunkContext(data: ReportData): FullChunkContext {
    return {
      companyName: data.companyName,
      year: data.year,
      sector: data.sector,
      country: data.country,
      employees: data.employees,
      sites: data.sites,
      surface: data.surface,
      totalEmissions: data.totalEmissions,
      scope1: data.scope1,
      scope2: data.scope2,
      scope3: data.scope3,
      scope1Percent: data.scope1Percent,
      scope2Percent: data.scope2Percent,
      scope3Percent: data.scope3Percent ?? 0,
      hasScope3: data.hasScope3,
      topPoste: data.topPoste,
      topPosts: data.topPosts,
      intensityPerEmployee: data.intensityPerEmployee,
      intensityPerM2: data.intensityPerM2,
      scopeDominant: data.scopeDominant,
      scopeDominantPercent: data.scopeDominantPercent,
      paretoCount: data.paretoCount,
      paretoPercent: data.paretoPercent,
      remainingPercent: data.remainingPercent,
      reductionTarget: data.reductionTarget,
      scope1TopPoste: data.scope1TopPoste,
      scope1SecondaryPostes: data.scope1SecondaryPostes,
      scope2TopPoste: data.scope2TopPoste,
      scope2SecondaryPostes: data.scope2SecondaryPostes ?? '',
      scope3PurchasesEmissions: data.scope3PurchasesEmissions,
      scope3PurchasesPercent: data.scope3PurchasesPercent ?? 0,
      scope3TransportEmissions: data.scope3TransportEmissions,
      scope3TransportPercent: data.scope3TransportPercent ?? 0,
      scope3DeplacementsEmissions: data.scope3DeplacementsEmissions,
      scope3FinDeVieEmissions: data.scope3FinDeVieEmissions,
      scope3OtherEmissions: data.scope3OtherEmissions,
      scope3AchatsTop3Details: data.scope3AchatsTop3Details,
      siteNames: (data.sitesInScope || []).map(s => s.name).join(', '),
      consolidationMethod: data.consolidationMethod,
    };
  }

  /**
   * Appel API Edge Function pour une section "chunk" (contenu IA).
   * En échec (réseau, API absente), retourne null → le template statique est conservé.
   */
  private static async fetchReportChunk(
    _section: string,
    _context: FullChunkContext
  ): Promise<string | null> {
    return null;
  }

  /**
   * Prépare les données pour le rendu des templates
   */
  private static prepareReportData(bilanData: any, orgData: any, year: number, siteBreakdownsRaw: Array<{ name: string; total: number; scope1: number; scope2: number; scope3: number }> = []): ReportData {
    // Convertir de kg à tonnes si nécessaire
    const totalEmissions = bilanData.totalEmissions / 1000; // kg -> tonnes
    const scope1 = bilanData.scope1 / 1000;
    const scope2 = bilanData.scope2 / 1000;
    const scope3 = (bilanData.scope3 || 0) / 1000;

    // Calcul des pourcentages
    const scope1Percent = totalEmissions > 0 ? (scope1 / totalEmissions) * 100 : 0;
    const scope2Percent = totalEmissions > 0 ? (scope2 / totalEmissions) * 100 : 0;
    const scope3Percent = totalEmissions > 0 ? (scope3 / totalEmissions) * 100 : 0;

    // Calcul des intensités
    const intensityPerEmployee = orgData.employees > 0 ? totalEmissions / orgData.employees : 0;
    const intensityPerM2 = orgData.surface > 0 ? (totalEmissions * 1000) / orgData.surface : 0; // kgCO2e/m²
    const intensityPerRevenue = orgData.revenue ? (totalEmissions * 1000) / (orgData.revenue / 1000) : undefined;

    // Analyse des postes
    const breakdown = bilanData.breakdown || [];
    const sortedPosts = [...breakdown].sort((a, b) => b.emissions - a.emissions);
    const top5 = sortedPosts.slice(0, 5);
    const top3 = sortedPosts.slice(0, 3);
    const topPosts = top3.length > 0 ? top3.map(p => this.humanizeCategory(p.category)).join(', ') : 'Non disponible';
    const topPostsPercent = top3.length > 0 ? top3.reduce((sum, p) => sum + (p.emissions / (totalEmissions * 1000)) * 100, 0) : 0;
    const topPoste = sortedPosts.length > 0 ? this.humanizeCategory(sortedPosts[0].category) : 'Non disponible';

    // Top 5 postes avec ranking pour Page 11
    const maxEmissions = sortedPosts.length > 0 ? sortedPosts[0].emissions : 1;
    const topPostsRanking = top5.map((post, index) => {
      const emissionsTonnes = post.emissions / 1000;
      const percent = totalEmissions > 0 ? (emissionsTonnes / totalEmissions) * 100 : 0;
      const scope = this.detectScope(post.category);
      return {
        position: index + 1,
        name: this.humanizeCategory(post.category) || 'Poste non identifié',
        value: Math.round(emissionsTonnes),
        percent: Math.round(percent),
        scope,
        barWidth: Math.round((post.emissions / maxEmissions) * 100)
      };
    });

    // Déterminer le scope dominant
    const scopeDominant = scope1Percent > scope2Percent && scope1Percent > scope3Percent ? '1' :
                         scope2Percent > scope3Percent ? '2' : '3';
    const scopeDominantPercent = scopeDominant === '1' ? scope1Percent :
                                scopeDominant === '2' ? scope2Percent : scope3Percent;

    // Benchmark (simplifié pour l'instant)
    const benchmarkStatus = intensityPerEmployee < 5 ? 'en dessous de la moyenne sectorielle' : 
                           intensityPerEmployee < 10 ? 'dans la moyenne sectorielle' :
                           'au-dessus de la moyenne sectorielle';

    // Pas d'objectif réglementaire inventé
    const reductionTarget = 0;

    // Commentaire analytique
    const analyticalComment = this.generateAnalyticalComment(scope1Percent, scope2Percent, scope3Percent, orgData.sector);

    // Breakdown par scope (convertir en tonnes et arrondir)
    const scope1Posts = breakdown
      .filter((p: any) => p.category?.toLowerCase().includes('scope 1') || p.emissions > 0)
      .slice(0, 5)
      .map((p: any) => ({
        name: this.humanizeCategory(p.category) || 'Poste non identifié',
        value: Math.round(p.emissions / 1000),
        percent: scope1 > 0 ? Math.round((p.emissions / 1000 / scope1) * 100) : 0,
        description: this.getPostDescription(this.humanizeCategory(p.category) || '')
      }));

    // Top poste Scope 1 et postes secondaires
    const scope1TopPoste = scope1Posts.length > 0 ? scope1Posts[0].name : 'Non disponible';
    const scope1SecondaryPostes = scope1Posts.length > 1 
      ? scope1Posts.slice(1, 3).map(p => p.name).join(', ')
      : 'autres postes';

    const scope2Posts = breakdown
      .filter((p: any) => p.category?.toLowerCase().includes('électricité') || p.category?.toLowerCase().includes('scope 2'))
      .slice(0, 5)
      .map((p: any) => ({
        name: this.humanizeCategory(p.category) || 'Électricité',
        value: Math.round(p.emissions / 1000),
        percent: scope2 > 0 ? Math.round((p.emissions / 1000 / scope2) * 100) : 0
      }));

    // Top poste Scope 2 et postes secondaires
    const scope2TopPoste = scope2Posts.length > 0 ? scope2Posts[0].name : 'Électricité';
    const scope2SecondaryPostes = scope2Posts.length > 1 
      ? scope2Posts.slice(1, 3).map(p => p.name).join(', ')
      : 'autres consommations énergétiques';

    // Formater la date d'édition
    const generatedDate = new Date().toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });

    // Méthode de consolidation (par défaut : contrôle opérationnel)
    const consolidationMethod = 'contrôle opérationnel';

    // Pilote de la démarche et nom complet : configurables dans Paramètres > Organisation
    const pilotName = orgData.pilotName || 'le pilote désigné au sein de l\'organisation';
    const companyFullName = orgData.legalName || orgData.name;

    return {
      companyName: orgData.name,
      companyFullName,
      sector: orgData.sector,
      employees: orgData.employees,
      sites: orgData.sites,
      surface: orgData.surface,
      revenue: orgData.revenue,
      year,
      country: orgData.country,
      generatedDate,
      consolidationMethod,
      pilotName,
      sitesInScope: orgData.sitesInScope || [],
      
      // Règle Bilan Carbone® : Arrondir sans décimales
      totalEmissions: Math.round(totalEmissions),
      scope1: Math.round(scope1),
      scope2: Math.round(scope2),
      scope3: Math.round(scope3),
      scope1Percent: Math.round(scope1Percent),
      scope2Percent: Math.round(scope2Percent),
      scope3Percent: Math.round(scope3Percent),
      
      // Intensités : arrondir à l'entier le plus proche
      intensityPerEmployee: Math.round(intensityPerEmployee),
      intensityPerM2: Math.round(intensityPerM2),
      intensityPerRevenue: intensityPerRevenue ? Math.round(intensityPerRevenue) : undefined,
      
      topPosts,
      topPostsPercent: Math.round(topPostsPercent),
      topPoste,
      scopeDominant,
      scopeDominantPercent: Math.round(scopeDominantPercent),
      benchmarkStatus,
      reductionTarget,
      analyticalComment,
      
      // Variables pour pages détaillées Scope 1 & 2
      scope1TopPoste,
      scope1SecondaryPostes,
      scope2TopPoste,
      scope2SecondaryPostes,
      
      // Top 5 ranking pour Page 11 et 17
      topPostsRanking,
      
      // Variables pour analyse Pareto (Page 17)
      paretoCount: 5,
      paretoPercent: Math.round(topPostsPercent),
      remainingPercent: Math.round(100 - topPostsPercent),
      
      scope1Posts: scope1Posts.length > 0 ? scope1Posts.map(p => ({
        ...p,
        value: Math.round(p.value),
        percent: Math.round(p.percent)
      })) : [{
        name: 'Émissions directes',
        value: Math.round(scope1),
        percent: 100,
        description: 'Émissions directes de l\'organisation'
      }],
      scope2Posts: scope2Posts.length > 0 ? scope2Posts.map(p => ({
        ...p,
        value: Math.round(p.value),
        percent: Math.round(p.percent)
      })) : [{
        name: 'Électricité',
        value: Math.round(scope2),
        percent: 100
      }],
      
      // Scope 3 Posts avec totalPercent pour Page 13
      scope3Posts: scope3 > 0 && breakdown.length > 0 ? breakdown
        .filter((p: any) => p.category?.toLowerCase().includes('scope 3'))
        .slice(0, 10)
        .map((p: any) => {
          const emissionsTonnes = p.emissions / 1000;
          const percentScope3 = scope3 > 0 ? (emissionsTonnes / scope3) * 100 : 0;
          const percentTotal = totalEmissions > 0 ? (emissionsTonnes / totalEmissions) * 100 : 0;
          return {
            name: this.humanizeCategory(p.category) || 'Poste Scope 3',
            value: Math.round(emissionsTonnes),
            percent: Math.round(percentScope3),
            totalPercent: Math.round(percentTotal),
            description: this.getPostDescription(this.humanizeCategory(p.category) || '')
          };
        }) : [],
      
      // Top 3 catégories Scope 3 pour Page 13
      scope3TopCategory1: scope3 > 0 && breakdown.length > 0 ? 
        this.humanizeCategory(breakdown.filter((p: any) => p.category?.toLowerCase().includes('scope 3'))[0]?.category || 'Achats de biens et services') : 
        'Achats de biens et services',
      scope3TopCategory2: scope3 > 0 && breakdown.length > 1 ? 
        this.humanizeCategory(breakdown.filter((p: any) => p.category?.toLowerCase().includes('scope 3'))[1]?.category || 'Transport et déplacements') : 
        'Transport et déplacements',
      scope3TopCategory3: scope3 > 0 && breakdown.length > 2 ? 
        this.humanizeCategory(breakdown.filter((p: any) => p.category?.toLowerCase().includes('scope 3'))[2]?.category || 'Autres postes') : 
        'Autres postes',
      
      // Variables pour Page 14 (Achats)
      scope3PurchasesEmissions: scope3 > 0 && breakdown.length > 0 ? 
        Math.round((breakdown.find((p: any) => p.category?.toLowerCase().includes('achat'))?.emissions || scope3 * 0.6 * 1000) / 1000) : 
        0,
      scope3PurchasesPercent: scope3 > 0 && breakdown.length > 0 ? 
        Math.round(((breakdown.find((p: any) => p.category?.toLowerCase().includes('achat'))?.emissions || scope3 * 0.6 * 1000) / (scope3 * 1000)) * 100) : 
        60,
      
      // Variables pour Page 15 (Transport)
      scope3TransportEmissions: scope3 > 0 && breakdown.length > 0 ? 
        Math.round((breakdown.find((p: any) => p.category?.toLowerCase().includes('transport') || p.category?.toLowerCase().includes('déplacement'))?.emissions || scope3 * 0.25 * 1000) / 1000) : 
        0,
      scope3TransportPercent: scope3 > 0 && breakdown.length > 0 ? 
        Math.round(((breakdown.find((p: any) => p.category?.toLowerCase().includes('transport') || p.category?.toLowerCase().includes('déplacement'))?.emissions || scope3 * 0.25 * 1000) / (scope3 * 1000)) * 100) : 
        25,
      
      // Variables pour Page 16 (Autres postes)
      scope3OtherEmissions: scope3 > 0 ? 
        Math.round(scope3 - ((breakdown.find((p: any) => p.category?.toLowerCase().includes('achat'))?.emissions || scope3 * 0.6 * 1000) / 1000) - ((breakdown.find((p: any) => p.category?.toLowerCase().includes('transport') || p.category?.toLowerCase().includes('déplacement'))?.emissions || scope3 * 0.25 * 1000) / 1000)) : 
        0,
      scope3OtherPercent: scope3 > 0 ? 
        Math.round((1 - 0.6 - 0.25) * 100) : 
        15,
      
      // Expert Scope 3 : déplacements, utilisation, fin de vie, top 3 achats (pour chunk IA)
      scope3AchatsTop3Details: scope3 > 0 && breakdown.length > 0
        ? (breakdown
            .filter((p: any) => /scope 3|achat|achats/i.test(p.category || ''))
            .slice(0, 3)
            .map((p: any) => `${p.category || 'Achats'}: ${Math.round(p.emissions / 1000)} tCO₂e`)
            .join(' ; ') || 'Non détaillé')
        : 'Non détaillé',
      scope3DeplacementsEmissions: scope3 > 0 && breakdown.length > 0
        ? Math.round((breakdown
            .filter((p: any) => /déplacement|domicile|voyage|trajet|professionnel/i.test(p.category || ''))
            .reduce((sum: number, p: any) => sum + p.emissions, 0)) / 1000)
        : 0,
      scope3UtilisationEmissions: scope3 > 0 && breakdown.length > 0
        ? Math.round((breakdown
            .filter((p: any) => /utilisation|produit vendu/i.test(p.category || ''))
            .reduce((sum: number, p: any) => sum + p.emissions, 0)) / 1000)
        : 0,
      scope3FinDeVieEmissions: scope3 > 0 && breakdown.length > 0
        ? Math.round((breakdown
            .filter((p: any) => /fin de vie|déchet|recyclage|élimination/i.test(p.category || ''))
            .reduce((sum: number, p: any) => sum + p.emissions, 0)) / 1000)
        : 0,
      
      // Variables pour Page 17 (Analyse consolidée)
      topPoste1: sortedPosts.length > 0 ? this.humanizeCategory(sortedPosts[0].category) : 'Non disponible',
      topPoste2: sortedPosts.length > 1 ? this.humanizeCategory(sortedPosts[1].category) : 'Non disponible',
      topPoste3: sortedPosts.length > 2 ? this.humanizeCategory(sortedPosts[2].category) : 'Non disponible',
      top3PostesPercent: Math.round(topPostsPercent),
      
      hasScope3: scope3 > 0,
      hasScope1: scope1 > 0,
      hasRevenue: !!orgData.revenue,
      logoUrl: orgData.logoUrl || null,
      companyInitial: orgData.name.charAt(0).toUpperCase(),
      orgLogoHtml: orgData.logoUrl
        ? `<img src="${orgData.logoUrl}" alt="${orgData.name}" class="report-running-logo" style="width: 28px; height: 28px; border-radius: 6px; object-fit: contain;" />`
        : `<div class="report-running-logo" style="width: 28px; height: 28px; background: linear-gradient(135deg, #0EA5E9 0%, #6366F1 100%); border-radius: 6px; display: flex; align-items: center; justify-content: center;"><span style="color: white; font-size: 13px; font-weight: 800;">${orgData.name.charAt(0)}</span></div>`,

      // ── Graphiques SVG inline (injectés directement dans le HTML) ──
      chartScopesDoughnut: svgDoughnutChart(
        [
          { label: 'Scope 1 — Directes', value: Math.round(scope1), color: '#0EA5E9' },
          { label: 'Scope 2 — Énergie', value: Math.round(scope2), color: '#F59E0B' },
          ...(scope3 > 0 ? [{ label: 'Scope 3 — Chaîne de valeur', value: Math.round(scope3), color: '#6366F1' }] : []),
        ],
        { title: 'Répartition des émissions par scope', width: 480, height: 280 }
      ),
      chartScopesBar: svgVerticalBarChart(
        [
          { label: 'Scope 1', value: Math.round(scope1), color: '#0EA5E9' },
          { label: 'Scope 2', value: Math.round(scope2), color: '#F59E0B' },
          ...(scope3 > 0 ? [{ label: 'Scope 3', value: Math.round(scope3), color: '#6366F1' }] : []),
        ],
        { title: 'Émissions par scope (tCO₂e)', width: 420, height: 280 }
      ),
      chartScope1Bars: svgHorizontalBarChart(
        scope1Posts.map(p => ({ label: p.name, value: Math.round(p.value) })),
        { title: 'Postes d\'émissions du Scope 1', color: '#0EA5E9', width: 520 }
      ),
      chartScope2Bars: svgHorizontalBarChart(
        scope2Posts.map(p => ({ label: p.name, value: Math.round(p.value) })),
        { title: 'Postes d\'émissions du Scope 2', color: '#F59E0B', width: 520 }
      ),
      chartScope3Bars: scope3 > 0 ? svgHorizontalBarChart(
        (breakdown || [])
          .filter((p: any) => p.category?.toLowerCase().includes('scope 3'))
          .slice(0, 8)
          .map((p: any) => ({ label: this.humanizeCategory(p.category) || 'Poste Scope 3', value: Math.round(p.emissions / 1000) })),
        { title: 'Postes d\'émissions du Scope 3', color: '#6366F1', width: 520 }
      ) : '',
      chartScope3Stacked: scope3 > 0 ? svgStackedBarChart(
        [
          { label: 'Achats', value: Math.round((breakdown.find((p: any) => p.category?.toLowerCase().includes('achat'))?.emissions || scope3 * 0.6 * 1000) / 1000), color: '#6366F1' },
          { label: 'Transport', value: Math.round((breakdown.find((p: any) => p.category?.toLowerCase().includes('transport') || p.category?.toLowerCase().includes('déplacement'))?.emissions || scope3 * 0.25 * 1000) / 1000), color: '#818CF8' },
          { label: 'Autres', value: Math.round(scope3 - ((breakdown.find((p: any) => p.category?.toLowerCase().includes('achat'))?.emissions || scope3 * 0.6 * 1000) / 1000) - ((breakdown.find((p: any) => p.category?.toLowerCase().includes('transport') || p.category?.toLowerCase().includes('déplacement'))?.emissions || scope3 * 0.25 * 1000) / 1000)), color: '#A5B4FC' },
        ],
        { title: 'Répartition des émissions Scope 3', width: 520, total: Math.round(scope3) }
      ) : '',
      chartTopPosts: svgHorizontalBarChart(
        top5.map((p, i) => ({
          label: this.humanizeCategory(p.category) || 'Poste non identifié',
          value: Math.round(p.emissions / 1000),
          color: ['#0EA5E9', '#38BDF8', '#F59E0B', '#6366F1', '#818CF8'][i % 5],
        })),
        { title: 'Top 5 des postes émetteurs', width: 520 }
      ),
      chartTrajectory: svgTrajectoryChart(
        year,
        Math.round(totalEmissions),
        2030,
        42,
        { title: 'Trajectoire de réduction alignée Accord de Paris', width: 520, height: 280 }
      ),
      htmlScopeCards: htmlScopeCards({
        scope1: Math.round(scope1),
        scope2: Math.round(scope2),
        scope3: Math.round(scope3),
        scope1Percent: Math.round(scope1Percent),
        scope2Percent: Math.round(scope2Percent),
        scope3Percent: Math.round(scope3Percent),
        hasScope3: scope3 > 0,
      }),
      htmlIntensityCards: htmlIntensityCards({
        intensityPerEmployee: Math.round(intensityPerEmployee),
        intensityPerM2: Math.round(intensityPerM2),
        intensityPerRevenue: intensityPerRevenue ? Math.round(intensityPerRevenue) : undefined,
        hasRevenue: !!orgData.revenue,
      }),
      htmlTopPostsTable: htmlTopPostsTable(
        topPostsRanking.map(p => ({ name: p.name, value: p.value, percent: p.percent, scope: p.scope })),
        { title: 'Classement des postes les plus contributeurs' }
      ),

      // ── Analyse comparative par site ──
      siteBreakdowns: siteBreakdownsRaw.map(s => ({
        ...s,
        scope1Pct: s.total > 0 ? Math.round((s.scope1 / s.total) * 100) : 0,
        scope2Pct: s.total > 0 ? Math.round((s.scope2 / s.total) * 100) : 0,
        scope3Pct: s.total > 0 ? Math.round((s.scope3 / s.total) * 100) : 0,
      })),
      chartSiteComparison: siteBreakdownsRaw.length > 0
        ? svgSiteComparisonChart(
            siteBreakdownsRaw.map(s => ({
              name: s.name,
              scope1: s.scope1,
              scope2: s.scope2,
              scope3: s.scope3,
              total: s.total,
            })),
            { title: 'Émissions par site et par scope (tCO₂e)', width: 520, height: 320 }
          )
        : '',
    };
  }

  /**
   * Rend un template avec les données
   * Remplace les variables {{variable}} par les valeurs réelles
   */
  private static renderTemplate(template: string, data: ReportData): string {
    let rendered = template;

    // Remplacer toutes les variables simples {{variable}}
    Object.entries(data).forEach(([key, value]) => {
      if (typeof value === 'string' || typeof value === 'number') {
        const regex = new RegExp(`{{${key}}}`, 'g');
        rendered = rendered.replace(regex, String(value));
      }
    });

    // Gérer les conditionnels {{#if variable}}...{{/if}}
    rendered = this.handleConditionals(rendered, data);

    // Gérer les boucles {{#each array}}...{{/each}}
    rendered = this.handleLoops(rendered, data);

    // Harmoniser toutes les couleurs sur la palette éditoriale du rapport
    return applyReportPalette(rendered);
  }

  /**
   * Gère les conditionnels dans les templates
   */
  private static handleConditionals(template: string, data: any): string {
    let rendered = template;

    // Pattern pour {{#if variable}}...{{else}}...{{/if}} (avec else optionnel)
    const ifElsePattern = /{{#if\s+(\w+)}}([\s\S]*?){{else}}([\s\S]*?){{\/if}}/g;
    rendered = rendered.replace(ifElsePattern, (match, variable, ifContent, elseContent) => {
      const value = data[variable];
      return value ? ifContent : elseContent;
    });

    // Pattern pour {{#if variable}}...{{/if}} (sans else)
    const ifPattern = /{{#if\s+(\w+)}}([\s\S]*?){{\/if}}/g;
    rendered = rendered.replace(ifPattern, (match, variable, content) => {
      const value = data[variable];
      return value ? content : '';
    });

    return rendered;
  }

  /**
   * Gère les boucles dans les templates
   */
  private static handleLoops(template: string, data: any): string {
    let rendered = template;

    // Pattern pour {{#each array}}...{{/each}}
    const eachPattern = /{{#each\s+(\w+)}}([\s\S]*?){{\/each}}/g;
    
    rendered = rendered.replace(eachPattern, (match, arrayName, itemTemplate) => {
      const array = data[arrayName];
      if (!Array.isArray(array)) return '';

      return array.map(item => {
        let itemRendered = itemTemplate;
        Object.entries(item).forEach(([key, value]) => {
          const regex = new RegExp(`{{${key}}}`, 'g');
          itemRendered = itemRendered.replace(regex, String(value));
        });
        return itemRendered;
      }).join('');
    });

    return rendered;
  }

  /**
   * Génère un commentaire analytique basé sur les données
   */
  private static generateAnalyticalComment(
    scope1Percent: number,
    scope2Percent: number,
    scope3Percent: number,
    sector: string
  ): string {
    if (scope1Percent > 50) {
      return `Les émissions directes (Scope 1) représentent la majorité du bilan avec ${scope1Percent.toFixed(0)}%. Cela indique une forte dépendance aux combustibles fossiles et suggère des opportunités de réduction via l'électrification et l'efficacité énergétique.`;
    } else if (scope2Percent > 50) {
      return `Les émissions indirectes liées à l'énergie (Scope 2) dominent le bilan avec ${scope2Percent.toFixed(0)}%. La transition vers des sources d'énergie renouvelable et l'amélioration de l'efficacité énergétique sont les leviers prioritaires.`;
    } else {
      return `Le bilan présente une répartition équilibrée entre Scope 1 (${scope1Percent.toFixed(0)}%) et Scope 2 (${scope2Percent.toFixed(0)}%). Une approche globale combinant électrification, énergies renouvelables et efficacité énergétique est recommandée.`;
    }
  }

  /**
   * Détecte le scope d'un poste d'émission
   */
  private static detectScope(category: string): number {
    const categoryLower = category.toLowerCase();
    
    // Scope 1 : émissions directes
    if (categoryLower.includes('scope 1') || 
        categoryLower.includes('combustion') || 
        categoryLower.includes('véhicule') ||
        categoryLower.includes('gaz') ||
        categoryLower.includes('fioul') ||
        categoryLower.includes('fugitive')) {
      return 1;
    }
    
    // Scope 3 : chaîne de valeur
    if (categoryLower.includes('scope 3') ||
        categoryLower.includes('achat') ||
        categoryLower.includes('transport') ||
        categoryLower.includes('déplacement') ||
        categoryLower.includes('déchet') ||
        categoryLower.includes('fret')) {
      return 3;
    }
    
    // Scope 2 par défaut (électricité, énergie)
    return 2;
  }

  /**
   * Convertit un slug technique en nom français lisible pour le rapport
   */
  private static humanizeCategory(slug: string): string {
    if (!slug) return 'Poste non identifié';

    const labels: Record<string, string> = {
      // Scope 1
      'scope1': 'Émissions directes',
      'essence_sans_plomb': 'Essence sans plomb',
      'gasoil': 'Gasoil',
      'gasoil_super': 'Gasoil super',
      'diesel': 'Diesel',
      'fossil_gas': 'Gaz naturel',
      'fossil_fuel_oil': 'Fioul domestique',
      'propane': 'Propane',
      'butane': 'Butane',
      'r410a': 'Fluide frigorigène R410A',
      'r22': 'Fluide frigorigène R22',
      'r134a': 'Fluide frigorigène R134a',
      // Scope 2
      'scope2': 'Énergie indirecte',
      'electricity': 'Électricité',
      'district_heating': 'Réseau de chaleur',
      // Scope 3 — catégories GHG Protocol
      'cat1_purchased_goods': 'Achats de biens et services',
      'cat2_capital_goods': 'Biens d\'équipement (CAPEX)',
      'cat3_fuel_energy': 'Énergie amont',
      'cat4_upstream_transport': 'Transport amont',
      'cat5_waste': 'Déchets',
      'cat6_business_travel': 'Déplacements professionnels',
      'cat7_employee_commuting': 'Trajets domicile-travail',
      'cat8_upstream_leased': 'Actifs loués amont',
      'cat9_downstream_transport': 'Transport aval',
      'cat10_processing': 'Transformation des produits',
      'cat11_use_of_sold': 'Utilisation des produits vendus',
      'cat12_end_of_life': 'Fin de vie des produits',
      'cat13_downstream_leased': 'Actifs loués aval',
      'cat14_franchises': 'Franchises',
      'cat15_investments': 'Investissements',
      // Sous-catégories Scope 3 courantes
      'cat1_purchased_goods_eur': 'Achats de biens (monétaire)',
      'cat6_flight_short': 'Vol court-courrier',
      'cat6_flight_medium': 'Vol moyen-courrier',
      'cat6_flight_long': 'Vol long-courrier',
      'cat6_train': 'Train (déplacements pro)',
      'cat6_rental_car': 'Voiture de location',
      'cat7_car_km': 'Voiture (domicile-travail)',
      'cat7_public_transport': 'Transport en commun',
      'cat13_leased_vehicles_km': 'Véhicules loués (km)',
      'cat12_vhu': 'Véhicules hors d\'usage',
      'cat5_used_oils': 'Huiles usagées collectées',
      'cat5_unsorted_waste': 'Déchets non triés',
      'cat5_tires': 'Pneus usagés',
      'cat4_road_freight': 'Transport routier marchandises',
      'cat4_maritime_roro': 'Transport maritime Ro-Ro',
      'cat9_road_freight': 'Transport routier aval',
      'cat2_capex_equipment': 'CAPEX Équipements',
      'cat2_capex_it': 'Équipements informatiques',
      'cat1_services': 'Services sous-traités',
      'cat1_paper': 'Papier imprimé',
    };

    // Essayer le slug complet d'abord
    const lower = slug.toLowerCase().trim();
    if (labels[lower]) return labels[lower];

    // Si format composite "prefix:suffix", essayer le suffix
    if (lower.includes(':')) {
      const suffix = lower.split(':').pop() || '';
      if (labels[suffix]) return labels[suffix];
      // Essayer le prefix aussi
      const prefix = lower.split(':')[0];
      if (labels[prefix]) return labels[prefix];
    }

    // Dernier recours : nettoyer le slug pour le rendre lisible
    const cleaned = slug
      .replace(/^(scope[123]|cat\d+_\w+):/, '') // retirer le prefix scope/cat
      .replace(/^cat\d+_/, '')                   // retirer catN_
      .replace(/_/g, ' ')                        // underscores → espaces
      .replace(/\b\w/g, c => c.toUpperCase());   // capitaliser chaque mot

    return cleaned || 'Poste non identifié';
  }

  /**
   * Retourne une description pour un poste d'émission
   */
  private static getPostDescription(category: string): string {
    const descriptions: Record<string, string> = {
      'Électricité': 'Consommation électrique des bâtiments et équipements',
      'Essence Sans Plomb': 'Carburant pour véhicules légers de la flotte',
      'Gasoil': 'Carburant pour véhicules utilitaires et poids lourds',
      'Gaz Naturel': 'Combustible pour chauffage et procédés',
      'Fioul': 'Combustible pour chauffage et groupes électrogènes',
      'R410A': 'Fluide frigorigène pour climatisation',
      'R22': 'Fluide frigorigène (ancien, à remplacer)',
      'R21': 'Fluide frigorigène'
    };

    return descriptions[category] || 'Poste d\'émission';
  }

  // Templates HTML par défaut (fallback)
  // Ces templates sont maintenant stockés en base de données
  // Ils ne sont utilisés que si la base de données est vide
  
  private static getCoverTemplate(): string {
    const P = REPORT_PALETTE;
    return `
      <div class="report-cover" style="position: relative; width: 100%; min-height: 297mm; background: ${P.paper}; font-family: Inter, -apple-system, sans-serif; overflow: hidden;">

        <!-- Bandeau vert dégradé + vague en S -->
        <div style="position: absolute; top: 0; left: 0; right: 0; height: 200mm; background: linear-gradient(150deg, #0B3B33 0%, #14544A 55%, #1E6B54 100%);"></div>
        <div style="position: absolute; top: 140mm; left: 0; right: 0; height: 62mm; line-height: 0;">
          <svg viewBox="0 0 1000 240" preserveAspectRatio="none" style="width: 100%; height: 62mm; display: block;">
            <path d="M0,196 C170,196 250,120 420,84 C600,44 760,36 1000,36 L1000,240 L0,240 Z" fill="${P.paper}"></path>
          </svg>
        </div>

        <!-- Cercles décoratifs -->
        <div style="position: absolute; top: -30mm; right: -22mm; width: 112mm; height: 112mm; border-radius: 50%; border: 1px solid rgba(255,255,255,0.10);"></div>
        <div style="position: absolute; top: -12mm; right: -4mm; width: 72mm; height: 72mm; border-radius: 50%; border: 1px solid rgba(255,255,255,0.07);"></div>
        <div style="position: absolute; top: 14mm; right: 56mm; width: 2.6mm; height: 2.6mm; border-radius: 50%; background: ${P.accent};"></div>
        <svg style="position: absolute; top: 5mm; right: 12mm; width: 58mm; height: 78mm;" viewBox="0 0 200 270" fill="none">
          <path d="M52 6 C150 62, 176 172, 150 226" stroke="${P.accent}" stroke-width="8" stroke-linecap="round"></path>
          <circle cx="150" cy="232" r="11" fill="${P.accent}"></circle>
        </svg>

        <!-- Logo / nom court -->
        <div style="position: absolute; z-index: 3; top: 16mm; left: 16mm; right: 16mm;">
          <div style="display: flex; align-items: center; gap: 12px;">
            {{#if logoUrl}}
            <img src="{{logoUrl}}" alt="{{companyName}}" style="width: 42px; height: 42px; border-radius: 10px; object-fit: contain; background: #FFFFFF; padding: 4px;" />
            {{else}}
            <div style="width: 42px; height: 42px; background: #FFFFFF; border-radius: 10px; display: flex; align-items: center; justify-content: center;">
              <span style="color: ${P.deep}; font-size: 21px; font-weight: 800;">{{companyInitial}}</span>
            </div>
            {{/if}}
            <span style="font-size: 18px; font-weight: 800; color: #FFFFFF; letter-spacing: 2px;">{{companyName}}</span>
          </div>
        </div>

        <!-- Bloc titre -->
        <div style="position: absolute; z-index: 3; top: 44mm; left: 16mm; width: 98mm;">
          <p style="margin: 0 0 7px 0; font-size: 11px; font-weight: 700; letter-spacing: 4px; text-transform: uppercase; color: ${P.accent};">Rapport d'inventaire GES</p>
          <div style="width: 17mm; height: 3.5px; background: ${P.accent}; border-radius: 2px; margin-bottom: 9mm;"></div>
          <h1 style="margin: 0; font-size: 60px; line-height: 1.02; font-weight: 800; color: #FFFFFF; letter-spacing: -1.5px; text-transform: uppercase;">Bilan<br/>Carbone<span style="font-size: 24px; vertical-align: baseline;">®</span></h1>
          <p style="margin: 10px 0 0 0; font-size: 19px; line-height: 1.32; font-weight: 500; color: rgba(255,255,255,0.92); max-width: 94mm;">{{companyFullName}}</p>
        </div>

        <!-- Sphère CO2e -->
        <div style="position: absolute; z-index: 3; top: 88mm; right: 16mm; width: 50mm; height: 50mm;">
          <div style="position: absolute; inset: 0; border-radius: 50%; background: radial-gradient(circle at 30% 26%, #E4FCB8 0%, #A6E87F 45%, #6FC07A 100%); box-shadow: 0 10px 26px rgba(0,0,0,0.22);"></div>
          <svg viewBox="0 0 200 200" style="position: absolute; inset: 0; width: 100%; height: 100%;" fill="none">
            <defs><clipPath id="sphClip"><circle cx="100" cy="100" r="100"></circle></clipPath></defs>
            <g clip-path="url(#sphClip)" stroke="rgba(255,255,255,0.55)" stroke-width="3" fill="none">
              <path d="M40 0 C22 70, 26 140, 52 200"></path>
              <path d="M100 0 C92 70, 94 140, 104 200"></path>
              <path d="M160 0 C176 70, 172 140, 150 200"></path>
            </g>
            <g clip-path="url(#sphClip)" stroke="rgba(255,255,255,0.35)" stroke-width="3" fill="none">
              <path d="M0 62 C60 44, 140 44, 200 62"></path>
              <path d="M0 138 C60 156, 140 156, 200 138"></path>
            </g>
          </svg>
          <div style="position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;">
            <span style="font-size: 26px; font-weight: 800; color: ${P.deep}; letter-spacing: -0.5px;">CO₂e</span>
          </div>
        </div>

        <!-- Bloc bas : exercice + méta -->
        <div style="position: absolute; z-index: 3; left: 16mm; right: 16mm; top: 196mm;">
          <p style="margin: 0 0 5px 0; font-size: 10.5px; font-weight: 700; letter-spacing: 3px; text-transform: uppercase; color: ${P.institutional};">Exercice de référence</p>
          <p style="margin: 0 0 9mm 0; font-size: 56px; font-weight: 800; color: ${P.night}; letter-spacing: -2px; line-height: 1;">{{year}}</p>

          <div style="border-top: 1px solid ${P.divider}; border-bottom: 1px solid ${P.divider}; padding: 7mm 0; display: flex; gap: 8mm;">
            <div style="flex: 1;">
              <p style="margin: 0 0 6px 0; font-size: 9px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; color: ${P.muted};">Périmètre</p>
              <p style="margin: 0; font-size: 15px; font-weight: 700; color: ${P.night};">{{sites}} site(s) analysé(s)</p>
            </div>
            <div style="flex: 1;">
              <p style="margin: 0 0 6px 0; font-size: 9px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; color: ${P.muted};">Couverture</p>
              <p style="margin: 0; font-size: 15px; font-weight: 700; color: ${P.night};">{{#if hasScope3}}Scopes 1, 2 et 3{{else}}Scopes 1 et 2{{/if}}</p>
            </div>
            <div style="flex: 1;">
              <p style="margin: 0 0 6px 0; font-size: 9px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; color: ${P.muted};">Unité de restitution</p>
              <p style="margin: 0; font-size: 15px; font-weight: 700; color: ${P.night};">tCO₂e</p>
            </div>
          </div>

          <div style="padding-top: 7mm;">
            <p style="margin: 0 0 5px 0; font-size: 9px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; color: ${P.institutional};">Référentiels mobilisés</p>
            <p style="margin: 0; font-size: 13px; color: ${P.body};">Calcul interne CarboScan — non vérifié par un tiers</p>
          </div>
        </div>

        <!-- Pied de page -->
        <div style="position: absolute; z-index: 3; bottom: 0; left: 0; right: 0; background: ${P.night}; padding: 6mm 16mm; display: flex; justify-content: space-between; align-items: center;">
          <p style="margin: 0; font-size: 11px; color: #FFFFFF;"><strong style="letter-spacing: 1px;">CARBOSCAN</strong> <span style="color: rgba(255,255,255,0.7); margin-left: 8px;">Plateforme de comptabilité carbone</span></p>
          <p style="margin: 0; font-size: 11px; font-weight: 700; color: ${P.accent};">{{generatedDate}}</p>
        </div>
      </div>
    `;
  }


  private static getExecutiveSummaryTemplate(): string {
    const P = 'font-size: 14px; line-height: 1.8; color: #334155; margin-bottom: 16px; text-align: justify;';
    const H3 = 'font-size: 16px; font-weight: 600; color: #1e293b; margin: 24px 0 12px 0;';
    return `
      ${reportPageOpen("Executive summary")}
        <p style="${P}">Le présent bilan carbone permet de quantifier les émissions totales de gaz à effet de serre de <strong>{{companyName}}</strong> sur l'année <strong>{{year}}</strong>. Les émissions totales s'élèvent à <strong>{{totalEmissions}} tCO₂e</strong>.</p>

        <p style="${P}">{{#if hasScope3}}Les résultats mettent en évidence une prédominance des émissions indirectes du Scope {{scopeDominant}}, qui représente <strong>{{scopeDominantPercent}} %</strong> des émissions totales. Le Scope 1 (émissions directes) représente <strong>{{scope1Percent}} %</strong>, le Scope 2 (énergie achetée) <strong>{{scope2Percent}} %</strong> et le Scope 3 (chaîne de valeur) <strong>{{scope3Percent}} %</strong>.{{else}}Le Scope 1 (émissions directes) représente <strong>{{scope1Percent}} %</strong> et le Scope 2 (énergie achetée) <strong>{{scope2Percent}} %</strong> des émissions totales.{{/if}}</p>

        <p style="${P}">Ce diagnostic constitue une base de référence structurante pour le pilotage carbone futur et l'identification de leviers d'action prioritaires.</p>

        <h3 style="${H3}">Répartition des émissions par scope</h3>

        <div style="margin: 16px 0; display: flex; justify-content: center;">
          {{chartScopesDoughnut}}
        </div>
      ${reportPageClose()}
    `;
  }

  private static getOrganizationTemplate(): string {
    const P = 'font-size: 14px; line-height: 1.8; color: #334155; margin-bottom: 16px; text-align: justify;';
    const H3 = 'font-size: 16px; font-weight: 600; color: #1e293b; margin: 24px 0 12px 0;';
    return `
      ${reportPageOpen("Présentation de l'entreprise")}
        <p style="${P}"><strong>{{companyName}}</strong> opère dans le secteur <strong>{{sector}}</strong> en <strong>{{country}}</strong>. L'organisation est structurée autour de <strong>{{sites}} site(s)</strong> opérationnels et mobilise des fonctions commerciales, techniques et support.</p>

        <h3 style="${H3}">Données clés</h3>

        <p style="font-size: 14px; line-height: 1.7; color: #334155; margin-bottom: 8px; padding-left: 16px;">• <strong>Effectif</strong> : {{employees}} collaborateurs</p>
        <p style="font-size: 14px; line-height: 1.7; color: #334155; margin-bottom: 8px; padding-left: 16px;">• <strong>Sites</strong> : {{sites}} site(s) en {{country}}</p>
        <p style="font-size: 14px; line-height: 1.7; color: #334155; margin-bottom: 8px; padding-left: 16px;">• <strong>Surface</strong> : {{surface}} m²</p>
        {{#if hasRevenue}}
        <p style="font-size: 14px; line-height: 1.7; color: #334155; margin-bottom: 8px; padding-left: 16px;">• <strong>Chiffre d'affaires</strong> : {{revenue}} TND</p>
        {{/if}}
        <p style="font-size: 14px; line-height: 1.7; color: #334155; margin-bottom: 8px; padding-left: 16px;">• <strong>Secteur</strong> : {{sector}}</p>
        <p style="font-size: 14px; line-height: 1.7; color: #334155; margin-bottom: 16px; padding-left: 16px;">• <strong>Année de référence</strong> : {{year}}</p>

        <h3 style="${H3}">Implantations</h3>

        {{#each sitesInScope}}
        <p style="font-size: 14px; line-height: 1.7; color: #334155; margin-bottom: 8px; padding-left: 16px;">• <strong>{{name}}</strong> — {{city}}, {{country}}</p>
        {{/each}}
      ${reportPageClose()}
    `;
  }

  // NOTE: getObjectivesTemplate is now in ReportTemplatesExtra.ts (objectivesTpl)

  private static getMethodologyTemplate(): string {
    const P = 'font-size: 14px; line-height: 1.8; color: #334155; margin-bottom: 16px; text-align: justify;';
    const H3 = 'font-size: 16px; font-weight: 600; color: #1e293b; margin: 24px 0 12px 0;';
    const BOX = 'background: #f8fafc; border-left: 4px solid #64748b; padding: 16px 20px; margin: 16px 0; border-radius: 0 8px 8px 0; font-size: 13px; line-height: 1.7; color: #334155;';
    const LI = 'font-size: 14px; line-height: 1.7; color: #334155; margin-bottom: 8px; padding-left: 16px;';
    return `
      ${reportPageOpen("Référentiels et cadre méthodologique")}
        <p style="${P}">Le bilan carbone a été réalisé conformément aux référentiels suivants :</p>

        <p style="${LI}">• <strong>GHG Protocol — Corporate Standard</strong> : standard international de comptabilité et de reporting des émissions de gaz à effet de serre.</p>
        <p style="${LI}">• <strong>Méthode Bilan Carbone®</strong> : méthode de référence développée par l'ADEME pour la comptabilité carbone des organisations.</p>
        <p style="${LI}">• <strong>Base Carbone® de l'ADEME</strong> : base de données de facteurs d'émission utilisée pour la conversion des données d'activité en émissions de CO₂ équivalent.</p>

        <p style="${P}">Ces référentiels garantissent la cohérence, la comparabilité et la robustesse des résultats présentés.</p>

        <h3 style="${H3}">Principe de calcul</h3>

        <div style="${BOX}">
          <strong>Formule :</strong> Émissions (kgCO₂e) = Donnée d'activité × Facteur d'émission
        </div>

        <p style="${P}">La quantification des émissions repose sur l'application de facteurs d'émission aux données d'activité collectées auprès de l'organisation. Les facteurs d'émission proviennent de la Base Carbone® ADEME, complétés par les facteurs spécifiques de l'organisation lorsque disponibles.</p>

        <h3 style="${H3}">Outil de calcul</h3>

        <p style="${P}">Les calculs ont été réalisés via la plateforme <strong>CarboScan</strong>, qui assure la traçabilité des données saisies, l'application automatique des facteurs d'émission et la génération des résultats par scope et par poste. L'outil garantit la reproductibilité des calculs et la cohérence méthodologique.</p>
      ${reportPageClose()}
    `;
  }

  private static getResultsTemplate(): string {
    const P = 'font-size: 14px; line-height: 1.8; color: #334155; margin-bottom: 16px; text-align: justify;';
    const H3 = 'font-size: 16px; font-weight: 600; color: #1e293b; margin: 24px 0 12px 0;';
    return `
      ${reportPageOpen("Résultats globaux")}
        <p style="${P}">Les émissions totales de <strong>{{companyName}}</strong> pour l'année <strong>{{year}}</strong> s'élèvent à <strong>{{totalEmissions}} tCO₂e</strong>. La répartition par scope met en évidence le poids dominant des émissions {{#if hasScope3}}indirectes du Scope 3{{else}}directes du Scope 1{{/if}}, devant les autres périmètres.</p>

        <h3 style="${H3}">Répartition par scope</h3>

        <p style="${P}">Scope 1 (émissions directes) : <strong>{{scope1}} tCO₂e</strong> — <strong>{{scope1Percent}} %</strong>. Scope 2 (énergie achetée) : <strong>{{scope2}} tCO₂e</strong> — <strong>{{scope2Percent}} %</strong>.{{#if hasScope3}} Scope 3 (chaîne de valeur) : <strong>{{scope3}} tCO₂e</strong> — <strong>{{scope3Percent}} %</strong>.{{/if}}</p>

        <div style="margin: 20px 0;">
          {{chartScopesBar}}
        </div>
      ${reportPageClose()}
    `;
  }

  private static getScope1DetailTemplate(): string {
    const P = 'font-size: 14px; line-height: 1.8; color: #334155; margin-bottom: 16px; text-align: justify;';
    const H3 = 'font-size: 16px; font-weight: 600; color: #1e293b; margin: 24px 0 12px 0;';
    return `
      ${reportPageOpen("Résultats Scope 1")}
        <p style="${P}">Les émissions du Scope 1 de <strong>{{companyName}}</strong> s'élèvent à <strong>{{scope1}} tCO₂e</strong>, soit <strong>{{scope1Percent}} %</strong> du bilan total. Elles sont principalement liées à la consommation directe de carburants et aux déplacements réalisés avec des véhicules sous contrôle direct de l'entreprise.</p>

        <h3 style="${H3}">Postes d'émissions</h3>

        <p style="${P}">Le poste principal est <strong>{{scope1TopPoste}}</strong>. Les postes secondaires identifiés sont {{scope1SecondaryPostes}}.</p>

        <div style="margin: 20px 0;">
          {{chartScope1Bars}}
        </div>
      ${reportPageClose()}
    `;
  }

  private static getScope2DetailTemplate(): string {
    const P = 'font-size: 14px; line-height: 1.8; color: #334155; margin-bottom: 16px; text-align: justify;';
    const H3 = 'font-size: 16px; font-weight: 600; color: #1e293b; margin: 24px 0 12px 0;';
    return `
      ${reportPageOpen("Résultats Scope 2")}
        <p style="${P}">Les émissions du Scope 2 de <strong>{{companyName}}</strong> s'élèvent à <strong>{{scope2}} tCO₂e</strong>, soit <strong>{{scope2Percent}} %</strong> du bilan total. Elles correspondent aux consommations d'électricité achetée pour les besoins des sites. Elles reflètent le mix énergétique utilisé pour la production de l'électricité consommée.</p>

        <h3 style="${H3}">Postes d'émissions</h3>

        <p style="${P}">Le poste principal est <strong>{{scope2TopPoste}}</strong>. Les postes secondaires sont {{scope2SecondaryPostes}}.</p>

        <div style="margin: 20px 0;">
          {{chartScope2Bars}}
        </div>
      ${reportPageClose()}
    `;
  }

  // NOTE: getActionPlanSimpleTemplate removed in v2 — merged into getActionPlanTemplate

  private static getAnalysisTemplate(): string {
    const P = 'font-size: 14px; line-height: 1.8; color: #334155; margin-bottom: 16px; text-align: justify;';
    const H3 = 'font-size: 16px; font-weight: 600; color: #1e293b; margin: 24px 0 12px 0;';
    return `
      ${reportPageOpen("Analyse des postes les plus émetteurs")}
        <p style="${P}">L'analyse met en évidence un nombre limité de postes concentrant l'essentiel des émissions de <strong>{{companyName}}</strong>, en particulier au sein du Scope {{scopeDominant}} (<strong>{{scopeDominantPercent}} %</strong> du total). Ces postes constituent des leviers prioritaires d'action.</p>

        <h3 style="${H3}">Concentration des émissions</h3>

        <p style="${P}">Les <strong>{{paretoCount}} premiers postes</strong> concentrent <strong>{{paretoPercent}} %</strong> des émissions totales. Les {{remainingPercent}} % restants se répartissent sur l'ensemble des autres postes. Cette concentration confirme l'intérêt d'une approche ciblée.</p>

        <div style="margin: 20px 0;">
          {{chartTopPosts}}
        </div>
      ${reportPageClose()}
    `;
  }

  private static getActionPlanTemplate(): string {
    const P = 'font-size: 14px; line-height: 1.8; color: #334155; margin-bottom: 16px; text-align: justify;';
    const H3 = 'font-size: 16px; font-weight: 600; color: #1e293b; margin: 24px 0 12px 0;';
    const LI = 'font-size: 14px; line-height: 1.7; color: #334155; margin-bottom: 8px; padding-left: 16px;';
    return `
      ${reportPageOpen("Plan d'actions et recommandations")}
        <p style="${P}">Un ensemble d'actions hiérarchisées est proposé afin de réduire progressivement les émissions de gaz à effet de serre de <strong>{{companyName}}</strong>, en tenant compte de leur faisabilité technique et économique.</p>

        <h3 style="${H3}">Actions prioritaires — Court terme (0-12 mois)</h3>

        <p style="${LI}">• Formation à l'éco-conduite pour les conducteurs de la flotte.</p>
        <p style="${LI}">• Audit énergétique des bâtiments et remplacement de l'éclairage par des solutions LED.</p>
        <p style="${LI}">• Maintenance préventive des systèmes de climatisation (fuites de fluides frigorigènes).</p>
        <p style="${LI}">• Mise en place du tri sélectif et suivi quantitatif des déchets.</p>

        <h3 style="${H3}">Actions structurelles — Moyen terme (1-3 ans)</h3>

        <p style="${LI}">• Électrification progressive de la flotte de véhicules.</p>
        <p style="${LI}">• Installation de panneaux photovoltaïques en autoconsommation.</p>
        <p style="${LI}">• Intégration de critères environnementaux dans la politique d'achats.</p>
        <p style="${LI}">• Développement du covoiturage et des mobilités douces.</p>

        {{#if hasScope3}}
        <h3 style="${H3}">Actions Scope 3 — Long terme</h3>

        <p style="${LI}">• Engagement des fournisseurs stratégiques via une charte carbone.</p>
        <p style="${LI}">• Optimisation logistique et consolidation des flux de transport.</p>
        <p style="${LI}">• Démarche d'économie circulaire (réemploi, reconditionnement).</p>
        {{/if}}

        <div style="margin: 20px 0;">
          {{chartTrajectory}}
        </div>
      ${reportPageClose()}
    `;
  }

  // NOTE: getRecommendationsTemplate, getConclusionTemplate, getAnnexesTemplate, getAnnexesEndTemplate
  // removed in v2 — content merged into ActionPlan (page 24) and Conclusion (page 25, in ReportTemplatesExtra.ts)
}
