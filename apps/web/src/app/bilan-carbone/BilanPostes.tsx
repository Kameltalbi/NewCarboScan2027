import React, { useState } from 'react';
import { useOrganizationData } from '@/hooks/useOrganizationData';
import { BilanScopesDetail } from '@/components/bilan-carbone/BilanScopesDetail';

export const BilanPostes: React.FC = () => {
  const { referenceYear } = useOrganizationData();
  const [periodStart] = useState(`${referenceYear}-01-01`);
  const [periodEnd] = useState(`${referenceYear}-12-31`);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Détail par poste</h1>
        <p className="text-muted-foreground mt-1">
          Analyse des postes d'émission selon le Bilan Carbone®
        </p>
      </div>
      <BilanScopesDetail periodStart={periodStart} periodEnd={periodEnd} />
    </div>
  );
};

