/**
 * @deprecated LEGACY — NON RÉGLEMENTAIRE
 * Calculs clients React + Proxy Supabase. Les totaux officiels / publiés
 * DOIVENT passer par `@newcarboscan/carbon-engine` + POST /v1/calculate + ledger.
 * Voir docs/ENGINE_INVENTORY.md et docs/PRIORITY_5_ACTIONS.md.
 *
 * Service de calcul pour le Bilan Carbone (compat UI historique uniquement).
 */

import { ActivityDataService } from '../activity-data/ActivityDataService';
import { ActivityDataFilters } from '../activity-data/types';
import { api } from "@/integrations/api/client";
import { logger } from '@/utils/logger';

// Cache des facteurs d'émission pour éviter les requêtes répétées
// TTL pour éviter les données stale entre sessions/tenants
const BASE_CACHE_TTL = 10 * 60 * 1000; // 10 minutes pour les FE de base (rarement modifiés)
const ORG_CACHE_TTL = 5 * 60 * 1000;   // 5 minutes pour les FE org (modifiés par les admins)

let cachedEmissionFactors: Map<string, number> | null = null;
let cachedEmissionFactorsTimestamp = 0;
let cachedOrgFactors: Map<string, number> | null = null;
let cachedOrgFactorsTimestamp = 0;
let cachedOrgId: string | null = null;

/**
 * Invalider le cache des facteurs d'émission
 * À appeler lorsque les FE sont modifiés
 */
export function invalidateEmissionFactorCache() {
  cachedEmissionFactors = null;
  cachedEmissionFactorsTimestamp = 0;
  cachedOrgFactors = null;
  cachedOrgFactorsTimestamp = 0;
  cachedOrgId = null;
  logger.debug('🔄 Cache des facteurs d\'émission invalidé');
}

export interface MissingEmissionFactor {
  subcategory: string;
  activityType: string;
  quantity: number;
  unit: string;
  scopeHint: number | null;
}

/**
 * Détail d'une ligne de calcul pour la traçabilité
 */
export interface EmissionLineDetail {
  category: string;
  subcategory: string;
  quantity: number;
  unit: string;
  emissionFactor: number;
  emissionFactorUnit: string;
  emissionFactorSource: 'ADEME/Organisation' | 'ADEME/Taxonomie' | 'ADEME/Base' | 'Non trouvé';
  emissions: number;
  scope: 1 | 2 | 3;
  dataQuality: 'real' | 'estimated' | 'default';
}

export interface BilanCarboneResult {
  totalEmissions: number; // kg CO2e
  scope1: number;
  scope2: number;
  scope3: number;
  breakdown: {
    category: string;
    emissions: number;
    percentage: number;
  }[];
  /** Détails ligne par ligne pour la traçabilité (quantité × FE = émissions) */
  detailedBreakdown: EmissionLineDetail[];
  period: {
    start: string;
    end: string;
  };
  dataQuality: {
    real: number;
    estimated: number;
    default: number;
  };
  missingFactors: MissingEmissionFactor[];
}

