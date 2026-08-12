// Étape 4: Transport

import React, { useState } from 'react';
import { ProductCalculation, TransportData, TransportMode } from '../../types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowRight, Info } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';

interface Step4Props {
  data: Partial<ProductCalculation>;
  onNext: (data: Partial<ProductCalculation>) => void;
  onPrevious: () => void;
}

const TRANSPORT_MODES: { value: TransportMode; label: string }[] = [
  { value: 'road', label: 'Route (camion)' },
  { value: 'sea', label: 'Mer (cargo)' },
  { value: 'air', label: 'Air (avion)' },
  { value: 'rail', label: 'Rail (train)' },
  { value: 'mixed', label: 'Mixte' },
];

export const Step4Transport: React.FC<Step4Props> = ({ data, onNext, onPrevious }) => {
  const totalWeight = data.materials?.reduce((sum, m) => sum + m.quantity, 0) || 0;
  const [distance, setDistance] = useState(data.transport?.distance || 500);
  const [mode, setMode] = useState<TransportMode>(data.transport?.mode || 'road');
  const [isEstimated, setIsEstimated] = useState(data.transport?.isEstimated ?? true);

  const handleNext = () => {
    onNext({
      transport: {
        distance: distance || 500,
        mode,
        weight: totalWeight,
        isEstimated: isEstimated || distance === 0,
      },
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2">
          Transport
        </h2>
        <p className="text-muted-foreground">
          Indiquez la distance et le mode de transport principal
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="distance">
            Distance approximative (km)
          </Label>
          <Input
            id="distance"
            type="number"
            value={distance || ''}
            onChange={(e) => setDistance(parseFloat(e.target.value) || 0)}
            placeholder="500"
            className="max-w-md"
          />
          {distance === 0 && (
            <p className="text-sm text-muted-foreground">
              Estimation par défaut: 500 km
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="mode">Mode de transport</Label>
          <Select value={mode} onValueChange={(value) => setMode(value as TransportMode)}>
            <SelectTrigger id="mode" className="max-w-md">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TRANSPORT_MODES.map((tm) => (
                <SelectItem key={tm.value} value={tm.value}>
                  {tm.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="p-4 bg-muted rounded-lg">
          <p className="text-sm font-medium mb-1">Poids total du produit</p>
          <p className="text-2xl font-bold">{totalWeight.toFixed(2)} kg</p>
          <p className="text-xs text-muted-foreground mt-1">
            Basé sur les quantités de matériaux renseignées
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="estimated"
            checked={isEstimated}
            onCheckedChange={(checked) => setIsEstimated(checked === true)}
          />
          <Label htmlFor="estimated" className="cursor-pointer">
            Données estimées
          </Label>
        </div>
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Si vous ne connaissez pas la distance exacte, nous utiliserons une estimation 
          de 500 km par route, valeur moyenne pour les produits manufacturés.
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

