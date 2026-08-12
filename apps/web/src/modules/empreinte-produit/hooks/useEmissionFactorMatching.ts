// Auto-matching des facteurs d'émission depuis la table emission_factors
import { useQuery } from '@tanstack/react-query';
import { supabase } from "@/integrations/api/client";

interface MatchedFactor {
  id: string;
  factor_name: string;
  emission_factor: number;
  unit: string;
  source: string | null;
  category: string;
}

// Mapping de mots-clés matériaux vers des slugs/catégories connus
const MATERIAL_KEYWORDS: Record<string, string[]> = {
  acier: ['acier', 'steel', 'fer'],
  aluminium: ['aluminium', 'aluminum', 'alu'],
  plastique: ['plastique', 'plastic', 'pet', 'pehd', 'pp', 'pvc', 'polypropylène', 'polyéthylène'],
  verre: ['verre', 'glass'],
  bois: ['bois', 'wood', 'timber'],
  carton: ['carton', 'cardboard', 'papier', 'paper'],
  cuivre: ['cuivre', 'copper'],
  béton: ['béton', 'concrete', 'ciment', 'cement'],
  textile: ['textile', 'coton', 'cotton', 'polyester', 'nylon'],
};

const TRANSPORT_FACTORS: Record<string, number> = {
  road: 0.062,
  sea: 0.015,
  air: 0.602,
  rail: 0.022,
  mixed: 0.04,
};

const ENERGY_FACTORS: Record<string, number> = {
  electricite: 0.057,
  electricity: 0.057,
  'gaz naturel': 0.227,
  'natural gas': 0.227,
  diesel: 2.68,
  fioul: 2.68,
  propane: 1.53,
  biomasse: 0.04,
};

const WASTE_FACTORS: Record<string, number> = {
  recycling: -0.5,
  incineration: 0.5,
  landfill: 0.1,
};

const EOL_FACTORS: Record<string, number> = {
  recycling: -0.5,
  incineration: 0.5,
  landfill: 0.1,
  reuse: -1.0,
};

// Fetch all emission factors once
export function useEmissionFactors() {
  return useQuery({
    queryKey: ['emission-factors-all'],
    staleTime: 1000 * 60 * 30, // 30 min cache
    queryFn: async () => {
      const { data, error } = await supabase
        .from('emission_factors')
        .select('id, factor_name, emission_factor, unit, source, category, subcategory, slug')
        .order('factor_name');
      if (error) throw error;
      return data;
    },
  });
}

// Match a material name to an emission factor
export function matchMaterialFactor(
  materialName: string,
  factors: { id: string; factor_name: string; emission_factor: number; unit: string; source: string | null; category: string; subcategory: string | null; slug: string | null }[]
): MatchedFactor | null {
  const name = materialName.toLowerCase().trim();

  // 1. Direct slug/name match
  const directMatch = factors.find(
    f => f.slug === name || f.factor_name.toLowerCase() === name
  );
  if (directMatch) return directMatch;

  // 2. Partial name match
  const partialMatch = factors.find(
    f => f.factor_name.toLowerCase().includes(name) || name.includes(f.factor_name.toLowerCase())
  );
  if (partialMatch) return partialMatch;

  // 3. Keyword-based match
  for (const [, keywords] of Object.entries(MATERIAL_KEYWORDS)) {
    if (keywords.some(kw => name.includes(kw))) {
      const kwMatch = factors.find(f => 
        keywords.some(kw => 
          f.factor_name.toLowerCase().includes(kw) || 
          (f.slug && f.slug.includes(kw))
        )
      );
      if (kwMatch) return kwMatch;
    }
  }

  return null;
}

// Get transport emission factor by mode
export function getTransportFactor(mode: string): number {
  return TRANSPORT_FACTORS[mode] || 0.04;
}

// Get energy emission factor by type
export function getEnergyFactor(energyType: string): number {
  const key = energyType.toLowerCase().trim();
  for (const [name, factor] of Object.entries(ENERGY_FACTORS)) {
    if (key.includes(name) || name.includes(key)) return factor;
  }
  return 0.057; // Default electricity
}

// Get waste treatment factor
export function getWasteFactor(treatment: string): number {
  return WASTE_FACTORS[treatment] || 0.1;
}

// Get end-of-life factor
export function getEndOfLifeFactor(scenario: string): number {
  return EOL_FACTORS[scenario] || 0.1;
}

// Packaging default factor (kg CO2e per kg of packaging material)
const PACKAGING_FACTORS: Record<string, number> = {
  carton: 0.75,
  plastique: 3.0,
  bois: 0.3,
  verre: 0.85,
  metal: 2.5,
  aluminium: 8.0,
};

export function getPackagingFactor(material: string): number {
  const key = material.toLowerCase().trim();
  for (const [name, factor] of Object.entries(PACKAGING_FACTORS)) {
    if (key.includes(name) || name.includes(key)) return factor;
  }
  return 1.5; // Default
}
