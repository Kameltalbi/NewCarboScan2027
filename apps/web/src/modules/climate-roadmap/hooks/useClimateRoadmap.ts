import { useState, useEffect, useCallback } from 'react';
import { api, getStoredUser } from "@/integrations/api/client";
import { useOrganizationId } from '@/hooks/useOrganizationId';
import { ClimateRoadmap, ClimateLever, ClimateAction, ClimateActionMilestone, ClimatePriorityScore, ClimateKPI, RoadmapDashboard, DashboardAlert } from '../types';

export function useClimateRoadmaps() {
  const { organizationId, loading: orgLoading } = useOrganizationId();
  const [roadmaps, setRoadmaps] = useState<ClimateRoadmap[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRoadmaps = useCallback(async () => {
    if (!organizationId) return;
    setLoading(true);
    const { items } = await api.listClimateRoadmaps();
    setRoadmaps((items || []) as unknown as ClimateRoadmap[]);
    setLoading(false);
  }, [organizationId]);

  useEffect(() => {
    if (!orgLoading && organizationId) fetchRoadmaps();
  }, [orgLoading, organizationId, fetchRoadmaps]);

  const createRoadmap = async (roadmap: Partial<ClimateRoadmap>) => {
    if (!organizationId) return null;
    const user = getStoredUser();
    const { item } = await api.createClimateRoadmap({
      ...roadmap,
      created_by: user?.id,
    });
    if (item) {
      await fetchRoadmaps();
      return item as unknown as ClimateRoadmap;
    }
    return null;
  };

  const updateRoadmap = async (id: string, updates: Partial<ClimateRoadmap>) => {
    await api.patchClimateRoadmap(id, updates as Record<string, unknown>);
    await fetchRoadmaps();
    return true;
  };

  return { roadmaps, loading: loading || orgLoading, createRoadmap, updateRoadmap, refetch: fetchRoadmaps };
}

export function useClimateLevers(roadmapId: string | null) {
  const [levers, setLevers] = useState<ClimateLever[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLevers = useCallback(async () => {
    if (!roadmapId) { setLevers([]); setLoading(false); return; }
    setLoading(true);
    const { items } = await api.listClimateLevers(roadmapId);
    setLevers((items || []) as unknown as ClimateLever[]);
    setLoading(false);
  }, [roadmapId]);

  useEffect(() => { fetchLevers(); }, [fetchLevers]);

  const createLever = async (lever: Partial<ClimateLever>) => {
    if (!roadmapId) return null;
    const { item } = await api.createClimateLever({ ...lever, roadmap_id: roadmapId });
    await fetchLevers();
    return item ? (item as unknown as ClimateLever) : null;
  };

  const updateLever = async (id: string, updates: Partial<ClimateLever>) => {
    await api.patchClimateLever(id, updates as Record<string, unknown>);
    await fetchLevers();
    return true;
  };

  const deleteLever = async (id: string) => {
    await api.deleteClimateLever(id);
    await fetchLevers();
    return true;
  };

  return { levers, loading, createLever, updateLever, deleteLever, refetch: fetchLevers };
}

export function useClimateActions(roadmapId: string | null, filters?: { leverId?: string; status?: string; priority?: string }) {
  const [actions, setActions] = useState<ClimateAction[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchActions = useCallback(async () => {
    if (!roadmapId) { setActions([]); setLoading(false); return; }
    setLoading(true);
    const { items } = await api.listClimateActions({
      roadmapId,
      leverId: filters?.leverId,
      status: filters?.status,
      priority: filters?.priority,
    });
    setActions((items || []) as unknown as ClimateAction[]);
    setLoading(false);
  }, [roadmapId, filters?.leverId, filters?.status, filters?.priority]);

  useEffect(() => { fetchActions(); }, [fetchActions]);

  const createAction = async (action: Partial<ClimateAction>) => {
    if (!roadmapId) return null;
    const { item } = await api.createClimateAction({ ...action, roadmap_id: roadmapId });
    await fetchActions();
    return item ? (item as unknown as ClimateAction) : null;
  };

  const updateAction = async (id: string, updates: Partial<ClimateAction>) => {
    await api.patchClimateAction(id, updates as Record<string, unknown>);
    await fetchActions();
    return true;
  };

  const deleteAction = async (id: string) => {
    await api.deleteClimateAction(id);
    await fetchActions();
    return true;
  };

  return { actions, loading, createAction, updateAction, deleteAction, refetch: fetchActions };
}

export function useRoadmapDashboard(roadmapId: string | null) {
  const [dashboard, setDashboard] = useState<RoadmapDashboard | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!roadmapId) { setDashboard(null); setLoading(false); return; }

    const compute = async () => {
      setLoading(true);
      const [roadmapRes, leversRes, actionsRes] = await Promise.all([
        api.getClimateRoadmap(roadmapId),
        api.listClimateLevers(roadmapId),
        api.listClimateActions({ roadmapId }),
      ]);

      if (!roadmapRes.item) { setLoading(false); return; }

      const roadmap = roadmapRes.item as unknown as ClimateRoadmap;
      const actions = (actionsRes.items || []) as unknown as ClimateAction[];
      const levers = (leversRes.items || []) as unknown as ClimateLever[];

      const now = new Date();
      const alerts: DashboardAlert[] = [];

      // Compute delayed actions
      const delayed = actions.filter(a => {
        if (a.status === 'completed' || a.status === 'abandoned') return false;
        if (a.target_date && new Date(a.target_date) < now) return true;
        return false;
      });

      delayed.forEach(a => {
        alerts.push({
          type: 'delay',
          severity: 'warning',
          title: `Action en retard : ${a.title}`,
          description: `Échéance dépassée le ${a.target_date}`,
          action_id: a.id,
        });
      });

      // Upcoming deadlines (next 30 days)
      const in30days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      actions.filter(a => {
        if (a.status === 'completed' || a.status === 'abandoned') return false;
        if (a.target_date) {
          const td = new Date(a.target_date);
          return td >= now && td <= in30days;
        }
        return false;
      }).forEach(a => {
        alerts.push({
          type: 'deadline',
          severity: 'info',
          title: `Échéance proche : ${a.title}`,
          description: `Date cible : ${a.target_date}`,
          action_id: a.id,
        });
      });

      const totalExpected = actions.reduce((s, a) => s + (a.expected_reduction_tco2e || 0), 0);
      const totalEngaged = actions.filter(a => ['in_progress', 'completed'].includes(a.status)).reduce((s, a) => s + (a.expected_reduction_tco2e || 0), 0);
      const totalRealized = actions.reduce((s, a) => s + (a.realized_reduction_tco2e || 0), 0);
      const totalBudgetEst = actions.reduce((s, a) => s + (a.budget_estimated || 0), 0);
      const totalBudgetAct = actions.reduce((s, a) => s + (a.budget_actual || 0), 0);

      const completed = actions.filter(a => a.status === 'completed').length;
      const total = actions.length;
      const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

      // Top 5 by expected reduction
      const topActions = [...actions].sort((a, b) => (b.expected_reduction_tco2e || 0) - (a.expected_reduction_tco2e || 0)).slice(0, 5);

      setDashboard({
        roadmap,
        levers_count: levers.length,
        actions_total: total,
        actions_to_launch: actions.filter(a => a.status === 'to_launch').length,
        actions_in_progress: actions.filter(a => a.status === 'in_progress').length,
        actions_completed: completed,
        actions_delayed: delayed.length,
        total_expected_reduction: totalExpected,
        total_engaged_reduction: totalEngaged,
        total_realized_reduction: totalRealized,
        total_budget_estimated: totalBudgetEst,
        total_budget_actual: totalBudgetAct,
        progress_percent: progress,
        top_actions: topActions,
        alerts,
      });
      setLoading(false);
    };

    compute();
  }, [roadmapId]);

  return { dashboard, loading };
}