export class BilanCarboneCalculator {
  /**
   * Calculer le bilan carbone pour une organisation sur une période
   * Priorité: activity_data via RPC function, fallback sur bilans_carbone pour compatibilité
   */
  static async calculate(
    organizationId: string,
    periodStart: string,
    periodEnd: string,
    siteId?: string // Optionnel: filtrer par site
  ): Promise<BilanCarboneResult> {
    // Bilan déjà enregistré (import ou publication) : l'afficher tel quel.
    // Recalcul activity_data seulement s'il n'y a pas de totaux exploitables.
    if (!siteId) {
      const legacy = await this.calculateFromLegacyBilans(organizationId, periodStart, periodEnd);
      if (legacy.totalEmissions > 0) {
        return legacy;
      }
    }

    // Calculer côté frontend depuis activity_data
    // Récupérer toutes les données d'activité pour la période
    const filters: ActivityDataFilters = {
      organization_id: organizationId,
      period_start: periodStart,
      period_end: periodEnd,
    };
    
    // Ajouter le filtre site si spécifié
    if (siteId) {
      filters.site_id = siteId;
    }
    
    const activities = await ActivityDataService.list(filters);

    // Si activity_data est vide et pas de filtre site, essayer le fallback legacy
    if (activities.length === 0 && !siteId) {
      return await this.calculateFromLegacyBilans(organizationId, periodStart, periodEnd);
    }

    // ── Allocation par site : calculer le bilan consolidé puis répartir ──
    // Si un site est sélectionné et qu'il n'a pas (ou peu) de données propres,
    // calculer le bilan consolidé et appliquer les % d'allocation par scope.
    if (activities.length === 0 && siteId) {
      const allocatedResult = await this.calculateWithSiteAllocation(
        organizationId, siteId, periodStart, periodEnd
      );
      if (allocatedResult) {
        return allocatedResult;
      }
      // Pas d'allocation configurée et pas de données per-site → résultat vide (pas de fallback legacy)
      return {
        totalEmissions: 0, scope1: 0, scope2: 0, scope3: 0,
        breakdown: [], detailedBreakdown: [],
        period: { start: periodStart, end: periodEnd },
        dataQuality: { real: 0, estimated: 0, default: 0 },
        missingFactors: [],
      };
    }

    // OPTIMISATION: Précharger les facteurs d'émission AVANT le Promise.all
    // Cela évite les requêtes dupliquées (8+ appels parallèles → 1 seul appel)
    await Promise.all([
      this.loadOrgEmissionFactors(organizationId),
      this.loadEmissionFactorsFromDB(),
    ]);

    // Calculer les émissions par activité et collecter les FE manquants
    // Hiérarchie: 1. FE org personnalisés, 2. FE base (724), 3. Défauts
    const missingFactors: MissingEmissionFactor[] = [];
    const detailedBreakdown: EmissionLineDetail[] = [];
    
    const emissionsByActivity = await Promise.all(
      activities.map(async (activity) => {
        let emissions = 0;
        let hasFactor = true;
        let emissionFactor = 0;
        let emissionFactorUnit = '';
        let emissionFactorSource: EmissionLineDetail['emissionFactorSource'] = 'Non trouvé';
        
        // Si un facteur d'émission est directement lié, utiliser le calcul RPC
        if (activity.emission_factor_id) {
          emissions = await ActivityDataService.calculateEmissions(activity.id);
          // Pour les FE liés, on ne peut pas récupérer les détails sans autre requête
          // Marquer comme "ADEME/Base" car c'est un lien direct vers la base
          emissionFactor = emissions / (parseFloat(String(activity.quantity)) || 1);
          emissionFactorUnit = 'kgCO₂e/' + (activity.unit || 'unité');
          emissionFactorSource = 'ADEME/Base';
          hasFactor = true;
        } else {
          // Sinon, utiliser la hiérarchie des facteurs d'émission
          const result = await this.calculateWithFactorHierarchyAndCheck(activity, organizationId);
          emissions = result.emissions;
          hasFactor = result.hasFactor;
          emissionFactor = result.emissionFactor;
          emissionFactorUnit = result.emissionFactorUnit;
          emissionFactorSource = result.emissionFactorSource;
        }
        
        // Si pas de FE trouvé, ajouter à la liste des manquants
        if (!hasFactor) {
          const subcategoryParts = (activity.subcategory || '').split(':');
          const subcategory = subcategoryParts.length > 1 ? subcategoryParts[1] : subcategoryParts[0];
          
          missingFactors.push({
            subcategory: subcategory || activity.category || 'unknown',
            activityType: activity.activity_type,
            quantity: parseFloat(String(activity.quantity)) || 0,
            unit: activity.unit || '',
            scopeHint: activity.scope_hint,
          });
        }
        
        // Ajouter au détail ligne par ligne
        const scope = activity.scope_hint || this.inferScopeFromCategory(activity.category);
        const subcategoryParts = (activity.subcategory || '').split(':');
        const subcategoryName = subcategoryParts.length > 1 ? subcategoryParts[1] : subcategoryParts[0];
        
        detailedBreakdown.push({
          category: activity.category || 'other',
          subcategory: subcategoryName || activity.category || 'other',
          quantity: parseFloat(String(activity.quantity)) || 0,
          unit: activity.unit || '',
          emissionFactor,
          emissionFactorUnit,
          emissionFactorSource,
          emissions,
          scope: scope as 1 | 2 | 3,
          dataQuality: activity.data_quality || 'default',
        });
        
        return {
          activity,
          emissions,
        };
      })
    );

    // Agrégation par scope
    let scope1 = 0;
    let scope2 = 0;
    let scope3 = 0;
    const breakdown: Record<string, number> = {};

    emissionsByActivity.forEach(({ activity, emissions }) => {
      // Utiliser scope_hint si disponible, sinon déduire de category
      const scope = activity.scope_hint || this.inferScopeFromCategory(activity.category);
      
      if (scope === 1) scope1 += emissions;
      else if (scope === 2) scope2 += emissions;
      else if (scope === 3) scope3 += emissions;

      // Breakdown par sous-catégorie (utiliser subcategory comme clé principale)
      const categoryKey = activity.subcategory || activity.category || 'other';
      breakdown[categoryKey] = (breakdown[categoryKey] || 0) + emissions;
    });

    // ── Allocation par scope pour les données manquantes per-site ──
    // Si on calcule pour un site et que certains scopes sont à 0 (données consolidées),
    // appliquer l'allocation pour ces scopes
    if (siteId) {
      const scopeAllocations = await this.applyScopeAllocations(
        organizationId, siteId, periodStart, periodEnd,
        { scope1, scope2, scope3 }
      );
      if (scopeAllocations) {
        if (scope1 === 0 && scopeAllocations.scope1 > 0) {
          scope1 = scopeAllocations.scope1;
          breakdown['Scope 1 (réparti)'] = scope1;
          detailedBreakdown.push({
            category: 'Émissions directes', subcategory: 'Scope 1 (réparti)', quantity: 1,
            unit: 'allocation', emissionFactor: scope1, emissionFactorUnit: 'kgCO₂e (réparti)',
            emissionFactorSource: 'ADEME/Organisation', emissions: scope1, scope: 1, dataQuality: 'estimated',
          });
        }
        if (scope2 === 0 && scopeAllocations.scope2 > 0) {
          scope2 = scopeAllocations.scope2;
          breakdown['Scope 2 (réparti)'] = scope2;
          detailedBreakdown.push({
            category: 'Énergie indirecte', subcategory: 'Scope 2 (réparti)', quantity: 1,
            unit: 'allocation', emissionFactor: scope2, emissionFactorUnit: 'kgCO₂e (réparti)',
            emissionFactorSource: 'ADEME/Organisation', emissions: scope2, scope: 2, dataQuality: 'estimated',
          });
        }
        if (scope3 === 0 && scopeAllocations.scope3 > 0) {
          scope3 = scopeAllocations.scope3;
          breakdown['Scope 3 (réparti)'] = scope3;
          detailedBreakdown.push({
            category: 'Autres indirectes', subcategory: 'Scope 3 (réparti)', quantity: 1,
            unit: 'allocation', emissionFactor: scope3, emissionFactorUnit: 'kgCO₂e (réparti)',
            emissionFactorSource: 'ADEME/Organisation', emissions: scope3, scope: 3, dataQuality: 'estimated',
          });
        }
      }
    }

    const totalEmissions = scope1 + scope2 + scope3;

    if (totalEmissions === 0 && !siteId) {
      const legacy = await this.calculateFromLegacyBilans(organizationId, periodStart, periodEnd);
      if (legacy.totalEmissions > 0) return legacy;
    }

    // Calculer la qualité des données
    const qualityStats = await ActivityDataService.getDataQualityStats(
      organizationId,
      periodStart,
      periodEnd
    );

    // Formater le breakdown
    const breakdownArray = Object.entries(breakdown)
      .map(([category, emissions]) => ({
        category,
        emissions,
        percentage: totalEmissions > 0 ? (emissions / totalEmissions) * 100 : 0,
      }))
      .sort((a, b) => b.emissions - a.emissions);

    return {
      totalEmissions,
      scope1,
      scope2,
      scope3,
      breakdown: breakdownArray,
      detailedBreakdown,
      period: {
        start: periodStart,
        end: periodEnd,
      },
      dataQuality: {
        real: qualityStats.real_percentage,
        estimated: qualityStats.estimated_percentage,
        default: qualityStats.default_percentage,
      },
      missingFactors,
    };
  }

