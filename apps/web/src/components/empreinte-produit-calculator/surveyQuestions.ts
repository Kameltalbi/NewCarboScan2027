import { QuestionItem } from "./types";

// Pure metadata. All human-readable content is resolved at render time via t().
// Section keys map to carbonCalculator.sidebar.sections.<key>
// Question ids map to carbonCalculator.questions.<id>.*

export interface QuestionMeta {
  id: string;
  sectionKey: string;
  type: "number" | "select";
  optionValues?: string[];
  conditional?: { dependsOn: string; showWhen: string[] };
}

export const SURVEY_SECTION_KEYS = [
  "company",
  "energy",
  "fleet",
  "travel",
  "purchases",
  "waste",
] as const;

export const SURVEY_QUESTIONS_META: QuestionMeta[] = [
  { id: "employeeCount", sectionKey: "company", type: "number" },
  { id: "annualRevenue", sectionKey: "company", type: "number" },
  { id: "industrySector", sectionKey: "company", type: "select", optionValues: ["btp","restauration","services","industrie","commerce","transport","agriculture","sante","education","technologie","finance","immobilier","autre"] },
  { id: "numberOfSites", sectionKey: "company", type: "number" },
  { id: "officeSpace", sectionKey: "company", type: "number" },

  { id: "heatingSource", sectionKey: "energy", type: "select", optionValues: ["electricite","gaz","fioul","bois","climatisation","aucun"] },
  { id: "gasConsumption", sectionKey: "energy", type: "select", optionValues: ["moins-1000","1000-3000","3000-10000","plus-10000"], conditional: { dependsOn: "heatingSource", showWhen: ["gaz"] } },
  { id: "fuelConsumption", sectionKey: "energy", type: "select", optionValues: ["moins-500","500-1500","1500-5000","plus-5000"], conditional: { dependsOn: "heatingSource", showWhen: ["fioul"] } },
  { id: "woodConsumption", sectionKey: "energy", type: "select", optionValues: ["moins-5","5-15","15-30","plus-30"], conditional: { dependsOn: "heatingSource", showWhen: ["bois"] } },
  { id: "electricityConsumption", sectionKey: "energy", type: "select", optionValues: ["moins-5000","5000-15000","15000-50000","plus-50000"] },

  { id: "vehicleCount", sectionKey: "fleet", type: "number" },
  { id: "averageKilometers", sectionKey: "fleet", type: "select", optionValues: ["moins-10000","10000-25000","25000-50000","plus-50000"] },

  { id: "shortFlights", sectionKey: "travel", type: "number" },
  { id: "mediumFlights", sectionKey: "travel", type: "number" },
  { id: "longFlights", sectionKey: "travel", type: "number" },
  { id: "trainTrips", sectionKey: "travel", type: "number" },

  { id: "annualPurchases", sectionKey: "purchases", type: "select", optionValues: ["moins-100","100-500","500-2000","plus-2000"] },
  { id: "subcontracting", sectionKey: "purchases", type: "select", optionValues: ["aucune","faible","moderee","importante"] },
  { id: "freightTonKm", sectionKey: "purchases", type: "number" },
  { id: "freightMode", sectionKey: "purchases", type: "select", optionValues: ["routier","maritime","ferroviaire","mixte"] },

  { id: "wasteVolume", sectionKey: "waste", type: "select", optionValues: ["moins-1","1-5","5-20","plus-20"] },
  { id: "wasteRecycling", sectionKey: "waste", type: "select", optionValues: ["aucun","partiel","complet"] },
  { id: "laptops", sectionKey: "waste", type: "number" },
  { id: "desktopComputers", sectionKey: "waste", type: "number" },
];

export interface SurveySectionGroup {
  sectionKey: string;
  questions: QuestionMeta[];
}

export const SURVEY_SECTIONS_META: SurveySectionGroup[] = SURVEY_SECTION_KEYS.map((key) => ({
  sectionKey: key,
  questions: SURVEY_QUESTIONS_META.filter((q) => q.sectionKey === key),
}));

// Build a live (translated) survey structure with the current i18n `t` function.
// Returned objects match the QuestionItem shape used by existing consumers.
export function buildTranslatedSections(t: (key: string, fallback?: string) => string) {
  return SURVEY_SECTIONS_META.map((s) => ({
    section: t(`carbonCalculator.sidebar.sections.${s.sectionKey}`, s.sectionKey),
    sectionKey: s.sectionKey,
    questions: s.questions.map<QuestionItem & { sectionKey: string }>((q) => ({
      id: q.id,
      sectionKey: s.sectionKey,
      title: t(`carbonCalculator.questions.${q.id}.title`, q.id),
      question: t(`carbonCalculator.questions.${q.id}.question`, q.id),
      description: t(`carbonCalculator.questions.${q.id}.description`, ""),
      type: q.type,
      section: t(`carbonCalculator.sidebar.sections.${s.sectionKey}`, s.sectionKey),
      conditional: q.conditional,
      options: q.optionValues?.map((v) => ({
        value: v,
        label: t(`carbonCalculator.questions.${q.id}.options.${v}`, v),
      })),
    })),
  }));
}

// Stable count for progress calculations (does not depend on i18n).
export const SURVEY_SECTION_COUNT = SURVEY_SECTIONS_META.length;

// Legacy exports kept for any external import compatibility.
export const surveyQuestions: QuestionItem[] = SURVEY_QUESTIONS_META.map((q) => ({
  id: q.id,
  title: q.id,
  question: q.id,
  type: q.type,
  section: q.sectionKey,
  conditional: q.conditional,
  options: q.optionValues?.map((v) => ({ value: v, label: v })),
}));

export const surveySections = SURVEY_SECTIONS_META.map((s) => ({
  section: s.sectionKey,
  questions: s.questions.map<QuestionItem>((q) => ({
    id: q.id,
    title: q.id,
    question: q.id,
    type: q.type,
    section: s.sectionKey,
    conditional: q.conditional,
    options: q.optionValues?.map((v) => ({ value: v, label: v })),
  })),
}));
