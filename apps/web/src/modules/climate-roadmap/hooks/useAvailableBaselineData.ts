// Hook pour détecter les données disponibles dans les autres modules CarboScan
// et proposer une baseline intelligente à l'utilisateur

import { useState, useEffect } from "react";
import { api } from "@/integrations/api/client";
import { useOrganizationId } from "@/hooks/useOrganizationId";
import { useAuth } from "@/hooks/useAuth";

export interface DataSourceSummary {
  bilanCount: number;
  bilans: BilanSummary[];
  pcfCount: number;
  pcfStudies: PCFSummary[];
  acvCount: number;
  acvProjects: ACVSummary[];
  lastUpdate: string | null;
  loading: boolean;
}

export interface BilanSummary {
  id: string;
  year: number | null;
  totalEmissions: number; // tCO2e
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

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function str(v: unknown, fallback = ""): string {
  return v == null ? fallback : String(v);
}

export function useAvailableDataSources(): DataSourceSummary {
  const { organizationId } = useOrganizationId();
  const { user } = useAuth();
  const [data, setData] = useState<DataSourceSummary>({
    bilanCount: 0,
    bilans: [],
    pcfCount: 0,
    pcfStudies: [],
    acvCount: 0,
    acvProjects: [],
    lastUpdate: null,
    loading: true,
  });

  useEffect(() => {
    if (!user?.id) {
      setData((prev) => ({ ...prev, loading: false }));
      return;
    }

    let cancelled = false;

    const fetchAll = async () => {
      const bilans: BilanSummary[] = [];
      const pcfStudies: PCFSummary[] = [];
      const acvProjects: ACVSummary[] = [];
      let lastUpdate: string | null = null;

      try {
        const { items: bilanItems } = await api.listBilans();
        for (const b of bilanItems || []) {
          const total = num(b.total_emission);
          if (total <= 0) continue;
          const updated = str(b.updated_at || b.created_at);
          bilans.push({
            id: str(b.id),
            year:
              b.reference_year != null
                ? num(b.reference_year)
                : updated
                  ? new Date(updated).getFullYear()
                  : null,
            totalEmissions: total,
            scope1: num(b.scope1_emission),
            scope2: num(b.scope2_emission),
            scope3: num(b.scope3_emission),
            status: str(b.status, "draft"),
            date: updated,
          });
          if (!lastUpdate || updated > lastUpdate) lastUpdate = updated;
        }
      } catch {
        // bilans indisponibles — on continue avec les autres sources
      }

      if (organizationId) {
        try {
          const { items: pcfItems } = await api.listPcfStudies();
          for (const s of pcfItems || []) {
            const updated = str(s.updated_at || s.created_at);
            pcfStudies.push({
              id: str(s.id),
              productName: str(s.name || s.product_name, "Étude PCF"),
              totalCarbonKg: num(s.total_emissions ?? s.total_carbon_kg),
              status: str(s.status, "draft"),
              date: updated,
              functionalUnit: s.functional_unit
                ? str(s.functional_unit)
                : undefined,
            });
            if (!lastUpdate || (updated && updated > lastUpdate)) {
              lastUpdate = updated;
            }
          }
        } catch {
          // PCF indisponible
        }
      }

      try {
        const { items: acvItems } = await api.listAcvProjects();
        for (const proj of acvItems || []) {
          const updated = str(proj.updated_at || proj.created_at);
          acvProjects.push({
            id: str(proj.id),
            name: str(proj.name, "Projet ACV"),
            status: str(proj.status, "draft"),
            date: updated,
            impactCategories: Array.isArray(proj.impact_categories)
              ? (proj.impact_categories as string[])
              : [],
            totalCarbon: num(proj.total_carbon_tco2e ?? proj.total_carbon),
          });
          if (!lastUpdate || (updated && updated > lastUpdate)) {
            lastUpdate = updated;
          }
        }
      } catch {
        // ACV indisponible
      }

      if (cancelled) return;

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
    return () => {
      cancelled = true;
    };
  }, [user?.id, organizationId]);

  return data;
}
