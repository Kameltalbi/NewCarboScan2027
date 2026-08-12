import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, ArrowLeft } from 'lucide-react';
import { VerticalProgressBar } from './VerticalProgressBar';
import { QuestionStepper, PricingFormData } from './QuestionStepper';
import { PricingCalculator, calculateTotal, defaultModules } from './PricingCalculator';
import { EnterpriseQuoteSection } from './EnterpriseQuoteSection';
import { Card, CardContent } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';

const TOTAL_STEPS = 7;

export const DynamicPricingPage: React.FC = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<PricingFormData>({
    employees: 0,
    revenue: 0,
    sites: 1,
    entities: 1,
    hasScope3: true,
    sector: '',
    selectedModules: ['carbon'],
    academyUsers: 1
  });

  // Check if enterprise mode
  const isEnterprise = useMemo(() => {
    return formData.employees > 250 || formData.revenue > 10000;
  }, [formData.employees, formData.revenue]);

  // Calculate total price - no blocking for enterprise, they can see the price
  const totalPrice = useMemo(() => {
    return calculateTotal(
      formData.selectedModules,
      formData.academyUsers,
      formData.hasScope3,
      formData.entities
    );
  }, [formData.selectedModules, formData.academyUsers, formData.hasScope3, formData.entities]);

  // Calculate completed steps
  const completedSteps = useMemo(() => {
    let completed = 0;
    if (formData.employees > 0) completed++;
    if (formData.revenue > 0) completed++;
    if (formData.sites > 0) completed++;
    if (formData.entities >= 1) completed++;
    if (formData.hasScope3 !== undefined && formData.hasScope3 !== null) completed++;
    if (formData.sector) completed++;
    if (formData.selectedModules.length > 0) completed++;
    return completed;
  }, [formData]);

  const handleFormDataChange = (data: Partial<PricingFormData>) => {
    setFormData(prev => ({ ...prev, ...data }));
  };

  const handleNext = () => {
    if (currentStep < TOTAL_STEPS) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleStepClick = (step: number) => {
    if (step <= completedSteps + 1) {
      setCurrentStep(step);
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return formData.employees > 0;
      case 2:
        return formData.revenue >= 0;
      case 3:
        return formData.sites > 0;
      case 4:
        return formData.entities >= 1;
      case 5:
        return formData.hasScope3 !== undefined && formData.hasScope3 !== null;
      case 6:
        return formData.sector !== '';
      case 7:
        return formData.selectedModules.length > 0;
      default:
        return false;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate('/')}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour à l'accueil
          </Button>
          <h1 className="text-4xl font-bold text-[#0A1A2F] mb-2">
            Configurez votre offre CarboScan
          </h1>
          <p className="text-gray-600 text-lg">
            Répondez à quelques questions pour obtenir un prix personnalisé
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Sidebar - Progress Bar */}
          <div className="lg:col-span-3">
            <Card className="sticky top-8">
              <CardContent className="pt-6">
                <VerticalProgressBar
                  currentStep={completedSteps}
                  totalSteps={TOTAL_STEPS}
                  isEnterprise={isEnterprise}
                />
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-6">
            <div className="space-y-6">
              {/* Step Indicator */}
              <div className="flex items-center justify-between mb-6">
                <span className="text-sm font-medium text-gray-600">
                  Étape {currentStep} sur {TOTAL_STEPS}
                </span>
                <div className="flex gap-2">
                  {Array.from({ length: TOTAL_STEPS }).map((_, index) => {
                    const step = index + 1;
                    const isCompleted = step <= completedSteps;
                    const isCurrent = step === currentStep;
                    return (
                      <button
                        key={step}
                        onClick={() => handleStepClick(step)}
                        className={`w-8 h-8 rounded-full transition-all ${
                          isCompleted
                            ? 'bg-[#009879] text-white'
                            : isCurrent
                            ? 'bg-[#009879]/20 text-[#009879] border-2 border-[#009879]'
                            : 'bg-gray-200 text-gray-400'
                        }`}
                      >
                        {isCompleted ? '✓' : step}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Question Stepper */}
              <QuestionStepper
                currentStep={currentStep}
                formData={formData}
                onFormDataChange={handleFormDataChange}
                isEnterprise={isEnterprise}
              />

              {/* Navigation Buttons */}
              <div className="flex justify-between pt-4">
                <Button
                  variant="outline"
                  onClick={handlePrevious}
                  disabled={currentStep === 1}
                >
                  <ChevronLeft className="w-4 h-4 mr-2" />
                  Précédent
                </Button>
                {currentStep < TOTAL_STEPS ? (
                  <Button
                    onClick={handleNext}
                    disabled={!canProceed()}
                    className="bg-[#009879] hover:bg-[#007a63]"
                  >
                    Suivant
                    <ChevronRight className="w-4 h-4 ml-2" />
                  </Button>
                ) : (
                  <Button
                    onClick={() => {
                      if (isEnterprise) {
                        // Scroll to quote section
                        document.getElementById('quote-section')?.scrollIntoView({ behavior: 'smooth' });
                      } else {
                        // Navigate to payment
                        navigate('/payment', {
                          state: {
                            modules: formData.selectedModules,
                            total: totalPrice,
                            formData
                          }
                        });
                      }
                    }}
                    disabled={!canProceed()}
                    className="bg-[#009879] hover:bg-[#007a63]"
                  >
                    {isEnterprise ? 'Voir l\'accompagnement personnalisé' : 'Procéder au paiement'}
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Right Sidebar - Pricing Display */}
          <div className="lg:col-span-3">
            <div className="sticky top-8">
              {isEnterprise ? (
                <Card className="border-2 border-blue-200 bg-blue-50/50">
                  <CardContent className="pt-6">
                    <div className="text-center space-y-4">
                      <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                        <span className="text-2xl">🏢</span>
                      </div>
                      <h3 className="text-xl font-bold text-blue-700">
                        Profil Entreprise
                      </h3>
                      <p className="text-sm text-gray-700">
                        Accompagnement personnalisé pour votre organisation.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <PricingCalculator
                  selectedModules={formData.selectedModules}
                  modules={defaultModules}
                  totalPrice={totalPrice}
                  isEnterprise={false}
                  entities={formData.entities}
                />
              )}
            </div>
          </div>
        </div>

        {/* Custom Quote Panel - Always show at step 6 if enterprise */}
        {isEnterprise && currentStep === TOTAL_STEPS && (
          <div id="quote-section" className="mt-12 space-y-8">
            {/* Premium Custom Quote Panel */}
            <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 via-white to-blue-50/30 shadow-xl">
              <CardContent className="pt-12 pb-12 px-8">
                <div className="max-w-4xl mx-auto text-center space-y-6">
                  <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                    <span className="text-4xl">💼</span>
                  </div>
                  <h2 className="text-3xl font-bold text-gray-900">
                    Accompagnement personnalisé
                  </h2>
                  <p className="text-lg text-gray-700 leading-relaxed max-w-3xl mx-auto">
                    Votre organisation bénéficie d'un accompagnement personnalisé. Pour garantir une estimation précise et adaptée à votre périmètre, nous vous proposons un échange de 15 minutes avec un expert CarboScan. Remplissez vos informations pour recevoir votre proposition détaillée.
                  </p>
                </div>
              </CardContent>
            </Card>
            
            {/* Enterprise Quote Form */}
            <EnterpriseQuoteSection formData={formData} />
          </div>
        )}
      </div>
    </div>
  );
};