  /**
   * Calculer le bilan pour un site via allocation complète (3 scopes).
   * Utilisé quand le site n'a aucune activity_data propre.
   * Calcule le bilan consolidé puis applique les % d'allocation par scope.
   */
  private static async calculateWithSiteAllocation(
    organizationId: string,
    siteId: string,
    periodStart: string,
    periodEnd: string
  ): Promise<BilanCarboneResult | null> {
    try {
      // 1. Lire les % d'allocation pour ce site (tous scopes)
      const percentages: Array<{ scope: number; allocation_percentage: number }> = [];

      const pctMap = new Map<number, number>();
      for (const p of (percentages || [])) {
        pctMap.set(p.scope, Number(p.allocation_percentage) || 0);
      }

      // Si aucun % d'allocation défini pour ce site → pas d'allocation possible
      if (pctMap.size === 0) {
        logger.debug(`📊 calculateWithSiteAllocation: aucun % d'allocation pour le site ${siteId}`);
        return null;
      }

      // 2. Déterminer le % à utiliser pour chaque scope
      // Utiliser le % spécifique au scope s'il existe, sinon fallback sur un % disponible
      const fallbackPct = pctMap.values().next().value || 0;
      const pctScope1 = pctMap.get(1) ?? pctMap.get(3) ?? fallbackPct;
      const pctScope2 = pctMap.get(2) ?? pctMap.get(3) ?? fallbackPct;
      const pctScope3 = pctMap.get(3) ?? fallbackPct;

      // 3. Calculer le bilan consolidé (sans filtre site)
      const consolidated = await this.calculate(organizationId, periodStart, periodEnd);
      logger.debug(`📊 Bilan consolidé: S1=${consolidated.scope1.toFixed(0)}, S2=${consolidated.scope2.toFixed(0)}, S3=${consolidated.scope3.toFixed(0)}, total=${consolidated.totalEmissions.toFixed(0)}`);

      // 4. Appliquer les % par scope
      let scope1 = consolidated.scope1 > 0 ? consolidated.scope1 * (pctScope1 / 100) : 0;
      let scope2 = consolidated.scope2 > 0 ? consolidated.scope2 * (pctScope2 / 100) : 0;
      let scope3 = consolidated.scope3 > 0 ? consolidated.scope3 * (pctScope3 / 100) : 0;

      logger.debug(`📊 Scope 1 allocation: ${consolidated.scope1.toFixed(0)} × ${pctScope1}% = ${scope1.toFixed(0)}`);
      logger.debug(`📊 Scope 2 allocation: ${consolidated.scope2.toFixed(0)} × ${pctScope2}% = ${scope2.toFixed(0)}`);
      logger.debug(`📊 Scope 3 allocation: ${consolidated.scope3.toFixed(0)} × ${pctScope3}% = ${scope3.toFixed(0)}`);

      const totalEmissions = scope1 + scope2 + scope3;
      logger.debug(`📊 Site ${siteId} après allocation: S1=${scope1.toFixed(0)}, S2=${scope2.toFixed(0)}, S3=${scope3.toFixed(0)}, total=${totalEmissions.toFixed(0)}`);

      // 5. Construire le breakdown et detailedBreakdown alloués
      const breakdown: { category: string; emissions: number; percentage: number }[] = [];
      const detailedBreakdown: EmissionLineDetail[] = [];

      const scopeEntries: Array<{ scopeNum: 1 | 2 | 3; value: number; category: string; label: string }> = [
        { scopeNum: 1, value: scope1, category: 'Émissions directes', label: 'Scope 1 (réparti)' },
        { scopeNum: 2, value: scope2, category: 'Énergie indirecte', label: 'Scope 2 (réparti)' },
        { scopeNum: 3, value: scope3, category: 'Autres indirectes', label: 'Scope 3 (réparti)' },
      ];

      for (const { scopeNum, value, category, label } of scopeEntries) {
        if (value > 0) {
          breakdown.push({
            category: label,
            emissions: value,
            percentage: totalEmissions > 0 ? (value / totalEmissions) * 100 : 0,
          });
          detailedBreakdown.push({
            category,
            subcategory: label,
            quantity: 1,
            unit: 'allocation',
            emissionFactor: value,
            emissionFactorUnit: 'kgCO₂e (réparti)',
            emissionFactorSource: 'ADEME/Organisation',
            emissions: value,
            scope: scopeNum,
            dataQuality: 'estimated',
          });
        }
      }

      return {
        totalEmissions,
        scope1,
        scope2,
        scope3,
        breakdown,
        detailedBreakdown,
        period: { start: periodStart, end: periodEnd },
        dataQuality: consolidated.dataQuality,
        missingFactors: [],
      };
    } catch (error) {
      logger.warn('⚠️ Erreur calculateWithSiteAllocation:', error);
      return null;
    }
  }

  /**
   * Appliquer l'allocation par scope pour les scopes manquants d'un site.
   * Utilisé quand le site a des données propres pour certains scopes mais pas tous.
   */
  private static async applyScopeAllocations(
    organizationId: string,
    siteId: string,
    periodStart: string,
    periodEnd: string,
    currentScopes: { scope1: number; scope2: number; scope3: number }
  ): Promise<{ scope1: number; scope2: number; scope3: number } | null> {
    try {
      // Vérifier quels scopes sont à 0 (potentiellement à allouer)
      const missingScopes: number[] = [];
      if (currentScopes.scope1 === 0) missingScopes.push(1);
      if (currentScopes.scope2 === 0) missingScopes.push(2);
      if (currentScopes.scope3 === 0) missingScopes.push(3);

      if (missingScopes.length === 0) return null;

      // Lire les configs d'allocation pour les scopes manquants
      const configs: Array<{ scope: number; strategy: string }> = [];

      const allocScopes = (configs || []).filter(c => c.strategy === 'allocation_key').map(c => c.scope);
      if (allocScopes.length === 0) return null;

      // Lire les % pour ce site
      const percentages: Array<{ scope: number; allocation_percentage: number }> = [];

      const pctMap = new Map<number, number>();
      for (const p of (percentages || [])) {
        pctMap.set(p.scope, Number(p.allocation_percentage) || 0);
      }

      if (pctMap.size === 0) return null;

      // Calculer le bilan consolidé pour obtenir les totaux par scope
      const consolidated = await this.calculate(organizationId, periodStart, periodEnd);

      const result = {
        scope1: currentScopes.scope1,
        scope2: currentScopes.scope2,
        scope3: currentScopes.scope3,
      };

      if (pctMap.has(1)) {
        result.scope1 = consolidated.scope1 * (pctMap.get(1)! / 100);
      }
      if (pctMap.has(2)) {
        result.scope2 = consolidated.scope2 * (pctMap.get(2)! / 100);
      }
      if (pctMap.has(3)) {
        result.scope3 = consolidated.scope3 * (pctMap.get(3)! / 100);
      }

      return result;
    } catch (error) {
      logger.warn('⚠️ Erreur applyScopeAllocations:', error);
      return null;
    }
  }

