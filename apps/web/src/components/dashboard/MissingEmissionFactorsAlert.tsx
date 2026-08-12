// Composant d'alerte pour les facteurs d'émission manquants

import React from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import type { MissingEmissionFactor } from '@/lib/calculators/BilanCarboneCalculator';

interface MissingEmissionFactorsAlertProps {
  missingFactors: MissingEmissionFactor[];
}

export const MissingEmissionFactorsAlert: React.FC<MissingEmissionFactorsAlertProps> = ({
  missingFactors,
}) => {
  const navigate = useNavigate();

  if (!missingFactors || missingFactors.length === 0) {
    return null;
  }

  // Grouper par scope
  const scope1Missing = missingFactors.filter(f => f.scopeHint === 1 || (!f.scopeHint && !f.subcategory.startsWith('cat')));
  const scope2Missing = missingFactors.filter(f => f.scopeHint === 2);
  const scope3Missing = missingFactors.filter(f => f.scopeHint === 3 || f.subcategory.startsWith('cat'));

  return (
    <Alert variant="destructive" className="border-amber-500 bg-amber-50 dark:bg-amber-950/30">
      <AlertTriangle className="h-5 w-5 text-amber-600" />
      <AlertTitle className="text-amber-800 dark:text-amber-200 font-semibold">
        Facteurs d'émission manquants ({missingFactors.length})
      </AlertTitle>
      <AlertDescription className="mt-2">
        <p className="text-amber-700 dark:text-amber-300 text-sm mb-3">
          Les données suivantes ne seront pas comptabilisées dans votre bilan carbone car aucun facteur d'émission n'a été trouvé :
        </p>
        
        <div className="space-y-2 mb-4">
          {scope1Missing.length > 0 && (
            <div className="text-sm">
              <span className="font-medium text-orange-700">Scope 1:</span>{' '}
              <span className="text-amber-700">{scope1Missing.map(f => f.subcategory).join(', ')}</span>
            </div>
          )}
          {scope2Missing.length > 0 && (
            <div className="text-sm">
              <span className="font-medium text-blue-700">Scope 2:</span>{' '}
              <span className="text-amber-700">{scope2Missing.map(f => f.subcategory).join(', ')}</span>
            </div>
          )}
          {scope3Missing.length > 0 && (
            <div className="text-sm">
              <span className="font-medium text-purple-700">Scope 3:</span>{' '}
              <span className="text-amber-700">{scope3Missing.map(f => f.subcategory).join(', ')}</span>
            </div>
          )}
        </div>

        <Button
          variant="outline"
          size="sm"
          className="border-amber-500 text-amber-700 hover:bg-amber-100"
          onClick={() => navigate('/app/settings/emission-factors')}
        >
          <Settings className="h-4 w-4 mr-2" />
          Configurer les facteurs d'émission
        </Button>
      </AlertDescription>
    </Alert>
  );
};
