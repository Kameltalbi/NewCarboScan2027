// Hook CRUD pour les études PCF

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, getStoredUser } from "@/integrations/api/client";
import { useOrganizationId } from '@/hooks/useOrganizationId';
import { toast } from 'sonner';
import type { PCFStudy, CreateStudyForm } from '../types';

export function usePCFStudies() {
  const { organizationId } = useOrganizationId();

  return useQuery({
    queryKey: ['pcf-studies', organizationId],
    enabled: !!organizationId,
    queryFn: async () => {
      const { items } = await api.listPcfStudies();
      return (items || []) as unknown as PCFStudy[];
    },
  });
}

export function usePCFStudy(studyId: string | undefined) {
  return useQuery({
    queryKey: ['pcf-study', studyId],
    enabled: !!studyId,
    queryFn: async () => {
      const { item } = await api.getPcfStudy(studyId!);
      return item as unknown as PCFStudy;
    },
  });
}

export function useCreatePCFStudy() {
  const qc = useQueryClient();
  const { organizationId } = useOrganizationId();

  return useMutation({
    mutationFn: async (form: CreateStudyForm) => {
      const user = getStoredUser();
      if (!user || !organizationId) throw new Error('Non authentifié');
      const { item } = await api.createPcfStudy(form as unknown as Record<string, unknown>);
      return item as unknown as PCFStudy;
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
      const { item } = await api.patchPcfStudy(id, updates as Record<string, unknown>);
      return item as unknown as PCFStudy;
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
      await api.deletePcfStudy(id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pcf-studies'] });
      toast.success('Étude supprimée');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
