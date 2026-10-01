import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from "@/integrations/api/client";
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
  raw_legacy?: Record<string, unknown> | null;
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

function mapSupplier(row: Record<string, unknown>): Supplier {
  return {
    id: String(row.id),
    organization_id: String(row.organization_id),
    name: String(row.name || ''),
    siret: (row.siret as string | null) ?? null,
    naf_code: (row.naf_code as string | null) ?? null,
    country: String(row.country || ''),
    city: (row.city as string | null) ?? null,
    contact_name: (row.contact_name as string | null) ?? null,
    contact_email: (row.contact_email as string | null) ?? null,
    purchase_category: (row.purchase_category as string | null) ?? null,
    carbon_score: (row.carbon_score as string | null) ?? null,
    confidence_index: Number(row.confidence_index ?? 0),
    engagement_status: String(row.engagement_status || 'not_contacted'),
    data_method: String(row.data_method || 'estimated'),
    has_carbon_footprint: Boolean(row.has_carbon_footprint),
    has_sbti_target: Boolean(row.has_sbti_target),
    has_cdp_disclosure: Boolean(row.has_cdp_disclosure),
    cdp_score: (row.cdp_score as string | null) ?? null,
    has_iso14001: Boolean(row.has_iso14001),
    has_ecovadis: Boolean(row.has_ecovadis),
    ecovadis_score: row.ecovadis_score != null ? Number(row.ecovadis_score) : null,
    annual_spend: row.annual_spend != null ? Number(row.annual_spend) : null,
    criticality: String(row.criticality || 'medium'),
    is_active: row.is_active !== false,
    tags: Array.isArray(row.tags) ? (row.tags as string[]) : [],
    last_data_update: (row.last_data_update as string | null) ?? null,
    created_at: String(row.created_at || ''),
    updated_at: String(row.updated_at || ''),
    raw_legacy:
      row.raw_legacy && typeof row.raw_legacy === 'object'
        ? (row.raw_legacy as Record<string, unknown>)
        : null,
  };
}

export const useSuppliers = () => {
  const { organizationId } = useOrganizationId();
  const queryClient = useQueryClient();

  const suppliersQuery = useQuery({
    queryKey: ['suppliers', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { items } = await api.listSuppliers();
      return (items || []).map((row) => mapSupplier(row));
    },
    enabled: !!organizationId,
  });

  const statsQuery = useQuery({
    queryKey: ['supplier-stats', organizationId],
    queryFn: async () => {
      if (!organizationId) return null;
      const { stats } = await api.getSupplierStats();
      return stats as SupplierStats;
    },
    enabled: !!organizationId,
  });

  const createSupplier = useMutation({
    mutationFn: async (supplier: Partial<Supplier>) => {
      if (!organizationId) throw new Error('No organization');
      const { item } = await api.createSupplier(supplier as Record<string, unknown>);
      return mapSupplier(item);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers', organizationId] });
      queryClient.invalidateQueries({ queryKey: ['supplier-stats', organizationId] });
      toast.success('Contrepartie ajoutée avec succès');
    },
    onError: (err) => {
      toast.error('Erreur lors de l\'ajout');
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
