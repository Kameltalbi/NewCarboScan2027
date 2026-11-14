/**
 * Sélection d'un facteur selon l'activité.
 * Aucune base n'est retenue seulement parce qu'elle répond en premier.
 * Les champs absents des bases ne sont pas inventés.
 */

import { parseStoredFactor } from '@/lib/factors/ademeFactor';
import { electricityQuantityToKwh, TN_ELECTRICITY_KG_PER_KWH } from '@/lib/factors/tunisiaElectricityNotice';

export type ActivityFamily = 'electricity' | 'fuel' | 'food' | 'transport' | 'purchase' | 'other';

export type CatalogFactor = {
  id: string;
  name: string;
  value: number;
  unitNumerator: string;
  unitDenominator: string;
  sourceKey: string;
  sourceName: string;
  datasetVersion: string | null;
  countryCode: string | null;
  region: string | null;
  factorYear: number | null;
  category: string | null;
  stableFactorId: string | null;
};

export type FactorRole = 'match' | 'replacement' | 'upstream' | 'incompatible';

export type ClassifiedFactor = {
  factor: CatalogFactor;
  role: FactorRole;
  reason: string | null;
};

export type SearchRequest = {
  q: string;
  source?: string;
  role: 'match' | 'replacement';
};

const COOKED = /grillé|grillée|grille|cuit|cuite|rôti|roti|braisé|braise|poêl|poel|bouilli/i;
const RAW = /\bcru|\bcrue/i;
const UPSTREAM = /amont|upstream|well.to.tank|\bwtt\b|pré-combustion|pre-combustion|extraction/i;

const FOOD_REPLACEMENTS: Record<string, { exact: string; replacements: string[]; gap: string }> = {
  cat1_meat_red: {
    exact: 'viande rouge',
    replacements: ['boeuf', 'agneau'],
    gap: 'Aucune ligne ne s’appelle « viande rouge ». Bœuf et agneau sont des produits distincts ; cru et cuit ne sont pas équivalents.',
  },
  cat1_meat_white: {
    exact: 'viande blanche',
    replacements: ['volaille', 'porc'],
    gap: 'Aucune ligne ne s’appelle « viande blanche ». Volaille et porc sont des produits distincts ; cru et cuit ne sont pas équivalents.',
  },
  cat1_fish_seafood: {
    exact: 'poisson',
    replacements: [],
    gap: 'Les bases détaillent des espèces et des états. Vérifier le produit et cru ou cuit.',
  },
};

export function subcategoryKey(subcategory?: string | null): string {
  return (subcategory || '').split(':').pop()?.trim().toLowerCase() || '';
}

export function activityFamily(subcategory?: string | null): ActivityFamily {
  const key = subcategoryKey(subcategory);
  if (key.startsWith('electricity')) return 'electricity';
  if (key.startsWith('fuel_') || key.startsWith('fossil_')) return 'fuel';
  if (
    key.startsWith('cat1_meat') ||
    key.startsWith('cat1_fish') ||
    key.startsWith('cat1_dairy') ||
    key.startsWith('cat1_fruit') ||
    key.startsWith('cat1_grocery') ||
    key.startsWith('cat1_oils') ||
    key.startsWith('cat1_bakery') ||
    key.startsWith('cat1_soft') ||
    key.startsWith('cat1_alcohol') ||
    key.startsWith('cat1_coffee') ||
    key === 'cat1_food_beverages'
  ) {
    return 'food';
  }
  if (/^cat[4679]_/.test(key) || key.includes('freight') || key.includes('travel') || key.includes('commut')) {
    return 'transport';
  }
  if (key.startsWith('cat1_')) return 'purchase';
  return 'other';
}

export function countryCode(country?: string | null): string | null {
  const value = (country || '').trim().toLowerCase();
  if (!value) return null;
  if (value === 'tn' || value === 'tun' || value === 'tunisie' || value === 'tunisia') return 'TN';
  if (value === 'fr' || value === 'france') return 'FR';
  if (value === 'gb' || value === 'uk' || value.includes('royaume')) return 'GB';
  if (value === 'us' || value === 'usa' || value.includes('états') || value.includes('etats')) return 'US';
  return null;
}

function fuelQuery(key: string): string {
  if (key.includes('diesel') || key.includes('gazole') || key.includes('fuel_oil')) return 'gazole';
  if (key.includes('gasoline') || key.includes('essence')) return 'essence';
  if (key.includes('gas') || key.includes('gaz') || key.includes('cng')) return 'gaz naturel';
  if (key.includes('lpg') || key.includes('propane') || key.includes('butane')) return 'gpl';
  return key.replace(/^fuel_|^fossil_/, '').replace(/_/g, ' ');
}

