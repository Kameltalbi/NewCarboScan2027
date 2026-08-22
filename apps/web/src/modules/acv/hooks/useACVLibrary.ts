import { useQuery } from '@tanstack/react-query';
import { api } from "@/integrations/api/client";
import type { ACVMaterial, ACVProcess, ACVTransportMode } from '../types';

export const useACVMaterials = (category?: string) => {
  return useQuery({
    queryKey: ['acv-materials', category],
    queryFn: async () => {
      const { items } = await api.listAcvMaterials(category);
      return (items || []) as unknown as ACVMaterial[];
    },
  });
};

export const useACVProcesses = (sector?: string) => {
  return useQuery({
    queryKey: ['acv-processes', sector],
    queryFn: async () => {
      const { items } = await api.listAcvProcesses(sector);
      return (items || []) as unknown as ACVProcess[];
    },
  });
};

export const useACVTransportModes = () => {
  return useQuery({
    queryKey: ['acv-transport-modes'],
    queryFn: async () => {
      const { items } = await api.listAcvTransportModes();
      return (items || []) as unknown as ACVTransportMode[];
    },
  });
};
