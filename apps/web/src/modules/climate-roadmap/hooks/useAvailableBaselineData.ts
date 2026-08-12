// Hook pour détecter les données disponibles dans les autres modules CarboScan
// et proposer une baseline intelligente à l'utilisateur

import { useState, useEffect } from 'react';
import { supabase } from "@/integrations/api/client";
import { useOrganizationId } from '@/hooks/useOrganizationId';
import { useAuth } from '@/hooks/useAuth';

export interface DataSourceSummary {
  // Bilan
  bilanCount: number;
  bilans: BilanSummary[];
  // PCF
  pcfCount: number;
  pcfStudies: PCFSummary[];
  // ACV
  acvCount: number;
  acvProjects: ACVSummary[];
  // Meta
  lastUpdate: string | null;
  loading: boolean;
}

export interface BilanSummary {
  id: string;
  year: number | null;
  totalEmissions: number; // in tCO2e
  scope1: number;
  scope2: number;
  scope3: number;
  status: string;
  date: string;
  sitesCount?: number;
}

export interface PCFSummary {
  id: string;
  productName: string;
  totalCarbonKg: number;
  status: string;
  date: string;
  functionalUnit?: string;
}

export interface ACVSummary {
  id: string;
  name: string;
  status: string;
  date: string;
  impactCategories: string[];
  totalCarbon: number;
}

export function useAvailableDataSources(): DataSourceSummary {
  const { organizationId } = useOrganizationId();
  const { user } = useAuth();
  const [data, setData] = useState<DataSourceSummary>({
    bilanCount: 0, bilans: [],
    pcfCount: 0, pcfStudies: [],
    acvCount: 0, acvProjects: [],
    lastUpdate: null, loading: true,
  });

  useEffect(() => {
    if (!user?.id) { setData(prev => ({ ...prev, loading: false })); return; }

    const fetchAll = async () => {
      const bilans: BilanSummary[] = [];
      const pcfStudies: PCFSummary[] = [];
      const acvProjects: ACVSummary[] = [];
      let lastUpdate: string | null = null;

      // Bilans — query by user_id AND organization_id to catch all accessible bilans
      const bilanQuery = supabase
        .from('bilans_carbone')
        .select('id, total_emission, scope1_emission, scope2_emission, scope3_emission, status, date_bilan, reference_year, created_at, updated_at, organization_id, user_id')
        .order('created_at', { ascending: false });

      // Fetch by user_id
      const { data: bilanByUser } = await bilanQuery.eq('user_id', user.id);
      
      // Also fetch by organization_id if available
      let bilanByOrg: typeof bilanByUser = [];
      if (organizationId) {
        const { data } = await supabase
          .from('bilans_carbone')
          .select('id, total_emission, scope1_emission, scope2_emission, scope3_emission, status, date_bilan, reference_year, created_at, updated_at, organization_id, user_id')
          .eq('organization_id', organizationId)
          .order('created_at', { ascending: false });
        bilanByOrg = data || [];
      }

      // Merge and deduplicate
      const allBilans = [...(bilanByUser || []), ...(bilanByOrg || [])];
      const seenBilanIds = new Set<string>();

      allBilans.forEach(b => {
        if (seenBilanIds.has(b.id)) return;
        seenBilanIds.add(b.id);
        if (b.total_emission > 0) {
          bilans.push({
            id: b.id,
            year: b.reference_year || new Date(b.created_at).getFullYear(),
            totalEmissions: b.total_emission,
            scope1: b.scope1_emission || 0,
            scope2: b.scope2_emission || 0,
            scope3: b.scope3_emission || 0,
            status: b.status || 'draft',
            date: b.updated_at || b.created_at,
          });
          if (!lastUpdate || b.updated_at > lastUpdate) lastUpdate = b.updated_at;
        }
      });

      // PCF
      if (organizationId) {
        const { data: pcfData } = await supabase
          .from('pcf_studies')
          .select('id, name, status, created_at, updated_at, total_emissions, functional_unit')
          .eq('organization_id', organizationId)
          .order('created_at', { ascending: false });

        if (pcfData) {
          pcfData.forEach(s => {
            pcfStudies.push({
              id: s.id,
              productName: s.name,
              totalCarbonKg: (s.total_emissions || 0),
              status: s.status,
              date: s.updated_at || s.created_at,
              functionalUnit: s.functional_unit || undefined,
            });
            if (!lastUpdate || (s.updated_at && s.updated_at > lastUpdate)) lastUpdate = s.updated_at;
          });
        }
      }

      // ACV
      const { data: acvData } = await supabase
        .from('acv_projects')
        .select('id, name, status, created_at, updated_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (acvData) {
        for (const proj of acvData) {
          const { data: results } = await supabase
            .from('acv_results')
            .select('total_value, impact_category')
            .eq('project_id', proj.id);

          const categories = [...new Set(results?.map(r => r.impact_category) || [])];
          const totalCarbon = results
            ?.filter(r => r.impact_category === 'climate_change')
            .reduce((s, r) => s + (r.total_value || 0), 0) || 0;

          acvProjects.push({
            id: proj.id,
            name: proj.name,
            status: proj.status,
            date: proj.updated_at || proj.created_at,
            impactCategories: categories,
            totalCarbon: totalCarbon / 1000,
          });
          if (!lastUpdate || (proj.updated_at && proj.updated_at > lastUpdate)) lastUpdate = proj.updated_at;
        }
      }

      setData({
        bilanCount: bilans.length,
        bilans,
        pcfCount: pcfStudies.length,
        pcfStudies,
        acvCount: acvProjects.length,
        acvProjects,
        lastUpdate,
        loading: false,
      });
    };

    fetchAll();
  }, [user?.id, organizationId]);

  return data;
}
