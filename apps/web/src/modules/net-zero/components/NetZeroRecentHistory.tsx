import React from 'react';
import { Clock } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface HistoryEntry {
  id: string;
  planName: string;
  action: 'creation' | 'update' | 'revision' | 'validation';
  date: string;
  user: string;
}

interface NetZeroRecentHistoryProps {
  entries: HistoryEntry[];
}

const getActionLabel = (action: HistoryEntry['action']) => {
  switch (action) {
    case 'creation':
      return 'Création';
    case 'update':
      return 'Mise à jour';
    case 'revision':
      return 'Révision';
    case 'validation':
      return 'Validation';
    default:
      return action;
  }
};

const getActionColor = (action: HistoryEntry['action']) => {
  switch (action) {
    case 'creation':
      return 'text-emerald-600';
    case 'update':
      return 'text-blue-600';
    case 'revision':
      return 'text-amber-600';
    case 'validation':
      return 'text-purple-600';
    default:
      return 'text-muted-foreground';
  }
};

export const NetZeroRecentHistory: React.FC<NetZeroRecentHistoryProps> = ({ entries }) => {
  if (entries.length === 0) {
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
        {entries.map((entry, index) => (
          <div 
            key={`${entry.id}-${index}`} 
            className="flex items-center justify-between px-4 py-3 hover:bg-muted/20"
          >
            <div className="flex items-center gap-3">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium text-foreground">
                  {entry.planName}
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
