import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Calculator, CheckCircle } from 'lucide-react';
import { CBAMData } from '@/types/cbam';

interface CBAMSummaryStepProps {
  data: CBAMData;
  onNext: () => void;
  onPrevious: () => void;
  isFirstStep: boolean;
}

export const CBAMSummaryStep: React.FC<CBAMSummaryStepProps> = ({
  data,
  onNext,
  onPrevious,
  isFirstStep
}) => {
  const { t } = useTranslation();

  const getSectorLabel = (sector: string) => {
    return t(`cbamCalculator.questions.sector.options.${sector}`);
  };

  const getCountryLabel = (country: string) => {
    const countries: { [key: string]: string } = {
      tunisia: 'Tunisie / Tunisia',
      morocco: 'Maroc / Morocco',
      turkey: 'Turquie / Turkey',
      china: 'Chine / China',
      india: 'Inde / India',
      other: 'Autre / Other'
    };
    return countries[country] || country;
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h3 className="text-lg font-semibold mb-2 flex items-center justify-center gap-2">
          <CheckCircle className="h-5 w-5 text-green-500" />
          Récapitulatif de vos données
        </h3>
        <p className="text-gray-600">
          Vérifiez vos informations avant de lancer le calcul CBAM
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* General Information */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              {t('cbamCalculator.steps.general')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <span className="text-sm text-gray-500">Secteur:</span>
              <div className="font-medium">{getSectorLabel(data.sector)}</div>
            </div>
            <div>
              <span className="text-sm text-gray-500">Pays d'exportation:</span>
              <div className="font-medium">{getCountryLabel(data.exportCountry)}</div>
            </div>
            <div>
              <span className="text-sm text-gray-500">Volume annuel:</span>
              <div className="font-medium">{data.annualVolume.toLocaleString()} tonnes</div>
            </div>
          </CardContent>
        </Card>

        {/* Energy Data */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              {t('cbamCalculator.steps.directData')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.useDefaultData ? (
              <Badge variant="secondary" className="w-fit">
                Valeurs par défaut UE
              </Badge>
            ) : (
              <>
                <div>
                  <span className="text-sm text-gray-500">Électricité:</span>
                  <div className="font-medium">{data.electricity.toLocaleString()} kWh</div>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Gaz naturel:</span>
                  <div className="font-medium">{data.gas.toLocaleString()} m³</div>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Combustibles:</span>
                  <div className="font-medium">{data.fuel.toLocaleString()} litres</div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Transport Data */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              {t('cbamCalculator.steps.indirectData')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.useAverageTransport ? (
              <Badge variant="secondary" className="w-fit">
                Moyennes sectorielles
              </Badge>
            ) : (
              <>
                <div>
                  <span className="text-sm text-gray-500">Transport routier:</span>
                  <div className="font-medium">{data.truckDistance.toLocaleString()} km</div>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Transport maritime:</span>
                  <div className="font-medium">{data.shipDistance.toLocaleString()} km</div>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Transport aérien:</span>
                  <div className="font-medium">{data.airDistance.toLocaleString()} km</div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Calculation Notice */}
        <Card className="md:col-span-2">
          <CardContent className="p-4">
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <h4 className="font-medium text-blue-900 mb-2">
                🧮 Prêt pour le calcul CBAM
              </h4>
              <p className="text-blue-800 text-sm">
                Nous allons calculer vos émissions carbone et estimer le coût de la taxe carbone 
                aux frontières (CBAM) pour vos exportations vers l'Union Européenne.
              </p>
              <p className="text-blue-700 text-xs mt-2">
                Prix carbone ETS actuel: ~85 €/tonne CO₂e
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

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
          className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700"
        >
          <Calculator className="h-4 w-4" />
          {t('cbamCalculator.navigation.calculate')}
        </Button>
      </div>
    </div>
  );
};