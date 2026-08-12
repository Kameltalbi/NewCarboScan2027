import React, { useState } from 'react';
import { useOrganizationData } from '@/hooks/useOrganizationData';
import { GHGHierarchyView } from '@/components/bilan-carbone/GHGHierarchyView';
import { Card, CardContent } from '@/components/ui/card';

export const BilanScopes: React.FC = () => {
  const { organizationId, referenceYear } = useOrganizationData();
  const [periodStart] = useState(`${referenceYear}-01-01`);
  const [periodEnd] = useState(`${referenceYear}-12-31`);

  if (!organizationId) {
    return (
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Détail par scope</h1>
          <p className="text-muted-foreground mt-1">
            Analyse détaillée des émissions par scope selon la hiérarchie GHG Protocol
          </p>
        </div>
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              Veuillez vous connecter pour accéder à vos données.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Détail par scope</h1>
        <p className="text-muted-foreground mt-1">
          Analyse détaillée des émissions par scope selon la hiérarchie GHG Protocol
        </p>
      </div>
      <GHGHierarchyView
        organizationId={organizationId}
        periodStart={periodStart}
        periodEnd={periodEnd}
      />
    </div>
  );
};

