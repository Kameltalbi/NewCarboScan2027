
export type SurveyStep = "question" | "contact" | "results";

export interface SurveyData {
  industrySector: string;
  employeeCount: number | null;
  annualRevenue: number | null;
  currency: string;
  officeSpace: number | null;
  numberOfSites: number | null;
  heatingSource: string;
  electricityConsumption: string;
  gasConsumption?: string;
  fuelConsumption?: string;
  woodConsumption?: string;
  vehicleCount: number | null;
  averageKilometers: string;
  shortFlights: number | null;
  mediumFlights: number | null;
  longFlights: number | null;
  trainTrips: number | null;
  annualPurchases: string;
  subcontracting: string;
  freightTonKm: number | null;
  freightMode: string;
  wasteVolume: string;
  wasteRecycling: string;
  waterConsumption?: number | null;
  laptops: number | null;
  mobilePhones: number | null;
  monitors: number | null;
  desktopComputers: number | null;
}

export interface ContactData {
  firstName: string;
  lastName: string;
  company: string;
  position: string;
  email: string;
  phone: string;
}

export interface QuestionItem {
  id: string;
  title: string;
  question: string;
  description?: string;
  type: string;
  section?: string;
  options?: Array<{ value: string; label: string }>;
  conditional?: {
    dependsOn: string;
    showWhen: string[];
  };
}

export interface QuestionGroup {
  section: string;
  questions: QuestionItem[];
}

export interface QuestionScreenProps {
  question: QuestionItem;
  value: string | number | null;
  onChange: (value: any) => void;
  onNext: () => void;
  onPrevious: () => void;
  isFirstQuestion: boolean;
}

export interface ContactFormProps {
  onSubmit: (data: ContactData) => void;
  onSkip: () => void;
}
