// Étape 3: Fabrication et énergie

import React, { useState } from 'react';
import { ProductCalculation, ManufacturingData } from '../../types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowRight, Info } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';

interface Step3Props {
  data: Partial<ProductCalculation>;
  onNext: (data: Partial<ProductCalculation>) => void;
  onPrevious: () => void;
}

export const Step3Manufacturing: React.FC<Step3Props> = ({ data, onNext, onPrevious }) => {
  const [electricity, setElectricity] = useState(data.manufacturing?.electricity || 0);
  const [isEstimated, setIsEstimated] = useState(data.manufacturing?.isEstimated ?? true);

  const totalWeight = data.materials?.reduce((sum, m) => sum + m.quantity, 0) || 0;
  const estimatedElectricity = totalWeight * 2; // Estimation: 2 kWh/kg

  const handleNext = () => {
    onNext({
      manufacturing: {
        electricity: electricity || estimatedElectricity,
        isEstimated: isEstimated || electricity === 0,
      },
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2">
          Fabrication et consommation d'énergie
        </h2>
        <p className="text-muted-foreground">
          Indiquez la consommation d'électricité lors de la fabrication
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="electricity">
            Consommation électrique (kWh)
          </Label>
          <Input
            id="electricity"
            type="number"
            value={electricity || ''}
            onChange={(e) => setElectricity(parseFloat(e.target.value) || 0)}
            placeholder={estimatedElectricity.toFixed(1)}
            className="max-w-md"
          />
          {electricity === 0 && (
            <p className="text-sm text-muted-foreground">
              Estimation automatique: {estimatedElectricity.toFixed(1)} kWh 
              (basée sur {totalWeight.toFixed(1)} kg de matériaux)
            </p>
          )}
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="estimated"
            checked={isEstimated}
            onCheckedChange={(checked) => setIsEstimated(checked === true)}
          />
          <Label htmlFor="estimated" className="cursor-pointer">
            Données estimées (valeur par défaut utilisée)
          </Label>
        </div>
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Si vous ne connaissez pas la consommation exacte, nous utiliserons une estimation 
          basée sur le poids total des matériaux.
        </AlertDescription>
      </Alert>

      <div className="flex flex-col-reverse sm:flex-row justify-between gap-3">
        <Button variant="outline" onClick={onPrevious} className="w-full sm:w-auto">
          Précédent
        </Button>
        <Button onClick={handleNext} className="w-full sm:w-auto">
          Continuer
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
};

