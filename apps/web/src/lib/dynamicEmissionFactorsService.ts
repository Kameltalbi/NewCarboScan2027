import { supabase } from "@/integrations/api/client";
import { EmissionFactor } from '@/types/dynamicQuestionnaire';

export class DynamicEmissionFactorsService {
  private static emissionFactorsCache: { [slug: string]: EmissionFactor } = {};
  private static cacheTimestamp: number = 0;
  private static readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  /**
   * Fetch all emission factors from Supabase
   */
  static async fetchAllEmissionFactors(): Promise<{ [slug: string]: EmissionFactor }> {
    const now = Date.now();
    
    // Return cached data if still valid
    if (
      Object.keys(this.emissionFactorsCache).length > 0 && 
      now - this.cacheTimestamp < this.CACHE_DURATION
    ) {
      return this.emissionFactorsCache;
    }

    try {
      const { data, error } = await supabase
        .from('emission_factors')
        .select('id, slug, nom_affiche, factor_name, emission_factor, unit, category, subcategory, source, year, created_at, updated_at')
        .order('category', { ascending: true });

      if (error) {
        console.error('Error fetching emission factors:', error);
        throw new Error(`Failed to fetch emission factors: ${error.message}`);
      }

      // Convert to slug-indexed object
      const factorsMap: { [slug: string]: EmissionFactor } = {};
      
      data?.forEach((factor: any) => {
        // Use slug if available, fallback to id
        const key = factor.slug || factor.id;
        factorsMap[key] = {
          id: factor.id,
          slug: factor.slug || factor.id,
          nom_affiche: factor.nom_affiche || factor.factor_name,
          factor_name: factor.factor_name,
          emission_factor: factor.emission_factor,
          unit: factor.unit,
          category: factor.category,
          subcategory: factor.subcategory,
          source: factor.source,
          year: factor.year
        };
      });

      // Update cache
      this.emissionFactorsCache = factorsMap;
      this.cacheTimestamp = now;

      return factorsMap;
    } catch (error) {
      console.error('Error in fetchAllEmissionFactors:', error);
      throw error;
    }
  }

  /**
   * Fetch emission factors for specific slugs
   */
  static async fetchEmissionFactorsBySlugs(slugs: string[]): Promise<{ [slug: string]: EmissionFactor }> {
    try {
      const { data, error } = await supabase
        .from('emission_factors')
        .select('id, slug, nom_affiche, factor_name, emission_factor, unit, category, subcategory, source, year, created_at, updated_at')
        .in('slug', slugs);

      if (error) {
        console.error('Error fetching emission factors by slugs:', error);
        throw new Error(`Failed to fetch emission factors: ${error.message}`);
      }

      const factorsMap: { [slug: string]: EmissionFactor } = {};
      
      data?.forEach((factor: any) => {
        const key = factor.slug || factor.id;
        factorsMap[key] = {
          id: factor.id,
          slug: factor.slug || factor.id,
          nom_affiche: factor.nom_affiche || factor.factor_name,
          factor_name: factor.factor_name,
          emission_factor: factor.emission_factor,
          unit: factor.unit,
          category: factor.category,
          subcategory: factor.subcategory,
          source: factor.source,
          year: factor.year
        };
      });

      return factorsMap;
    } catch (error) {
      console.error('Error in fetchEmissionFactorsBySlugs:', error);
      throw error;
    }
  }

  /**
   * Get a single emission factor by slug
   */
  static async getEmissionFactor(slug: string): Promise<EmissionFactor | null> {
    try {
      // Check cache first
      if (this.emissionFactorsCache[slug]) {
        return this.emissionFactorsCache[slug];
      }

      const { data, error } = await supabase
        .from('emission_factors')
        .select('id, slug, nom_affiche, factor_name, emission_factor, unit, category, subcategory, source, year, created_at, updated_at')
        .eq('slug', slug)
        .maybeSingle();

      if (error) {
        console.error(`Error fetching emission factor for slug ${slug}:`, error);
        return null;
      }

      if (!data) {
        return null;
      }

      const emissionFactor: EmissionFactor = {
        id: data.id,
        slug: data.slug || data.id,
        nom_affiche: data.nom_affiche || data.factor_name,
        factor_name: data.factor_name,
        emission_factor: data.emission_factor,
        unit: data.unit,
        category: data.category,
        subcategory: data.subcategory,
        source: data.source,
        year: data.year
      };

      // Update cache
      this.emissionFactorsCache[slug] = emissionFactor;

      return emissionFactor;
    } catch (error) {
      console.error('Error in getEmissionFactor:', error);
      return null;
    }
  }

  /**
   * Get emission factors by category
   */
  static async getEmissionFactorsByCategory(category: string): Promise<EmissionFactor[]> {
    try {
      const { data, error } = await supabase
        .from('emission_factors')
        .select('id, slug, nom_affiche, factor_name, emission_factor, unit, category, subcategory, source, year, created_at, updated_at')
        .eq('category', category)
        .order('factor_name', { ascending: true });

      if (error) {
        console.error(`Error fetching emission factors for category ${category}:`, error);
        throw new Error(`Failed to fetch emission factors: ${error.message}`);
      }

      return data?.map((factor: any) => ({
        id: factor.id,
        slug: factor.slug || factor.id,
        nom_affiche: factor.nom_affiche || factor.factor_name,
        factor_name: factor.factor_name,
        emission_factor: factor.emission_factor,
        unit: factor.unit,
        category: factor.category,
        subcategory: factor.subcategory,
        source: factor.source,
        year: factor.year
      })) || [];
    } catch (error) {
      console.error('Error in getEmissionFactorsByCategory:', error);
      throw error;
    }
  }

  /**
   * Clear the cache (useful for testing or forced refresh)
   */
  static clearCache(): void {
    this.emissionFactorsCache = {};
    this.cacheTimestamp = 0;
  }

  /**
   * Get cache info for debugging
   */
  static getCacheInfo(): { count: number; timestamp: number; age: number } {
    return {
      count: Object.keys(this.emissionFactorsCache).length,
      timestamp: this.cacheTimestamp,
      age: Date.now() - this.cacheTimestamp
    };
  }

  /**
   * Validate that all required emission factors exist for given question slugs
   */
  static async validateEmissionFactors(questionSlugs: string[]): Promise<{
    valid: boolean;
    missing: string[];
    available: { [slug: string]: EmissionFactor };
  }> {
    try {
      const factors = await this.fetchEmissionFactorsBySlugs(questionSlugs);
      const available = Object.keys(factors);
      const missing = questionSlugs.filter(slug => !available.includes(slug));

      return {
        valid: missing.length === 0,
        missing,
        available: factors
      };
    } catch (error) {
      console.error('Error validating emission factors:', error);
      return {
        valid: false,
        missing: questionSlugs,
        available: {}
      };
    }
  }
} 