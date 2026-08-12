import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  FileEdit, Send, CheckCircle2, RotateCcw, Lock, Clock, AlertTriangle 
} from 'lucide-react';
import { 
  BilanStatus, 
  BILAN_STATUS_CONFIG, 
  BilanWorkflowService, 
  BilanWorkflowInfo 
} from '@/lib/services/BilanWorkflowService';
import { useToast } from '@/hooks/use-toast';

interface BilanStatusBadgeProps {
  status: BilanStatus;
  revisionCount?: number;
  maxRevisions?: number;
  compact?: boolean;
}

export const BilanStatusBadge: React.FC<BilanStatusBadgeProps> = ({ 
  status, 
  revisionCount = 0, 
  maxRevisions = 2,
  compact = false 
}) => {
  const config = BILAN_STATUS_CONFIG[status];
  
  const StatusIcon = {
    draft: FileEdit,
    submitted: Clock,
    validated: CheckCircle2,
    revision: RotateCcw,
  }[status];

  if (compact) {
    return (
      <Badge variant="outline" className={`${config.bgColor} ${config.color} text-xs`}>
        <StatusIcon className="h-3 w-3 mr-1" />
        {config.label}
      </Badge>
    );
  }

  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-lg border ${config.bgColor}`}>
      <StatusIcon className={`h-5 w-5 ${config.color}`} />
      <div className="flex-1">
        <div className={`font-semibold text-sm ${config.color}`}>{config.label}</div>
        <div className="text-xs text-gray-600 mt-0.5">{config.description}</div>
      </div>
      {status === 'validated' && (
        <div className="text-xs text-gray-500">
          Révisions : {revisionCount}/{maxRevisions}
        </div>
      )}
      {status === 'revision' && (
        <div className="flex items-center gap-1 text-xs text-orange-600">
          <Lock className="h-3 w-3" />
          Champs clés verrouillés
        </div>
      )}
    </div>
  );
};

interface BilanWorkflowActionsProps {
  bilanId: string;
  userId: string;
  workflowInfo: BilanWorkflowInfo;
  onStatusChange: () => void;
}

export const BilanWorkflowActions: React.FC<BilanWorkflowActionsProps> = ({
  bilanId,
  userId,
  workflowInfo,
  onStatusChange,
}) => {
  const { toast } = useToast();
  const [loading, setLoading] = React.useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const result = await BilanWorkflowService.submitForValidation(bilanId, userId);
      if (result.success) {
        toast({
          title: 'Bilan soumis',
          description: 'Votre bilan a été soumis pour vérification par un expert en comptabilité carbone.',
        });
        onStatusChange();
      } else {
        toast({ title: 'Erreur', description: result.error, variant: 'destructive' });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRequestRevision = async () => {
    setLoading(true);
    try {
      const result = await BilanWorkflowService.requestRevision(bilanId, userId);
      if (result.success) {
        toast({
          title: 'Révision ouverte',
          description: `Vous pouvez maintenant modifier vos données d'activité. Révision ${result.revision_count}/${workflowInfo.max_revisions}.`,
        });
        onStatusChange();
      } else {
        toast({ title: 'Erreur', description: result.error, variant: 'destructive' });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      {workflowInfo.can_submit && (
        <Button
          onClick={handleSubmit}
          disabled={loading}
          size="sm"
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          <Send className="h-4 w-4 mr-1" />
          Soumettre pour validation
        </Button>
      )}

      {workflowInfo.can_request_revision && (
        <Button
          onClick={handleRequestRevision}
          disabled={loading}
          size="sm"
          variant="outline"
          className="border-orange-400 text-orange-600 hover:bg-orange-50"
        >
          <RotateCcw className="h-4 w-4 mr-1" />
          Demander une révision ({workflowInfo.revisions_remaining} restante{(workflowInfo.revisions_remaining || 0) > 1 ? 's' : ''})
        </Button>
      )}

      {workflowInfo.status === 'submitted' && (
        <div className="flex items-center gap-1 text-sm text-blue-600">
          <Clock className="h-4 w-4" />
          En attente de validation expert
        </div>
      )}

      {workflowInfo.status === 'validated' && !workflowInfo.can_request_revision && (
        <div className="flex items-center gap-1 text-sm text-gray-500">
          <Lock className="h-4 w-4" />
          Bilan définitif — aucune révision restante
        </div>
      )}
    </div>
  );
};
