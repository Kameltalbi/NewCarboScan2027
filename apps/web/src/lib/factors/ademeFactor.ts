import { getSubcategoryLabel } from '@/lib/scope3/subcategories';

export const FACTOR_SOURCES = [
  { key: 'internal', label: 'Pack interne' },
  { key: 'ademe', label: 'ADEME Base Carbone' },
  { key: 'uk_gov_ghg', label: 'UK Government GHG' },
  { key: 'epa_ghg_emission_factors_hub', label: 'US EPA' },
  { key: 'ipcc_efdb', label: 'IPCC' },
] as const;

/** Ancien ordre fixe. La saisie ne l'utilise plus : voir factorSelection.ts. */
export function factorSourceOrder(country?: string | null) {
  const value = (country || '').trim().toLowerCase();
  const first =
    value === 'tn' || value === 'tun' || value === 'tunisie' || value === 'tunisia'
      ? 'internal'
      : value === 'fr' || value === 'france'
        ? 'ademe'
        : value === 'gb' || value === 'uk' || value.includes('royaume')
          ? 'uk_gov_ghg'
          : value === 'us' || value === 'usa' || value.includes('états') || value.includes('etats')
            ? 'epa_ghg_emission_factors_hub'
            : 'ademe';
  const preferred = FACTOR_SOURCES.find((source) => source.key === first) ?? FACTOR_SOURCES[1];
  return [preferred, ...FACTOR_SOURCES.filter((source) => source.key !== preferred.key)];
}

/** Mots ADEME pour une sous-catégorie dont le libellé n'existe pas tel quel dans la base. */
const ADEME_QUERIES: Record<string, string> = {
  cat1_meat_red: 'viande rouge',
  cat1_meat_white: 'viande blanche',
  cat1_fish_seafood: 'poisson',
  cat1_dairy_eggs: 'lait',
  cat1_fruit_vegetables: 'légume',
  cat1_grocery_staples: 'pâtes',
  cat1_oils_fats: 'huile',
  cat1_bakery: 'pain',
  cat1_soft_drinks: 'boisson',
  cat1_alcoholic_drinks: 'vin',
  cat1_coffee_tea: 'café',
  electricity_grid: 'électricité',
  electricity_green: 'électricité renouvelable',
  electricity_self: 'électricité',
  district_heat: 'chaleur',
  district_steam: 'vapeur',
  district_cold: 'froid',
  diesel: 'gazole',
  fuel_diesel: 'gazole',
  gasoil: 'gazole',
  essence: 'essence',
  gasoline: 'essence',
  natural_gas: 'gaz naturel',
  gaz_naturel: 'gaz naturel',
};

export type AdemeFactorRef = {
  id: string;
  name: string;
  value: number;
  unit: string;
  sourceKey?: string | null;
  sourceName?: string | null;
  datasetVersion?: string | null;
  countryCode?: string | null;
  region?: string | null;
  factorYear?: number | null;
  stableFactorId?: string | null;
  replacementReason?: string | null;
};

export type StoredFactor = {
  id: string;
  name: string;
  value: number;
  unit: string;
  sourceKey: string | null;
  sourceName: string | null;
  datasetVersion: string | null;
  countryCode: string | null;
  region: string | null;
  factorYear: number | null;
  stableFactorId: string | null;
  replacementReason: string | null;
};

export function selectionToFactor(factor: {
  id: string;
  factor_name: string;
  emission_factor: number;
  unit: string;
  sourceKey?: string | null;
  sourceName?: string | null;
  datasetVersion?: string | null;
  countryCode?: string | null;
  region?: string | null;
  factorYear?: number | null;
  stableFactorId?: string | null;
  reason?: string | null;
} | null | undefined): AdemeFactorRef | null {
  if (!factor) return null;
  return {
    id: factor.id,
    name: factor.factor_name,
    value: factor.emission_factor,
    unit: factor.unit,
    sourceKey: factor.sourceKey ?? null,
    sourceName: factor.sourceName ?? null,
    datasetVersion: factor.datasetVersion ?? null,
    countryCode: factor.countryCode ?? null,
    region: factor.region ?? null,
    factorYear: factor.factorYear ?? null,
    stableFactorId: factor.stableFactorId ?? null,
    replacementReason: factor.reason ?? null,
  };
}

