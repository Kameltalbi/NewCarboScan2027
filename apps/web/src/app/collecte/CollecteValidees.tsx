import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle } from 'lucide-react';
import { CollecteStatusList } from '@/modules/collect/components/CollecteStatusList';

export const CollecteValidees: React.FC = () => {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Collectes validées</h1>
        <p className="text-muted-foreground mt-1">Consultez vos collectes validées</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            Collectes validées
          </CardTitle>
          <CardDescription>Historique de vos collectes validées</CardDescription>
        </CardHeader>
        <CardContent>
          <CollecteStatusList status="validated" />
        </CardContent>
      </Card>
    </div>
  );
};

