import React, { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { SurveySidebar } from "./SurveySidebar";
import { GroupedQuestionScreen } from "./QuestionScreen";
import { ContactForm } from "./ContactForm";
import { ResultsScreen } from "./ResultsScreen";
import { calculateEmpreinteProduit } from "@/lib/empreinteProduitCalculations";
import { EmissionsResult, IntensityMetrics } from "@/types/empreinteProduit";
import { SurveyStep, SurveyData, ContactData } from "./types";
import { buildTranslatedSections, SURVEY_SECTION_COUNT } from "./surveyQuestions";
import { getInitialSurveyData, getCurrentSectionKey, calculateProgressPercentage } from "./surveyUtils";
import { api } from "@/integrations/api/client";
import { toast } from "sonner";

export const EmpreinteProduitCalculatorSurvey: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [step, setStep] = useState<SurveyStep>("question");
  const [surveyData, setSurveyData] = useState<SurveyData>(getInitialSurveyData());
  const [contactData, setContactData] = useState<ContactData>({
    firstName: "", lastName: "", company: "", position: "", email: "", phone: "",
  });
  const [results, setResults] = useState<EmissionsResult | null>(null);
  const [intensityMetrics, setIntensityMetrics] = useState<IntensityMetrics | undefined>(undefined);
  const [progressPercentage, setProgressPercentage] = useState(
    calculateProgressPercentage(0, "question", SURVEY_SECTION_COUNT)
  );

  // Rebuild translated survey structure whenever the language changes.
  const surveySections = useMemo(
    () => buildTranslatedSections(t as any),
    [t, i18n.language]
  );

  const updateSurveyData = (questionId: string, value: any) => {
    setSurveyData((prev) => ({ ...prev, [questionId]: value }));
  };

  const handleNext = () => {
    if (currentSectionIndex < SURVEY_SECTION_COUNT - 1) {
      const nextIdx = currentSectionIndex + 1;
      setCurrentSectionIndex(nextIdx);
      setProgressPercentage(calculateProgressPercentage(nextIdx, "question", SURVEY_SECTION_COUNT));
    } else {
      setStep("contact");
      setProgressPercentage(calculateProgressPercentage(0, "contact", SURVEY_SECTION_COUNT));
    }
  };

  const handlePrevious = () => {
    if (currentSectionIndex > 0) {
      const prevIdx = currentSectionIndex - 1;
      setCurrentSectionIndex(prevIdx);
      setProgressPercentage(calculateProgressPercentage(prevIdx, "question", SURVEY_SECTION_COUNT));
    }
  };

  const handleContactFormSubmit = async (data: ContactData) => {
    setContactData(data);
    setProgressPercentage(100);

    const cleanedData = Object.fromEntries(
      Object.entries(surveyData).map(([key, value]) => [key, value === null ? 0 : value])
    ) as SurveyData;

    const emissionsResult = calculateEmpreinteProduit(cleanedData);
    setResults(emissionsResult);

    const totalTonnes = emissionsResult.totalEmissions;
    const employees = cleanedData.employeeCount || 0;
    const surface = cleanedData.officeSpace || 0;
    const revenueKDT = cleanedData.annualRevenue || 0;

    setIntensityMetrics({
      perEmployee: employees > 0 ? totalTonnes / employees : 0,
      perM2: surface > 0 ? totalTonnes / surface : 0,
      perKDT: revenueKDT > 0 ? totalTonnes / revenueKDT : 0,
    });

    try {
      await api.submitLead({
        requestType: 'free_calculator',
        email: data.email,
        companyName: data.company,
        phone: data.phone,
        fullName: `${data.firstName} ${data.lastName}`,
        message: `Free carbon assessment — Results: ${Math.round(emissionsResult.totalEmissions)} tCO₂e. Contact: ${data.firstName} ${data.lastName}, Sector: ${data.position || 'Not specified'}`,
        payload: { totalEmissions: emissionsResult.totalEmissions, position: data.position },
      });
      toast.success(t("carbonCalculator.messages.success"));
    } catch (error) {
      toast.error(t("carbonCalculator.messages.error"));
    }

    setStep("results");
  };

  const currentSectionKey = getCurrentSectionKey(currentSectionIndex);
  const currentGroup = surveySections[currentSectionIndex];

  return (
    <div className="flex flex-1 w-full h-full">
      <SurveySidebar
        progress={progressPercentage}
        currentSectionKey={currentSectionKey}
        step={step}
        currentSectionIndex={currentSectionIndex}
      />
      <div className="flex-1 flex flex-col min-h-0 bg-background">
        {step === "question" && currentGroup && (
          <GroupedQuestionScreen
            sectionTitle={currentGroup.section}
            questions={currentGroup.questions}
            surveyData={surveyData}
            onUpdateField={updateSurveyData}
            onNext={handleNext}
            onPrevious={handlePrevious}
            isFirstSection={currentSectionIndex === 0}
            isLastSection={currentSectionIndex === SURVEY_SECTION_COUNT - 1}
            currentSectionIndex={currentSectionIndex}
            totalSections={SURVEY_SECTION_COUNT}
          />
        )}
        {step === "contact" && <ContactForm onSubmit={handleContactFormSubmit} />}
        {step === "results" && results && (
          <div className="flex-1 overflow-auto">
            <ResultsScreen results={results} companyName={contactData.company} intensityMetrics={intensityMetrics} />
          </div>
        )}
      </div>
    </div>
  );
};
