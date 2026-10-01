// Hook pour détecter les données disponibles dans les autres modules CarboScan
// et proposer une baseline intelligente à l'utilisateur.
//
// Source fiable (alignée Dashboard / Bilan Carbone / Transition) :
// 1. Snapshots bilans_carbone (total_emission en tCO₂e, champ year)
// 2. Sinon agrégation live activity_data via DashboardAggregator (kg → tCO₂e)
// Ne crée / ne modifie aucun bilan.

import { useState, useEffect } from "react";
import { api } from "@/integrations/api/client";
import { useOrganizationId } from "@/hooks/useOrganizationId";
import { useAuth } from "@/hooks/useAuth";
import { DashboardAggregator } from "@/lib/calculators/DashboardAggregator";

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
  /** true si dérivé de activity_data (pas de ligne bilans_carbone) */
  fromActivity?: boolean;
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

function resolveBilanYear(b: Record<string, unknown>): number | null {
  if (b.year != null && Number.isFinite(Number(b.year))) return Number(b.year);
  if (b.reference_year != null && Number.isFinite(Number(b.reference_year))) {
    return Number(b.reference_year);
  }
  const dateStr = str(b.date_bilan || b.updated_at || b.created_at);
  if (dateStr) {
    const y = new Date(dateStr).getFullYear();
    if (Number.isFinite(y)) return y;
  }
  return null;
}

async function buildActivityFallbackBilans(
  organizationId: string,
): Promise<BilanSummary[]> {
  const yearsRes = await api.listOrgYears();
  const yearCandidates = new Set<number>();
  for (const item of yearsRes.items || []) {
    if (item.is_included && Number.isFinite(Number(item.year))) {
      yearCandidates.add(Number(item.year));
    }
  }
  const latestActivity = Number(yearsRes.latestActivityYear);
  if (Number.isFinite(latestActivity)) yearCandidates.add(latestActivity);
  const latestBilan = Number(yearsRes.latestBilanYear);
  if (Number.isFinite(latestBilan)) yearCandidates.add(latestBilan);

  if (yearCandidates.size === 0) {
    // Dernier recours : année courante / N-1 si des activités existent
    const y = new Date().getFullYear();
    yearCandidates.add(y);
    yearCandidates.add(y - 1);
  }

  const out: BilanSummary[] = [];
  for (const year of [...yearCandidates].sort((a, b) => b - a)) {
    try {
      const aggregated = await DashboardAggregator.aggregate(
        organizationId,
        `${year}-01-01`,
        `${year}-12-31`,
      );
      const kg = aggregated.bilanCarbone;
      const totalT = kg.totalEmissions / 1000;
      if (!(totalT > 0)) continue;
      out.push({
        id: `live-activity-${year}`,
        year,
        totalEmissions: totalT,
        scope1: kg.scope1 / 1000,
        scope2: kg.scope2 / 1000,
        scope3: kg.scope3 / 1000,
        status: "calculated",
        date: `${year}-12-31`,
        fromActivity: true,
      });
    } catch {
      // année sans données calculables
    }
  }
  return out;
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
          const updated = str(b.updated_at || b.created_at || b.date_bilan);
          bilans.push({
            id: str(b.id),
            year: resolveBilanYear(b),
            totalEmissions: total,
            scope1: num(b.scope1_emission),
            scope2: num(b.scope2_emission),
            scope3: num(b.scope3_emission),
            status: str(b.status, "draft"),
            date: updated,
            fromActivity: false,
          });
          if (!lastUpdate || updated > lastUpdate) lastUpdate = updated;
        }
      } catch {
        // bilans indisponibles — on continue
      }

      // Fallback aligné Dashboard / Bilan live : activity_data
      if (bilans.length === 0 && organizationId) {
        try {
          const live = await buildActivityFallbackBilans(organizationId);
          bilans.push(...live);
          if (live[0]?.date && (!lastUpdate || live[0].date > lastUpdate)) {
            lastUpdate = live[0].date;
          }
        } catch {
          // pas de données activity
        }
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