export function emissionFactorSourceLabel(factor: AdemeFactorRef | null): string | undefined {
  if (!factor) return undefined;
  const source = factor.sourceName || 'Facteur enregistré';
  return `${source} — ${factor.name}`;
}

export function ademeSearchQuery(subcategory?: string | null): string {
  if (!subcategory) return '';
  const key = subcategory.split(':').pop()?.trim().toLowerCase() || '';
  if (ADEME_QUERIES[key]) return ADEME_QUERIES[key];
  const label = getSubcategoryLabel(key);
  if (!label) return '';
  return label.replace(/\s*\([^)]*\)/g, '').trim();
}

export function ademeFactorNote(factor: AdemeFactorRef | null, extra?: string | null): string | undefined {
  const rest = (extra || '').replace(/^FE_ADEME:.*(?:\r?\n|$)/, '').replace(/^FE_SNAPSHOT:.*(?:\r?\n|$)/, '').trim();
  if (!factor || !Number.isFinite(factor.value)) return rest || undefined;
  const snapshot = {
    id: factor.id,
    name: factor.name,
    value: factor.value,
    unit: factor.unit,
    sourceKey: factor.sourceKey ?? null,
    sourceName: factor.sourceName ?? null,
    datasetVersion: factor.datasetVersion ?? null,
    countryCode: factor.countryCode ?? null,
    region: factor.region ?? null,
    factorYear: factor.factorYear ?? null,
    stableFactorId: factor.stableFactorId ?? null,
    replacementReason: factor.replacementReason ?? null,
  };
  const line = `FE_SNAPSHOT:${JSON.stringify(snapshot)}`;
  return rest ? `${line}\n${rest}` : line;
}

export function parseStoredFactor(notes: string | null | undefined): StoredFactor | null {
  const snap = (notes || '').match(/^FE_SNAPSHOT:(\{.*\})$/m);
  if (snap) {
    try {
      const raw = JSON.parse(snap[1]) as Partial<StoredFactor>;
      const value = Number(raw.value);
      if (!raw.id || !Number.isFinite(value)) return null;
      return {
        id: String(raw.id),
        name: String(raw.name || ''),
        value,
        unit: String(raw.unit || ''),
        sourceKey: raw.sourceKey ?? null,
        sourceName: raw.sourceName ?? null,
        datasetVersion: raw.datasetVersion ?? null,
        countryCode: raw.countryCode ?? null,
        region: raw.region ?? null,
        factorYear: raw.factorYear ?? null,
        stableFactorId: raw.stableFactorId ?? null,
        replacementReason: raw.replacementReason ?? null,
      };
    } catch {
      return null;
    }
  }
  const legacy = parseAdemeFactor(notes);
  if (!legacy) return null;
  return {
    id: legacy.id,
    name: legacy.name,
    value: legacy.value,
    unit: legacy.unit,
    sourceKey: 'ademe',
    sourceName: 'ADEME',
    datasetVersion: null,
    countryCode: null,
    region: null,
    factorYear: null,
    stableFactorId: null,
    replacementReason: null,
  };
}

export function parseAdemeFactor(notes: string | null | undefined): AdemeFactorRef | null {
  const match = (notes || '').match(/^FE_ADEME:\s*([\d.]+)\|([^|]*)\|([^|]*)\|(.*)$/m);
  if (!match) return null;
  const value = Number(match[1]);
  if (!Number.isFinite(value) || value < 0) return null;
  return {
    value,
    unit: match[2] || 'kgCO₂e/unité',
    id: match[3],
    name: match[4].trim(),
  };
}
