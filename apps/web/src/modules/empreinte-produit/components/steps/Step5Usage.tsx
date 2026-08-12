// Étape 5: Utilisation (optionnelle)

import React, { useState } from 'react';
import { ProductCalculation, UsageData } from '../../types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowRight, X } from 'lucide-react';

interface Step5Props {
  data: Partial<ProductCalculation>;
  onNext: (data: Partial<ProductCalculation>) => void;
  onPrevious: () => void;
  onSkip?: () => void;
}

export const Step5Usage: React.FC<Step5Props> = ({ data, onNext, onPrevious, onSkip }) => {
  const [lifetime, setLifetime] = useState(data.usage?.lifetime || 1);
  const [consumptionPerUse, setConsumptionPerUse] = useState(data.usage?.consumptionPerUse || 0);
  const [numberOfUses, setNumberOfUses] = useState(data.usage?.numberOfUses || 1);
  const [isEstimated, setIsEstimated] = useState(data.usage?.isEstimated ?? true);

  const handleNext = () => {
    onNext({
      usage: {
        lifetime,
        consumptionPerUse,
        numberOfUses,
        isEstimated,
      },
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-2xl font-bold text-foreground">
            Utilisation (optionnel)
          </h2>
          {onSkip && (
            <Button variant="ghost" size="sm" onClick={onSkip}>
              <X className="w-4 h-4 mr-2" />
              Passer
            </Button>
          )}
        </div>
        <p className="text-muted-foreground">
          Si votre produit consomme de l'énergie pendant son utilisation, renseignez ces informations
        </p>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="lifetime">Durée de vie (années)</Label>
            <Input
              id="lifetime"
              type="number"
              value={lifetime || ''}
              onChange={(e) => setLifetime(parseFloat(e.target.value) || 1)}
              min="1"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="consumption">Consommation par usage (kWh)</Label>
            <Input
              id="consumption"
              type="number"
              value={consumptionPerUse || ''}
              onChange={(e) => setConsumptionPerUse(parseFloat(e.target.value) || 0)}
              min="0"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="uses">Nombre d'usages/an</Label>
            <Input
              id="uses"
              type="number"
              value={numberOfUses || ''}
              onChange={(e) => setNumberOfUses(parseFloat(e.target.value) || 1)}
              min="1"
            />
          </div>
        </div>
      </div>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onPrevious}>
          Précédent
        </Button>
        <Button onClick={handleNext}>
          Continuer
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
};

