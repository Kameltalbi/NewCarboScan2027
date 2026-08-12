import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Truck, 
  Zap, 
  ShoppingCart, 
  GraduationCap, 
  Building2,
  Recycle,
  CheckCircle2,
  ArrowRight,
  Target,
  Loader2
} from 'lucide-react';
import { getRecommendedActions, RecommendedAction, getPriorityActions } from '@/lib/recommendedActions';
import { EmissionsResult } from '@/types/empreinteProduit';

interface PriorityActionsProps {
  emissionsData?: {
    totalEmissions: number;
    scope1: number;
    scope2: number;
    scope3: number;
  };
}

const categoryIcons: Record<string, React.ElementType> = {
  'Énergie': Zap,
  'Mobilité': Truck,
  'Achats': ShoppingCart,
  'Déchets': Recycle,
  'Formation': GraduationCap,
  'Bâtiment': Building2,
};

const priorityColors: Record<string, string> = {
  haute: 'bg-destructive text-destructive-foreground',
  moyenne: 'bg-accent text-accent-foreground',
  basse: 'bg-muted text-muted-foreground',
};

const priorityLabels: Record<string, string> = {
  haute: 'Fort',
  moyenne: 'Moyen',
  basse: 'Faible',
};

export const PriorityActions: React.FC<PriorityActionsProps> = ({ emissionsData }) => {
  const [actions, setActions] = useState<RecommendedAction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchActions = async () => {
      if (!emissionsData || emissionsData.totalEmissions === 0) {
        setLoading(false);
        return;
      }

      const majorityScope = emissionsData.scope3 >= emissionsData.scope1 && emissionsData.scope3 >= emissionsData.scope2 ? 3
        : emissionsData.scope1 >= emissionsData.scope2 ? 1 : 2;

      const result = await getRecommendedActions({
        totalEmissions: emissionsData.totalEmissions,
        scope1: emissionsData.scope1,
        scope2: emissionsData.scope2,
        scope3: emissionsData.scope3,
        categoryBreakdown: [],
        majorityScope,
      });

      setActions(getPriorityActions(result, 5));
      setLoading(false);
    };

    fetchActions();
  }, [emissionsData]);

  if (loading) {
    return (
      <Card className="border-0 shadow-soft">
        <CardContent className="py-8 flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (actions.length === 0) {
    return (
      <Card className="border-0 shadow-soft">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold text-dashboard-text flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-carbon-impact" />
            Actions Prioritaires
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <Target className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Aucune action recommandée disponible.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-soft">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold text-dashboard-text flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-carbon-impact" />
          Top {actions.length} Actions Prioritaires
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {actions.map((action, index) => {
          const Icon = categoryIcons[action.categorie] || Target;
          
          return (
            <div 
              key={action.id}
              className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer group"
            >
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-carbon-impact/10">
                <Icon className="h-4 w-4 text-carbon-dark" />
              </div>
              
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-dashboard-text truncate">
                  {index + 1}. {action.titre}
                </p>
                <p className="text-xs text-muted-foreground">
                  Impact estimé : {action.impact_estime_pourcent}
                </p>
              </div>
              
              <Badge className={priorityColors[action.priorite] || priorityColors.moyenne}>
                {priorityLabels[action.priorite] || 'Moyen'}
              </Badge>
              
              <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};
