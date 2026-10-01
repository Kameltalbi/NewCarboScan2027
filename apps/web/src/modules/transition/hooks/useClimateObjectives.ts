import { useCallback, useEffect, useState } from "react";
import { api } from "@/integrations/api/client";
import type { ClimateFramework, ClimateObjective } from "../types";

export function useClimateObjectives() {
  const [objectives, setObjectives] = useState<ClimateObjective[]>([]);
  const [frameworks, setFrameworks] = useState<ClimateFramework[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const [objRes, fwRes] = await Promise.all([
        api.listClimateObjectives(),
        api.listClimateFrameworks(),
      ]);
      setObjectives((objRes.items || []) as unknown as ClimateObjective[]);
      setFrameworks(
        (fwRes.items || []).map((f) => ({
          ...(f as unknown as ClimateFramework),
          versions: Array.isArray((f as { versions?: unknown }).versions)
            ? ((f as { versions: ClimateFramework["versions"] }).versions)
            : [],
        })),
      );
    } catch {
      setObjectives([]);
      setFrameworks([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const createObjective = async (payload: Record<string, unknown>) => {
    const { item } = await api.createClimateObjective(payload);
    await reload();
    return item as unknown as ClimateObjective;
  };

  const updateObjective = async (id: string, payload: Record<string, unknown>) => {
    const { item } = await api.patchClimateObjective(id, payload);
    await reload();
    return item as unknown as ClimateObjective;
  };

  const archiveObjective = async (id: string) => {
    await api.archiveClimateObjective(id);
    await reload();
  };

  const primary = objectives.find((o) => o.is_primary && o.status === "active") || null;

  return {
    objectives: objectives.filter((o) => o.status !== "archived"),
    allObjectives: objectives,
    frameworks,
    primary,
    loading,
    reload,
    createObjective,
    updateObjective,
    archiveObjective,
  };
}
