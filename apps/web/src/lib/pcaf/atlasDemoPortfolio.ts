/**
 * Entrées de démonstration Banque Atlas.
 * Aucun résultat PCAF n'est stocké ici : le moteur les calcule.
 * Les facteurs sectoriels sont illustratifs et le disent dans leur source.
 */
import type { BusinessLoanInput, FactorRef } from "./businessLoans.ts";

export interface AtlasCounterparty {
  id: string;
  name: string;
  city: string;
  sectorLabel: string;
  carbonScore: string;
  confidence: number;
  input: BusinessLoanInput;
}

const demoFactor = (
  tco2ePerUnit: number,
  perUnit: string,
  year = 2024,
): FactorRef => ({
  tco2ePerUnit,
  perUnit,
  source: "Facteur de démonstration CarboScan — non issu de la base PCAF ni d'une table EEIO",
  year,
  geography: "TN",
  currency: perUnit === "TND" ? "TND" : null,
});

export const ATLAS_COUNTERPARTIES: AtlasCounterparty[] = [
  {
    id: "d101",
    name: "Médina Textile SA",
    city: "Monastir",
    sectorLabel: "Industrie textile",
    carbonScore: "A",
    confidence: 92,
    input: {
      assetClass: "business_loans",
      instrument: "business_loan",
      listing: "unlisted",
      outstandingAmount: 48_500_000,
      currency: "TND",
      reportingYear: 2025,
      totalEquity: 80_000_000,
      totalDebt: 114_000_000,
      sector: "Industrie textile",
      scope12: {
        reported: {
          verified: true,
          emissionsTco2e: 52_000,
          source: "Rapport GES 2025 vérifié (données de démonstration)",
          year: 2025,
        },
      },
      scope3: {
        reported: {
          verified: true,
          emissionsTco2e: 28_000,
          source: "Rapport GES 2025 vérifié, scope 3 (données de démonstration)",
          year: 2025,
        },
      },
    },
  },
  {
    id: "d102",
    name: "Carthage Agro SARL",
    city: "Béja",
    sectorLabel: "Agroalimentaire",
    carbonScore: "B",
    confidence: 74,
    input: {
      assetClass: "business_loans",
      instrument: "business_loan",
      listing: "unlisted",
      outstandingAmount: 31_200_000,
      currency: "TND",
      reportingYear: 2025,
      totalEquity: 70_000_000,
      totalDebt: 86_000_000,
      sector: "Agroalimentaire",
      scope12: {
        reported: {
          verified: false,
          emissionsTco2e: 45_000,
          source: "Déclaration emprunteur non vérifiée, 2025 (démonstration)",
          year: 2025,
        },
      },
      scope3: {
        reported: {
          verified: false,
          emissionsTco2e: 20_000,
          source: "Déclaration emprunteur non vérifiée, scope 3, 2025 (démonstration)",
          year: 2025,
        },
      },
    },
  },
  {
    id: "d103",
    name: "Numéris Soft TN",
    city: "Tunis",
    sectorLabel: "Services numériques",
    carbonScore: "A+",
    confidence: 90,
    input: {
      assetClass: "business_loans",
      instrument: "business_loan",
      listing: "listed",
      outstandingAmount: 15_800_000,
      currency: "TND",
      reportingYear: 2025,
      evic: 79_000_000,
      totalEquity: 10_000_000,
      totalDebt: 10_000_000,
      sector: "Services numériques",
      scope12: {
        reported: {
          verified: true,
          emissionsTco2e: 8_000,
          source: "Rapport GES vérifié 2025 (démonstration)",
          year: 2025,
        },
      },
      scope3: {
        reported: {
          verified: true,
          emissionsTco2e: 4_000,
          source: "Rapport GES vérifié, scope 3, 2025 (démonstration)",
          year: 2025,
        },
      },
    },
  },
  {
    id: "d104",
    name: "Sahel Constructions",
    city: "Sousse",
    sectorLabel: "BTP",
    carbonScore: "C",
    confidence: 55,
    input: {
      assetClass: "business_loans",
      instrument: "business_loan",
      listing: "unlisted",
      outstandingAmount: 27_600_000,
      currency: "TND",
      reportingYear: 2025,
      totalEquity: 40_000_000,
      totalDebt: 70_400_000,
      sector: "BTP",
      scope12: {
        production: {
          quantity: 120_000,
          unit: "t",
          factor: demoFactor(0.8, "t"),
        },
      },
    },
  },
  {
    id: "d105",
    name: "Oasis Énergies",
    city: "Gabès",
    sectorLabel: "Énergie",
    carbonScore: "B",
    confidence: 68,
    input: {
      assetClass: "business_loans",
      instrument: "business_loan",
      listing: "unlisted",
      outstandingAmount: 52_400_000,
      currency: "TND",
      reportingYear: 2025,
      totalEquity: 100_000_000,
      totalDebt: 162_000_000,
      sector: "Énergie",
      revenue: 200_000_000,
      revenueCurrency: "TND",
      scope12: {
        energy: {
          quantity: 80_000_000,
          unit: "kWh",
          processEmissionsTco2e: 2_000,
          factor: {
            tco2ePerUnit: 0.000523,
            perUnit: "kWh",
            source: "Core Pack électricité TN 0,523 kgCO₂e/kWh, exprimé en tCO₂e",
            year: 2025,
            geography: "TN",
          },
        },
      },
      sectorEmissionsPerRevenue: {
        scope3: demoFactor(0.00015, "TND"),
      },
    },
  },
  {
    id: "d106",
    name: "Cap Bon Logistique",
    city: "Nabeul",
    sectorLabel: "Transport & logistique",
    carbonScore: "B",
    confidence: 70,
    input: {
      assetClass: "business_loans",
      instrument: "business_loan",
      listing: "unlisted",
      outstandingAmount: 18_900_000,
      currency: "TND",
      reportingYear: 2025,
      totalEquity: 30_000_000,
      totalDebt: 45_600_000,
      sector: "Transport & logistique",
      revenue: 90_000_000,
      revenueCurrency: "TND",
      sectorEmissionsPerRevenue: {
        scope12: demoFactor(0.0004, "TND"),
        scope3: demoFactor(0.0002, "TND"),
      },
    },
  },
  {
    id: "d107",
    name: "Golfe Pharma Distribution",
    city: "Sfax",
    sectorLabel: "Santé / distribution",
    carbonScore: "A",
    confidence: 84,
    input: {
      assetClass: "business_loans",
      instrument: "business_loan",
      listing: "unlisted",
      outstandingAmount: 22_100_000,
      currency: "TND",
      reportingYear: 2025,
      totalEquity: 40_000_000,
      totalDebt: 48_400_000,
      sector: "Santé / distribution",
      scope12: {
        reported: {
          verified: false,
          emissionsTco2e: 30_000,
          source: "Déclaration emprunteur non vérifiée, 2025 (démonstration)",
          year: 2025,
        },
      },
      scope3: {
        reported: {
          verified: false,
          emissionsTco2e: 12_000,
          source: "Déclaration emprunteur non vérifiée, scope 3, 2025 (démonstration)",
          year: 2025,
        },
      },
    },
  },
  {
    id: "d108",
    name: "Virtus Courtage Assurances",
    city: "Tunis",
    sectorLabel: "Services financiers",
    carbonScore: "A+",
    confidence: 88,
    input: {
      assetClass: "business_loans",
      instrument: "business_loan",
      listing: "listed",
      outstandingAmount: 9_400_000,
      currency: "TND",
      reportingYear: 2025,
      evic: 47_000_000,
      sector: "Services financiers",
      scope12: {
        reported: {
          verified: false,
          emissionsTco2e: 5_000,
          source: "Déclaration emprunteur non vérifiée, 2025 (démonstration)",
          year: 2025,
        },
      },
      scope3: {
        reported: {
          verified: false,
          emissionsTco2e: 2_000,
          source: "Déclaration emprunteur non vérifiée, scope 3, 2025 (démonstration)",
          year: 2025,
        },
      },
    },
  },
  {
    id: "d109",
    name: "Horizon Hôtels Groupe",
    city: "Hammamet",
    sectorLabel: "Tourisme",
    carbonScore: "C",
    confidence: 48,
    input: {
      assetClass: "business_loans",
      instrument: "business_loan",
      listing: "unlisted",
      outstandingAmount: 36_700_000,
      currency: "TND",
      reportingYear: 2025,
      totalEquity: 60_000_000,
      totalDebt: 86_800_000,
      sector: "Tourisme",
      scope12: {
        production: {
          quantity: 50_000,
          unit: "nuitées",
          factor: demoFactor(1.2, "nuitée"),
        },
      },
      scope3: {
        production: {
          quantity: 20_000,
          unit: "nuitées",
          factor: demoFactor(0.5, "nuitée"),
        },
      },
    },
  },
  {
    id: "d110",
    name: "Delta Immobilière",
    city: "Ariana",
    sectorLabel: "Immobilier",
    carbonScore: "D",
    confidence: 35,
    input: {
      assetClass: "business_loans",
      instrument: "business_loan",
      listing: "unlisted",
      outstandingAmount: 41_200_000,
      currency: "TND",
      reportingYear: 2025,
      sector: "Immobilier",
      sectorEmissionsPerAsset: {
        scope12: demoFactor(0.0008, "TND"),
        scope3: demoFactor(0.0003, "TND"),
      },
    },
  },
  {
    id: "d111",
    name: "SoftPay Fintech",
    city: "Tunis",
    sectorLabel: "Fintech",
    carbonScore: "A",
    confidence: 86,
    input: {
      assetClass: "business_loans",
      instrument: "business_loan",
      listing: "unlisted",
      outstandingAmount: 7_200_000,
      currency: "TND",
      reportingYear: 2025,
      totalEquity: 20_000_000,
      totalDebt: 25_000_000,
      sector: "Fintech",
      scope12: {
        energy: {
          quantity: 2_000_000,
          unit: "kWh",
          processEmissionsTco2e: 0,
          factor: {
            tco2ePerUnit: 0.0005,
            perUnit: "kWh",
            source: "Facteur de démonstration électricité, 0,5 kgCO₂e/kWh",
            year: 2025,
            geography: "TN",
          },
        },
      },
      sectorAssetTurnover: {
        ratio: 1.5,
        source: "Rotation d'actifs sectorielle de démonstration",
        year: 2024,
        geography: "TN",
      },
      sectorEmissionsPerRevenue: {
        scope3: demoFactor(0.0002, "TND"),
      },
    },
  },
  {
    id: "d112",
    name: "Green Olive Export",
    city: "Sfax",
    sectorLabel: "Agro-export",
    carbonScore: "B",
    confidence: 65,
    input: {
      assetClass: "business_loans",
      instrument: "business_loan",
      listing: "unlisted",
      outstandingAmount: 14_300_000,
      currency: "TND",
      reportingYear: 2025,
      sector: "Agro-export",
      sectorAssetTurnover: {
        ratio: 1.25,
        source: "Rotation d'actifs sectorielle de démonstration",
        year: 2024,
        geography: "TN",
      },
      sectorEmissionsPerRevenue: {
        scope12: demoFactor(0.0004, "TND"),
        scope3: demoFactor(0.0002, "TND"),
      },
    },
  },
];
