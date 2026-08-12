import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp } from 'lucide-react';

export const ACVPhases: React.FC = () => {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Impacts par phase</h1>
        <p className="text-muted-foreground mt-1">Analyse des impacts par phase du cycle de vie</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Phases du cycle de vie
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
