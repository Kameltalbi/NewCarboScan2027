import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock } from 'lucide-react';
import { CollecteStatusList } from '@/modules/collect/components/CollecteStatusList';

export const CollecteEnCours: React.FC = () => {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Collectes en cours</h1>
        <p className="text-muted-foreground mt-1">Gérez vos collectes de données en cours</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Collectes en cours
          </CardTitle>
          <CardDescription>Continuez vos collectes de données</CardDescription>
        </CardHeader>
        <CardContent>
          <CollecteStatusList status="in_progress" />
        </CardContent>
      </Card>
    </div>
  );
};

