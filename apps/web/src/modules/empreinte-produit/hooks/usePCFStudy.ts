// Hook CRUD pour les études PCF

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from "@/integrations/api/client";
import { useOrganizationId } from '@/hooks/useOrganizationId';
import { toast } from 'sonner';
import type { PCFStudy, CreateStudyForm } from '../types';

const TABLE = 'pcf_studies';

export function usePCFStudies() {
  const { organizationId } = useOrganizationId();

  return useQuery({
    queryKey: ['pcf-studies', organizationId],
    enabled: !!organizationId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from(TABLE)
        .select('*')
        .eq('organization_id', organizationId)
        .order('updated_at', { ascending: false });
      if (error) throw error;
      return data as PCFStudy[];
    },
  });
}

export function usePCFStudy(studyId: string | undefined) {
  return useQuery({
    queryKey: ['pcf-study', studyId],
    enabled: !!studyId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from(TABLE)
        .select('*')
        .eq('id', studyId)
        .single();
      if (error) throw error;
      return data as PCFStudy;
    },
  });
}

export function useCreatePCFStudy() {
  const qc = useQueryClient();
  const { organizationId } = useOrganizationId();

  return useMutation({
    mutationFn: async (form: CreateStudyForm) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !organizationId) throw new Error('Non authentifié');

      const { data, error } = await (supabase as any)
        .from(TABLE)
        .insert({
          ...form,
          organization_id: organizationId,
          created_by: user.id,
        })
        .select()
        .single();
      if (error) throw error;
      return data as PCFStudy;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pcf-studies'] });
      toast.success('Étude PCF créée');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdatePCFStudy() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<PCFStudy> & { id: string }) => {
      const { data, error } = await (supabase as any)
        .from(TABLE)
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as PCFStudy;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['pcf-studies'] });
      qc.invalidateQueries({ queryKey: ['pcf-study', data.id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeletePCFStudy() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from(TABLE).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pcf-studies'] });
      toast.success('Étude supprimée');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