  /**
   * Calculer depuis les anciens bilans_carbone (compatibilité)
   */
  private static async calculateFromLegacyBilans(
    organizationId: string,
    periodStart: string,
    periodEnd: string
  ): Promise<BilanCarboneResult> {
    const { items: bilans } = await api.listBilans();
    const requestedYear = Number(String(periodStart).slice(0, 4));
    const rows = (bilans || []) as Array<Record<string, unknown>>;
    const tonnesOf = (row: Record<string, unknown>) =>
      Number(row.total_emission ?? row.total_kgco2e ?? 0) || 0;
    const yearOf = (row: Record<string, unknown>): number | null => {
      const y = Number(row.year);
      if (Number.isInteger(y) && y >= 2000) return y;
      if (row.date_bilan) {
        const fromDate = new Date(String(row.date_bilan)).getFullYear();
        if (Number.isInteger(fromDate)) return fromDate;
      }
      return null;
    };
    const inPeriod = rows.filter((row) => yearOf(row) === requestedYear);
    const bilan = inPeriod.find((row) => tonnesOf(row) > 0) || inPeriod[0] || null;
    if (!bilan || tonnesOf(bilan) <= 0) {
      return this.getEmptyResult(periodStart, periodEnd);
    }
    // Import et UI historique stockent des tCO2e dans total_emission *ou* total_kgco2e.
    const T_TO_KG = 1000;
    const scope1 = (Number(bilan.scope1_emission ?? bilan.scope1_kgco2e) || 0) * T_TO_KG;
    const scope2 = (Number(bilan.scope2_emission ?? bilan.scope2_kgco2e) || 0) * T_TO_KG;
    const scope3 = (Number(bilan.scope3_emission ?? bilan.scope3_kgco2e) || 0) * T_TO_KG;
    const totalEmissions = tonnesOf(bilan) * T_TO_KG;

    // Créer un breakdown basique depuis detailed_breakdown si disponible
    let breakdown: Array<{ category: string; emissions: number; percentage: number }> = [];

    if (bilan.detailed_breakdown && typeof bilan.detailed_breakdown === 'object') {
      const detailed = bilan.detailed_breakdown as Record<string, any>;

      // Aplatir le breakdown : gère à la fois le format plat { poste: tonnes }
      // et le format imbriqué { scope1: { poste: tonnes }, scope3: { catX: tonnes }, ... }
      const flat: Array<{ category: string; emissions: number }> = [];
      const SCOPE_PREFIX: Record<string, string> = {
        scope1: 'scope1',
        scope2: 'scope2',
        scope3: 'scope3',
      };

      for (const [key, value] of Object.entries(detailed)) {
        if (typeof value === 'number') {
          flat.push({ category: key, emissions: value * T_TO_KG });
        } else if (value && typeof value === 'object') {
          const prefix = SCOPE_PREFIX[key.toLowerCase()];
          // Ne dépilier que les buckets de scope (ignore pcaf_breakdown & autres métadonnées)
          if (!prefix) continue;
          for (const [subKey, subVal] of Object.entries(value as Record<string, any>)) {
            if (typeof subVal === 'number') {
              flat.push({ category: `${prefix}:${subKey}`, emissions: subVal * T_TO_KG });
            }
          }
        }
      }

      breakdown = flat
        .map(item => ({
          ...item,
          percentage: totalEmissions > 0 ? (item.emissions / totalEmissions) * 100 : 0,
        }))
        .filter(item => item.emissions > 0)
        .sort((a, b) => b.emissions - a.emissions);
    }

    // Fallback : si aucun détail exploitable, breakdown par scope
    if (breakdown.length === 0) {
      breakdown = [
        { category: 'Scope 1', emissions: scope1, percentage: totalEmissions > 0 ? (scope1 / totalEmissions) * 100 : 0 },
        { category: 'Scope 2', emissions: scope2, percentage: totalEmissions > 0 ? (scope2 / totalEmissions) * 100 : 0 },
        { category: 'Scope 3', emissions: scope3, percentage: totalEmissions > 0 ? (scope3 / totalEmissions) * 100 : 0 },
      ].filter(item => item.emissions > 0);
    }

    return {
      totalEmissions,
      scope1,
      scope2,
      scope3,
      breakdown,
      detailedBreakdown: [], // Legacy bilans n'ont pas de détails ligne par ligne
      period: {
        start: periodStart,
        end: periodEnd,
      },
      dataQuality: {
        real: 100, // On considère les anciens bilans comme réels
        estimated: 0,
        default: 0,
      },
      missingFactors: [], // Les anciens bilans n'ont pas de FE manquants
    };
  }

  /**
   * Retourner un résultat vide
   */
  private static getEmptyResult(
    periodStart: string,
    periodEnd: string
  ): BilanCarboneResult {
    return {
      totalEmissions: 0,
      scope1: 0,
      scope2: 0,
      scope3: 0,
      breakdown: [],
      detailedBreakdown: [],
      period: {
        start: periodStart,
        end: periodEnd,
      },
      dataQuality: {
        real: 0,
        estimated: 0,
        default: 100,
      },
      missingFactors: [],
    };
  }

  /**
   * Inférer le scope depuis la catégorie si scope_hint n'est pas défini
   */
  private static inferScopeFromCategory(category: string): 1 | 2 | 3 {
    if (category.startsWith('scope1')) return 1;
    if (category.startsWith('scope2')) return 2;
    if (category.startsWith('scope3')) return 3;
    return 3; // Par défaut scope 3
  }

