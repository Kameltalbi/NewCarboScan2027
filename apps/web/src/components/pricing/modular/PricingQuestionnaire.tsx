import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { ArrowRight, Users, MapPin, MessageCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface QuestionnaireData {
  employees: 'less-250' | 'more-250' | null;
  sites: '1' | 'multiple' | null;
  contact: 'yes' | 'no' | null;
}

interface PricingQuestionnaireProps {
  onComplete: (data: QuestionnaireData) => void;
}

export const PricingQuestionnaire: React.FC<PricingQuestionnaireProps> = ({ onComplete }) => {
  const { t } = useTranslation();
  const [step, setStep] = useState(1);
  const [data, setData] = useState<QuestionnaireData>({
    employees: null,
    sites: null,
    contact: null,
  });

  const handleNext = () => {
    if (step < 3) {
      setStep(step + 1);
    } else {
      onComplete(data);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const isStepComplete = () => {
    switch (step) {
      case 1:
        return data.employees !== null;
      case 2:
        return data.sites !== null;
      case 3:
        return data.contact !== null;
      default:
        return false;
    }
  };

  const isCustomQuote = () => {
    return data.employees === 'more-250' || data.sites === 'multiple';
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl border-2 border-[#00B8C9] shadow-2xl">
        <CardHeader className="bg-gradient-to-r from-[#003B73] to-[#004B87] text-white rounded-t-lg">
          <CardTitle className="text-2xl font-bold text-center">
            {t('pricing.modular.questionnaire.title')}
          </CardTitle>
          <p className="text-center text-white/90 mt-2">
            {t('pricing.modular.questionnaire.subtitle')}
          </p>
        </CardHeader>
        <CardContent className="pt-8 pb-6">
          {/* Step 1: Employees */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="flex items-center justify-center mb-6">
                <div className="w-16 h-16 bg-[#00B8C9]/20 rounded-full flex items-center justify-center">
                  <Users className="h-8 w-8 text-[#003B73]" />
                </div>
              </div>
              <Label className="text-xl font-semibold text-gray-900 block text-center mb-4">
                {t('pricing.modular.questionnaire.step1.question')}
              </Label>
              <RadioGroup
                value={data.employees || ''}
                onValueChange={(value) => setData({ ...data, employees: value as 'less-250' | 'more-250' })}
                className="space-y-4"
              >
                <div className="flex items-center space-x-3 p-4 border-2 rounded-lg hover:border-[#00B8C9] transition-colors">
                  <RadioGroupItem value="less-250" id="less-250" />
                  <Label htmlFor="less-250" className="flex-1 cursor-pointer text-lg">
                    {t('pricing.modular.questionnaire.step1.option1')}
                  </Label>
                </div>
                <div className="flex items-center space-x-3 p-4 border-2 rounded-lg hover:border-[#00B8C9] transition-colors">
                  <RadioGroupItem value="more-250" id="more-250" />
                  <Label htmlFor="more-250" className="flex-1 cursor-pointer text-lg">
                    {t('pricing.modular.questionnaire.step1.option2')}
                  </Label>
                </div>
              </RadioGroup>
            </div>
          )}

          {/* Step 2: Sites */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="flex items-center justify-center mb-6">
                <div className="w-16 h-16 bg-[#00B8C9]/20 rounded-full flex items-center justify-center">
                  <MapPin className="h-8 w-8 text-[#003B73]" />
                </div>
              </div>
              <Label className="text-xl font-semibold text-gray-900 block text-center mb-4">
                {t('pricing.modular.questionnaire.step2.question')}
              </Label>
              <RadioGroup
                value={data.sites || ''}
                onValueChange={(value) => setData({ ...data, sites: value as '1' | 'multiple' })}
                className="space-y-4"
              >
                <div className="flex items-center space-x-3 p-4 border-2 rounded-lg hover:border-[#00B8C9] transition-colors">
                  <RadioGroupItem value="1" id="1-site" />
                  <Label htmlFor="1-site" className="flex-1 cursor-pointer text-lg">
                    {t('pricing.modular.questionnaire.step2.option1')}
                  </Label>
                </div>
                <div className="flex items-center space-x-3 p-4 border-2 rounded-lg hover:border-[#00B8C9] transition-colors">
                  <RadioGroupItem value="multiple" id="multiple-sites" />
                  <Label htmlFor="multiple-sites" className="flex-1 cursor-pointer text-lg">
                    {t('pricing.modular.questionnaire.step2.option2')}
                  </Label>
                </div>
              </RadioGroup>
            </div>
          )}

          {/* Step 3: Contact */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="flex items-center justify-center mb-6">
                <div className="w-16 h-16 bg-[#00B8C9]/20 rounded-full flex items-center justify-center">
                  <MessageCircle className="h-8 w-8 text-[#003B73]" />
                </div>
              </div>
              <Label className="text-xl font-semibold text-gray-900 block text-center mb-4">
                {t('pricing.modular.questionnaire.step3.question')}
              </Label>
              <RadioGroup
                value={data.contact || ''}
                onValueChange={(value) => setData({ ...data, contact: value as 'yes' | 'no' })}
                className="space-y-4"
              >
                <div className="flex items-center space-x-3 p-4 border-2 rounded-lg hover:border-[#00B8C9] transition-colors">
                  <RadioGroupItem value="yes" id="yes-contact" />
                  <Label htmlFor="yes-contact" className="flex-1 cursor-pointer text-lg">
                    {t('pricing.modular.questionnaire.step3.option1')}
                  </Label>
                </div>
                <div className="flex items-center space-x-3 p-4 border-2 rounded-lg hover:border-[#00B8C9] transition-colors">
                  <RadioGroupItem value="no" id="no-contact" />
                  <Label htmlFor="no-contact" className="flex-1 cursor-pointer text-lg">
                    {t('pricing.modular.questionnaire.step3.option2')}
                  </Label>
                </div>
              </RadioGroup>
            </div>
          )}

          {/* Navigation buttons */}
          <div className="flex justify-between mt-8">
            {step > 1 && (
              <Button
                variant="outline"
                onClick={handleBack}
                className="border-[#003B73] text-[#003B73] hover:bg-[#003B73]/10"
              >
                {t('common.previous')}
              </Button>
            )}
            <div className="flex-1" />
            <Button
              onClick={handleNext}
              disabled={!isStepComplete()}
              className="bg-[#003B73] hover:bg-[#004B87] text-white"
            >
              {step === 3 ? t('pricing.modular.questionnaire.complete') : t('common.next')}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>

          {/* Progress indicator */}
          <div className="flex justify-center gap-2 mt-6">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`h-2 w-2 rounded-full ${
                  s <= step ? 'bg-[#00B8C9]' : 'bg-gray-300'
                }`}
              />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

