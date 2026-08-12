import React, { useState, useEffect } from 'react';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, Zap, BarChart3, FileText, Sparkles, Brain, Circle } from 'lucide-react';

interface ReportLoadingProgressProps {
  isLoading: boolean;
}

interface LoadingStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  duration: number; // en millisecondes
}

const loadingSteps: LoadingStep[] = [
  {
    id: 'analysis',
    title: 'Analyse des données',
    description: 'Traitement de vos données carbone...',
    icon: <BarChart3 className="w-5 h-5" />,
    duration: 2000
  },
  {
    id: 'calculation',
    title: 'Calculs d\'émissions',
    description: 'Application des facteurs d\'émission...',
    icon: <Zap className="w-5 h-5" />,
    duration: 1500
  },
  {
    id: 'ai_generation',
    title: 'Génération IA',
    description: 'Rédaction du contenu personnalisé...',
    icon: <Brain className="w-5 h-5" />,
    duration: 4000
  },
  {
    id: 'formatting',
    title: 'Finalisation',
    description: 'Mise en forme du rapport professionnel...',
    icon: <FileText className="w-5 h-5" />,
    duration: 1000
  }
];

export const ReportLoadingProgress: React.FC<ReportLoadingProgressProps> = ({ isLoading }) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);

  useEffect(() => {
    if (!isLoading) {
      setProgress(100);
      setCompletedSteps(loadingSteps.map(step => step.id));
      return;
    }

    let totalDuration = 0;
    let stepStartTime = 0;

    const runSteps = async () => {
      for (let i = 0; i < loadingSteps.length; i++) {
        const step = loadingSteps[i];
        setCurrentStepIndex(i);
        
        // Animation de progression pour cette étape
        const stepDuration = step.duration;
        const startProgress = (totalDuration / 8500) * 100; // 8500ms total approximatif
        const endProgress = ((totalDuration + stepDuration) / 8500) * 100;
        
        const progressInterval = setInterval(() => {
          setProgress(prev => {
            const newProgress = Math.min(prev + 0.5, endProgress);
            return newProgress;
          });
        }, 50);

        // Attendre la durée de l'étape
        await new Promise(resolve => setTimeout(resolve, stepDuration));
        
        clearInterval(progressInterval);
        setProgress(endProgress);
        setCompletedSteps(prev => [...prev, step.id]);
        totalDuration += stepDuration;
      }
    };

    runSteps();
  }, [isLoading]);

  if (!isLoading) return null;

  const currentStep = loadingSteps[currentStepIndex];

  const progressPercent = Math.round(progress);

  return (
    <div className="fixed inset-0 bg-gray-50 flex items-center justify-center p-2 sm:p-4 z-50 overflow-y-auto">
      <div className="max-w-2xl w-full bg-white rounded-lg shadow-lg p-4 sm:p-6 md:p-8 my-4">
        {/* Header */}
        <div className="text-center mb-6 sm:mb-8">
          <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4" style={{ backgroundColor: '#e6f7f5' }}>
            <Sparkles className="h-6 w-6 sm:h-8 sm:w-8" style={{ color: '#0f766e' }} />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
            Génération de votre rapport
          </h1>
          <p className="text-sm sm:text-base text-gray-600 px-2">
            CarboScan analyse vos données et génère un rapport personnalisé
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-6 sm:mb-8">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs sm:text-sm font-medium text-gray-700">Progression</span>
            <span className="text-xs sm:text-sm font-medium" style={{ color: '#0f766e' }}>{progressPercent}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="h-2 rounded-full transition-all duration-500"
              style={{ width: `${progress}%`, backgroundColor: '#0f766e' }}
            ></div>
          </div>
        </div>

        {/* Steps */}
        <div className="space-y-3 sm:space-y-4 mb-6 sm:mb-8">
          {loadingSteps.map((step, index) => {
            const isCompleted = completedSteps.includes(step.id);
            const isCurrent = index === currentStepIndex;
            const isPending = index > currentStepIndex;

            return (
              <div
                key={step.id}
                className={`flex items-center space-x-3 sm:space-x-4 p-3 sm:p-4 rounded-lg ${
                  isCompleted
                    ? 'bg-green-50'
                    : isCurrent
                    ? 'bg-blue-50'
                    : 'bg-gray-50'
                }`}
              >
                <div className="flex-shrink-0">
                  {isCompleted ? (
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: '#0f766e' }}>
                      <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                    </div>
                  ) : isCurrent ? (
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: '#0f766e' }}>
                      <div className="animate-spin rounded-full h-4 w-4 sm:h-5 sm:w-5 border-b-2 border-white"></div>
                    </div>
                  ) : (
                    <div className="w-7 h-7 sm:w-8 sm:h-8 bg-gray-200 rounded-full flex items-center justify-center">
                      <Circle className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm sm:text-base font-semibold text-gray-900">{step.title}</h3>
                  <p className="text-xs sm:text-sm text-gray-600">
                    {step.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Status message */}
        <div className="text-center text-gray-600">
          <p className="text-xs sm:text-sm">Votre rapport sera prêt dans quelques instants...</p>
        </div>
      </div>
    </div>
  );
};