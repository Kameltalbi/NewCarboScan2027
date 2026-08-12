import { useState, useEffect } from 'react';
import { supabase } from "@/integrations/api/client";
import { ImpactFactor } from '@/types/acv';
import { useToast } from '@/hooks/use-toast';

export const useACVImpactFactors = () => {
  const [impactFactors, setImpactFactors] = useState<ImpactFactor[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchImpactFactors = async () => {
    try {
      const { data, error } = await supabase
        .from('impact_factors')
        .select('*')
        .order('category', { ascending: true });

      if (error) throw error;
      setImpactFactors(data || []);
    } catch (error) {
      console.error('Error fetching impact factors:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les facteurs d'impact",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getFactorByItem = (item: string): ImpactFactor | undefined => {
    return impactFactors.find(factor => factor.item.toLowerCase() === item.toLowerCase());
  };

  const getFactorsByCategory = (category: string): ImpactFactor[] => {
    return impactFactors.filter(factor => factor.category.toLowerCase() === category.toLowerCase());
  };

  useEffect(() => {
    fetchImpactFactors();
  }, []);

  return {
    impactFactors,
    loading,
    getFactorByItem,
    getFactorsByCategory,
    refetch: fetchImpactFactors,
  };
};