export function searchRequests(input: {
  subcategory?: string | null;
  label?: string | null;
  siteCountry?: string | null;
  widen?: boolean;
}): { requests: SearchRequest[]; gap: string | null } {
  const key = subcategoryKey(input.subcategory);
  const family = activityFamily(input.subcategory);
  const label = (input.label || '').replace(/\s*\([^)]*\)/g, '').trim();

  if (input.widen) {
    const q = label || key.replace(/_/g, ' ');
    return {
      requests: q ? [{ q, role: 'match' }] : [],
      gap: null,
    };
  }

  if (family === 'electricity') {
    const code = countryCode(input.siteCountry);
    if (!(input.siteCountry || '').trim()) {
      return {
        requests: [],
        gap: 'Indiquez le pays du site qui consomme l’électricité. Le pays du siège n’est pas utilisé.',
      };
    }
    if (code === 'TN') {
      return {
        requests: [],
        gap: null,
      };
    }
    return {
      requests: [{ q: 'électricité', source: 'ademe', role: 'match' }],
      gap: 'Pour ce pays, la base ADEME est utilisée. Vous pouvez aussi saisir votre facteur.',
    };
  }

  if (family === 'fuel') {
    const q = fuelQuery(key);
    return {
      requests: [
        { q, source: 'internal', role: 'match' },
        { q, source: 'ademe', role: 'match' },
      ],
      gap: 'Combustion et émissions amont sont des facteurs différents. La liste courte ne propose que la combustion, dans une unité compatible.',
    };
  }

  if (family === 'food') {
    const spec = FOOD_REPLACEMENTS[key];
    const exact = spec?.exact || label || key.replace(/^cat1_/, '').replace(/_/g, ' ');
    const requests: SearchRequest[] = [{ q: exact, source: 'ademe', role: 'match' }];
    for (const q of spec?.replacements || []) {
      requests.push({ q, source: 'ademe', role: 'replacement' });
    }
    return { requests, gap: spec?.gap || null };
  }

  if (family === 'transport') {
    return {
      requests: [{ q: label || key.replace(/_/g, ' '), source: 'ademe', role: 'match' }],
      gap: 'Vérifier le mode, le véhicule, le carburant et l’unité (km, t.km ou passager.km).',
    };
  }

  return {
    requests: [{ q: label || key.replace(/_/g, ' '), source: 'ademe', role: 'match' }],
    gap: null,
  };
}

const MASS = new Set(['kg', 't', 'tonne', 'tonnes']);
const VOLUME = new Set(['l', 'litre', 'litres', 'm3', 'm³']);
const ENERGY = new Set(['kwh', 'mwh', 'wh']);

function normUnit(unit?: string | null): string {
  return (unit || '')
    .trim()
    .toLowerCase()
    .replace('co₂', 'co2')
    .replace('kwh', 'kwh')
    .replace(/\s/g, '');
}

function familyOf(unit: string): 'mass' | 'volume' | 'energy' | null {
  const u = normUnit(unit);
  if (MASS.has(u)) return 'mass';
  if (VOLUME.has(u)) return 'volume';
  if (ENERGY.has(u)) return 'energy';
  return null;
}

/** Multiplicateur pour exprimer la quantité saisie dans l'unité du facteur. */
export function unitCompatibility(
  activityUnit?: string | null,
  factorDenominator?: string | null,
): { ok: true; multiplier: number } | { ok: false; reason: string } {
  const activity = normUnit(activityUnit);
  const factor = normUnit(factorDenominator);
  if (!activity || !factor) {
    return { ok: false, reason: 'Unité du facteur absente : conversion impossible.' };
  }
  if (activity === factor) return { ok: true, multiplier: 1 };
  const left = familyOf(activity);
  const right = familyOf(factor);
  if (!left || left !== right) {
    return { ok: false, reason: `Unité incompatible : saisie en ${activityUnit}, facteur en ${factorDenominator}.` };
  }
  const toBase: Record<string, number> = { kg: 1, t: 1000, tonne: 1000, tonnes: 1000, l: 1, litre: 1, litres: 1, m3: 1000, 'm³': 1000, wh: 0.001, kwh: 1, mwh: 1000 };
  const from = toBase[activity];
  const to = toBase[factor];
  if (!from || !to) return { ok: false, reason: `Conversion non prévue entre ${activityUnit} et ${factorDenominator}.` };
  return { ok: true, multiplier: from / to };
}

