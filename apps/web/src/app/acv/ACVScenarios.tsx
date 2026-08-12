import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { GitCompare } from 'lucide-react';

export const ACVScenarios: React.FC = () => {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Comparaison de variantes</h1>
        <p className="text-muted-foreground mt-1">Comparez différents scénarios ACV</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GitCompare className="h-5 w-5" />
            Scénarios ACV
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            Aucun scénario disponible pour le moment.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
