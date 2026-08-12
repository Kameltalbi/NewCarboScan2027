/**
 * Calcul CBAM selon la formule officielle
 */

export interface CbamInput {
  processEmissions: number;          // tCO2e
  fuelEmissions: number;             // tCO2e
  electricityKwh: number;            // kWh
  electricityEF: number;             // tCO2/kWh (ex : 0.00063 Tunisie)
  totalProduction: number;           // tonnes/an
  importedQuantity: number;          // tonnes importées
  etsPrice: number;                  // €/tCO2
  localCarbonPrice?: number;         // €/tCO2 (optionnel)
}

export interface CbamResult {
  directEmissions: number;
  indirectEmissions: number;
  totalPlantEmissions: number;
  emissionsPerTon: number;
  declarableEmissions: number;
  cbamDue: number;
}

export function calculateCbam(input: CbamInput): CbamResult {
  const {
    processEmissions,
    fuelEmissions,
    electricityKwh,
    electricityEF,
    totalProduction,
    importedQuantity,
    etsPrice,
    localCarbonPrice = 0
  } = input;

  // 1. Émissions directes
  const directEmissions = processEmissions + fuelEmissions;

  // 2. Émissions indirectes
  const indirectEmissions = electricityKwh * electricityEF;

  // 3. Total usine
  const totalPlantEmissions = directEmissions + indirectEmissions;

  // 4. Intrinsèque par tonne
  const emissionsPerTon = totalProduction > 0 
    ? totalPlantEmissions / totalProduction 
    : 0;

  // 5. Émissions déclarables
  const declarableEmissions = emissionsPerTon * importedQuantity;

  // 6. CBAM dû
  const priceDifference = etsPrice - localCarbonPrice;
  const cbamDue = declarableEmissions * priceDifference;

  return {
    directEmissions,
    indirectEmissions,
    totalPlantEmissions,
    emissionsPerTon,
    declarableEmissions,
    cbamDue
  };
}

