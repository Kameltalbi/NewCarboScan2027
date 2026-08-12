import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart2 } from 'lucide-react';

export const ACVImpacts: React.FC = () => {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Résultats multi-impacts</h1>
        <p className="text-muted-foreground mt-1">Analyse des impacts environnementaux</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart2 className="h-5 w-5" />
            Impacts environnementaux
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            Aucune donnée disponible. Commencez par créer un modèle ACV.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
