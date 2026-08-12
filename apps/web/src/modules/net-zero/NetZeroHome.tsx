import React, { useState, useEffect } from 'react';
import { supabase } from "@/integrations/api/client";
import { useAuth } from '@/hooks/useAuth';
import { NetZeroCompactKPIs } from './components/NetZeroCompactKPIs';
import { NetZeroActionBar } from './components/NetZeroActionBar';
import { NetZeroPlansTable } from './components/NetZeroPlansTable';
import { NetZeroRecentHistory } from './components/NetZeroRecentHistory';
import { Loader2 } from 'lucide-react';

interface NetZeroPlan {
  id: string;
  name: string;
  referenceYear: number;
  targetYear: number;
  reductionTarget: number;
  status: 'draft' | 'active' | 'tracking' | 'revised';
}

interface HistoryEntry {
  id: string;
  planName: string;
  action: 'creation' | 'update' | 'revision' | 'validation';
  date: string;
  user: string;
}

export const NetZeroHome: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState<NetZeroPlan[]>([]);
  const [trajectoryConfig, setTrajectoryConfig] = useState<any>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;

      try {
        // Fetch trajectory config if exists
        const { data: trajectories } = await supabase
          .from('net_zero_trajectories')
          .select('*')
          .limit(1);

        if (trajectories && trajectories.length > 0) {
          setTrajectoryConfig(trajectories[0].config);
        }

        // For now, we'll use mock data for plans since there's no dedicated plans table
        // In production, this would fetch from a net_zero_plans table
        setPlans([]);
      } catch (error) {
        console.error('Error fetching Net Zero data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  // Calculate metrics from trajectory config
  const hasActivePlan = trajectoryConfig !== null;
  const referenceYear = trajectoryConfig?.referenceYear || null;
  const targetYear = trajectoryConfig?.targetYear || 2050;
  const baselineEmissions = trajectoryConfig?.baselineEmissions || null;
  const reductionTarget = trajectoryConfig?.reductionTarget || null;
  const currentProgress = trajectoryConfig?.currentProgress || null;

  // Generate history entries (mock for now)
  const historyEntries: HistoryEntry[] = [];

  const handleDuplicate = (id: string) => {
    // TODO: Implement duplication logic
    // TODO: Implement duplication logic
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-2">
      {/* Status Banner removed - info now in ModuleHeader */}
      {/* Compact KPIs */}
      <NetZeroCompactKPIs
        baselineEmissions={baselineEmissions}
        reductionTarget={reductionTarget}
        targetYear={targetYear}
        currentProgress={currentProgress}
      />

      {/* Action Bar */}
      <NetZeroActionBar />

      {/* Plans Table */}
      <div className="py-4">
        <h3 className="text-sm font-medium text-foreground mb-3">Feuilles de route climat</h3>
        <NetZeroPlansTable 
          plans={plans} 
          onDuplicate={handleDuplicate}
        />
      </div>

      {/* Recent History */}
      <NetZeroRecentHistory entries={historyEntries} />
    </div>
  );
};
