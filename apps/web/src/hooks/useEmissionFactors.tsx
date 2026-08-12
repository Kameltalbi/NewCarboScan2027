import { useState, useEffect } from 'react';
import { supabase } from "@/integrations/api/client";

export interface EmissionFactor {
  id: string;
  slug: string;
  nom_affiche: string;
  factor_name: string;
  emission_factor: number;
  unit: string;
  category: string;
  subcategory?: string;
  source?: string;
  year?: number;
}

export const useEmissionFactors = () => {
  const [emissionFactors, setEmissionFactors] = useState<EmissionFactor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchEmissionFactors = async () => {
      try {
        const { data, error } = await supabase
          .from('emission_factors')
          .select('*');

        if (error) {
          setError(error.message);
        } else {
          setEmissionFactors(data || []);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Une erreur est survenue');
      } finally {
        setLoading(false);
      }
    };

    fetchEmissionFactors();
  }, []);

  const getFactorBySlug = (slug: string): EmissionFactor | undefined => {
    return emissionFactors.find(factor => factor.slug === slug);
  };

  const getFactorsByCategory = (category: string): EmissionFactor[] => {
    return emissionFactors.filter(factor => factor.category.toLowerCase() === category.toLowerCase());
  };

  return {
    emissionFactors,
    loading,
    error,
    getFactorBySlug,
    getFactorsByCategory,
  };
};