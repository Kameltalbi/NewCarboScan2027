import React from 'react';
import { Clock } from 'lucide-react';
import { ACVProject } from '@/types/acv';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface HistoryEntry {
  id: string;
  studyName: string;
  action: 'creation' | 'recalcul' | 'verrouillage' | 'export';
  date: string;
  user: string;
}

interface ACVRecentHistoryProps {
  studies: ACVProject[];
}

const getActionLabel = (action: HistoryEntry['action']) => {
  switch (action) {
    case 'creation':
      return 'Création';
    case 'recalcul':
      return 'Recalcul';
    case 'verrouillage':
      return 'Verrouillage';
    case 'export':
      return 'Export';
    default:
      return action;
  }
};

const getActionColor = (action: HistoryEntry['action']) => {
  switch (action) {
    case 'creation':
      return 'text-emerald-600';
    case 'recalcul':
      return 'text-amber-600';
    case 'verrouillage':
      return 'text-blue-600';
    case 'export':
      return 'text-purple-600';
    default:
      return 'text-muted-foreground';
  }
};

export const ACVRecentHistory: React.FC<ACVRecentHistoryProps> = ({ studies }) => {
  // Generate history entries from studies (mock based on created_at/updated_at)
  const historyEntries: HistoryEntry[] = studies
    .slice(0, 5)
    .map((study) => ({
      id: study.id,
      studyName: study.name,
      action: 'creation' as const,
      date: study.created_at,
      user: 'Utilisateur',
    }));

  if (historyEntries.length === 0) {
    return (
      <div className="py-6">
        <h3 className="text-sm font-medium text-foreground mb-3">Historique récent</h3>
        <div className="text-center py-6 border rounded-lg bg-muted/10">
          <Clock className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">
            Aucune activité récente.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="py-6">
      <h3 className="text-sm font-medium text-foreground mb-3">Historique récent</h3>
      <div className="border rounded-lg divide-y">
        {historyEntries.map((entry, index) => (
          <div 
            key={`${entry.id}-${index}`} 
            className="flex items-center justify-between px-4 py-3 hover:bg-muted/20"
          >
            <div className="flex items-center gap-3">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium text-foreground">
                  {entry.studyName}
                </p>
                <p className="text-xs text-muted-foreground">
                  {entry.user}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className={`text-sm font-medium ${getActionColor(entry.action)}`}>
                {getActionLabel(entry.action)}
              </p>
              <p className="text-xs text-muted-foreground">
                {format(new Date(entry.date), 'dd MMM yyyy', { locale: fr })}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
