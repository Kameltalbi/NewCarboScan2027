// Hooks CRUD pour les sous-tables PCF (materials, transport, manufacturing, etc.)

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from "@/integrations/api/client";
import { toast } from 'sonner';

// Generic hook factory for PCF sub-tables
function usePCFSubTable<T extends { id: string }>(
  table: string,
  studyId: string | undefined,
  queryKeyPrefix: string
) {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: [queryKeyPrefix, studyId],
    enabled: !!studyId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from(table)
        .select('*')
        .eq('study_id', studyId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data as T[];
    },
  });

  const upsert = useMutation({
    mutationFn: async (row: Partial<T> & { study_id: string }) => {
      const { data, error } = await (supabase as any)
        .from(table)
        .upsert(row)
        .select()
        .single();
      if (error) throw error;
      return data as T;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [queryKeyPrefix, studyId] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const insert = useMutation({
    mutationFn: async (row: Omit<Partial<T>, 'id'> & { study_id: string }) => {
      const { data, error } = await (supabase as any)
        .from(table)
        .insert(row)
        .select()
        .single();
      if (error) throw error;
      return data as T;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [queryKeyPrefix, studyId] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const update = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<T> & { id: string }) => {
      const { data, error } = await (supabase as any)
        .from(table)
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as T;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [queryKeyPrefix, studyId] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from(table).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [queryKeyPrefix, studyId] }),
    onError: (e: Error) => toast.error(e.message),
  });

  return { ...query, upsert, insert, update, remove };
}

// ─── Exported hooks ─────────────────────────────────────────────────
import type {
  PCFMaterial, PCFTransport, PCFManufacturing,
  PCFWaste, PCFPackaging, PCFUsage, PCFEndOfLife,
  PCFResult, PCFScenario, PCFSubcontracting, PCFCoProductAllocation
} from '../types';

export const usePCFMaterials = (studyId?: string) =>
  usePCFSubTable<PCFMaterial>('pcf_materials', studyId, 'pcf-materials');

export const usePCFTransport = (studyId?: string) =>
  usePCFSubTable<PCFTransport>('pcf_transport', studyId, 'pcf-transport');

export const usePCFManufacturing = (studyId?: string) =>
  usePCFSubTable<PCFManufacturing>('pcf_manufacturing', studyId, 'pcf-manufacturing');

export const usePCFWastes = (studyId?: string) =>
  usePCFSubTable<PCFWaste>('pcf_wastes', studyId, 'pcf-wastes');

export const usePCFPackaging = (studyId?: string) =>
  usePCFSubTable<PCFPackaging>('pcf_packaging', studyId, 'pcf-packaging');

export const usePCFUsage = (studyId?: string) =>
  usePCFSubTable<PCFUsage>('pcf_usage', studyId, 'pcf-usage');

export const usePCFEndOfLife = (studyId?: string) =>
  usePCFSubTable<PCFEndOfLife>('pcf_end_of_life', studyId, 'pcf-end-of-life');

export const usePCFResults = (studyId?: string) =>
  usePCFSubTable<PCFResult>('pcf_results', studyId, 'pcf-results');

export const usePCFScenarios = (studyId?: string) =>
  usePCFSubTable<PCFScenario>('pcf_scenarios', studyId, 'pcf-scenarios');

export const usePCFSubcontracting = (studyId?: string) =>
  usePCFSubTable<PCFSubcontracting>('pcf_subcontracting', studyId, 'pcf-subcontracting');

export const usePCFCoProductAllocations = (studyId?: string) =>
  usePCFSubTable<PCFCoProductAllocation>('pcf_co_product_allocations', studyId, 'pcf-co-products');
