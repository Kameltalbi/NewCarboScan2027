import { useQuery } from '@tanstack/react-query';
import { supabase } from "@/integrations/api/client";
import type { ACVMaterial, ACVProcess, ACVTransportMode } from '../types';

export const useACVMaterials = (category?: string) => {
  return useQuery({
    queryKey: ['acv-materials', category],
    queryFn: async () => {
      let query = supabase
        .from('acv_materials')
        .select('*')
        .order('category')
        .order('name');

      if (category) {
        query = query.eq('category', category);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as ACVMaterial[];
    },
  });
};

export const useACVProcesses = (sector?: string) => {
  return useQuery({
    queryKey: ['acv-processes', sector],
    queryFn: async () => {
      let query = supabase
        .from('acv_processes')
        .select('*')
        .order('sector')
        .order('name');

      if (sector) {
        query = query.eq('sector', sector);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as ACVProcess[];
    },
  });
};

export const useACVTransportModes = () => {
  return useQuery({
    queryKey: ['acv-transport-modes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('acv_transport_modes')
        .select('*')
        .order('mode_type')
        .order('name');

      if (error) throw error;
      return data as ACVTransportMode[];
    },
  });
};