function mentionsTunisia(factor: CatalogFactor): boolean {
  const text = `${factor.name} ${factor.countryCode || ''} ${factor.region || ''}`.toLowerCase();
  return text.includes('tunisie') || text.includes(' tn') || factor.countryCode === 'TN' || /\bTN\b/.test(factor.name);
}

export function classifyFactor(
  factor: CatalogFactor,
  input: {
    subcategory?: string | null;
    siteCountry?: string | null;
    reportingYear?: number | null;
    activityUnit?: string | null;
    requestedRole?: 'match' | 'replacement';
  },
): ClassifiedFactor {
  const family = activityFamily(input.subcategory);
  const units = unitCompatibility(input.activityUnit, factor.unitDenominator);
  if (!units.ok) return { factor, role: 'incompatible', reason: units.reason };

  if (family === 'fuel' && UPSTREAM.test(factor.name)) {
    return {
      factor,
      role: 'upstream',
      reason: 'Émission amont, distincte de la combustion. Ne pas l’ajouter en plus du facteur de combustion.',
    };
  }

  const reasons: string[] = [];
  let role: FactorRole = input.requestedRole === 'replacement' ? 'replacement' : 'match';

  if (family === 'electricity') {
    const code = countryCode(input.siteCountry);
    if (code === 'TN' && !mentionsTunisia(factor)) {
      role = 'replacement';
      reasons.push('Le facteur ne porte pas le mix tunisien du site.');
    }
    if (code === 'FR' && factor.countryCode && factor.countryCode !== 'FR') {
      role = 'replacement';
      reasons.push(`Géographie ${factor.countryCode}, différente du site (FR).`);
    }
  }

  if (input.reportingYear && factor.factorYear && factor.factorYear !== input.reportingYear) {
    role = 'replacement';
    reasons.push(`Année du facteur ${factor.factorYear}, dossier ${input.reportingYear}.`);
  }

  if (family === 'food' && COOKED.test(factor.name) && !COOKED.test(input.subcategory || '')) {
    role = 'replacement';
    reasons.push('État cuit. Cru et cuit ne sont pas équivalents.');
  }
  if (family === 'food' && input.requestedRole === 'replacement') {
    role = 'replacement';
    const key = subcategoryKey(input.subcategory);
    if (key === 'cat1_meat_red') {
      reasons.push('Produit plus précis que « viande rouge ». Confirmer l’espèce et l’état cru ou cuit.');
    }
    if (key === 'cat1_meat_white') {
      reasons.push('Produit plus précis que « viande blanche ». Confirmer l’espèce et l’état cru ou cuit.');
    }
  }
  if (family === 'food' && RAW.test(factor.name) && role === 'replacement' && !reasons.some((r) => r.startsWith('Produit plus précis'))) {
    reasons.push('État cru indiqué par le libellé du facteur.');
  }

  return { factor, role, reason: reasons.length ? reasons.join(' ') : null };
}

export function shortList(items: ClassifiedFactor[]): ClassifiedFactor[] {
  return items
    .filter((item) => item.role === 'match' || item.role === 'replacement')
    .sort((a, b) => {
      if (a.role !== b.role) return a.role === 'match' ? -1 : 1;
      const aRaw = RAW.test(a.factor.name) ? 0 : 1;
      const bRaw = RAW.test(b.factor.name) ? 0 : 1;
      return aRaw - bRaw;
    })
    .slice(0, 8);
}

export function factorDenominator(unit?: string | null): string {
  const raw = (unit || '').trim();
  if (!raw) return '';
  const parts = raw.split('/');
  return (parts.length > 1 ? parts[parts.length - 1] : raw).trim();
}

