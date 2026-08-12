import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { CBAMData } from '@/types/cbam';

interface CBAMGeneralStepProps {
  data: CBAMData;
  onUpdate: (updates: Partial<CBAMData>) => void;
  onNext: () => void;
  onPrevious: () => void;
  isFirstStep: boolean;
}

const countries = [
  { value: 'tunisia', label: 'Tunisie / Tunisia' },
  { value: 'morocco', label: 'Maroc / Morocco' },
  { value: 'turkey', label: 'Turquie / Turkey' },
  { value: 'china', label: 'Chine / China' },
  { value: 'india', label: 'Inde / India' },
  { value: 'other', label: 'Autre / Other' },
];

export const CBAMGeneralStep: React.FC<CBAMGeneralStepProps> = ({
  data,
  onUpdate,
  onNext,
  onPrevious,
  isFirstStep
}) => {
  const { t } = useTranslation();

  const isValidToNext = data.sector && data.exportCountry && data.annualVolume > 0;

  return (
    <div className="space-y-6">
      {/* Sector Selection */}
      <div className="space-y-2">
        <Label htmlFor="sector" className="text-base font-medium">
          {t('cbamCalculator.questions.sector.title')}
        </Label>
        <p className="text-sm text-gray-600 mb-3">
          {t('cbamCalculator.questions.sector.description')}
        </p>
        <Select value={data.sector} onValueChange={(value) => onUpdate({ sector: value })}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Sélectionnez votre secteur / Select your sector" />
          </SelectTrigger>
          <SelectContent className="bg-white z-50">
            <SelectItem value="cement">{t('cbamCalculator.questions.sector.options.cement')}</SelectItem>
            <SelectItem value="steel">{t('cbamCalculator.questions.sector.options.steel')}</SelectItem>
            <SelectItem value="aluminum">{t('cbamCalculator.questions.sector.options.aluminum')}</SelectItem>
            <SelectItem value="fertilizer">{t('cbamCalculator.questions.sector.options.fertilizer')}</SelectItem>
            <SelectItem value="electricity">{t('cbamCalculator.questions.sector.options.electricity')}</SelectItem>
            <SelectItem value="hydrogen">{t('cbamCalculator.questions.sector.options.hydrogen')}</SelectItem>
            <SelectItem value="other">{t('cbamCalculator.questions.sector.options.other')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Country Selection */}
      <div className="space-y-2">
        <Label htmlFor="country" className="text-base font-medium">
          {t('cbamCalculator.questions.exportCountry.title')}
        </Label>
        <p className="text-sm text-gray-600 mb-3">
          {t('cbamCalculator.questions.exportCountry.description')}
        </p>
        <Select value={data.exportCountry} onValueChange={(value) => onUpdate({ exportCountry: value })}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-white z-50">
            {countries.map((country) => (
              <SelectItem key={country.value} value={country.value}>
                {country.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Annual Volume */}
      <div className="space-y-2">
        <Label htmlFor="volume" className="text-base font-medium">
          {t('cbamCalculator.questions.annualVolume.title')}
        </Label>
        <p className="text-sm text-gray-600 mb-3">
          {t('cbamCalculator.questions.annualVolume.description')}
        </p>
        <div className="relative">
          <Input
            id="volume"
            type="number"
            min="0"
            value={data.annualVolume || ''}
            onChange={(e) => onUpdate({ annualVolume: Number(e.target.value) })}
            placeholder={t('cbamCalculator.questions.annualVolume.placeholder')}
            className="pr-16"
          />
          <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">
            tonnes
          </span>
        </div>
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
          disabled={!isValidToNext}
          className="flex items-center gap-2"
        >
          {t('cbamCalculator.navigation.next')}
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};