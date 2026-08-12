import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface SimpleQuestion {
  id: string;
  text: string;
  type: string;
  scope?: number;
  required: boolean;
  options?: string[];
}

interface SimpleQuestionStepProps {
  question: SimpleQuestion;
  responses: Record<string, any>;
  onResponseChange: (questionId: string, value: any) => void;
  onNext: () => void;
  onPrevious: () => void;
  canGoNext: boolean;
  canGoPrevious: boolean;
}

export const SimpleQuestionStep: React.FC<SimpleQuestionStepProps> = ({
  question,
  responses,
  onResponseChange,
  onNext,
  onPrevious,
  canGoNext,
  canGoPrevious
}) => {
  const { t } = useTranslation();
  const currentValue = responses[question.id] || '';

  const handleValueChange = (value: string) => {
    onResponseChange(question.id, value);
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-bold mb-4">{question.text}</h2>
      </div>

      <div className="space-y-4">
        {question.type === 'text' && (
          <div>
            <Label htmlFor="input">{t("questionnaire.questions.labels.yourAnswer")}</Label>
            <Input
              id="input"
              value={currentValue}
              onChange={(e) => handleValueChange(e.target.value)}
              placeholder={t("questionnaire.questions.labels.enterAnswer")}
            />
          </div>
        )}

        {question.type === 'number' && (
          <div>
            <Label htmlFor="input">{t("questionnaire.questions.labels.yourAnswer")}</Label>
            <Input
              id="input"
              type="number"
              value={currentValue}
              onChange={(e) => handleValueChange(e.target.value)}
              placeholder="0"
            />
          </div>
        )}

        {question.type === 'select' && question.options && (
          <div>
            <Label htmlFor="select">{t("questionnaire.questions.labels.selectOption")}</Label>
            <Select value={currentValue} onValueChange={handleValueChange}>
              <SelectTrigger>
                <SelectValue placeholder={t("questionnaire.questions.labels.choose")} />
              </SelectTrigger>
              <SelectContent>
                {question.options.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <div className="flex flex-col-reverse sm:flex-row justify-between gap-3">
        <Button
          variant="outline"
          onClick={onPrevious}
          disabled={!canGoPrevious}
          className="w-full sm:w-auto"
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          Précédent
        </Button>

        <Button
          onClick={onNext}
          disabled={!canGoNext}
          className="w-full sm:w-auto"
        >
          Suivant
          <ChevronRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
};