export function resolveRecordedFactor(input: {
  subcategory?: string | null;
  quantity?: number | string | null;
  unit?: string | null;
  notes?: string | null;
  siteCountry?: string | null;
}):
  | { kind: 'none' }
  | { kind: 'incomplete'; reason: string }
  | { kind: 'calculated'; kg: number; value: number; unit: string; sourceName: string | null } {
  const stored = parseStoredFactor(input.notes);
  const key = subcategoryKey(input.subcategory);
  if (!stored) {
    if ((input.notes || "").includes("A_COMPLETER:")) {
      return { kind: "incomplete", reason: "Ligne à compléter" };
    }
    if (UNCONFIRMED_FOOD_KEYS.has(key)) {
      return { kind: 'incomplete', reason: 'Facteur non confirmé' };
    }
    if (UNCONFIRMED_ELECTRICITY_KEYS.has(key)) {
      if (isTunisiaCountry(input.siteCountry)) {
        const kwh = electricityQuantityToKwh(Number(input.quantity) || 0, input.unit || '');
        if (kwh == null) return { kind: 'incomplete', reason: 'Unité d’électricité non convertie en kWh' };
        return {
          kind: 'calculated',
          kg: kwh * TN_ELECTRICITY_KG_PER_KWH,
          value: TN_ELECTRICITY_KG_PER_KWH,
          unit: 'kgCO2e/kWh',
          sourceName: 'Newcarboscan Core Pack TN',
        };
      }
      if ((input.siteCountry || '').trim()) {
        return { kind: 'incomplete', reason: 'Base ADEME à retenir, ou saisir le facteur' };
      }
      return { kind: 'incomplete', reason: 'Pays du site manquant' };
    }
    return { kind: 'none' };
  }
  const conv = unitCompatibility(input.unit, factorDenominator(stored.unit));
  if (!conv.ok) return { kind: 'incomplete', reason: conv.reason };
  const quantity = Number(input.quantity) || 0;
  return {
    kind: 'calculated',
    kg: quantity * conv.multiplier * stored.value,
    value: stored.value,
    unit: stored.unit,
    sourceName: stored.sourceName,
  };
}

/** kWh du réseau tunisien. Année du mix et source officielle : non renseignées. */
export const TN_GRID_ELECTRICITY_KG_PER_KWH = 0.53;

export const UNCONFIRMED_ELECTRICITY_KEYS = new Set([
  'electricite',
  'electricity',
  'electricity_grid',
]);

export function isTunisiaCountry(country?: string | null): boolean {
  return countryCode(country) === 'TN' || (country || '').trim().toLowerCase() === 'tunisie';
}

export function tunisiaElectricityCorrection(input: {
  subcategory?: string | null;
  unit?: string | null;
  siteCountry?: string | null;
  siteCountryCode?: string | null;
  organizationCountry?: string | null;
  notes?: string | null;
  catalogValue?: number | null;
}): { correct: false; reason: string } | { correct: true; previousValue: number; countryBasis: 'site' | 'organisation' } {
  const key = subcategoryKey(input.subcategory);
  if (!UNCONFIRMED_ELECTRICITY_KEYS.has(key)) {
    return { correct: false, reason: 'Pas une ligne d’électricité.' };
  }
  if (normUnit(input.unit) !== 'kwh') {
    return { correct: false, reason: 'Unité autre que kWh : pas de conversion silencieuse.' };
  }
  if (parseStoredFactor(input.notes)) {
    return { correct: false, reason: 'Facteur déjà copié sur la ligne.' };
  }
  const site = (input.siteCountry || '').trim();
  const siteCode = (input.siteCountryCode ?? '').trim();
  const org = (input.organizationCountry || '').trim();
  const textIsTunisia = site ? isTunisiaCountry(site) : false;
  const codeIsTunisia = siteCode ? isTunisiaCountry(siteCode) : false;
  const siteIsOther = (Boolean(site) && !textIsTunisia) || (Boolean(siteCode) && !codeIsTunisia);
  if (siteIsOther) return { correct: false, reason: 'Site hors Tunisie.' };
  // Un code pays vide, même si le texte dit « Tunisie », est le repli de migration.
  const siteKnown = codeIsTunisia || (textIsTunisia && input.siteCountryCode === undefined);
  if (!siteKnown && !isTunisiaCountry(org)) {
    return { correct: false, reason: 'Pays du site et de l’organisation non tunisiens.' };
  }
  const linked = input.catalogValue;
  const previousValue = linked != null && Number.isFinite(linked) ? linked : 0.56;
  return { correct: true, previousValue, countryBasis: siteKnown ? 'site' : 'organisation' };
}

export const UNCONFIRMED_FOOD_KEYS = new Set([
  'cat1_meat_red',
  'cat1_meat_white',
  'cat1_fish_seafood',
  'cat1_dairy_eggs',
  'cat1_fruit_vegetables',
  'cat1_grocery_staples',
  'cat1_oils_fats',
  'cat1_bakery',
  'cat1_soft_drinks',
  'cat1_alcoholic_drinks',
  'cat1_coffee_tea',
]);
