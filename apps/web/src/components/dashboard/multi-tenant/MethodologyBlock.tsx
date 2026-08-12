// Bloc méthodologique global
// Encadré standard sur les facteurs d'émission et le statut des données

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Info, BookOpen, ExternalLink } from 'lucide-react';

interface MethodologyBlockProps {
  emissionFactorsSource: string;
  lastUpdate?: Date;
}

export const MethodologyBlock: React.FC<MethodologyBlockProps> = ({
  emissionFactorsSource,
  lastUpdate,
}) => {
  return (
    <Card className="bg-white dark:bg-slate-900/50 border border-[#E2E8F0] dark:border-slate-700 rounded-[12px] shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-slate-200 dark:bg-slate-800 rounded-lg shrink-0">
            <BookOpen className="h-4 w-4 text-slate-600 dark:text-slate-400" />
          </div>
          <div className="space-y-2 flex-1">
            <div className="flex items-center gap-2">
              <Info className="h-4 w-4 text-slate-500" />
              <span className="text-sm font-medium text-foreground">Note méthodologique</span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Les résultats sont calculés à partir du jeu de facteurs d'émission <strong>{emissionFactorsSource}</strong> sélectionné 
              pour le projet. Le statut des données reflète leur niveau de consolidation : les données « Consolidées » 
              proviennent de sources primaires vérifiées, les données « Estimées » sont basées sur des ratios sectoriels, 
              et les données « Par défaut » utilisent des valeurs moyennes de référence.
            </p>
            
            <div className="flex items-center gap-4 pt-2 text-xs text-muted-foreground">
              {lastUpdate && (
                <span>
                  Dernière mise à jour : {lastUpdate.toLocaleDateString('fr-FR', { 
                    day: 'numeric', 
                    month: 'long', 
                    year: 'numeric' 
                  })}
                </span>
              )}
              <a 
                href="#" 
                className="flex items-center gap-1 text-primary hover:underline"
                onClick={(e) => e.preventDefault()}
              >
                <ExternalLink className="h-3 w-3" />
                Documentation méthodologique
              </a>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
