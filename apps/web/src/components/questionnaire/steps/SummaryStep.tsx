import React from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ChevronLeft, ChevronRight, Edit } from 'lucide-react';
import { CompanyInfo, DynamicQuestion, QuestionnaireResponse, EmissionFactor } from '@/types/dynamicQuestionnaire';

interface SummaryStepProps {
  companyInfo: CompanyInfo;
  questions: DynamicQuestion[];
  responses: { [questionId: string]: QuestionnaireResponse };
  emissionFactors: { [slug: string]: EmissionFactor };
  onConfirm: () => void;
  onBack: () => void;
}

export const SummaryStep: React.FC<SummaryStepProps> = ({
  companyInfo,
  questions,
  responses,
  emissionFactors,
  onConfirm,
  onBack
}) => {
  const answeredQuestions = questions.filter(q => responses[q.id] && responses[q.id].value > 0);
  const totalQuestions = questions.length;

  const getCategoryIcon = (category: string) => {
    const icons = {
      energy: '⚡',
      transport: '🚗',
      waste: '🗑️',
      production: '🏭',
      materials: '📦',
      other: '📊'
    };
    return icons[category as keyof typeof icons] || <span>📊</span>;
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Récapitulatif de vos réponses
        </h2>
        <p className="text-gray-600">
          Vérifiez vos informations avant de continuer vers le calcul de votre bilan carbone.
        </p>
      </div>

      {/* Company Info Summary */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Informations de l'entreprise</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <span className="font-medium">Entreprise:</span> {companyInfo.companyName}
          </div>
          <div>
            <span className="font-medium">Pays:</span> {companyInfo.country}
          </div>
          <div>
            <span className="font-medium">Employés:</span> {companyInfo.numberOfEmployees}
          </div>
          <div>
            <span className="font-medium">Surface:</span> {companyInfo.surfaceArea} m²
          </div>
          <div className="md:col-span-2">
            <span className="font-medium">Secteurs:</span> {companyInfo.sectors.join(', ')}
          </div>
        </div>
      </Card>

      {/* Questions Summary */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Vos réponses</h3>
          <span className="text-sm text-gray-500">
            {answeredQuestions.length} / {totalQuestions} questions répondues
          </span>
        </div>

        <div className="space-y-3 max-h-64 overflow-y-auto">
          {answeredQuestions.map((question) => {
            const response = responses[question.id];
            const emissionFactor = emissionFactors[question.emissionFactorSlug];
            const estimatedEmissions = emissionFactor ? response.value * emissionFactor.emission_factor : 0;

            return (
              <div key={question.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <span>{getCategoryIcon(question.category)}</span>
                    <span className="font-medium text-sm">{question.questionText}</span>
                  </div>
                  <div className="text-sm text-gray-600">
                    {response.value} {response.unit}
                    {estimatedEmissions > 0 && (
                      <span className="ml-2 text-green-600">
                        ≈ {estimatedEmissions.toFixed(1)} kg CO₂e
                      </span>
                    )}
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={onBack}>
                  <Edit className="w-4 h-4" />
                </Button>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-4">
        <Button variant="outline" onClick={onBack} className="flex items-center">
          <ChevronLeft className="w-4 h-4 mr-1" />
          Modifier les réponses
        </Button>

        <Button
          onClick={onConfirm}
          className="flex items-center bg-green-600 hover:bg-green-700 text-white"
        >
          Continuer
          <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}; 