  /**
   * Charger les facteurs d'émission de la base de données
   */
  private static async loadEmissionFactorsFromDB(): Promise<Map<string, number>> {
    if (cachedEmissionFactors && (Date.now() - cachedEmissionFactorsTimestamp < BASE_CACHE_TTL)) {
      return cachedEmissionFactors;
    }

    const { items } = await api.listFactors();
    return this.indexEmissionFactors(
      (items || []).map((f) => ({
        subcategory: String(f.category ?? ''),
        factor_name: String(f.name ?? ''),
        slug: String(f.category ?? f.name ?? '')
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '_'),
        emission_factor: Number(f.value ?? 0),
        unit: [f.unit_numerator, f.unit_denominator].filter(Boolean).join('/') || 'kgCO2e',
      })),
    );
  }

  /**
   * Indexer les facteurs d'émission pour faciliter la recherche (subcategory, slug, variations)
   */
  private static indexEmissionFactors(
    data: Array<{
      subcategory: string;
      factor_name: string;
      slug: string;
      emission_factor: number;
      unit: string;
    }>
  ): Map<string, number> {
    const factorMap = new Map<string, number>();

    // Indexer par subcategory, slug et factor_name pour faciliter la recherche
    data?.forEach((ef) => {
      const subcategory = ef.subcategory?.toLowerCase() || '';
      const factorName = ef.factor_name?.toLowerCase() || '';
      const slug = ef.slug?.toLowerCase() || '';
      
      // PRIORITÉ 1: Stocker par subcategory complète (ex: cat6_business_travel:cat6_flight_short)
      if (subcategory && !factorMap.has(subcategory)) {
        factorMap.set(subcategory, ef.emission_factor);
      }
      
      // PRIORITÉ 2: Stocker par slug (ex: cat6_flight_short)
      if (slug && !factorMap.has(slug)) {
        factorMap.set(slug, ef.emission_factor);
      }
      
      // PRIORITÉ 3: Si subcategory est composite, extraire le suffixe (après ":")
      if (subcategory.includes(':')) {
        const suffix = subcategory.split(':')[1];
        if (suffix && !factorMap.has(suffix)) {
          factorMap.set(suffix, ef.emission_factor);
        }
      }
      
      // Stocker aussi par des variations communes
      const variations = this.getSubcategoryVariations(subcategory, factorName);
      variations.forEach(v => {
        if (!factorMap.has(v)) {
          factorMap.set(v, ef.emission_factor);
        }
      });
    });

    logger.debug(`📊 Chargé ${factorMap.size} facteurs d'émission depuis la base`);
    cachedEmissionFactors = factorMap;
    cachedEmissionFactorsTimestamp = Date.now();
    return factorMap;
  }

  /**
   * Charger les facteurs personnalisés de l'organisation
   * Utilise subcategory_key pour le mapping direct avec activity_data.subcategory
   */
  private static async loadOrgEmissionFactors(organizationId: string): Promise<Map<string, number>> {
    if (cachedOrgFactors && cachedOrgId === organizationId && (Date.now() - cachedOrgFactorsTimestamp < ORG_CACHE_TTL)) {
      return cachedOrgFactors;
    }

    const data: Array<Record<string, unknown>> = [];
    const error = null;

    if (error) {
      console.error('Error loading org emission factors:', error);
      return new Map();
    }

    const factorMap = new Map<string, number>();
    
    data?.forEach((oef: any) => {
      // PRIORITÉ 1: Utiliser subcategory_key si défini (mapping explicite)
      if (oef.subcategory_key) {
        const key = oef.subcategory_key.toLowerCase();
        factorMap.set(key, oef.custom_value);
      }
      
      // PRIORITÉ 2: Matching intelligent par catégorie GHG (extrait de notes)
      // Format notes: "scope:3|category:cat1_purchased_goods|..."
      if (oef.notes) {
        const categoryMatch = oef.notes.match(/category:([^|]+)/);
        if (categoryMatch) {
          const ghgCategory = categoryMatch[1].toLowerCase();
           // IMPORTANT:
           // Ne pas appliquer un FE "par catégorie" à partir d'un FE de sous-catégorie.
           // Sinon un FE comme "Pneux neufs" (subcategory_key = cat2_tires_new) avec notes category:cat1_purchased_goods
           // écrase TOUTES les sous-catégories cat1_* (dont Services sous-traités).
           // On n'active ce comportement que si le FE est EXPLICITEMENT défini au niveau catégorie
           // (subcategory_key === ghgCategory).
           const key = (oef.subcategory_key || '').toLowerCase();
           const isExplicitCategoryFactor = key === ghgCategory;

           if (isExplicitCategoryFactor) {
             // Mapper à toutes les variantes de cette catégorie
             // Ex: cat1_purchased_goods -> match cat1_purchased_goods:* 
             if (!factorMap.has(ghgCategory)) {
               factorMap.set(ghgCategory, oef.custom_value);
             }
             // Aussi stocker avec préfixe pour le matching composite
             const compositeKey = `${ghgCategory}:`;
             factorMap.set(`__category_prefix__${compositeKey}`, oef.custom_value);
             logger.debug(`✅ FE org mappé par catégorie GHG (explicite): ${ghgCategory} → ${oef.custom_value}`);
           }
        }
      }
      
      // PRIORITÉ 3: Matching par nom normalisé (custom_source)
      if (oef.custom_source) {
        const normalizedName = this.normalizeForMatching(oef.custom_source);
        if (normalizedName && !factorMap.has(normalizedName)) {
          factorMap.set(normalizedName, oef.custom_value);
        }
      }
      
      // FALLBACK: Utiliser les infos du facteur de base
      const ef = oef.emission_factors;
      if (ef) {
        const subcategory = ef.subcategory?.toLowerCase() || '';
        const factorName = ef.factor_name?.toLowerCase() || '';
        
        if (subcategory && !factorMap.has(subcategory)) {
          factorMap.set(subcategory, oef.custom_value);
        }
        
        const variations = this.getSubcategoryVariations(subcategory, factorName);
        variations.forEach(v => {
          if (!factorMap.has(v)) {
            factorMap.set(v, oef.custom_value);
          }
        });
      }
    });

    cachedOrgFactors = factorMap;
    cachedOrgFactorsTimestamp = Date.now();
    cachedOrgId = organizationId;
    return factorMap;
  }
  
  /**
   * Normaliser un nom pour le matching (retirer accents, lowercase, underscores)
   */
  private static normalizeForMatching(name: string): string {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Retirer accents
      .replace(/[^a-z0-9]+/g, '_') // Remplacer caractères spéciaux par _
      .replace(/^_|_$/g, ''); // Retirer _ au début/fin
  }

  /**
   * Générer des variations de subcategory pour la correspondance
   */
  private static getSubcategoryVariations(subcategory: string, factorName: string): string[] {
    const variations: string[] = [];
    
    // Normaliser les noms courants
    const mappings: Record<string, string[]> = {
      'fuel': ['essence', 'essence_sans_plomb', 'gasoline'],
      'diesel': ['fuel_diesel', 'gasoil', 'gasoil_super'],
      'gas': ['gaz_naturel', 'fossil_gas', 'natural_gas'],
      'electricity': ['electricite', 'électricité'],
      'construction': ['essence', 'diesel'],
    };

    // Ajouter les variations depuis le factor_name
    if (factorName.includes('essence')) variations.push('essence', 'essence_sans_plomb');
    if (factorName.includes('diesel')) variations.push('diesel', 'fuel_diesel', 'gasoil');
    if (factorName.includes('gasoil')) variations.push('gasoil', 'gasoil_super', 'diesel');
    if (factorName.includes('gaz') || factorName.includes('gas')) variations.push('gaz_naturel', 'fossil_gas');
    if (factorName.includes('fioul')) variations.push('fioul', 'fossil_fuel_oil', 'fuel_oil');
    if (factorName.includes('propane')) variations.push('propane', 'gpl');
    if (factorName.includes('butane')) variations.push('butane');
    
    return variations;
  }

  /**
   * Calculer les émissions avec la hiérarchie de facteurs d'émission
   * 1. organization_emission_factors (FE personnalisés)
   * 2. emission_factors (base de référence - 724 entrées)
   * 3. Facteurs par défaut (dernier recours)
   */
  private static async calculateWithFactorHierarchy(
    activity: any,
    organizationId: string
  ): Promise<number> {
    const result = await this.calculateWithFactorHierarchyAndCheck(activity, organizationId);
    return result.emissions;
  }

  /**
   * Résultat détaillé du calcul avec traçabilité du FE
   */
  private static async calculateWithFactorHierarchyAndCheck(
    activity: any,
    organizationId: string
  ): Promise<{ 
    emissions: number; 
    hasFactor: boolean;
    emissionFactor: number;
    emissionFactorUnit: string;
    emissionFactorSource: 'ADEME/Organisation' | 'ADEME/Taxonomie' | 'ADEME/Base' | 'Non trouvé';
  }> {
    const rawSubcategory = activity.subcategory?.toLowerCase() || '';
    const activityType = activity.activity_type?.toLowerCase() || '';
    let quantity = parseFloat(activity.quantity) || 0;
    const unit = (activity.unit || '').toLowerCase();
    
    const subcategoryParts = rawSubcategory.split(':');
    const categoryPrefix = subcategoryParts.length > 1 ? subcategoryParts[0] : '';
    const subcategory = subcategoryParts.length > 1 ? subcategoryParts[1] : subcategoryParts[0];

    // Conversion d'unité pour les huiles usagées : le FE est en kgCO2e/kg
    // Si l'utilisateur saisit en litres, convertir en kg (1L huile = 0.9 kg)
    if (subcategory === 'cat5_used_oils' && (unit === 'l' || unit === 'litres' || unit === 'litre')) {
      quantity = quantity * 0.9; // Conversion L → kg
      logger.debug(`🔄 Conversion huiles: ${activity.quantity}L → ${quantity}kg`);
    }
    
    // Conversion d'unité pour les pneus usagés : le FE est en kgCO2e/kg
    // Si l'utilisateur saisit en unités, convertir en kg (1 pneu = 8 kg en moyenne)
    if (subcategory === 'cat5_used_tires' && (unit === 'unités' || unit === 'unites' || unit === 'unit' || unit === 'units' || unit === 'pneus' || unit === 'pneu')) {
      quantity = quantity * 8; // Conversion unités → kg (1 pneu = 8 kg)
      logger.debug(`🔄 Conversion pneus: ${activity.quantity} unités → ${quantity}kg`);
    }
    
    // Conversion d'unité pour les déchets non triés : le FE est en kgCO2e/kg
    // Si l'utilisateur saisit en tonnes, convertir en kg (1 t = 1000 kg)
    if (subcategory === 'cat5_unsorted_waste' && (unit === 't' || unit === 'tonnes' || unit === 'tonne')) {
      quantity = quantity * 1000; // Conversion t → kg
      logger.debug(`🔄 Conversion déchets non triés: ${activity.quantity}t → ${quantity}kg`);
    }

    // Domicile–travail (Mode de transport enquête) : FE stocké dans notes (FE_kg_km: X) ou défaut
    if (subcategory === 'cat7_transport_mode') {
      const notes = (activity.notes || '').toString();
      const feMatch = notes.match(/FE_kg_km:\s*([\d.]+)/i);
      const feKgKm = feMatch ? parseFloat(feMatch[1]) : this.getDefaultFactor('cat7_transport_mode', activityType) || 0.19;
      const emissions = quantity * feKgKm; // quantity en km/an, FE en kgCO2e/km → kg CO2e
      logger.debug(`✅ Domicile–travail (enquête): ${quantity} km/an × ${feKgKm} kgCO2e/km = ${emissions} kg CO2e`);
      return { 
        emissions, 
        hasFactor: true, 
        emissionFactor: feKgKm, 
        emissionFactorUnit: 'kgCO₂e/km', 
        emissionFactorSource: feMatch ? 'ADEME/Organisation' as const : 'ADEME/Taxonomie' as const 
      };
    }

    // IMPORTANT: Pour Scope 3, `activity.subcategory` peut être une clé composite
    // au format `categorie:sous-categorie` (ex: cat6_business_travel:cat6_flight_short).
    // On doit donc tenter la clé complète, puis la clé suffixe (après le `:`) pour compat.
    const baseKeys = [rawSubcategory, subcategory]
      .map(k => (k || '').trim())
      .filter(Boolean);

    // Étendre les clés pour gérer le mapping taxonomie GHG → base FE.
    // Exemple: `cat1_paper` doit matcher un FE de base sur `paper` / `papier`.
    // IMPORTANT: ne pas « dépréfixer » une sous-catégorie `catX_*` si on a déjà
    // un facteur par défaut pour cette clé. Sinon on peut matcher des FE non
    // compatibles (ex: `cat2_it_equipment` -> `it_equipment` matche un FE RH à 180).
    const expandedKeysSet = new Set<string>(baseKeys);
    for (const k of baseKeys) {
      const m = k.match(/^cat\d+_(.+)$/);
      if (!m?.[1]) continue;

      const hasDefaultForTaxonomyKey = this.getDefaultFactor(k, activityType) > 0;
      if (!hasDefaultForTaxonomyKey) {
        expandedKeysSet.add(m[1]);
      }
    }

    // Mappings spécifiques: certaines sous-catégories doivent matcher des slugs particuliers de la base
    const specificMappings: Record<string, string[]> = {
      'cat1_paper': ['papier_bureautique', 'papier', 'paper'],
      'paper': ['papier_bureautique', 'papier'],
    };
    for (const k of baseKeys) {
      const mappings = specificMappings[k];
      if (mappings) {
        mappings.forEach(v => expandedKeysSet.add(v));
      }
    }

    const lookupKeys = Array.from(expandedKeysSet);
    
    // HIÉRARCHIE CORRIGÉE:
    // 1. FE personnalisés de l'organisation (PRIORITÉ ABSOLUE - surcharge utilisateur)
    // 2. Facteurs par défaut (pour les clés taxonomie GHG catX_*)
    // 3. Base de référence (724 FE génériques)
    
    // 1. Chercher dans les FE personnalisés de l'organisation (PRIORITÉ MAXIMALE)
    const orgFactors = await this.loadOrgEmissionFactors(organizationId);
    
    // 1.1 Recherche exacte par clé complète (ex: cat4_upstream_transport:cat4_vehicles_imported_roro)
    for (const key of lookupKeys) {
      if (orgFactors.has(key)) {
        const factor = orgFactors.get(key)!;
        logger.debug(`✅ FE personnalisé trouvé (exact): ${key} → ${factor}`);
        return { 
          emissions: quantity * factor, 
          hasFactor: true, 
          emissionFactor: factor, 
          emissionFactorUnit: 'kgCO₂e/' + (unit || 'unité'), 
          emissionFactorSource: 'ADEME/Organisation' as const 
        };
      }
    }
    
    // 1.2 Recherche par catégorie GHG (ex: cat1_purchased_goods pour toutes les sous-catégories de cat1)
    if (categoryPrefix) {
      const categoryPrefixKey = `__category_prefix__${categoryPrefix}:`;
      if (orgFactors.has(categoryPrefixKey)) {
        const factor = orgFactors.get(categoryPrefixKey)!;
        logger.debug(`✅ FE personnalisé (catégorie GHG): ${categoryPrefix} → ${factor}`);
        return { 
          emissions: quantity * factor, 
          hasFactor: true, 
          emissionFactor: factor, 
          emissionFactorUnit: 'kgCO₂e/' + (unit || 'unité'), 
          emissionFactorSource: 'ADEME/Organisation' as const 
        };
      }
      // Essayer aussi directement la catégorie
      if (orgFactors.has(categoryPrefix)) {
        const factor = orgFactors.get(categoryPrefix)!;
        logger.debug(`✅ FE personnalisé (catégorie): ${categoryPrefix} → ${factor}`);
        return { 
          emissions: quantity * factor, 
          hasFactor: true, 
          emissionFactor: factor, 
          emissionFactorUnit: 'kgCO₂e/' + (unit || 'unité'), 
          emissionFactorSource: 'ADEME/Organisation' as const 
        };
      }
    }
    
    // 1.3 Recherche par nom normalisé (matching fuzzy)
    const normalizedSubcat = this.normalizeForMatching(subcategory);
    if (normalizedSubcat && orgFactors.has(normalizedSubcat)) {
      const factor = orgFactors.get(normalizedSubcat)!;
      logger.debug(`✅ FE personnalisé (normalisé): ${normalizedSubcat} → ${factor}`);
      return { 
        emissions: quantity * factor, 
        hasFactor: true, 
        emissionFactor: factor, 
        emissionFactorUnit: 'kgCO₂e/' + (unit || 'unité'), 
        emissionFactorSource: 'ADEME/Organisation' as const 
      };
    }

    // 2. Facteurs par défaut pour les clés taxonomie GHG (catX_*)
    // NOTE: Ces défauts sont maintenant SECONDAIRES aux FE personnalisés
    const defaultFactor = this.getDefaultFactor(subcategory, activityType);
    if (defaultFactor > 0) {
      logger.debug(`✅ Facteur par défaut: ${subcategory} → ${defaultFactor}`);
      return { 
        emissions: quantity * defaultFactor, 
        hasFactor: true, 
        emissionFactor: defaultFactor, 
        emissionFactorUnit: 'kgCO₂e/' + (unit || 'unité'), 
        emissionFactorSource: 'ADEME/Taxonomie' as const 
      };
    }

    // 3. Chercher dans la base de référence (724 FE) - dernier recours
    const dbFactors = await this.loadEmissionFactorsFromDB();
    for (const key of lookupKeys) {
      if (dbFactors.has(key)) {
        const factor = dbFactors.get(key)!;
        logger.debug(`✅ FE base de données: ${key} → ${factor}`);
        return { 
          emissions: quantity * factor, 
          hasFactor: true, 
          emissionFactor: factor, 
          emissionFactorUnit: 'kgCO₂e/' + (unit || 'unité'), 
          emissionFactorSource: 'ADEME/Base' as const 
        };
      }
    }
    
    logger.warn(`❌ Aucun FE trouvé pour ${subcategory}`);
    return { 
      emissions: 0, 
      hasFactor: false, 
      emissionFactor: 0, 
      emissionFactorUnit: '', 
      emissionFactorSource: 'Non trouvé' as const 
    };
  }

  /**
   * Indique si un facteur d'émission existe pour une sous-catégorie (org, base ou défaut).
   * Utilisé par la page Contrôle pour ne signaler que les sous-catégories vraiment sans FE.
   */
  static async hasFactorForSubcategory(
    organizationId: string,
    rawSubcategory: string
  ): Promise<boolean> {
    const result = await this.calculateWithFactorHierarchyAndCheck(
      {
        subcategory: rawSubcategory,
        activity_type: 'transport',
        quantity: 0,
      },
      organizationId
    );
    return result.hasFactor;
  }

  /**
   * Facteurs par défaut (dernier recours uniquement)
   * Inclut les facteurs Scope 3 pour les catégories GHG Protocol
   */
  private static getDefaultFactor(subcategory: string, activityType: string): number {
    const defaults: Record<string, number> = {
      // Carburants courants (kgCO2e/L)
      essence: 2.31,
      essence_sans_plomb: 2.31,
      fuel_gasoline: 2.31, // Essence (alias anglais)
      gasoline: 2.31,
      diesel: 2.68,
      fuel_diesel: 2.68,
      gasoil: 2.68,
      gasoil_super: 2.68,
      fioul: 2.68,
      fossil_fuel_oil: 2.68,
      fossil_fuel_oil_light: 2.68, // Fioul domestique léger
      fossil_fuel_oil_heavy: 3.25, // Fioul lourd
      gpl: 1.51,
      propane: 1.51,
      butane: 1.55,
      // Gaz (kgCO2e/m³)
      gaz_naturel: 2.04,
      fossil_gas: 2.04,
      natural_gas: 2.04,
      // Électricité (kgCO2e/kWh)
      electricite: 0.56, // Facteur réseau Tunisie (STEG/ADEME)
      electricity: 0.56,
      electricity_grid: 0.56, // Réseau électrique Tunisie
      electricity_renewable: 0.02, // Électricité renouvelable
      // Biomasse (kgCO2e/kg)
      biomass_wood: 0.040, // Bois biomasse
      biomass_pellets: 0.040,
      // Gaz frigorigènes (kgCO2e/kg = GWP)
      fugitive_r410a: 2088, // R-410A GWP = 2088 (ADEME/GIEC AR5)
      fugitive_r134a: 1430, // R-134a GWP = 1430
      fugitive_r32: 675, // R-32 GWP = 675
      fugitive_r404a: 3922, // R-404A GWP = 3922
      fugitive_r407c: 1774, // R-407C GWP = 1774
      fugitive_co2: 1, // CO2 comme frigorigène
      // ===== VOYAGES D'AFFAIRES - Scope 3 Cat 6 (kgCO2e/km) =====
      cat6_flight_short: 0.158, // Vol court-courrier (ADEME)
      cat6_flight_medium: 0.151, // Vol moyen-courrier (ADEME)
      cat6_flight_long: 0.150, // Vol long-courrier (ADEME)
      flight_short: 0.158,
      flight_medium: 0.151,
      flight_long: 0.150,
      vol_court_courrier: 0.158,
      vol_moyen_courrier: 0.151,
      vol_long_courrier: 0.150,
      train: 0.041, // Train (kgCO2e/passager.km)
      cat6_train: 0.041,
      hotel: 10.0, // Hôtel (kgCO2e/nuitée)
      cat6_hotel: 10.0,
      taxi: 0.200, // Taxi (kgCO2e/km)
      cat6_taxi: 0.200,
      rental_car: 0.180, // Location voiture (kgCO2e/km)
      cat6_rental_car: 0.180,
      // Véhicules (kgCO2e/km) - Scope 3 Cat 13 Actifs loués aval
      cat13_leased_vehicles_km: 0.180, // Véhicule moyen essence
      vehicles: 0.180,
      voiture: 0.180,
      voiture_essence: 0.180,
      voiture_diesel: 0.200,
      // Déplacements domicile-travail (Scope 3 Cat 7)
      cat7_transport_mode: 0.19, // Mode de transport (enquête) – défaut voiture/covoiturage (kgCO2e/km)
      cat7_car_solo: 0.200, // Voiture moyenne
      cat7_public_transport: 0.050,
      cat7_company_cars: 0.180,
      // Transport aval (Scope 3 Cat 9)
      cat9_delivery_vehicles: 0.180,
      cat9_showroom_distance: 0.09, // Distance vers showrooms/agents régionaux (kgCO2e/part.km)
      cat9_vehicles_delivered: 50.0, // Véhicules livrés (kgCO2e/unité, estimation moyenne)
      cat9_vehicles_transferred: 50.0, // Véhicules transférés (kgCO2e/unité)
      cat9_delivery_truck: 0.090, // Livraisons camion (kgCO2e/km)
      cat9_delivery_ship: 0.015, // Transport maritime (kgCO2e/t.km)
      cat9_delivery_air: 0.600, // Fret aérien (kgCO2e/t.km)
      cat9_warehousing: 0.100, // Entreposage aval (kgCO2e/TND)
      showroom_distance: 0.09, // Alias sans préfixe (kgCO2e/part.km)
     // ===== ACHATS DE BIENS ET SERVICES - Scope 3 Cat 1 (kgCO2e/TND) =====
     cat1_outsourced_services: 0.180, // Services sous-traités
     cat1_raw_materials: 0.50, // Matières premières (moyenne)
     cat1_imported_spare_parts: 0.70, // Pièces détachées importées
     cat1_workshop_equipment: 0.30, // Équipements atelier
     cat1_it_servers: 0.40, // Équipements informatiques
     cat1_packaging: 0.50, // Emballages
     cat1_consumables: 0.30, // Consommables
     cat1_office_supplies: 0.25, // Fournitures de bureau
     services_sous_traites: 0.180,
     achat_services: 0.180,
     externalisation_service: 0.180,
     // ===== BIENS D'ÉQUIPEMENT - Scope 3 Cat 2 (kgCO2e/TND) =====
     cat2_capex_general: 0.350, // CAPEX Équipements & Moyens Généraux
      cat2_it_equipment: 0.200, // Équipements informatiques (ratio monétaire)
     cat2_machinery: 0.400, // Machines industrielles
     cat2_furniture: 0.300, // Mobilier
     cat2_vehicles: 5000, // Véhicules (kgCO2e/unité)
     cat2_other: 0.350, // Autres immobilisations
     // ===== DÉCHETS - Scope 3 Cat 5 (kgCO2e/unité selon type) =====
     cat5_used_oils: 0.9, // Huiles usagées collectées (kgCO2e/kg) - ADEME régénération
     cat5_used_batteries: 15.0, // Batteries usagées (kgCO2e/unité)
     cat5_used_tires: 0.5, // Pneus usagés (kgCO2e/kg) - poids moyen 8kg/pneu converti
     cat5_hazardous_waste: 3.5, // Déchets dangereux (kgCO2e/kg)
     cat5_wastewater: 0.025, // Eaux usées (kgCO2e/m³)
     cat5_general_waste: 0.7, // DIB (kgCO2e/kg)
     cat5_recyclables: 0.1, // Déchets recyclables (kgCO2e/kg)
     cat5_unsorted_waste: 0.11, // Déchets non triés (kgCO2e/kg)
     cat5_waste_recycling: 0.05, // Déchets recyclés général (kgCO2e/kg)
     cat5_waste_incineration: 0.40, // Déchets incinérés (kgCO2e/kg)
     cat5_waste_landfill: 0.70, // Déchets enfouis (kgCO2e/kg)
     cat5_waste_hazardous: 3.5, // Déchets dangereux général (kgCO2e/kg)
     cat5_used_filters: 1.0, // Filtres usagés (kgCO2e/kg)
     cat5_cardboard_recycled: 0.05, // Cartons recyclés (kgCO2e/kg)
     cat5_plastic_recycled: 0.10, // Plastiques recyclés (kgCO2e/kg)
     cat5_metal_recycled: 0.02, // Métaux recyclés (kgCO2e/kg)
     // ===== ACHATS COMPLÉMENTAIRES - Scope 3 Cat 1 =====
     cat1_moyens_generaux: 0.25, // Moyens généraux OPEX (kgCO2e/TND)
     cat1_it_consumables: 0.30, // Consommables informatiques (kgCO2e/TND)
     cat1_maintenance_services: 0.20, // Services de maintenance (kgCO2e/TND)
     cat1_chemicals: 2.5, // Produits chimiques (kgCO2e/kg)
     cat1_food_beverages: 0.50, // Alimentation et boissons (kgCO2e/TND)
     cat1_paper: 1.0, // Papier imprimé (kgCO2e/kg)
     cat1_other: 0.30, // Autres achats (kgCO2e/TND)
     // ===== BIENS D'ÉQUIPEMENT COMPLÉMENTAIRES - Scope 3 Cat 2 =====
     cat2_buildings: 500, // Construction bâtiments (kgCO2e/m²)
     cat2_spare_parts_imported: 3.0, // Pièces détachées importées (kgCO2e/kg)
     cat2_oils_lubricants: 1.5, // Huiles et lubrifiants achetés (kgCO2e/kg)
     cat2_batteries_new: 20.0, // Batteries achetées (kgCO2e/unité)
     cat2_tires_new: 25.0, // Pneus achetés (kgCO2e/unité)
     cat2_paints_solvents: 4.0, // Peintures et solvants (kgCO2e/kg)
     // ===== TRANSPORT AMONT - Scope 3 Cat 4 =====
     cat4_supplier_truck: 0.09, // Livraisons fournisseurs camion (kgCO2e/km)
     cat4_road_freight_local: 0.10, // Transport routier local (kgCO2e/t.km)
     cat4_supplier_ship: 0.015, // Transport maritime (kgCO2e/t.km)
     cat4_supplier_air: 0.60, // Fret aérien (kgCO2e/t.km)
     cat4_supplier_rail: 0.025, // Transport ferroviaire (kgCO2e/t.km)
     cat4_warehousing: 0.10, // Entreposage amont (kgCO2e/TND)
     // IMPORTANT: cat4_vehicles_imported_roro utilise kgCO2e/t.km (pas unités!)
     // Si FE personnalisé supprimé, ce défaut assure la cohérence d'unité
     cat4_vehicles_imported_roro: 0.0191, // Transport maritime Ro-Ro (kgCO2e/t.km) - ADEME
     cat4_vehicles_imported_rt: 0.15, // Véhicules importés Route (kgCO2e/km)
     cat4_local_supplier_deliveries: 5.0, // Livraisons fournisseurs locaux (kgCO2e/livraison)
     cat4_courier_deliveries: 0.5, // Livraisons courrier (kgCO2e/envoi)
     // ===== VOYAGES D'AFFAIRES COMPLÉMENTAIRES - Scope 3 Cat 6 =====
     cat6_flight_domestic: 0.230, // Vol domestique (kgCO2e/km)
     // ===== DOMICILE-TRAVAIL - Scope 3 Cat 7 =====
     cat7_fuel_consumption: 2.5, // Consommation carburant (kgCO2e/L)
     cat7_car_gasoline: 0.20, // Voiture essence (kgCO2e/km)
     cat7_car_diesel: 0.18, // Voiture diesel (kgCO2e/km)
     cat7_car_electric: 0.02, // Voiture électrique (kgCO2e/km)
     cat7_bike: 0, // Vélo/mobilité douce (kgCO2e/km)
     cat7_remote_work: -0.5, // Télétravail réduction (kgCO2e/jour)
     // ===== ACTIFS LOUÉS AMONT - Scope 3 Cat 8 =====
     cat8_leased_buildings: 30, // Bâtiments loués (kgCO2e/m²/an)
     cat8_leased_vehicles: 3000, // Véhicules en leasing (kgCO2e/unité/an)
     cat8_leased_equipment: 0.20, // Équipements loués (kgCO2e/TND)
     // ===== TRANSFORMATION PRODUITS - Scope 3 Cat 10 =====
     cat10_processing: 0.30, // Transformation par tiers (kgCO2e/TND)
     // ===== UTILISATION PRODUITS VENDUS - Scope 3 Cat 11 =====
     cat11_energy_consumption: 0.50, // Conso énergie produits (kgCO2e/kWh)
     cat11_fuel_consumption: 2.5, // Conso carburant produits (kgCO2e/L)
     cat11_refrigerants: 1500, // Fuites frigorigènes (kgCO2e/kg)
     // ===== FIN DE VIE PRODUITS - Scope 3 Cat 12 =====
     cat12_recycling: 0.05, // Recyclage produits vendus (kgCO2e/kg)
     cat12_incineration: 0.40, // Incinération produits (kgCO2e/kg)
     cat12_landfill: 0.70, // Enfouissement produits (kgCO2e/kg)
     // ===== ACTIFS LOUÉS AVAL - Scope 3 Cat 13 =====
     cat13_leased_buildings: 30, // Bâtiments loués à tiers (kgCO2e/m²/an)
     cat13_leased_vehicles: 3000, // Véhicules loués à tiers (kgCO2e/unité/an)
     cat13_leased_equipment: 0.20, // Équipements loués à tiers (kgCO2e/TND)
     // ===== FRANCHISES - Scope 3 Cat 14 =====
     cat14_franchise_operations: 0.25, // Opérations franchises (kgCO2e/TND)
     cat14_spare_parts_sold: 0.40, // Pièces vendues franchisés (kgCO2e/TND)
     cat14_oils_products_sold: 0.50, // Huiles/pneus franchisés (kgCO2e/TND)
     cat14_franchise_waste: 0.50, // Déchets franchisés (kgCO2e/kg)
     // ===== INVESTISSEMENTS - Scope 3 Cat 15 =====
     cat15_equity: 0.10, // Investissements actions (kgCO2e/TND)
     cat15_debt: 0.05, // Investissements obligataires (kgCO2e/TND)
     cat15_project_finance: 0.15, // Financement projets (kgCO2e/TND)
    };

    if (defaults[subcategory]) {
      return defaults[subcategory];
    }

    // Fallback générique basé sur le type d'activité
    if (activityType.includes('fuel') || activityType.includes('energy')) {
      return 2.5; // Moyenne carburants
    }
    
    return 0;
  }
}

