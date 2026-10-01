import { useCallback, useEffect, useState } from "react";
import { api } from "@/integrations/api/client";
import type { ClimateReferenceTrajectory } from "../types";

function normalizeTrajectory(raw: Record<string, unknown>): ClimateReferenceTrajectory {
  const points = raw.annual_points;
  let annual_points: ClimateReferenceTrajectory["annual_points"] = [];
  if (Array.isArray(points)) {
    annual_points = points.map((p) => {
      const row = p as Record<string, unknown>;
      return {
        year: Number(row.year),
        emissionsT: Number(row.emissionsT ?? row.emissions_t),
      };
    });
  } else if (typeof points === "string") {
    try {
      const parsed = JSON.parse(points) as Array<Record<string, unknown>>;
      annual_points = parsed.map((row) => ({
        year: Number(row.year),
        emissionsT: Number(row.emissionsT ?? row.emissions_t),
      }));
    } catch {
      annual_points = [];
    }
  }

  return {
    ...(raw as unknown as ClimateReferenceTrajectory),
    annual_points,
    baseline_emissions: Number(raw.baseline_emissions),
    scope1_emissions: raw.scope1_emissions != null ? Number(raw.scope1_emissions) : null,
    scope2_emissions: raw.scope2_emissions != null ? Number(raw.scope2_emissions) : null,
    dlarr_percent: Number(raw.dlarr_percent),
    reduction_percent: Number(raw.reduction_percent),
    target_emissions: Number(raw.target_emissions),
    parameters:
      typeof raw.parameters === "object" && raw.parameters != null
        ? (raw.parameters as Record<string, unknown>)
        : {},
  };
}

export function useClimateReferenceTrajectories() {
  const [items, setItems] = useState<ClimateReferenceTrajectory[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const { items: rows } = await api.listClimateReferenceTrajectories();
      setItems((rows || []).map((r) => normalizeTrajectory(r)));
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const create = async (payload: Record<string, unknown>) => {
    const res = await api.createClimateReferenceTrajectory(payload);
    await reload();
    return {
      item: normalizeTrajectory(res.item),
      computation: res.computation,
    };
  };

  const archive = async (id: string) => {
    await api.archiveClimateReferenceTrajectory(id);
    await reload();
  };

  const active = items.find((t) => t.status === "active") || null;

  return { items, active, loading, reload, create, archive };
}
