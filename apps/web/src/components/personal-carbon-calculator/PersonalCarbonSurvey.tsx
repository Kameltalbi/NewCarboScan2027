import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Send } from "lucide-react";
import { useTranslation } from "react-i18next";
import { api } from "@/integrations/api/client";
import { toast } from "sonner";
import { PersonalQuestionScreen } from "./PersonalQuestionScreen";
import { PersonalResultsScreen } from "./PersonalResultsScreen";
import { PERSONAL_SECTIONS_META } from "./personalQuestions";
import { calculatePersonalEmissions } from "./personalCalculations";
import { PersonalEmissionsResult, PersonalStep, PersonalSurveyData, PersonalContactData } from "./types";

const initialData: PersonalSurveyData = {
  country: "", city: "", householdSize: 1,
  homeSurface: null, heatingType: "", heatingConsumption: null, electricityConsumption: null,
  carFuel: "", carKm: null, trainKm: null, busKm: null,
  shortFlights: null, mediumFlights: null, longFlights: null,
  diet: "", redMeatPerWeek: null,
  clothingSpend: "", electronicsSpend: "", leisureSpend: "",
  recycling: "",
};

const PersonalContactForm: React.FC<{ onSubmit: (d: PersonalContactData) => void }> = ({ onSubmit }) => {
  const { t } = useTranslation();
  const base = "freeCalculators.personal.contact";
  const schema = z.object({
    firstName: z.string().min(2, t(`${base}.validation.firstName`)),
    lastName: z.string().min(2, t(`${base}.validation.lastName`)),
    email: z.string().email(t(`${base}.validation.email`)),
    phone: z.string().min(8, t(`${base}.validation.phone`)).or(z.literal("")).optional(),
  });
  const form = useForm<PersonalContactData>({
    resolver: zodResolver(schema as any),
    defaultValues: { firstName: "", lastName: "", email: "", phone: "" },
  });
  return (
    <div className="max-w-lg mx-auto py-8 sm:py-12 px-4">
      <h2 className="text-2xl font-semibold text-foreground mb-2">{t(`${base}.title`)}</h2>
      <p className="text-sm text-muted-foreground mb-10">{t(`${base}.subtitle`)}</p>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField control={form.control} name="firstName" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-medium text-muted-foreground">{t(`${base}.firstName`)}</FormLabel>
                <FormControl><Input className="h-11" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="lastName" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-medium text-muted-foreground">{t(`${base}.lastName`)}</FormLabel>
                <FormControl><Input className="h-11" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
          </div>
          <FormField control={form.control} name="email" render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs font-medium text-muted-foreground">{t(`${base}.email`)}</FormLabel>
              <FormControl><Input type="email" className="h-11" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="phone" render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs font-medium text-muted-foreground">{t(`${base}.phone`)}</FormLabel>
              <FormControl><Input className="h-11" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <div className="pt-4">
            <Button type="submit" size="lg" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
              <Send className="w-4 h-4 mr-2" />
              {t(`${base}.submit`)}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
};

export const PersonalCarbonSurvey: React.FC<{ onBack?: () => void }> = ({ onBack }) => {
  const { t } = useTranslation();
  const base = "freeCalculators.personal";
  const [step, setStep] = useState<PersonalStep>("question");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [data, setData] = useState<PersonalSurveyData>(initialData);
  const [contact, setContact] = useState<PersonalContactData | null>(null);
  const [results, setResults] = useState<PersonalEmissionsResult | null>(null);

  const updateField = (id: string, value: any) => setData((p) => ({ ...p, [id]: value }));

  const handleNext = () => {
    if (currentIndex < PERSONAL_SECTIONS_META.length - 1) setCurrentIndex(currentIndex + 1);
    else setStep("contact");
  };
  const handlePrev = () => {
    if (currentIndex > 0) setCurrentIndex(currentIndex - 1);
    else if (onBack) onBack();
  };

  const handleContactSubmit = async (c: PersonalContactData) => {
    setContact(c);
    const r = calculatePersonalEmissions(data);
    setResults(r);
    try {
      await api.submitLead({
        requestType: "personal_calculator",
        email: c.email,
        companyName: `${c.firstName} ${c.lastName}`,
        phone: c.phone || undefined,
        fullName: `${c.firstName} ${c.lastName}`,
        message: `Personal carbon assessment - ${r.total.toFixed(2)} tCO2e/year. Main category: ${r.majorCategory}.`,
        payload: { total: r.total, majorCategory: r.majorCategory },
      });
      toast.success(t(`${base}.contact.successToast`));
    } catch {
      toast.error(t(`${base}.contact.errorToast`));
    }
    setStep("results");
  };

  const sidebarSections = PERSONAL_SECTIONS_META.map((s, i) => ({
    key: s.key,
    title: t(`${base}.sections.${s.key}.title`),
    active: i === currentIndex && step === "question",
    completed: i < currentIndex || step === "contact" || step === "results",
  }));

  return (
    <div className="flex flex-1 w-full h-full">
      <div className="w-56 shrink-0 border-r border-border/40 bg-background pt-6 hidden md:flex flex-col">
        <button
          onClick={() => onBack?.()}
          className="px-6 mb-8 text-sm text-muted-foreground hover:text-foreground transition-colors text-left"
        >
          {t(`${base}.sidebar.back`)}
        </button>
        <nav className="flex-1 px-4 space-y-1">
          {sidebarSections.map((s) => (
            <div
              key={s.key}
              className={`px-3 py-2.5 rounded-md text-sm transition-colors ${
                s.active ? "font-semibold text-foreground" : s.completed ? "text-foreground/70" : "text-muted-foreground/50"
              }`}
            >
              {s.title}
            </div>
          ))}
          <div className={`px-3 py-2.5 rounded-md text-sm ${step === "results" ? "font-semibold text-foreground" : "text-muted-foreground/40"}`}>
            {t(`${base}.sidebar.results`)}
          </div>
        </nav>
      </div>

      <div className="flex-1 flex flex-col min-h-0 bg-background">
        {step === "question" && (
          <PersonalQuestionScreen
            section={PERSONAL_SECTIONS_META[currentIndex]}
            data={data}
            onUpdate={updateField}
            onNext={handleNext}
            onPrevious={handlePrev}
            isFirstSection={currentIndex === 0}
            isLastSection={currentIndex === PERSONAL_SECTIONS_META.length - 1}
            currentIndex={currentIndex}
            totalSections={PERSONAL_SECTIONS_META.length}
          />
        )}
        {step === "contact" && <PersonalContactForm onSubmit={handleContactSubmit} />}
        {step === "results" && results && (
          <div className="flex-1 overflow-auto">
            <PersonalResultsScreen results={results} firstName={contact?.firstName} />
          </div>
        )}
      </div>
    </div>
  );
};
