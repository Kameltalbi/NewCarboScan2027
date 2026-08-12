import React from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useACVProjects } from '@/hooks/useACVProjects';
import { ACVCompactKPIs } from './components/ACVCompactKPIs';
import { ACVActionBar } from './components/ACVActionBar';
import { ACVStudiesTable } from './components/ACVStudiesTable';
import { ACVRecentHistory } from './components/ACVRecentHistory';
import { Loader2 } from 'lucide-react';
export const ACVHome: React.FC = () => {
  const { projects, loading } = useACVProjects();

  // Calculate metrics
  const totalStudies = projects.length;
  const inProgressCount = projects.filter(p => p.status === 'draft' || p.status === 'in_progress').length;
  const completedCount = projects.filter(p => p.status === 'completed' || p.status === 'locked').length;

  // Get last update
  const lastUpdate = projects.length > 0
    ? format(new Date(Math.max(...projects.map(p => new Date(p.updated_at).getTime()))), 'dd MMM yyyy', { locale: fr })
    : null;

  // Most common scope (simplified logic)
  const scopes = projects.map(p => p.scope_definition).filter(Boolean);
  const mostCommonScope = scopes.length > 0 
    ? (scopes.includes('Produit') ? 'Produit' : scopes[0]) 
    : null;

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
      <ACVCompactKPIs
        totalStudies={totalStudies}
        inProgressCount={inProgressCount}
        lastUpdate={lastUpdate}
        mostCommonScope={mostCommonScope}
      />

      {/* Action Bar */}
      <ACVActionBar />

      {/* Studies Table */}
      <div className="py-4">
        <h3 className="text-sm font-medium text-foreground mb-3">Études ACV</h3>
        <ACVStudiesTable 
          studies={projects} 
          onDuplicate={handleDuplicate}
        />
      </div>

      {/* Recent History */}
      <ACVRecentHistory studies={projects} />
    </div>
  );
};
