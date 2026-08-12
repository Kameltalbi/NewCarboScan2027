// Bloc dédié Scope 3 (toujours présent)
// Affiche l'avancement, catégories couvertes, méthodologie, statut

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Truck, CheckCircle2, Circle, AlertTriangle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Scope3Category {
  id: string;
  name: string;
  covered: boolean;
  emissions?: number;
}

interface Scope3BlockProps {
  coveragePercentage: number;
  methodology: 'screening' | 'specific' | 'hybrid';
  status: 'provisional' | 'consolidated';
  categories: Scope3Category[];
  /** Émissions totales Scope 3 en kg (converties en tCO₂e à l'affichage) */
  totalEmissions: number;
}

const METHODOLOGY_LABELS: Record<string, { label: string; description: string }> = {
  screening: { 
    label: 'Screening', 
    description: 'Estimation basée sur des données monétaires et des ratios sectoriels' 
  },
  specific: { 
    label: 'Données spécifiques', 
    description: 'Collecte de données primaires auprès des fournisseurs et partenaires' 
  },
  hybrid: { 
    label: 'Hybride', 
    description: 'Combinaison de données spécifiques et d\'estimations' 
  },
};

export const Scope3Block: React.FC<Scope3BlockProps> = ({
  coveragePercentage,
  methodology,
  status,
  categories,
  totalEmissions,
}) => {
  const coveredCategories = categories.filter(c => c.covered);
  const methodologyInfo = METHODOLOGY_LABELS[methodology];
  const totalTonnes = Math.round(totalEmissions / 1000);

  return (
    <Card className="bg-white dark:bg-slate-900/50 border border-[#E2E8F0] dark:border-slate-700 rounded-[12px] shadow-sm border-l-4 border-l-[#6366F1]">
      <CardHeader className="pb-3 px-3 sm:px-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="p-1.5 sm:p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg shrink-0">
              <Truck className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="min-w-0">
              <CardTitle className="text-base sm:text-lg font-semibold">Scope 3 - Détails</CardTitle>
              <p className="text-xs sm:text-sm text-muted-foreground">Émissions indirectes</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 justify-end">
            <Badge 
              variant="outline" 
              className={cn(
                "text-[10px] sm:text-xs font-medium shrink-0",
                status === 'consolidated' 
                  ? 'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700' 
                  : 'bg-amber-100 text-amber-700 border-amber-300'
              )}
            >
              {status === 'consolidated' ? 'Consolidé' : 'Provisoire'}
            </Badge>
            <span className="text-base sm:text-xl font-bold text-blue-600 dark:text-blue-400 tabular-nums font-mono">
              {totalTonnes.toLocaleString('fr-FR')} tCO₂e
            </span>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4 sm:space-y-6 px-3 sm:px-6">
        {/* Couverture */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Taux de couverture</span>
            <span className="font-medium">{coveragePercentage}%</span>
          </div>
          <Progress value={coveragePercentage} className="h-2" />
          <p className="text-xs text-muted-foreground">
            {coveredCategories.length} catégorie{coveredCategories.length > 1 ? 's' : ''} sur {categories.length} couvertes
          </p>
        </div>

        {/* Méthodologie */}
        <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border">
          <div className="flex items-start gap-2">
            <Info className="h-4 w-4 text-cyan-600 dark:text-cyan-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-foreground">
                Méthodologie : {methodologyInfo.label}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {methodologyInfo.description}
              </p>
            </div>
          </div>
        </div>

        {/* Catégories */}
        <div>
          <p className="text-sm font-medium text-foreground mb-3">Catégories GHG Protocol</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {categories.map((category) => (
              <div 
                key={category.id}
                className={cn(
                  "flex items-center gap-2 p-2 rounded-md text-sm",
                  category.covered 
                    ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" 
                    : "bg-gray-50 dark:bg-gray-800/50 text-gray-500"
                )}
              >
                {category.covered ? (
                  <CheckCircle2 className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
                ) : (
                  <Circle className="h-4 w-4 text-gray-400 shrink-0" />
                )}
                <span className="truncate">{category.name}</span>
                {category.covered && category.emissions !== undefined && (
                  <span className="ml-auto text-xs font-medium tabular-nums font-mono">
                    {Math.round(category.emissions / 1000).toLocaleString('fr-FR')} tCO₂e
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Avertissement si provisoire */}
        {status === 'provisional' && (
          <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800">
            <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
            <p className="text-xs text-amber-800 dark:text-amber-200">
              Les résultats du Scope 3 sont provisoires. La consolidation finale nécessite 
              la validation des données de toutes les catégories couvertes.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
