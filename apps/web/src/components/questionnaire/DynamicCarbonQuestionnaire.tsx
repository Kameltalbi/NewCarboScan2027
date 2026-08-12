import React, { useState, useEffect } from 'react';
import { logger } from '@/utils/logger';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { DynamicQuestionnaireState, DynamicQuestion, QuestionnaireResponse, CompanyInfo, ContactInfo } from '@/types/dynamicQuestionnaire';
import { DynamicEmissionFactorsService } from '@/lib/dynamicEmissionFactorsService';
import { DynamicCarbonCalculator, DynamicEmissionsResult } from '@/lib/dynamicCarbonCalculations';
import { COUNTRIES, SECTORS, getTranslatedDefaultQuestions, SECTOR_QUESTIONS, SECTOR_MAPPINGS } from '@/lib/dynamicQuestionnaireConfig';
import { AssessmentUsageGuard } from '@/components/guards/AssessmentUsageGuard';
import { useAssessmentUsage } from '@/hooks/useAssessmentUsage';

// Import step components
import { CompanyInfoStep } from './steps/CompanyInfoStep';
import { QuestionStep } from './steps/QuestionStep';
import { SummaryStep } from './steps/SummaryStep';
import { ContactStep } from './steps/ContactStep';
import { ResultsStep } from './steps/ResultsStep';

