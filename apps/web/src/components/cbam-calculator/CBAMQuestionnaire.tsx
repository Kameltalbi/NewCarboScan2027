import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { CBAMGeneralStep } from './steps/CBAMGeneralStep';
import { CBAMEnergyStep } from './steps/CBAMEnergyStep';
import { CBAMTransportStep } from './steps/CBAMTransportStep';
import { CBAMSummaryStep } from './steps/CBAMSummaryStep';
import { CBAMContactStep } from './steps/CBAMContactStep';
import { CBAMResultsStep } from './steps/CBAMResultsStep';
import { CBAMData, CBAMStep, CBAMResults } from '@/types/cbam';
import { calculateCBAMEmissions } from '@/lib/cbamCalculations';

const initialData: CBAMData = {
  sector: '',
  exportCountry: 'tunisia',
  annualVolume: 0,
  electricity: 0,
  gas: 0,
  fuel: 0,
  useDefaultData: false,
  truckDistance: 0,
  shipDistance: 0,
  airDistance: 0,
  useAverageTransport: false,
};

export const CBAMQuestionnaire: React.FC = () => {
  const { t } = useTranslation();
  const [currentStep, setCurrentStep] = useState<CBAMStep>('general');
  const [data, setData] = useState<CBAMData>(initialData);
  const [results, setResults] = useState<CBAMResults | null>(null);

  const steps: CBAMStep[] = ['general', 'direct-data', 'indirect-data', 'summary', 'contact', 'results'];
  const currentStepIndex = steps.indexOf(currentStep);
  const progress = ((currentStepIndex + 1) / steps.length) * 100;

  const updateData = (updates: Partial<CBAMData>) => {
    setData(prev => ({ ...prev, ...updates }));
  };

  const handleNext = () => {
    const nextStepIndex = currentStepIndex + 1;
    if (nextStepIndex < steps.length - 2) {
      // Étapes normales avant summary
      setCurrentStep(steps[nextStepIndex]);
    } else if (currentStep === 'summary') {
      // À l'étape summary, calculer les résultats et aller à contact
      const calculateResults = async () => {
        const calculatedResults = await calculateCBAMEmissions(data);
        setResults(calculatedResults);
        setCurrentStep('contact');
      };
      calculateResults();
    } else if (currentStep === 'contact') {
      // Du contact vers les résultats
      setCurrentStep('results');
    }
  };

  const handlePrevious = () => {
    const prevStepIndex = currentStepIndex - 1;
    if (prevStepIndex >= 0) {
      setCurrentStep(steps[prevStepIndex]);
    }
  };

  const handleRestart = () => {
    setCurrentStep('general');
    setData(initialData);
    setResults(null);
  };

  const isLastStep = currentStep === 'results';
  const isFirstStep = currentStep === 'general';

  const getStepTitle = () => {
    switch (currentStep) {
      case 'general':
        return t('cbamCalculator.steps.general');
      case 'direct-data':
        return t('cbamCalculator.steps.directData');
      case 'indirect-data':
        return t('cbamCalculator.steps.indirectData');
      case 'summary':
        return t('cbamCalculator.steps.summary');
      case 'contact':
        return t('cbamCalculator.steps.contact', 'Contact information');
      case 'results':
        return t('cbamCalculator.steps.results');
      default:
        return '';
    }
  };

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 'general':
        return (
          <CBAMGeneralStep
            data={data}
            onUpdate={updateData}
            onNext={handleNext}
            onPrevious={handlePrevious}
            isFirstStep={isFirstStep}
          />
        );
      case 'direct-data':
        return (
          <CBAMEnergyStep
            data={data}
            onUpdate={updateData}
            onNext={handleNext}
            onPrevious={handlePrevious}
            isFirstStep={isFirstStep}
          />
        );
      case 'indirect-data':
        return (
          <CBAMTransportStep
            data={data}
            onUpdate={updateData}
            onNext={handleNext}
            onPrevious={handlePrevious}
            isFirstStep={isFirstStep}
          />
        );
      case 'summary':
        return (
          <CBAMSummaryStep
            data={data}
            onNext={handleNext}
            onPrevious={handlePrevious}
            isFirstStep={isFirstStep}
          />
        );
      case 'contact':
        return results ? (
          <CBAMContactStep
            data={data}
            results={results}
            onNext={handleNext}
            onPrevious={handlePrevious}
          />
        ) : null;
      case 'results':
        return results ? (
          <CBAMResultsStep
            data={data}
            results={results}
            onRestart={handleRestart}
          />
        ) : null;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 py-8">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {t('cbamCalculator.title')}
            </h1>
            <p className="text-gray-600 max-w-2xl mx-auto">
              {t('cbamCalculator.subtitle')}
            </p>
          </div>

          {/* Progress Bar */}
          {!isLastStep && (
            <div className="mb-8">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700">
                  {getStepTitle()}
                </span>
                <span className="text-sm text-gray-500">
                  {currentStepIndex + 1} / {steps.length - 1}
                </span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}

          {/* Content Card */}
          <Card className="shadow-lg">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl text-center">
                {getStepTitle()}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {renderCurrentStep()}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};