import React from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VerticalProgressBarProps {
  currentStep: number;
  totalSteps: number;
  isEnterprise: boolean;
}

const steps = [
  'Salariés',
  'Chiffre d\'affaires',
  'Sites',
  'Scope 3',
  'Secteur',
  'Modules'
];

export const VerticalProgressBar: React.FC<VerticalProgressBarProps> = ({
  currentStep,
  totalSteps,
  isEnterprise
}) => {
  const progressPercentage = (currentStep / totalSteps) * 100;

  return (
    <div className="relative flex flex-col items-start h-full min-h-[500px]">
      {/* Progress line */}
      <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200">
        <div
          className="absolute top-0 left-0 w-full transition-all duration-500 ease-out bg-[#009879]"
          style={{ height: `${progressPercentage}%` }}
        />
      </div>

      {/* Steps */}
      <div className="relative z-10 space-y-8">
        {steps.map((step, index) => {
          const stepNumber = index + 1;
          const isCompleted = stepNumber <= currentStep;
          const isCurrent = stepNumber === currentStep;
          const isUpcoming = stepNumber > currentStep;

          return (
            <div key={step} className="flex items-center gap-4">
              {/* Step circle */}
              <div
                className={cn(
                  "relative flex items-center justify-center w-8 h-8 rounded-full border-2 transition-all duration-300",
                  isCompleted && "bg-[#009879] border-[#009879]",
                  isCurrent && !isCompleted && "border-[#009879] bg-white",
                  isUpcoming && "border-gray-300 bg-white"
                )}
              >
                {isCompleted ? (
                  <Check className="w-5 h-5 text-white" />
                ) : (
                  <span
                    className={cn(
                      "text-sm font-semibold",
                      isCurrent ? "text-[#009879]" : "text-gray-400"
                    )}
                  >
                    {stepNumber}
                  </span>
                )}
              </div>

              {/* Step label */}
              <div className="flex flex-col">
                <span
                  className={cn(
                    "text-sm font-medium transition-colors",
                    isCompleted || isCurrent
                      ? "text-gray-900"
                      : "text-gray-400"
                  )}
                >
                  {step}
                </span>
                {isEnterprise && stepNumber === 1 && (
                  <span className="text-xs text-blue-600 font-medium mt-1">
                    Accompagnement personnalisé
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

