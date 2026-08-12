// Étape 6: Fin de vie (optionnelle)

import React, { useState } from 'react';
import { ProductCalculation, EndOfLifeData, EndOfLifeScenario } from '../../types';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { ArrowRight, X } from 'lucide-react';

interface Step6Props {
  data: Partial<ProductCalculation>;
  onNext: (data: Partial<ProductCalculation>) => void;
  onPrevious: () => void;
  onSkip?: () => void;
}

const SCENARIOS: { value: EndOfLifeScenario; label: string }[] = [
  { value: 'recycling', label: 'Recyclage' },
  { value: 'incineration', label: 'Incinération' },
  { value: 'landfill', label: 'Mise en décharge' },
  { value: 'reuse', label: 'Réutilisation' },
];

export const Step6EndOfLife: React.FC<Step6Props> = ({ data, onNext, onPrevious, onSkip }) => {
  const [scenario, setScenario] = useState<EndOfLifeScenario>(data.endOfLife?.scenario || 'recycling');
  const [percentage, setPercentage] = useState(data.endOfLife?.percentage || 100);
  const [isEstimated, setIsEstimated] = useState(data.endOfLife?.isEstimated ?? true);

  const handleNext = () => {
    onNext({
      endOfLife: {
        scenario,
        percentage,
        isEstimated,
      },
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-2xl font-bold text-foreground">
            Fin de vie (optionnel)
          </h2>
          {onSkip && (
            <Button variant="ghost" size="sm" onClick={onSkip}>
              <X className="w-4 h-4 mr-2" />
              Passer
            </Button>
          )}
        </div>
        <p className="text-muted-foreground">
          Indiquez le scénario principal de fin de vie de votre produit
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="scenario">Scénario principal</Label>
          <Select value={scenario} onValueChange={(value) => setScenario(value as EndOfLifeScenario)}>
            <SelectTrigger id="scenario" className="max-w-md">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SCENARIOS.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="percentage">Pourcentage (%)</Label>
          <Input
            id="percentage"
            type="number"
            value={percentage || ''}
            onChange={(e) => setPercentage(Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))}
            min="0"
            max="100"
            className="max-w-md"
          />
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

