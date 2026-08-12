import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, ArrowRight, Truck, Ship, Plane } from 'lucide-react';
import { CBAMData } from '@/types/cbam';

interface CBAMTransportStepProps {
  data: CBAMData;
  onUpdate: (updates: Partial<CBAMData>) => void;
  onNext: () => void;
  onPrevious: () => void;
  isFirstStep: boolean;
}

export const CBAMTransportStep: React.FC<CBAMTransportStepProps> = ({
  data,
  onUpdate,
  onNext,
  onPrevious,
  isFirstStep
}) => {
  const { t } = useTranslation();

  const hasTransportDataOrAverage = data.useAverageTransport || 
    (data.truckDistance > 0 || data.shipDistance > 0 || data.airDistance > 0);

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h3 className="text-lg font-semibold mb-2">
          {t('cbamCalculator.questions.transport.title')}
        </h3>
        <p className="text-gray-600">
          {t('cbamCalculator.questions.transport.description')}
        </p>
      </div>

      {/* Use Average Checkbox */}
      <div className="bg-blue-50 p-4 rounded-lg border">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="useAverage"
            checked={data.useAverageTransport}
            onCheckedChange={(checked) => onUpdate({ useAverageTransport: !!checked })}
          />
          <Label htmlFor="useAverage" className="text-sm font-medium cursor-pointer">
            {t('cbamCalculator.questions.transport.useAverage')}
          </Label>
        </div>
      </div>

      {/* Transport Inputs - Only show if not using averages */}
      {!data.useAverageTransport && (
        <div className="grid gap-6 md:grid-cols-3">
          {/* Truck Transport */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-base font-medium">
              <Truck className="h-4 w-4 text-gray-600" />
              {t('cbamCalculator.questions.transport.truck')}
            </Label>
            <div className="relative">
              <Input
                type="number"
                min="0"
                value={data.truckDistance || ''}
                onChange={(e) => onUpdate({ truckDistance: Number(e.target.value) })}
                placeholder="ex: 500"
                className="pr-12"
              />
              <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-xs">
                km
              </span>
            </div>
          </div>

          {/* Ship Transport */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-base font-medium">
              <Ship className="h-4 w-4 text-blue-600" />
              {t('cbamCalculator.questions.transport.ship')}
            </Label>
            <div className="relative">
              <Input
                type="number"
                min="0"
                value={data.shipDistance || ''}
                onChange={(e) => onUpdate({ shipDistance: Number(e.target.value) })}
                placeholder="ex: 1500"
                className="pr-12"
              />
              <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-xs">
                km
              </span>
            </div>
          </div>

          {/* Air Transport */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-base font-medium">
              <Plane className="h-4 w-4 text-red-500" />
              {t('cbamCalculator.questions.transport.air')}
            </Label>
            <div className="relative">
              <Input
                type="number"
                min="0"
                value={data.airDistance || ''}
                onChange={(e) => onUpdate({ airDistance: Number(e.target.value) })}
                placeholder="ex: 0"
                className="pr-12"
              />
              <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-xs">
                km
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Info Message */}
      {data.useAverageTransport && (
        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
          <p className="text-green-800 text-sm">
            ℹ️ Les moyennes sectorielles seront utilisées selon votre pays d'origine. 
            Pour la Tunisie vers l'UE: ~1500 km par voie maritime.
          </p>
        </div>
      )}

      {/* Transport Tips */}
      {!data.useAverageTransport && (
        <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
          <p className="text-yellow-800 text-sm font-medium mb-2">
            💡 Conseils transport:
          </p>
          <ul className="text-yellow-700 text-sm space-y-1">
            <li>• Transport maritime: le plus économe en carbone</li>
            <li>• Transport routier: pour les distances courtes</li>
            <li>• Transport aérien: éviter si possible (très émetteur)</li>
          </ul>
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
          disabled={!hasTransportDataOrAverage}
          className="flex items-center gap-2"
        >
          {t('cbamCalculator.navigation.next')}
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};