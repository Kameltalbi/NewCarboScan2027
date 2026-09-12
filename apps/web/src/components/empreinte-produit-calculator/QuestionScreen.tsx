import React from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowRight, Leaf } from "lucide-react";
import { QuestionItem, SurveyData } from "./types";

const SECTION_TIP_KEYS = [
  "carbonCalculator.sidebar.tips.entreprise",
  "carbonCalculator.sidebar.tips.energie",
  "carbonCalculator.sidebar.tips.flotte",
  "carbonCalculator.sidebar.tips.deplacements",
  "carbonCalculator.sidebar.tips.achats",
  "carbonCalculator.sidebar.tips.dechets",
];

interface QuestionScreenProps {
  question: QuestionItem;
  value: any;
  onChange: (value: any) => void;
  onNext: () => void;
  onPrevious: () => void;
  isFirstQuestion: boolean;
}

export const QuestionScreen: React.FC<QuestionScreenProps> = ({
  question, value, onChange,
}) => {
  const { t } = useTranslation();
  return (
    <div className="max-w-2xl mx-auto py-12 px-6">
      <h2 className="text-2xl font-semibold text-foreground mb-2">{question.question}</h2>
      {question.description && <p className="text-muted-foreground text-sm mb-8">{question.description}</p>}
      <div className="space-y-8">
        {question.type === "select" ? (
          <Select onValueChange={onChange} value={value || ""}>
            <SelectTrigger className="w-full h-12 text-base border-border/60 bg-background">
              <SelectValue placeholder={t("carbonCalculator.questions.selectPlaceholder")} />
            </SelectTrigger>
            <SelectContent className="bg-white z-50">
              {question.options?.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
        ) : (
          <Input type="number" value={value || ""} onChange={(e) => onChange(e.target.value)} placeholder={t("carbonCalculator.questions.inputPlaceholder")} className="h-12 text-base border-border/60" />
        )}
      </div>
    </div>
  );
};

interface GroupedQuestionScreenProps {
  sectionTitle: string;
  questions: QuestionItem[];
  surveyData: SurveyData;
  onUpdateField: (questionId: string, value: any) => void;
  onNext: () => void;
  onPrevious: () => void;
  isFirstSection: boolean;
  isLastSection: boolean;
  currentSectionIndex: number;
  totalSections: number;
}

export const GroupedQuestionScreen: React.FC<GroupedQuestionScreenProps> = ({
  sectionTitle, questions, surveyData, onUpdateField, onNext, onPrevious, isFirstSection, isLastSection, currentSectionIndex, totalSections,
}) => {
  const { t } = useTranslation();

  const visibleQuestions = questions.filter((q) => {
    if (!q.conditional) return true;
    const dependencyValue = surveyData[q.conditional.dependsOn as keyof SurveyData];
    return q.conditional.showWhen.includes(dependencyValue as string);
  });

  const renderFields = () => {
    const elements: React.ReactNode[] = [];
    let i = 0;
    while (i < visibleQuestions.length) {
      const q = visibleQuestions[i];
      const nextQ = visibleQuestions[i + 1];
      const value = surveyData[q.id as keyof SurveyData];

      if (q.type === "number" && nextQ?.type === "number") {
        const nextValue = surveyData[nextQ.id as keyof SurveyData];
        elements.push(
          <div key={q.id} className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">{q.question}</label>
              <Input
                type="number"
                value={(value as string | number) || ""}
                onChange={(e) => onUpdateField(q.id, e.target.value)}
                placeholder={t("carbonCalculator.questions.inputPlaceholder")}
                className="h-11 border-border/60"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">{nextQ.question}</label>
              <Input
                type="number"
                value={(nextValue as string | number) || ""}
                onChange={(e) => onUpdateField(nextQ.id, e.target.value)}
                placeholder={t("carbonCalculator.questions.inputPlaceholder")}
                className="h-11 border-border/60"
              />
            </div>
          </div>
        );
        i += 2;
      } else {
        elements.push(
          <div key={q.id}>
            <label className="block text-sm font-medium text-foreground mb-1.5">{q.question}</label>
            {q.description && <p className="text-xs text-muted-foreground mb-2">{q.description}</p>}
            {q.type === "select" ? (
              <Select onValueChange={(v) => onUpdateField(q.id, v)} value={(value as string) || ""}>
                <SelectTrigger className="w-full h-11 border-border/60">
                  <SelectValue placeholder={t("carbonCalculator.questions.selectPlaceholder")} />
                </SelectTrigger>
                <SelectContent className="bg-white z-50">
                  {q.options?.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            ) : (
              <Input
                type="number"
                value={(value as string | number) || ""}
                onChange={(e) => onUpdateField(q.id, e.target.value)}
                placeholder={t("carbonCalculator.questions.inputPlaceholder")}
                className="h-11 border-border/60"
              />
            )}
          </div>
        );
        i += 1;
      }
    }
    return elements;
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 sm:px-8 pt-6 pb-2 flex items-center gap-3">
        <div className="flex gap-1.5 flex-1">
          {Array.from({ length: totalSections }).map((_, idx) => (
            <div
              key={idx}
              className={`h-1.5 rounded-full flex-1 transition-all duration-300 ${
                idx <= currentSectionIndex ? 'bg-primary' : 'bg-border/40'
              }`}
            />
          ))}
        </div>
        <span className="text-xs text-muted-foreground font-medium shrink-0">
          {currentSectionIndex + 1}/{totalSections}
        </span>
        <span className="text-xs text-muted-foreground/60">
          {t("carbonCalculator.title", "Carbon Calculator")}
        </span>
      </div>

      <div className="flex-1 overflow-auto px-4 sm:px-8 pt-6 pb-28">
        <h2 className="text-2xl md:text-3xl font-semibold text-foreground mb-8">{sectionTitle}</h2>
        <div className="space-y-6 max-w-2xl">
          {renderFields()}
        </div>

        {SECTION_TIP_KEYS[currentSectionIndex] && (
          <div className="max-w-2xl mt-8 flex gap-3 items-start rounded-xl bg-primary/5 border border-primary/10 px-5 py-4">
            <Leaf className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <p className="text-sm text-foreground/80 leading-relaxed">
              <span className="font-semibold text-primary">{t("carbonCalculator.sidebar.tips.label", "Recommendation")} : </span>
              {t(SECTION_TIP_KEYS[currentSectionIndex])}
            </p>
          </div>
        )}
      </div>

      <div className="border-t border-border/40 bg-background px-4 sm:px-8 py-4 flex justify-center gap-3 sm:gap-4">
        <Button
          variant="outline"
          onClick={onPrevious}
          disabled={isFirstSection}
          className="px-8 h-11 rounded-[4px] border-border/60"
        >
          {t("carbonCalculator.questions.previous", "Back")}
        </Button>
        <Button
          onClick={onNext}
          className="px-8 h-11 rounded-[4px] bg-primary hover:bg-primary/90 text-primary-foreground"
        >
          {isLastSection ? t("carbonCalculator.questions.finalize") : t("carbonCalculator.questions.next", "Next")}
          {!isLastSection && <ArrowRight className="w-4 h-4 ml-2" />}
        </Button>
      </div>
    </div>
  );
};
