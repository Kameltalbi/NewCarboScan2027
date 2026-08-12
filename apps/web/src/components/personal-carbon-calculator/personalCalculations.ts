// Calcul empreinte carbone personnelle — résultats en tCO2e/an
// Facteurs simplifiés ADEME Base Empreinte / IPCC

import { PersonalSurveyData, PersonalEmissionsResult } from "./types";

const toNum = (v: number | null | undefined): number => (v == null || isNaN(Number(v)) ? 0 : Number(v));

const SPEND_KG: Record<string, { clothing: number; electronics: number; leisure: number }> = {
  faible: { clothing: 200, electronics: 100, leisure: 250 },
  moyen: { clothing: 500, electronics: 300, leisure: 600 },
  eleve: { clothing: 1000, electronics: 700, leisure: 1200 },
  tres_eleve: { clothing: 1800, electronics: 1300, leisure: 2200 },
};

const DIET_KG: Record<string, number> = {
  omnivore: 2000,
  flexitarien: 1700,
  vegetarien: 1200,
  vegan: 900,
};

const CAR_KG_PER_KM: Record<string, number> = {
  essence: 0.193,
  diesel: 0.171,
  hybride: 0.12,
  electrique: 0.05,
  aucun: 0,
};

// Mix électrique selon pays (kgCO2e/kWh) — sources IEA 2022 / RTE / ADEME
const ELEC_FACTOR: Record<string, number> = {
  FR: 0.06,   // France (nucléaire dominant)
  TN: 0.50,   // Tunisie (gaz)
  MA: 0.65,   // Maroc (charbon majoritaire)
  DZ: 0.55,   // Algérie (gaz)
  EG: 0.45,   // Égypte
  SN: 0.55,   // Sénégal
  CI: 0.40,   // Côte d'Ivoire (hydro+gaz)
  DE: 0.38,   // Allemagne
  BE: 0.16,   // Belgique (nucléaire)
  CH: 0.04,   // Suisse (hydro+nucléaire)
  ES: 0.20,   // Espagne
  IT: 0.27,   // Italie
  UK: 0.21,   // Royaume-Uni
  US: 0.37,   // États-Unis
  CA: 0.13,   // Canada (hydro)
  autre: 0.475, // Moyenne monde (IEA)
};

// Moyenne nationale empreinte / habitant (tCO2e/an) — Banque mondiale 2022 (Scope 1+2 conso)
const NATIONAL_AVG: Record<string, number> = {
  FR: 9.0, TN: 2.7, MA: 2.5, DZ: 4.5, EG: 2.7, SN: 1.0, CI: 0.8,
  DE: 10.5, BE: 9.5, CH: 11.0, ES: 6.5, IT: 7.0, UK: 7.5,
  US: 17.5, CA: 18.5,
  autre: 6.3,
};

export const calculatePersonalEmissions = (data: PersonalSurveyData): PersonalEmissionsResult => {
  const country = data.country || "autre";
  const elecFactor = ELEC_FACTOR[country] || 0.35;
  const household = Math.max(1, toNum(data.householdSize) || 1);

  // ---- LOGEMENT (kgCO2e) ----
  // Plafonds de sécurité pour éviter les saisies aberrantes (mauvaise unité)
  let heating = 0;
  const hcRaw = toNum(data.heatingConsumption);
  const cap = (v: number, max: number) => Math.min(Math.max(v, 0), max);
  switch (data.heatingType) {
    case "gaz": heating = cap(hcRaw, 100000) * 0.227; break; // kWh/an
    case "fioul": heating = cap(hcRaw, 20000) * 2.68; break; // litres/an
    case "electricite": heating = cap(hcRaw, 80000) * elecFactor; break; // kWh/an
    case "pac": heating = cap(hcRaw, 40000) * elecFactor * 0.35; break; // kWh/an
    case "bois": heating = cap(hcRaw, 100) * 35; break; // stères/an (1 stère ≈ 35 kgCO2e)
    default: heating = 0;
  }
  const electricityRaw = cap(toNum(data.electricityConsumption), 30000);
  const electricity = electricityRaw * elecFactor;
  const logementHousehold = heating + electricity; // partagé par le foyer
  const logement = logementHousehold / household;

  // ---- TRANSPORT (kgCO2e) — personnel ----
  const carKm = toNum(data.carKm);
  const carEm = carKm * (CAR_KG_PER_KM[data.carFuel || "aucun"] ?? 0);
  const trainEm = toNum(data.trainKm) * 0.014;
  const busEm = toNum(data.busKm) * 0.113;
  const flights =
    toNum(data.shortFlights) * 250 +
    toNum(data.mediumFlights) * 700 +
    toNum(data.longFlights) * 2500;
  const transport = carEm + trainEm + busEm + flights;

  // ---- ALIMENTATION (kgCO2e/an, par personne) ----
  let alimentation = DIET_KG[data.diet || "omnivore"] ?? 1700;
  const redMeat = toNum(data.redMeatPerWeek);
  if (redMeat > 0 && (data.diet === "omnivore" || data.diet === "flexitarien")) {
    alimentation += Math.min(redMeat * 52 * 7, 2000);
  }

  // ---- CONSOMMATION (kgCO2e) ----
  const c = SPEND_KG[data.clothingSpend || "moyen"] ?? SPEND_KG.moyen;
  const e = SPEND_KG[data.electronicsSpend || "moyen"] ?? SPEND_KG.moyen;
  const l = SPEND_KG[data.leisureSpend || "moyen"] ?? SPEND_KG.moyen;
  const consommation = c.clothing + e.electronics + l.leisure;

  // ---- DÉCHETS ----
  const dechets = data.recycling === "oui" ? 180 : 280;

  // Total en tonnes
  const cats = {
    logement: logement / 1000,
    transport: transport / 1000,
    alimentation: alimentation / 1000,
    consommation: consommation / 1000,
    dechets: dechets / 1000,
  };

  const total = Object.values(cats).reduce((s, v) => s + v, 0);
  const perPerson = total;

  const labels: Record<string, string> = {
    logement: "Logement",
    transport: "Transport",
    alimentation: "Alimentation",
    consommation: "Consommation",
    dechets: "Déchets",
  };
  const colors: Record<string, string> = {
    logement: "hsl(var(--primary))",
    transport: "hsl(220 80% 55%)",
    alimentation: "hsl(140 55% 45%)",
    consommation: "hsl(30 90% 55%)",
    dechets: "hsl(280 50% 55%)",
  };

  const breakdown = Object.entries(cats)
    .map(([k, v]) => ({ name: labels[k], value: Math.round(v * 100) / 100, color: colors[k] }))
    .sort((a, b) => b.value - a.value);

  const majorCategory = breakdown[0]?.name || "Logement";

  const nationalAverage = NATIONAL_AVG[country] ?? NATIONAL_AVG.autre;
  const vsNationalAverage = nationalAverage > 0 ? ((total - nationalAverage) / nationalAverage) * 100 : 0;
  const gapVs2050 = Math.max(0, total - 2);

  return {
    total: Math.round(total * 100) / 100,
    perPerson: Math.round(perPerson * 100) / 100,
    categories: cats,
    breakdown,
    majorCategory,
    vsNationalAverage: Math.round(vsNationalAverage),
    gapVs2050: Math.round(gapVs2050 * 100) / 100,
  };
};
