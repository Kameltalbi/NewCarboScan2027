import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertCircle, ChevronLeft, ChevronRight, SkipForward, HelpCircle } from 'lucide-react';
import { DynamicQuestion, QuestionnaireResponse } from '@/types/dynamicQuestionnaire';
import { useTranslation } from 'react-i18next';

interface QuestionStepProps {
  question: DynamicQuestion;
  response: QuestionnaireResponse | undefined;
  onResponse: (questionId: string, response: QuestionnaireResponse) => void;
  onNext: () => void;
  onPrevious: () => void;
  isFirst: boolean;
  isLast: boolean;
  questionNumber: number;
  totalQuestions: number;
}

export const QuestionStep: React.FC<QuestionStepProps> = ({
  question,
  response,
  onResponse,
  onNext,
  onPrevious,
  isFirst,
  isLast,
  questionNumber,
  totalQuestions
}) => {
  const { t } = useTranslation();
  const [value, setValue] = useState<string>(response?.value?.toString() || '');
  const [hasAnswered, setHasAnswered] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    setValue(response?.value?.toString() || '');
    setHasAnswered(!!response?.value);
  }, [response, question.id]);

  const handleValueChange = (newValue: string) => {
    setValue(newValue);
    const numericValue = parseFloat(newValue) || 0;
    
    if (numericValue >= 0) {
      const questionResponse: QuestionnaireResponse = {
        questionId: question.id,
        value: numericValue,
        unit: question.unit,
        emissionFactorSlug: question.emissionFactorSlug,
      };
      
      onResponse(question.id, questionResponse);
      setHasAnswered(true);
    } else {
      setHasAnswered(false);
    }
  };

  const handleSkip = () => {
    // Create a response with value 0 to indicate skipped
    const questionResponse: QuestionnaireResponse = {
      questionId: question.id,
      value: 0,
      unit: question.unit,
      emissionFactorSlug: question.emissionFactorSlug,
    };
    
    onResponse(question.id, questionResponse);
    onNext();
  };

  const handleNext = () => {
    if (question.required && (!hasAnswered || parseFloat(value) <= 0)) {
      return; // Don't proceed if required question is not answered
    }
    onNext();
  };

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

  const getCategoryColor = (category: string) => {
    const colors = {
      energy: 'bg-yellow-100 border-yellow-300 text-yellow-800',
      transport: 'bg-blue-100 border-blue-300 text-blue-800',
      waste: 'bg-gray-100 border-gray-300 text-gray-800',
      production: 'bg-red-100 border-red-300 text-red-800',
      materials: 'bg-purple-100 border-purple-300 text-purple-800',
      other: 'bg-green-100 border-green-300 text-green-800'
    };
    return colors[category as keyof typeof colors] || 'bg-green-100 border-green-300 text-green-800';
  };

  const getSectorBadge = () => {
    if (!question.sector) return null;
    
    const sectorLabels: { [key: string]: string } = {
      agriculture: 'Agriculture',
      btp: 'BTP',
      textile: 'Textile',
      tourism: 'Tourisme',
      chemicals: 'Chimie',
      gaming: 'Gaming',
      education: 'Éducation',
      finance: 'Finance',
      retail: 'Commerce'
    };

    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
        {sectorLabels[question.sector] || question.sector}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Question Header */}
      <div className="text-center">
        <div className="flex items-center justify-center space-x-4 mb-4">
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getCategoryColor(question.category)}`}>
            <span className="mr-2">{getCategoryIcon(question.category)}</span>
            {question.category.charAt(0).toUpperCase() + question.category.slice(1)}
          </span>
          {getSectorBadge()}
        </div>
        
        <div className="mb-2">
          <span className="text-sm text-gray-500">
            {t("questionnaire.progress.question", { current: questionNumber, total: totalQuestions })}
          </span>
        </div>
        
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          {question.questionText}
        </h2>
        
        {question.required && (
          <div className="flex items-center justify-center text-red-600 text-sm mb-2">
            <AlertCircle className="w-4 h-4 mr-1" />
            {t("questionnaire.questions.required")}
          </div>
        )}
      </div>

      {/* Question Input */}
      <Card className="p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="questionInput" className="text-lg font-medium">
              Votre réponse ({question.unit})
            </Label>
            {question.helpText && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowHelp(!showHelp)}
                className="text-gray-500 hover:text-gray-700"
              >
                <HelpCircle className="w-4 h-4 mr-1" />
                Aide
              </Button>
            )}
          </div>

          {showHelp && question.helpText && (
            <Card className="p-3 bg-blue-50 border-blue-200">
              <p className="text-blue-800 text-sm">{question.helpText}</p>
            </Card>
          )}

          {question.inputType === 'number' && (
            <div className="space-y-2">
              <Input
                id="questionInput"
                type="number"
                min="0"
                step="0.01"
                value={value}
                onChange={(e) => handleValueChange(e.target.value)}
                placeholder={question.placeholder}
                className="text-lg"
              />
              <p className="text-sm text-gray-500">
                Unité: {question.unit}
              </p>
            </div>
          )}

          {question.inputType === 'select' && question.options && (
            <Select value={value} onValueChange={handleValueChange}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionnez une option" />
              </SelectTrigger>
              <SelectContent>
                {question.options.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {hasAnswered && parseFloat(value) > 0 && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-md">
              <p className="text-green-800 text-sm">
                ✓ Réponse enregistrée: {value} {question.unit}
              </p>
            </div>
          )}
        </div>
      </Card>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between pt-4">
        <Button
          variant="outline"
          onClick={onPrevious}
          disabled={isFirst}
          className="flex items-center"
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          Précédent
        </Button>

        <div className="flex items-center space-x-2">
          {!question.required && (
            <Button
              variant="ghost"
              onClick={handleSkip}
              className="flex items-center text-gray-500 hover:text-gray-700"
            >
              <SkipForward className="w-4 h-4 mr-1" />
              Passer
            </Button>
          )}

          <Button
            onClick={handleNext}
            disabled={question.required && (!hasAnswered || parseFloat(value) <= 0)}
            className="flex items-center bg-green-600 hover:bg-green-700 text-white"
          >
            {isLast ? 'Terminer' : 'Suivant'}
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </div>

      {/* Progress indicator */}
      <div className="text-center text-sm text-gray-500">
        {questionNumber} / {totalQuestions} questions répondues
      </div>

      {/* Question details */}
      {process.env.NODE_ENV === 'development' && (
        <Card className="p-3 bg-gray-50 text-xs">
          <details>
            <summary className="cursor-pointer font-semibold">Question Details (Dev)</summary>
            <pre className="mt-2 text-xs">
              {JSON.stringify({
                id: question.id,
                emissionFactorSlug: question.emissionFactorSlug,
                category: question.category,
                sector: question.sector,
                required: question.required
              }, null, 2)}
            </pre>
          </details>
        </Card>
      )}
    </div>
  );
}; 