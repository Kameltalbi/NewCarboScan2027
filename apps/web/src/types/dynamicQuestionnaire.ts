export interface CompanyInfo {
  companyName: string;
  address: string; // Adresse complète de l'entreprise
  country: string;
  numberOfSites: number; // Nombre de sites étudiés
  siteLocations?: string; // Emplacement des sites si plusieurs
  sectors: string[];
  numberOfEmployees: number;
  surfaceArea: number; // in m²
  annualRevenue: number; // Chiffre d'affaires de l'année étudiée (en DT)
  studiedYear: number; // Année d'étude
  // Nouveaux champs pour l'objectif de la démarche
  objective: string; // Objectif principal de la démarche carbone
  motivation: string; // Motivation/contexte de la démarche
  targetYear?: number; // Année cible pour les objectifs
  hasCommitments: boolean; // Engagements existants (SBTi, Net Zero, etc.)
  commitmentDetails?: string; // Détails des engagements
  logoUrl?: string; // URL du logo de l'entreprise depuis les paramètres
}

export interface DynamicQuestion {
  id: string;
  questionText: string;
  unit: string;
  emissionFactorSlug: string;
  category: 'energy' | 'transport' | 'waste' | 'production' | 'materials' | 'other';
  sector?: string; // If specific to a sector
  required: boolean;
  inputType: 'number' | 'select' | 'multiselect';
  options?: { value: string; label: string }[];
  helpText?: string;
  placeholder?: string;
}

export interface QuestionnaireResponse {
  questionId: string;
  value: number;
  unit: string;
  emissionFactorSlug: string;
  calculatedEmissions?: number;
}

export interface DynamicQuestionnaireData {
  companyInfo: CompanyInfo;
  responses: { [questionId: string]: QuestionnaireResponse };
  totalEmissions: number;
  emissionsByCategory: { [category: string]: number };
  emissionsByScope: {
    scope1: number;
    scope2: number;
    scope3: number;
  };
}

export interface SectorMapping {
  sectorId: string;
  sectorName: string;
  questions: string[]; // Array of question IDs specific to this sector
  defaultQuestions: string[]; // Questions that apply to all companies in this sector
}

export interface EmissionFactor {
  id: string;
  slug: string;
  nom_affiche: string;
  factor_name: string;
  emission_factor: number;
  unit: string;
  category: string;
  subcategory?: string;
  source?: string;
  year?: number;
}

export type QuestionnaireStep = 
  | 'company-info'
  | 'questions'
  | 'summary'
  | 'contact'
  | 'results';

export interface ContactInfo {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  position: string;
}

export interface DynamicQuestionnaireState {
  currentStep: QuestionnaireStep;
  currentQuestionIndex: number;
  companyInfo: Partial<CompanyInfo>;
  responses: { [questionId: string]: QuestionnaireResponse };
  contactInfo: Partial<ContactInfo>;
  generatedQuestions: DynamicQuestion[];
  emissionFactors: { [slug: string]: EmissionFactor };
  isLoading: boolean;
  errors: { [field: string]: string };
} 