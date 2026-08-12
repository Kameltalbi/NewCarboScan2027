export type PersonalStep = "question" | "contact" | "results";

export type DietType = "omnivore" | "flexitarien" | "vegetarien" | "vegan";
export type HeatingType = "gaz" | "fioul" | "electricite" | "bois" | "pac" | "aucun";
export type FuelType = "essence" | "diesel" | "hybride" | "electrique" | "aucun";
export type Country =
  | "TN" | "FR" | "MA" | "DZ" | "EG" | "SN" | "CI"
  | "DE" | "BE" | "CH" | "ES" | "IT" | "UK"
  | "US" | "CA"
  | "autre";
export type SpendLevel = "faible" | "moyen" | "eleve" | "tres_eleve";
export type YesNo = "oui" | "non";

export interface PersonalSurveyData {
  // Profil
  country: Country | "";
  city: string;
  householdSize: number | null;

  // Logement
  homeSurface: number | null;
  heatingType: HeatingType | "";
  heatingConsumption: number | null; // kWh/an (gaz/élec/PAC) ou litres (fioul) ou stères (bois)
  electricityConsumption: number | null; // kWh/an (usage hors chauffage)

  // Transport
  carFuel: FuelType | "";
  carKm: number | null;
  trainKm: number | null;
  busKm: number | null;
  shortFlights: number | null;
  mediumFlights: number | null;
  longFlights: number | null;

  // Alimentation
  diet: DietType | "";
  redMeatPerWeek: number | null;

  // Consommation
  clothingSpend: SpendLevel | "";
  electronicsSpend: SpendLevel | "";
  leisureSpend: SpendLevel | "";

  // Déchets
  recycling: YesNo | "";
}

export interface PersonalCategoryBreakdown {
  name: string;
  value: number; // tCO2e
  color: string;
}

export interface PersonalEmissionsResult {
  total: number; // tCO2e / an (personnel)
  perPerson: number; // tCO2e / personne du foyer
  categories: {
    logement: number;
    transport: number;
    alimentation: number;
    consommation: number;
    dechets: number;
  };
  breakdown: PersonalCategoryBreakdown[];
  majorCategory: string;
  vsNationalAverage: number; // % vs moyenne (≈9 t FR / 2.5 t TN)
  gapVs2050: number; // tCO2e à réduire pour atteindre 2 t
}

export interface PersonalContactData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}
