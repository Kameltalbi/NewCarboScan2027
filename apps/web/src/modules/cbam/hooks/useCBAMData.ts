/**
 * CBAM Module Data Hooks
 * Centralized hooks for all CBAM data operations
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from "@/integrations/api/client";
import { useOrganizationId } from '@/hooks/useOrganizationId';
import { useToast } from '@/hooks/use-toast';

// ============ INSTALLATIONS ============

export interface CBAMInstallation {
  id: string;
  organization_id: string;
  name: string;
  country: string;
  address: string | null;
  sector: string;
  annual_capacity: number | null;
  reference_year: number;
  created_at: string;
}

export const useCBAMInstallations = () => {
  const { organizationId } = useOrganizationId();
  return useQuery({
    queryKey: ['cbam-installations', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { items } = await api.listCbamInstallations();
      return (items || []) as unknown as CBAMInstallation[];
    },
    enabled: !!organizationId,
  });
};

export const useCreateInstallation = () => {
  const queryClient = useQueryClient();
  const { organizationId } = useOrganizationId();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async (data: Partial<CBAMInstallation>) => {
      const { item } = await api.createCbamInstallation({ ...data });
      return item;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cbam-installations'] });
      toast({ title: "Installation créée avec succès" });
    },
    onError: (err: any) => {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    },
  });
};

export const useUpdateInstallation = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<CBAMInstallation> & { id: string }) => {
      await api.patchCbamInstallation(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cbam-installations'] });
      toast({ title: "Installation mise à jour" });
    },
    onError: (err: any) => {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    },
  });
};

export const useDeleteInstallation = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async (id: string) => {
      await api.deleteCbamInstallation(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cbam-installations'] });
      toast({ title: "Installation supprimée" });
    },
    onError: (err: any) => {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    },
  });
};

// ============ PRODUCTS ============

export interface CBAMProduct {
  id: string;
  cn_code: string;
  name: string;
  sector: string;
  unit: string;
}

export const useCBAMProducts = () => {
  return useQuery({
    queryKey: ['cbam-products'],
    queryFn: async () => {
      const { items } = await api.listCbamProducts();
      return (items || []) as unknown as CBAMProduct[];
    },
  });
};

// ============ PRODUCTION ============

export interface CBAMProduction {
  id: string;
  installation_id: string;
  product_id: string;
  year: number;
  quarter: number;
  quantity: number;
  unit: string;
}

export const useCBAMProduction = (installationId?: string) => {
  return useQuery({
    queryKey: ['cbam-production', installationId],
    queryFn: async () => {
      const { items } = await api.listCbamProduction(installationId);
      return (items || []) as unknown as CBAMProduction[];
    },
    enabled: !installationId || !!installationId,
  });
};

export const useUpsertProduction = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async (data: Omit<CBAMProduction, 'id'>) => {
      await api.upsertCbamProduction(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cbam-production'] });
      toast({ title: "Production enregistrée" });
    },
    onError: (err: any) => {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    },
  });
};

// ============ EXPORTS ============

export interface CBAMExport {
  id: string;
  installation_id: string;
  product_id: string;
  client_name: string;
  destination_country: string;
  quantity_exported: number;
  export_date: string;
  created_at: string;
}

export const useCBAMExports = (installationId?: string) => {
  return useQuery({
    queryKey: ['cbam-exports', installationId],
    queryFn: async () => {
      const { items } = await api.listCbamExports(installationId);
      return (items || []) as unknown as CBAMExport[];
    },
  });
};

export const useCreateExport = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async (data: Omit<CBAMExport, 'id' | 'created_at'>) => {
      const { item } = await api.createCbamExport(data);
      return item;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cbam-exports'] });
      toast({ title: "Export enregistré" });
    },
    onError: (err: any) => {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    },
  });
};

// ============ ENERGY ============

export interface CBAMEnergy {
  id: string;
  installation_id: string;
  energy_type: string;
  quantity: number;
  unit: string;
  emission_factor: number;
  year: number;
  quarter: number;
}

export const useCBAMEnergy = (installationId?: string) => {
  return useQuery({
    queryKey: ['cbam-energy', installationId],
    queryFn: async () => {
      const { items } = await api.listCbamEnergy(installationId);
      return (items || []) as unknown as CBAMEnergy[];
    },
  });
};

// ============ EMISSIONS SUMMARY ============

export interface CBAMEmissionsSummary {
  id: string;
  installation_id: string;
  direct_emissions: number;
  indirect_emissions: number;
  total_emissions: number;
  year: number;
  quarter: number;
}

export const useCBAMEmissionsSummary = (installationId?: string) => {
  return useQuery({
    queryKey: ['cbam-emissions-summary', installationId],
    queryFn: async () => {
      const { items } = await api.listCbamEmissionsSummary(installationId);
      return (items || []) as unknown as CBAMEmissionsSummary[];
    },
  });
};

// ============ DASHBOARD STATS ============

export const useCBAMDashboardStats = () => {
  const { organizationId } = useOrganizationId();
  
  const installations = useCBAMInstallations();
  const products = useCBAMProducts();
  const exports = useCBAMExports();
  const emissionsSummary = useCBAMEmissionsSummary();

  const totalInstallations = installations.data?.length || 0;
  const totalProducts = products.data?.length || 0;
  const totalExports = exports.data?.length || 0;
  const totalEmissions = emissionsSummary.data?.reduce((sum, e) => sum + e.total_emissions, 0) || 0;

  const directEmissions = emissionsSummary.data?.reduce((sum, e) => sum + e.direct_emissions, 0) || 0;
  const indirectEmissions = emissionsSummary.data?.reduce((sum, e) => sum + e.indirect_emissions, 0) || 0;

  return {
    totalInstallations,
    totalProducts,
    totalExports,
    totalEmissions,
    directEmissions,
    indirectEmissions,
    isLoading: installations.isLoading || products.isLoading || exports.isLoading || emissionsSummary.isLoading,
  };
};
