import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Layers } from 'lucide-react';

export const ACVModeles: React.FC = () => {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Modèles ACV</h1>
        <p className="text-muted-foreground mt-1">Gérez vos modèles d'analyse du cycle de vie</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5" />
            Modèles ACV
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            Aucun modèle disponible pour le moment.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
