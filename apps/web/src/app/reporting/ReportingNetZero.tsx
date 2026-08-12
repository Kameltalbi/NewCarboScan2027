import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Milestone } from 'lucide-react';

export const ReportingNetZero: React.FC = () => {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Rapports Feuille de route climat</h1>
        <p className="text-muted-foreground mt-1">Rapports de la feuille de route climat</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Milestone className="h-5 w-5" />
            Rapports Feuille de route climat
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            Aucun rapport disponible pour le moment.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
