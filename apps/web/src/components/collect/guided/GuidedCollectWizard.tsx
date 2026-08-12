// Wizard de collecte guidée par sections
import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { CheckCircle2, ChevronRight, ArrowLeft, ArrowRight } from 'lucide-react';
import { COLLECT_SECTIONS, CollectSection } from '@/types/collectSections';
import { COLLECT_QUESTIONS, CollectQuestion } from '@/types/collectQuestions';
import { GuidedCollectSection } from './GuidedCollectSection';

interface GuidedCollectWizardProps {
  sessionId: string;
  responses: Array<{
    question_key: string;
    value: any;
    unit?: string | null;
  }>;
  onSave: (questionKey: string, value: any, options?: any) => Promise<boolean>;
}

export const GuidedCollectWizard: React.FC<GuidedCollectWizardProps> = ({
  sessionId,
  responses,
  onSave,
}) => {
  const [activeSectionIndex, setActiveSectionIndex] = useState(0);
  
  // Calculer les questions par section
  const sectionData = useMemo(() => {
    return COLLECT_SECTIONS.map(section => {
      const questions = COLLECT_QUESTIONS.filter(q => 
        section.categories.includes(q.category)
      );
      
      const answeredQuestions = questions.filter(q => {
        const response = responses.find(r => r.question_key === q.key);
        return response && response.value !== null && response.value !== undefined && response.value !== '';
      });
      
      return {
        section,
        questions,
        answered: answeredQuestions.length,
        total: questions.length,
        progress: questions.length > 0 ? (answeredQuestions.length / questions.length) * 100 : 0,
        isComplete: questions.length > 0 && answeredQuestions.length === questions.length,
      };
    });
  }, [responses]);

  const activeSection = sectionData[activeSectionIndex];
  const totalProgress = sectionData.reduce((acc, s) => acc + s.answered, 0);
  const totalQuestions = sectionData.reduce((acc, s) => acc + s.total, 0);
  const overallProgress = totalQuestions > 0 ? (totalProgress / totalQuestions) * 100 : 0;

  const goToNext = () => {
    if (activeSectionIndex < COLLECT_SECTIONS.length - 1) {
      setActiveSectionIndex(activeSectionIndex + 1);
    }
  };

  const goToPrevious = () => {
    if (activeSectionIndex > 0) {
      setActiveSectionIndex(activeSectionIndex - 1);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* Sidebar avec navigation par sections */}
      <div className="lg:col-span-1">
        <Card className="sticky top-4">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Progression globale</CardTitle>
            <div className="mt-2">
              <Progress value={overallProgress} className="h-2" />
              <p className="text-xs text-muted-foreground mt-1">
                {totalProgress} / {totalQuestions} questions
              </p>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[400px]">
              <div className="space-y-1 p-2">
                {sectionData.map((data, index) => {
                  const Icon = data.section.icon;
                  const isActive = index === activeSectionIndex;
                  
                  return (
                    <button
                      key={data.section.id}
                      onClick={() => setActiveSectionIndex(index)}
                      className={cn(
                        "w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors",
                        isActive 
                          ? "bg-primary/10 text-primary" 
                          : "hover:bg-muted"
                      )}
                    >
                      <div className={cn(
                        "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
                        data.isComplete ? "bg-green-100 text-green-600" : data.section.color + "/10"
                      )}>
                        {data.isComplete ? (
                          <CheckCircle2 className="h-4 w-4" />
                        ) : (
                          <Icon className={cn("h-4 w-4", isActive ? "text-primary" : "text-muted-foreground")} />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={cn(
                          "text-sm font-medium truncate",
                          isActive && "text-primary"
                        )}>
                          {data.section.label}
                        </p>
                        <div className="flex items-center gap-2">
                          <Progress value={data.progress} className="h-1 flex-1" />
                          <span className="text-xs text-muted-foreground">
                            {data.answered}/{data.total}
                          </span>
                        </div>
                      </div>
                      {isActive && (
                        <ChevronRight className="h-4 w-4 text-primary" />
                      )}
                    </button>
                  );
                })}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Contenu principal - Section active */}
      <div className="lg:col-span-3 space-y-4">
        {activeSection && (
          <>
            <GuidedCollectSection
              section={activeSection.section}
              questions={activeSection.questions}
              responses={responses}
              onSave={onSave}
              progress={activeSection.progress}
              answeredCount={activeSection.answered}
            />
            
            {/* Navigation entre sections */}
            <div className="flex items-center justify-between pt-4">
              <Button
                variant="outline"
                onClick={goToPrevious}
                disabled={activeSectionIndex === 0}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Section précédente
              </Button>
              
              <div className="flex items-center gap-2">
                {sectionData.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setActiveSectionIndex(index)}
                    className={cn(
                      "w-2 h-2 rounded-full transition-colors",
                      index === activeSectionIndex 
                        ? "bg-primary" 
                        : sectionData[index].isComplete 
                          ? "bg-green-500" 
                          : "bg-muted-foreground/30"
                    )}
                  />
                ))}
              </div>
              
              <Button
                onClick={goToNext}
                disabled={activeSectionIndex === COLLECT_SECTIONS.length - 1}
              >
                Section suivante
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
