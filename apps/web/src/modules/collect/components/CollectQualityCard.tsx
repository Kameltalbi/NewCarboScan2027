import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  ShieldCheck
} from 'lucide-react';

interface QualityIssue {
  type: 'missing_unit' | 'abnormal_value' | 'incomplete';
  count: number;
  label: string;
}

interface CollectQualityCardProps {
  issues: QualityIssue[];
  totalIncomplete: number;
}

export const CollectQualityCard: React.FC<CollectQualityCardProps> = ({
  issues,
  totalIncomplete,
}) => {
  const navigate = useNavigate();
  const hasIssues = totalIncomplete > 0;

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-lg flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-primary" />
          Qualité et cohérence des données
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {hasIssues ? (
          <>
            <div className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
              <div>
                <p className="text-sm font-medium text-amber-800">
                  {totalIncomplete} donnée{totalIncomplete > 1 ? 's' : ''} incomplète{totalIncomplete > 1 ? 's' : ''} ou incohérente{totalIncomplete > 1 ? 's' : ''}
                </p>
                <p className="text-xs text-amber-700">
                  Vérifiez ces données avant la validation
                </p>
              </div>
            </div>

            <div className="space-y-2">
              {issues.map((issue) => (
                <div key={issue.type} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2">
                    <XCircle className="h-4 w-4 text-destructive" />
                    <span className="text-sm text-foreground">{issue.label}</span>
                  </div>
                  <Badge variant="destructive" className="text-xs">
                    {issue.count}
                  </Badge>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="flex items-center gap-3 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
            <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0" />
            <div>
              <p className="text-sm font-medium text-emerald-800">
                Toutes les données sont cohérentes
              </p>
              <p className="text-xs text-emerald-700">
                Aucune anomalie détectée
              </p>
            </div>
          </div>
        )}

        <Button 
          variant="outline" 
          className="w-full"
          onClick={() => navigate('/app/collecte/consolidation')}
        >
          Lancer le contrôle de cohérence
        </Button>
      </CardContent>
    </Card>
  );
};
