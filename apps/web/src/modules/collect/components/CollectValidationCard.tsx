import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Lock, 
  Unlock,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface CollectValidationCardProps {
  status: 'draft' | 'in_progress' | 'validated' | 'locked';
  canValidate: boolean;
  onValidate: () => void;
}

const STATUS_INFO = {
  draft: { label: 'Brouillon', icon: Unlock, color: 'text-muted-foreground' },
  in_progress: { label: 'En cours de saisie', icon: Unlock, color: 'text-amber-600' },
  validated: { label: 'Validées', icon: CheckCircle, color: 'text-emerald-600' },
  locked: { label: 'Verrouillées', icon: Lock, color: 'text-blue-600' },
};

export const CollectValidationCard: React.FC<CollectValidationCardProps> = ({
  status,
  canValidate,
  onValidate,
}) => {
  const statusInfo = STATUS_INFO[status];
  const StatusIcon = statusInfo.icon;
  const isLocked = status === 'locked' || status === 'validated';

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-lg flex items-center gap-2">
          <Lock className="h-5 w-5 text-primary" />
          Validation des données
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-2">
            <StatusIcon className={cn('h-5 w-5', statusInfo.color)} />
            <span className="text-sm font-medium text-foreground">Statut actuel</span>
          </div>
          <Badge variant="outline" className="font-medium">
            {statusInfo.label}
          </Badge>
        </div>

        {!isLocked && (
          <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800">
              Une fois validées, les données ne pourront plus être modifiées sans déverrouillage.
            </p>
          </div>
        )}

        <Button 
          className="w-full"
          disabled={!canValidate || isLocked}
          onClick={onValidate}
        >
          {isLocked ? 'Données verrouillées' : 'Valider les données'}
        </Button>
      </CardContent>
    </Card>
  );
};
