// Composant principal avec navigation pas à pas

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ProductCalculation, ProductData } from '../types';
import { Step1ProductInfo } from './steps/Step1ProductInfo';
import { Step2Materials } from './steps/Step2Materials';
import { Step3Manufacturing } from './steps/Step3Manufacturing';
import { Step4Transport } from './steps/Step4Transport';
import { Step5Usage } from './steps/Step5Usage';
import { Step6EndOfLife } from './steps/Step6EndOfLife';
import { Step7Results } from './steps/Step7Results';
import { Progress } from '@/components/ui/progress';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useOrganizationId } from '@/hooks/useOrganizationId';

const STEPS = [
  { id: 1, title: 'Informations produit', component: Step1ProductInfo },
  { id: 2, title: 'Matières premières', component: Step2Materials },
  { id: 3, title: 'Fabrication', component: Step3Manufacturing },
  { id: 4, title: 'Transport', component: Step4Transport },
  { id: 5, title: 'Utilisation', component: Step5Usage, optional: true },
  { id: 6, title: 'Fin de vie', component: Step6EndOfLife, optional: true },
  { id: 7, title: 'Résultats', component: Step7Results },
];

export const ProductWizard: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [calculation, setCalculation] = useState<Partial<ProductCalculation>>({});
  const [productId, setProductId] = useState<string | null>(null);
  const { organizationId } = useOrganizationId();
  const navigate = useNavigate();

  const handleNext = (stepData: Partial<ProductCalculation>) => {
    const updatedCalculation = { ...calculation, ...stepData };
    setCalculation(updatedCalculation);
    
    // Générer un product_id unique si on arrive à l'étape 7 (résultats)
    if (currentStep === STEPS.length - 1 && !productId && updatedCalculation.product) {
      // Générer un UUID simple côté client (ou utiliser crypto.randomUUID() si disponible)
      const newProductId = crypto.randomUUID ? crypto.randomUUID() : 
        `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      setProductId(newProductId);
    }
    
    if (currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    if (currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleFinish = () => {
    navigate('/app/empreinte-produit');
  };

  const CurrentStepComponent = STEPS[currentStep - 1].component;
  const isOptional = STEPS[currentStep - 1].optional;
  const progress = ((currentStep - 1) / (STEPS.length - 1)) * 100;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>Étape {currentStep} sur {STEPS.length}</span>
          <span>{Math.round(progress)}% complété</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Step Indicator */}
      <div className="flex gap-2 justify-center">
        {STEPS.map((step, index) => (
          <div
            key={step.id}
            className={`h-2 w-2 rounded-full transition-colors ${
              index + 1 < currentStep
                ? 'bg-primary'
                : index + 1 === currentStep
                ? 'bg-primary ring-2 ring-primary ring-offset-2'
                : 'bg-muted'
            }`}
          />
        ))}
      </div>

      {/* Step Content */}
      <Card className="p-6">
        <CurrentStepComponent
          data={calculation}
          productId={productId || undefined}
          organizationId={organizationId || undefined}
          onNext={handleNext}
          onPrevious={handlePrevious}
          onSkip={isOptional ? handleSkip : undefined}
          onFinish={currentStep === STEPS.length ? handleFinish : undefined}
        />
      </Card>

      {/* Navigation Buttons */}
      {currentStep < STEPS.length && (
        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentStep === 1}
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            Précédent
          </Button>
          
          {isOptional && (
            <Button
              variant="ghost"
              onClick={handleSkip}
            >
              Passer cette étape
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

