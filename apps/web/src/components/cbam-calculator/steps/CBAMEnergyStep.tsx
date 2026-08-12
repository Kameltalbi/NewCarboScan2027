import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, ArrowRight, Zap, Flame, Fuel } from 'lucide-react';
import { CBAMData } from '@/types/cbam';

interface CBAMEnergyStepProps {
  data: CBAMData;
  onUpdate: (updates: Partial<CBAMData>) => void;
  onNext: () => void;
  onPrevious: () => void;
  isFirstStep: boolean;
}

export const CBAMEnergyStep: React.FC<CBAMEnergyStepProps> = ({
  data,
  onUpdate,
  onNext,
  onPrevious,
  isFirstStep
}) => {
  const { t } = useTranslation();

  const hasDataOrDefault = data.useDefaultData || 
    (data.electricity > 0 || data.gas > 0 || data.fuel > 0);

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h3 className="text-lg font-semibold mb-2">
          {t('cbamCalculator.questions.energyConsumption.title')}
        </h3>
        <p className="text-gray-600">
          {t('cbamCalculator.questions.energyConsumption.description')}
        </p>
      </div>

      {/* Use Default Checkbox */}
      <div className="bg-blue-50 p-4 rounded-lg border">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="useDefault"
            checked={data.useDefaultData}
            onCheckedChange={(checked) => onUpdate({ useDefaultData: !!checked })}
          />
          <Label htmlFor="useDefault" className="text-sm font-medium cursor-pointer">
            {t('cbamCalculator.questions.energyConsumption.useDefault')}
          </Label>
        </div>
      </div>

      {/* Energy Inputs - Only show if not using default */}
      {!data.useDefaultData && (
        <div className="grid gap-6 md:grid-cols-3">
          {/* Electricity */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-base font-medium">
              <Zap className="h-4 w-4 text-yellow-500" />
              {t('cbamCalculator.questions.energyConsumption.electricity')}
            </Label>
            <div className="relative">
              <Input
                type="number"
                min="0"
                value={data.electricity || ''}
                onChange={(e) => onUpdate({ electricity: Number(e.target.value) })}
                placeholder="ex: 50000"
                className="pr-12"
              />
              <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-xs">
                kWh
              </span>
            </div>
          </div>

          {/* Gas */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-base font-medium">
              <Flame className="h-4 w-4 text-blue-500" />
              {t('cbamCalculator.questions.energyConsumption.gas')}
            </Label>
            <div className="relative">
              <Input
                type="number"
                min="0"
                value={data.gas || ''}
                onChange={(e) => onUpdate({ gas: Number(e.target.value) })}
                placeholder="ex: 5000"
                className="pr-12"
              />
              <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-xs">
                m³
              </span>
            </div>
          </div>

          {/* Fuel */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-base font-medium">
              <Fuel className="h-4 w-4 text-red-500" />
              {t('cbamCalculator.questions.energyConsumption.fuel')}
            </Label>
            <div className="relative">
              <Input
                type="number"
                min="0"
                value={data.fuel || ''}
                onChange={(e) => onUpdate({ fuel: Number(e.target.value) })}
                placeholder="ex: 2000"
                className="pr-12"
              />
              <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-xs">
                litres
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Info Message */}
      {data.useDefaultData && (
        <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
          <p className="text-amber-800 text-sm">
            ℹ️ Les valeurs par défaut UE seront appliquées selon votre secteur d'activité. 
            Cela peut résulter en des coûts CBAM plus élevés.
          </p>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between pt-6 border-t">
        <Button
          variant="outline"
          onClick={onPrevious}
          disabled={isFirstStep}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('cbamCalculator.navigation.previous')}
        </Button>
        
        <Button
          onClick={onNext}
          disabled={!hasDataOrDefault}
          className="flex items-center gap-2"
        >
          {t('cbamCalculator.navigation.next')}
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};