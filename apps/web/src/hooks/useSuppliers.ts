import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from "@/integrations/api/client";
import { useOrganizationId } from './useOrganizationId';
import { toast } from 'sonner';

export interface Supplier {
  id: string;
  organization_id: string;
  name: string;
  siret: string | null;
  naf_code: string | null;
  country: string;
  city: string | null;
  contact_name: string | null;
  contact_email: string | null;
  purchase_category: string | null;
  carbon_score: string | null;
  confidence_index: number;
  engagement_status: string;
  data_method: string;
  has_carbon_footprint: boolean;
  has_sbti_target: boolean;
  has_cdp_disclosure: boolean;
  cdp_score: string | null;
  has_iso14001: boolean;
  has_ecovadis: boolean;
  ecovadis_score: number | null;
  annual_spend: number | null;
  criticality: string;
  is_active: boolean;
  tags: string[];
  last_data_update: string | null;
  created_at: string;
  updated_at: string;
}

export interface SupplierStats {
  total_suppliers: number;
  engaged_suppliers: number;
  scored_suppliers: number;
  top_performers: number;
  total_spend: number;
  total_emissions: number;
  avg_confidence: number;
  questionnaires_sent: number;
  questionnaires_completed: number;
  countries_count: number;
}

export const useSuppliers = () => {
  const { organizationId } = useOrganizationId();
  const queryClient = useQueryClient();

  const suppliersQuery = useQuery({
    queryKey: ['suppliers', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return (data || []) as Supplier[];
    },
    enabled: !!organizationId,
  });

  const statsQuery = useQuery({
    queryKey: ['supplier-stats', organizationId],
    queryFn: async () => {
      if (!organizationId) return null;
      const { data, error } = await supabase
        .rpc('get_supplier_dashboard_stats', { p_org_id: organizationId });
      if (error) throw error;
      if (!data || data.length === 0) return null;
      return data[0] as SupplierStats;
    },
    enabled: !!organizationId,
  });

  const createSupplier = useMutation({
    mutationFn: async (supplier: Partial<Supplier>) => {
      if (!organizationId) throw new Error('No organization');
      const { data, error } = await supabase
        .from('suppliers')
        .insert({ ...supplier, organization_id: organizationId })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers', organizationId] });
      queryClient.invalidateQueries({ queryKey: ['supplier-stats', organizationId] });
      toast.success('Fournisseur ajouté avec succès');
    },
    onError: (err) => {
      toast.error('Erreur lors de l\'ajout du fournisseur');
      console.error(err);
    },
  });

  return {
    suppliers: suppliersQuery.data || [],
    stats: statsQuery.data,
    isLoading: suppliersQuery.isLoading,
    isStatsLoading: statsQuery.isLoading,
    createSupplier,
    organizationId,
  };
};

// Engagement status mapping for display
export const engagementStatusLabels: Record<string, string> = {
  not_contacted: 'Non contacté',
  invited: 'Invitation envoyée',
  account_created: 'Compte créé',
  data_submitted: 'Données soumises',
  scored: 'Noté',
  engaged: 'Engagé',
};

export const engagementStatusVariant = (status: string): 'default' | 'secondary' | 'outline' | 'destructive' => {
  switch (status) {
    case 'scored':
    case 'engaged':
      return 'default';
    case 'data_submitted':
    case 'account_created':
      return 'secondary';
    case 'invited':
      return 'outline';
    default:
      return 'outline';
  }
};
