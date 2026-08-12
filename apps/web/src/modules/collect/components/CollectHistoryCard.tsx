import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  History, 
  Plus, 
  Edit, 
  FileSpreadsheet, 
  CheckCircle,
  Clock
} from 'lucide-react';

interface HistoryEntry {
  id: string;
  date: string;
  action: 'creation' | 'modification' | 'import' | 'validation';
  user: string;
}

interface CollectHistoryCardProps {
  entries: HistoryEntry[];
}

const ACTION_CONFIG = {
  creation: { label: 'Création', icon: Plus, color: 'bg-emerald-100 text-emerald-700' },
  modification: { label: 'Modification', icon: Edit, color: 'bg-blue-100 text-blue-700' },
  import: { label: 'Import', icon: FileSpreadsheet, color: 'bg-purple-100 text-purple-700' },
  validation: { label: 'Validation', icon: CheckCircle, color: 'bg-amber-100 text-amber-700' },
};

export const CollectHistoryCard: React.FC<CollectHistoryCardProps> = ({
  entries,
}) => {
  const navigate = useNavigate();

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <History className="h-5 w-5 text-primary" />
            Historique récent
          </CardTitle>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => navigate('/app/collecte/periodic')}
          >
            Voir tout
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? (
          <div className="text-center py-6">
            <Clock className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              Aucune action n'a encore été enregistrée.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {entries.map((entry) => {
              const config = ACTION_CONFIG[entry.action];
              const Icon = config.icon;
              const formattedDate = new Date(entry.date).toLocaleDateString('fr-FR', {
                day: '2-digit',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <div 
                  key={entry.id} 
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-1.5 rounded ${config.color}`}>
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{config.label}</p>
                      <p className="text-xs text-muted-foreground">{entry.user}</p>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground">{formattedDate}</span>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
