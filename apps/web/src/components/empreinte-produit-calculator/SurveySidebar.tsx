import React from "react";
import { useTranslation } from "react-i18next";
import { SurveyStep } from "./types";
import { SURVEY_SECTION_KEYS } from "./surveyQuestions";
import { Check, Menu } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

interface SurveySidebarProps {
  progress: number;
  currentSectionKey: string;
  step: SurveyStep;
  currentSectionIndex?: number;
}

interface SidebarEntry { key: string; label: string; active: boolean; completed: boolean }

const SidebarNav: React.FC<{ sections: SidebarEntry[]; step: SurveyStep; t: any; navigate: any }> = ({ sections, step, t, navigate }) => (
  <>
    <button
      onClick={() => navigate("/")}
      className="px-6 mb-8 text-sm text-muted-foreground hover:text-foreground transition-colors text-left"
    >
      ← {t("carbonCalculator.sidebar.backToHome", "Back to home")}
    </button>
    <nav className="flex-1 px-4 space-y-1">
      {sections.map((section) => (
        <div
          key={section.key}
          className={`flex items-center gap-2.5 px-3 py-2.5 rounded-md text-sm transition-colors ${
            section.active
              ? "font-semibold text-foreground"
              : section.completed
              ? "text-foreground/70"
              : "text-muted-foreground/50"
          }`}
        >
          <span>{section.label}</span>
          {section.completed && <Check className="h-4 w-4 text-primary shrink-0" />}
        </div>
      ))}
      <div className={`flex items-center gap-2.5 px-3 py-2.5 rounded-md text-sm transition-colors ${
        step === "results" ? "font-semibold text-foreground" : "text-muted-foreground/40"
      }`}>
        <span>{t("carbonCalculator.sidebar.sections.results", "Results")}</span>
        {step === "results" && <Check className="h-4 w-4 text-primary shrink-0" />}
      </div>
    </nav>
  </>
);

export const SurveySidebar: React.FC<SurveySidebarProps> = ({ currentSectionKey, step, currentSectionIndex = 0 }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const sections: SidebarEntry[] = SURVEY_SECTION_KEYS.map((key, i) => ({
    key,
    label: t(`carbonCalculator.sidebar.sections.${key}`, key),
    active: key === currentSectionKey && step === "question",
    completed: i < currentSectionIndex || step === "contact" || step === "results",
  }));

  return (
    <>
      <div className="w-56 shrink-0 border-r border-border/40 bg-background pt-6 hidden md:flex flex-col">
        <SidebarNav sections={sections} step={step} t={t} navigate={navigate} />
      </div>

      <div className="md:hidden fixed top-[64px] left-3 z-40">
        <Sheet>
          <SheetTrigger asChild>
            <button className="p-2 rounded-[4px] bg-background border border-border/40 shadow-sm">
              <Menu className="h-5 w-5 text-foreground" />
            </button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 pt-6 flex flex-col">
            <SheetHeader className="sr-only">
              <SheetTitle>{t("carbonCalculator.sidebar.sections.results", "Navigation")}</SheetTitle>
            </SheetHeader>
            <SidebarNav sections={sections} step={step} t={t} navigate={navigate} />
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
};
