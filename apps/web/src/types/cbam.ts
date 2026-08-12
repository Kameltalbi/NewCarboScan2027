export interface CBAMData {
  // Étape 1: Informations générales
  sector: string;
  exportCountry: string;
  annualVolume: number;
  
  // Étape 2: Données directes (Scope 1)
  electricity: number; // kWh
  gas: number; // m³
  fuel: number; // litres
  useDefaultData: boolean;
  
  // Étape 3: Données indirectes (Scope 2 & transport)
  truckDistance: number; // km
  shipDistance: number; // km
  airDistance: number; // km
  useAverageTransport: boolean;
}

export interface CBAMResults {
  totalEmissions: number; // tCO₂e
  emissionsPerTonne: number; // tCO₂e/tonne
  cbamCost: number; // €
  emissionsBySource: {
    production: number;
    energy: number;
    transport: number;
  };
  recommendations: string[];
  comparisonWithDefaults: {
    realData: number;
    defaultData: number;
    savings: number;
  };
}

export interface CBAMQuestion {
  id: string;
  step: number;
  title: string;
  description?: string;
  type: 'select' | 'number' | 'checkbox' | 'multi-input';
  required: boolean;
  options?: { value: string; label: string }[];
  fields?: { key: string; label: string; unit: string; placeholder: string }[];
  dependsOn?: string;
  showWhen?: string[];
}

export type CBAMStep = 'general' | 'direct-data' | 'indirect-data' | 'summary' | 'contact' | 'results';