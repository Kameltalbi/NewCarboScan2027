// Hook pour importer des activity_data depuis le module Collecte vers une étude PCF
import { useQuery } from '@tanstack/react-query';
import { supabase } from "@/integrations/api/client";
import { useOrganizationId } from '@/hooks/useOrganizationId';

export interface ImportableActivityData {
  id: string;
  category: string;
  subcategory: string | null;
  activity_type: string;
  quantity: number;
  unit: string;
  period_start: string;
  period_end: string;
  data_quality: string;
  notes: string | null;
  emission_factor_id: string | null;
}

/**
 * Récupère les activity_data de l'organisation, filtrables par catégorie,
 * pour permettre l'import dans les formulaires PCF.
 */
export function useImportableActivityData(category?: string) {
  const { organizationId } = useOrganizationId();

  return useQuery({
    queryKey: ['importable-activity-data', organizationId, category],
    enabled: !!organizationId,
    queryFn: async () => {
      let query = supabase
        .from('activity_data')
        .select('id, category, subcategory, activity_type, quantity, unit, period_start, period_end, data_quality, notes, emission_factor_id')
        .eq('organization_id', organizationId!)
        .order('created_at', { ascending: false })
        .limit(200);

      if (category) {
        query = query.eq('category', category);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as ImportableActivityData[];
    },
  });
}

// Mapping catégories activity_data → sections PCF
export const CATEGORY_TO_PCF_SECTION: Record<string, string> = {
  energy: 'manufacturing',
  materials: 'materials',
  transport: 'transport',
  waste: 'wastes',
  packaging: 'packaging',
};

export const PCF_SECTION_LABELS: Record<string, string> = {
  manufacturing: 'Fabrication',
  materials: 'Matériaux (BOM)',
  transport: 'Transport',
  wastes: 'Déchets',
  packaging: 'Emballage',
};
