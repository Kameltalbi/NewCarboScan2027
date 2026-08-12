// Widget : Progression de collecte pour le Dashboard

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { CollectionChecklistService } from '@/lib/services/CollectionChecklistService';
import { AUDIT_STATUS_CONFIG } from '@/lib/types/collection-checklist';
import type { CollectionProgress } from '@/lib/types/collection-checklist';

interface CollectionProgressWidgetProps {
  organizationId: string;
  className?: string;
}

export const CollectionProgressWidget = ({ 
  organizationId,
  className 
}: CollectionProgressWidgetProps) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState<CollectionProgress | null>(null);

  useEffect(() => {
    loadProgress();
  }, [organizationId]);

  const loadProgress = async () => {
    try {
      setLoading(true);
      const data = await CollectionChecklistService.getProgress(organizationId);
      setProgress(data);
    } catch (error) {
      console.error('Error loading progress:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !progress) {
    return null;
  }

  const statusConfig = AUDIT_STATUS_CONFIG[progress.audit_status];

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-base">
          <span>📊 Collecte de données</span>
          <Badge variant={statusConfig.color} className="text-xs">
            {statusConfig.icon} {progress.completion_percentage}%
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Progress value={progress.completion_percentage} className="h-2" />
        
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Postes obligatoires</span>
            <span className="font-medium">
              {progress.completed_mandatory}/{progress.mandatory_postes}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Tous postes</span>
            <span className="font-medium">
              {progress.completed_postes}/{progress.total_postes}
            </span>
          </div>
        </div>

        {progress.audit_status === 'audit_ready' ? (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
              <div className="flex-1 text-sm">
                <p className="font-medium text-green-900">Bilan audit-ready !</p>
                <p className="text-green-700 text-xs mt-1">
                  Toutes les données obligatoires sont collectées
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm">
            <p className="text-blue-900 font-medium mb-1">
              {progress.mandatory_postes - progress.completed_mandatory} poste(s) obligatoire(s) manquant(s)
            </p>
            <p className="text-blue-700 text-xs">
              Collectez-les pour obtenir un bilan certifiable
            </p>
          </div>
        )}

        <Button 
          variant="outline" 
          className="w-full"
          onClick={() => navigate('/collect/checklist')}
        >
          Voir la checklist complète
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  );
};