export const DynamicCarbonQuestionnaire: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [state, setState] = useState<DynamicQuestionnaireState>({
    currentStep: 'company-info',
    currentQuestionIndex: 0,
    companyInfo: {},
    responses: {},
    contactInfo: {},
    generatedQuestions: [],
    emissionFactors: {},
    isLoading: false,
    errors: {}
  });

  const [results, setResults] = useState<DynamicEmissionsResult | null>(null);
  const { incrementUsage } = useAssessmentUsage();

  /**
   * Generate questions based on selected sectors
   */
  const generateQuestionsForSectors = (sectors: string[]): DynamicQuestion[] => {
    const questions: DynamicQuestion[] = [...getTranslatedDefaultQuestions(t)];
    
    // Add sector-specific questions
    sectors.forEach(sectorId => {
      const sectorQuestions = SECTOR_QUESTIONS[sectorId] || [];
      questions.push(...sectorQuestions);
    });

    return questions;
  };

  /**
   * Handle company info submission and generate questions
   */
  const handleCompanyInfoSubmit = async (companyInfo: CompanyInfo) => {
    setState(prev => ({ ...prev, isLoading: true, companyInfo }));

    try {
      // Generate questions based on selected sectors
      const generatedQuestions = generateQuestionsForSectors(companyInfo.sectors);
      
      // Get all required emission factor slugs
      const requiredSlugs = generatedQuestions.map(q => q.emissionFactorSlug);
      
      // Fetch emission factors from Supabase
      const emissionFactors = await DynamicEmissionFactorsService.fetchEmissionFactorsBySlugs(requiredSlugs);
      
      // Validate that we have all required emission factors
      const validation = await DynamicEmissionFactorsService.validateEmissionFactors(requiredSlugs);
      
      if (!validation.valid && validation.missing.length > 0) {
        logger.warn('Missing emission factors:', validation.missing);
        toast.warning(`Certains facteurs d'émission sont manquants: ${validation.missing.join(', ')}`);
      }

      setState(prev => ({
        ...prev,
        generatedQuestions,
        emissionFactors,
        currentStep: 'questions',
        isLoading: false
      }));

      toast.success(`Questionnaire généré avec ${generatedQuestions.length} questions pour vos secteurs d'activité.`);
    } catch (error) {
      console.error('Error generating questionnaire:', error);
      toast.error('Erreur lors de la génération du questionnaire. Veuillez réessayer.');
      setState(prev => ({ ...prev, isLoading: false }));
    }
  };

  /**
   * Handle question response
   */
  const handleQuestionResponse = (questionId: string, response: QuestionnaireResponse) => {
    setState(prev => ({
      ...prev,
      responses: {
        ...prev.responses,
        [questionId]: response
      }
    }));
  };

  /**
   * Navigate to next question or step
   */
  const handleNextQuestion = () => {
    setState(prev => {
      if (prev.currentQuestionIndex < prev.generatedQuestions.length - 1) {
        return {
          ...prev,
          currentQuestionIndex: prev.currentQuestionIndex + 1
        };
      } else {
        return {
          ...prev,
          currentStep: 'summary'
        };
      }
    });
  };

  /**
   * Navigate to previous question
   */
  const handlePreviousQuestion = () => {
    setState(prev => {
      if (prev.currentQuestionIndex > 0) {
        return {
          ...prev,
          currentQuestionIndex: prev.currentQuestionIndex - 1
        };
      } else {
        return {
          ...prev,
          currentStep: 'company-info'
        };
      }
    });
  };

  /**
   * Handle summary confirmation and move to contact
   */
  const handleSummaryConfirm = () => {
    setState(prev => ({ ...prev, currentStep: 'contact' }));
  };

  /**
   * Handle contact info submission and calculate results
   */
  const handleContactSubmit = async (contactInfo: ContactInfo) => {
    setState(prev => ({ ...prev, isLoading: true, contactInfo }));

    try {
      // First, increment the usage count
      const usageIncremented = await incrementUsage();
      
      if (!usageIncremented) {
        toast.error('Impossible de créer une nouvelle évaluation. Limite atteinte ou abonnement inactif.');
        setState(prev => ({ ...prev, isLoading: false }));
        return;
      }

      // Calculate emissions
      const calculator = new DynamicCarbonCalculator(state.emissionFactors);
      const calculationResults = calculator.calculateEmissions(state.responses, state.generatedQuestions);

      setResults(calculationResults);
      setState(prev => ({
        ...prev,
        currentStep: 'results',
        isLoading: false
      }));

      toast.success('Bilan carbone calculé avec succès !');
    } catch (error) {
      console.error('Error calculating emissions:', error);
      toast.error('Erreur lors du calcul des émissions. Veuillez réessayer.');
      setState(prev => ({ ...prev, isLoading: false }));
    }
  };

  /**
   * Calculate progress percentage
   */
  const getProgressPercentage = (): number => {
    switch (state.currentStep) {
      case 'company-info':
        return 10;
      case 'questions':
        const questionProgress = (state.currentQuestionIndex / Math.max(state.generatedQuestions.length, 1)) * 70;
        return 10 + questionProgress;
      case 'summary':
        return 85;
      case 'contact':
        return 95;
      case 'results':
        return 100;
      default:
        return 0;
    }
  };

  /**
   * Get step title
   */
  const getStepTitle = (): string => {
    switch (state.currentStep) {
      case 'company-info':
        return 'Informations de l\'entreprise';
      case 'questions':
        return `Question ${state.currentQuestionIndex + 1} sur ${state.generatedQuestions.length}`;
      case 'summary':
        return 'Récapitulatif de vos réponses';
      case 'contact':
        return 'Informations de contact';
      case 'results':
        return 'Résultats de votre bilan carbone';
      default:
        return 'Bilan Carbone Dynamique';
    }
  };

  return (
    <AssessmentUsageGuard showUsageInfo={true}>
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 py-8">
        <div className="container mx-auto px-4 max-w-4xl">
        {/* Header with progress */}
        <div className="mb-8">
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              CarboScan - Bilan Carbone Dynamique
            </h1>
            <p className="text-gray-600">
              {getStepTitle()}
            </p>
          </div>
          
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>Progression</span>
              <span>{Math.round(getProgressPercentage())}%</span>
            </div>
            <Progress value={getProgressPercentage()} className="h-2" />
          </div>
        </div>

        {/* Main content */}
        <Card className="p-6">
          {state.isLoading && (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
              <span className="ml-2 text-gray-600">Chargement...</span>
            </div>
          )}

          {!state.isLoading && (
            <>
              {state.currentStep === 'company-info' && (
                <CompanyInfoStep
                  companyInfo={state.companyInfo}
                  onSubmit={handleCompanyInfoSubmit}
                  errors={state.errors}
                  countries={COUNTRIES}
                  sectors={SECTORS}
                />
              )}

              {state.currentStep === 'questions' && state.generatedQuestions[state.currentQuestionIndex] && (
                <QuestionStep
                  question={state.generatedQuestions[state.currentQuestionIndex]}
                  response={state.responses[state.generatedQuestions[state.currentQuestionIndex].id]}
                  onResponse={handleQuestionResponse}
                  onNext={handleNextQuestion}
                  onPrevious={handlePreviousQuestion}
                  isFirst={state.currentQuestionIndex === 0}
                  isLast={state.currentQuestionIndex === state.generatedQuestions.length - 1}
                  questionNumber={state.currentQuestionIndex + 1}
                  totalQuestions={state.generatedQuestions.length}
                />
              )}

              {state.currentStep === 'summary' && (
                <SummaryStep
                  companyInfo={state.companyInfo as CompanyInfo}
                  questions={state.generatedQuestions}
                  responses={state.responses}
                  emissionFactors={state.emissionFactors}
                  onConfirm={handleSummaryConfirm}
                  onBack={() => setState(prev => ({ 
                    ...prev, 
                    currentStep: 'questions',
                    currentQuestionIndex: prev.generatedQuestions.length - 1
                  }))}
                />
              )}

              {state.currentStep === 'contact' && (
                <ContactStep
                  contactInfo={state.contactInfo}
                  onSubmit={handleContactSubmit}
                  onBack={() => setState(prev => ({ ...prev, currentStep: 'summary' }))}
                  errors={state.errors}
                />
              )}

              {state.currentStep === 'results' && results && (
                <ResultsStep
                  responses={Object.fromEntries(
                    Object.entries(state.responses).map(([key, response]) => [
                      key, 
                      response.value
                    ])
                  )}
                  questions={state.generatedQuestions.map(q => ({
                    id: q.id,
                    text: q.questionText,
                    type: q.inputType,
                    required: q.required || false
                  }))}
                  planType="dynamic"
                  onGenerateReport={() => navigate('/empreinte-produit-report')}
                />
              )}
            </>
          )}
        </Card>

        {/* Debug info (remove in production) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-8 p-4 bg-gray-100 rounded-lg text-xs">
            <details>
              <summary className="cursor-pointer font-semibold">Debug Info</summary>
              <pre className="mt-2 overflow-auto">
                {JSON.stringify(
                  {
                    currentStep: state.currentStep,
                    currentQuestionIndex: state.currentQuestionIndex,
                    questionsCount: state.generatedQuestions.length,
                    responsesCount: Object.keys(state.responses).length,
                    emissionFactorsCount: Object.keys(state.emissionFactors).length
                  },
                  null,
                  2
                )}
              </pre>
            </details>
          </div>
        )}
        </div>
      </div>
    </AssessmentUsageGuard>
  );
}; 