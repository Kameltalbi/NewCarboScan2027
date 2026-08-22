import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAppData } from '@/contexts/AppDataContext';
import type { WattBimBuilding, WattBimMeter, WattBimReading, WattBimAlert, WattBimSaving } from './types';

const unavailable = () =>
  Promise.reject(new Error('WattBim n’est pas encore branché sur l’API Newcarboscan. Module gelé en production.'));

export const useBuildings = () => {
  const { organizationId } = useAppData();
  return useQuery({
    queryKey: ['wattbim', 'buildings', organizationId],
    enabled: !!organizationId,
    queryFn: async (): Promise<WattBimBuilding[]> => [],
  });
};

export const useUpsertBuilding = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (_input: Partial<WattBimBuilding> & { name: string }) => unavailable() as Promise<WattBimBuilding>,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['wattbim', 'buildings'] }),
  });
};

export const useDeleteBuilding = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (_id: string) => unavailable(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['wattbim'] }),
  });
};

export const useMeters = (buildingId?: string) => {
  const { organizationId } = useAppData();
  return useQuery({
    queryKey: ['wattbim', 'meters', organizationId, buildingId ?? 'all'],
    enabled: !!organizationId,
    queryFn: async (): Promise<WattBimMeter[]> => [],
  });
};

export const useUpsertMeter = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (_input: Partial<WattBimMeter> & { name: string; building_id: string }) =>
      unavailable() as Promise<WattBimMeter>,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['wattbim', 'meters'] }),
  });
};

export const useDeleteMeter = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (_id: string) => unavailable(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['wattbim'] }),
  });
};

export const useReadings = (meterId?: string) => {
  const { organizationId } = useAppData();
  return useQuery({
    queryKey: ['wattbim', 'readings', organizationId, meterId ?? 'all'],
    enabled: !!organizationId,
    queryFn: async (): Promise<WattBimReading[]> => [],
  });
};

export const useCreateReading = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (
      _input: Partial<WattBimReading> & {
        meter_id: string;
        period_start: string;
        period_end: string;
        value: number;
        unit: string;
      },
    ) => unavailable() as Promise<WattBimReading>,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['wattbim'] }),
  });
};

export const useAlerts = () => {
  const { organizationId } = useAppData();
  return useQuery({
    queryKey: ['wattbim', 'alerts', organizationId],
    enabled: !!organizationId,
    queryFn: async (): Promise<WattBimAlert[]> => [],
  });
};

export const useCreateAlert = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (_input: Partial<WattBimAlert> & { alert_type: string; message: string }) =>
      unavailable(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['wattbim', 'alerts'] }),
  });
};

export const useResolveAlert = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (_id: string) => unavailable(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['wattbim', 'alerts'] }),
  });
};

export const useSavings = () => {
  const { organizationId } = useAppData();
  return useQuery({
    queryKey: ['wattbim', 'savings', organizationId],
    enabled: !!organizationId,
    queryFn: async (): Promise<WattBimSaving[]> => [],
  });
};

export const detectAnomalies = (
  readings: WattBimReading[],
  newReading: WattBimReading,
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
