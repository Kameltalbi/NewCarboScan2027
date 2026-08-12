import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from "@/integrations/api/client";
import { useAppData } from '@/contexts/AppDataContext';
import type { WattBimBuilding, WattBimMeter, WattBimReading, WattBimAlert, WattBimSaving } from './types';

// Buildings
export const useBuildings = () => {
  const { organizationId } = useAppData();
  return useQuery({
    queryKey: ['wattbim', 'buildings', organizationId],
    enabled: !!organizationId,
    queryFn: async (): Promise<WattBimBuilding[]> => {
      const { data, error } = await supabase
        .from('wattbim_buildings')
        .select('*')
        .eq('organization_id', organizationId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as WattBimBuilding[];
    },
  });
};

export const useUpsertBuilding = () => {
  const qc = useQueryClient();
  const { organizationId } = useAppData();
  return useMutation({
    mutationFn: async (input: Partial<WattBimBuilding> & { name: string }) => {
      const payload = { ...input, organization_id: organizationId };
      const { data, error } = await supabase
        .from('wattbim_buildings')
        .upsert(payload as any)
        .select()
        .single();
      if (error) throw error;
      return data as WattBimBuilding;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['wattbim', 'buildings'] }),
  });
};

export const useDeleteBuilding = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('wattbim_buildings').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['wattbim'] }),
  });
};

// Meters
export const useMeters = (buildingId?: string) => {
  const { organizationId } = useAppData();
  return useQuery({
    queryKey: ['wattbim', 'meters', organizationId, buildingId ?? 'all'],
    enabled: !!organizationId,
    queryFn: async (): Promise<WattBimMeter[]> => {
      let q = supabase.from('wattbim_meters').select('*').eq('organization_id', organizationId!);
      if (buildingId) q = q.eq('building_id', buildingId);
      const { data, error } = await q.order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as WattBimMeter[];
    },
  });
};

export const useUpsertMeter = () => {
  const qc = useQueryClient();
  const { organizationId } = useAppData();
  return useMutation({
    mutationFn: async (input: Partial<WattBimMeter> & { name: string; building_id: string }) => {
      const payload = { ...input, organization_id: organizationId };
      const { data, error } = await supabase
        .from('wattbim_meters')
        .upsert(payload as any)
        .select()
        .single();
      if (error) throw error;
      return data as WattBimMeter;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['wattbim', 'meters'] }),
  });
};

export const useDeleteMeter = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('wattbim_meters').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['wattbim'] }),
  });
};

// Readings
export const useReadings = (meterId?: string) => {
  const { organizationId } = useAppData();
  return useQuery({
    queryKey: ['wattbim', 'readings', organizationId, meterId ?? 'all'],
    enabled: !!organizationId,
    queryFn: async (): Promise<WattBimReading[]> => {
      let q = supabase.from('wattbim_readings').select('*').eq('organization_id', organizationId!);
      if (meterId) q = q.eq('meter_id', meterId);
      const { data, error } = await q.order('period_start', { ascending: false }).limit(200);
      if (error) throw error;
      return (data ?? []) as WattBimReading[];
    },
  });
};

export const useCreateReading = () => {
  const qc = useQueryClient();
  const { organizationId } = useAppData();
  return useMutation({
    mutationFn: async (input: Partial<WattBimReading> & { meter_id: string; period_start: string; period_end: string; value: number; unit: string }) => {
      const payload = { ...input, organization_id: organizationId, source: input.source ?? 'manual' };
      const { data, error } = await supabase
        .from('wattbim_readings')
        .insert(payload as any)
        .select()
        .single();
      if (error) throw error;
      return data as WattBimReading;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['wattbim'] }),
  });
};

// Alerts
export const useAlerts = () => {
  const { organizationId } = useAppData();
  return useQuery({
    queryKey: ['wattbim', 'alerts', organizationId],
    enabled: !!organizationId,
    queryFn: async (): Promise<WattBimAlert[]> => {
      const { data, error } = await supabase
        .from('wattbim_alerts')
        .select('*')
        .eq('organization_id', organizationId!)
        .order('detected_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as WattBimAlert[];
    },
  });
};

export const useCreateAlert = () => {
  const qc = useQueryClient();
  const { organizationId } = useAppData();
  return useMutation({
    mutationFn: async (input: Partial<WattBimAlert> & { alert_type: string; message: string }) => {
      const payload = { ...input, organization_id: organizationId };
      const { error } = await supabase.from('wattbim_alerts').insert(payload as any);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['wattbim', 'alerts'] }),
  });
};

export const useResolveAlert = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('wattbim_alerts')
        .update({ status: 'resolved', resolved_at: new Date().toISOString() } as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['wattbim', 'alerts'] }),
  });
};

// Savings
export const useSavings = () => {
  const { organizationId } = useAppData();
  return useQuery({
    queryKey: ['wattbim', 'savings', organizationId],
    enabled: !!organizationId,
    queryFn: async (): Promise<WattBimSaving[]> => {
      const { data, error } = await supabase
        .from('wattbim_savings')
        .select('*')
        .eq('organization_id', organizationId!)
        .order('period_start', { ascending: false });
      if (error) throw error;
      return (data ?? []) as WattBimSaving[];
    },
  });
};

// Détection d'anomalies simple côté client à appeler après création d'un relevé
export const detectAnomalies = (
  readings: WattBimReading[],
  newReading: WattBimReading
): { type: string; severity: 'low' | 'medium' | 'high'; message: string; expected?: number }[] => {
  const anomalies: { type: string; severity: 'low' | 'medium' | 'high'; message: string; expected?: number }[] = [];
  const prior = readings
    .filter(r => r.meter_id === newReading.meter_id && r.id !== newReading.id)
    .slice(0, 6);
  if (prior.length === 0) return anomalies;

  const avg = prior.reduce((s, r) => s + Number(r.value || 0), 0) / prior.length;
  const ratio = avg > 0 ? Number(newReading.value) / avg : 1;

  if (ratio >= 1.3) {
    anomalies.push({
      type: 'drift',
      severity: ratio >= 1.6 ? 'high' : 'medium',
      message: `Consommation +${Math.round((ratio - 1) * 100)}% vs moyenne des 6 derniers relevés (${avg.toFixed(0)} ${newReading.unit}).`,
      expected: avg,
    });
  }
  if (ratio <= 0.5 && avg > 0) {
    anomalies.push({
      type: 'underuse',
      severity: 'low',
      message: `Consommation −${Math.round((1 - ratio) * 100)}% vs moyenne. À vérifier (compteur HS ?).`,
      expected: avg,
    });
  }
  return anomalies;
};
