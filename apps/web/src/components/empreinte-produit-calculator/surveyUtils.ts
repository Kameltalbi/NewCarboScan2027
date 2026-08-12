import { SurveyData } from "./types";
import { SURVEY_SECTION_COUNT, SURVEY_SECTION_KEYS } from "./surveyQuestions";

export const getInitialSurveyData = (): SurveyData => ({
  industrySector: "",
  employeeCount: null,
  annualRevenue: null,
  currency: "TND",
  officeSpace: null,
  numberOfSites: null,
  heatingSource: "",
  electricityConsumption: "",
  gasConsumption: "",
  fuelConsumption: "",
  woodConsumption: "",
  vehicleCount: null,
  averageKilometers: "",
  shortFlights: null,
  mediumFlights: null,
  longFlights: null,
  trainTrips: null,
  annualPurchases: "",
  subcontracting: "",
  freightTonKm: null,
  freightMode: "",
  wasteVolume: "",
  wasteRecycling: "",
  laptops: null,
  mobilePhones: null,
  monitors: null,
  desktopComputers: null,
});

// Returns the stable section KEY for the current index (translate via t() in the UI).
export const getCurrentSectionKey = (currentSectionIndex: number): string => {
  if (currentSectionIndex >= 0 && currentSectionIndex < SURVEY_SECTION_KEYS.length) {
    return SURVEY_SECTION_KEYS[currentSectionIndex];
  }
  return SURVEY_SECTION_KEYS[0];
};

// Kept for backward compatibility — now returns the section KEY, not a French label.
export const getCurrentSection = getCurrentSectionKey;

export const calculateProgressPercentage = (
  currentSectionIndex: number,
  step: string,
  _totalQuestions: number
): number => {
  if (step === "results") return 100;
  if (step === "contact") return (SURVEY_SECTION_COUNT / (SURVEY_SECTION_COUNT + 1)) * 100;
  return ((currentSectionIndex + 1) / (SURVEY_SECTION_COUNT + 1)) * 100;
};
