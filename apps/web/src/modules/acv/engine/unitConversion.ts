/**
 * Service de conversion d'unités ACV
 * Gère les conversions entre kg, tonnes, kWh, MJ, litres, tkm, etc.
 */

// ============================================
// TYPES
// ============================================

export type UnitCategory = 'mass' | 'energy' | 'volume' | 'distance' | 'transport' | 'area' | 'power';

export interface UnitDefinition {
  symbol: string;
  name: string;
  category: UnitCategory;
  toBase: number; // Facteur de conversion vers l'unité de base de la catégorie
}

// ============================================
// REGISTRE D'UNITÉS
// ============================================

const UNITS: Record<string, UnitDefinition> = {
  // Masse (base: kg)
  'mg':     { symbol: 'mg',     name: 'Milligramme',    category: 'mass',      toBase: 0.000001 },
  'g':      { symbol: 'g',      name: 'Gramme',         category: 'mass',      toBase: 0.001 },
  'kg':     { symbol: 'kg',     name: 'Kilogramme',     category: 'mass',      toBase: 1 },
  't':      { symbol: 't',      name: 'Tonne',          category: 'mass',      toBase: 1000 },
  'kt':     { symbol: 'kt',     name: 'Kilotonne',      category: 'mass',      toBase: 1_000_000 },
  'lb':     { symbol: 'lb',     name: 'Livre',          category: 'mass',      toBase: 0.453592 },

  // Énergie (base: MJ)
  'J':      { symbol: 'J',      name: 'Joule',          category: 'energy',    toBase: 0.000001 },
  'kJ':     { symbol: 'kJ',     name: 'Kilojoule',      category: 'energy',    toBase: 0.001 },
  'MJ':     { symbol: 'MJ',     name: 'Mégajoule',      category: 'energy',    toBase: 1 },
  'GJ':     { symbol: 'GJ',     name: 'Gigajoule',      category: 'energy',    toBase: 1000 },
  'TJ':     { symbol: 'TJ',     name: 'Térajoule',      category: 'energy',    toBase: 1_000_000 },
  'Wh':     { symbol: 'Wh',     name: 'Wattheure',      category: 'energy',    toBase: 0.0036 },
  'kWh':    { symbol: 'kWh',    name: 'Kilowattheure',  category: 'energy',    toBase: 3.6 },
  'MWh':    { symbol: 'MWh',    name: 'Mégawattheure',  category: 'energy',    toBase: 3600 },
  'GWh':    { symbol: 'GWh',    name: 'Gigawattheure',  category: 'energy',    toBase: 3_600_000 },
  'kcal':   { symbol: 'kcal',   name: 'Kilocalorie',    category: 'energy',    toBase: 0.004184 },
  'therm':  { symbol: 'therm',  name: 'Therm',          category: 'energy',    toBase: 105.506 },
  'BTU':    { symbol: 'BTU',    name: 'BTU',            category: 'energy',    toBase: 0.001055 },
  'tep':    { symbol: 'tep',    name: 'Tonne éq. pétrole', category: 'energy', toBase: 41868 },

  // Volume (base: L)
  'mL':     { symbol: 'mL',     name: 'Millilitre',     category: 'volume',    toBase: 0.001 },
  'L':      { symbol: 'L',      name: 'Litre',          category: 'volume',    toBase: 1 },
  'm3':     { symbol: 'm³',     name: 'Mètre cube',     category: 'volume',    toBase: 1000 },
  'm³':     { symbol: 'm³',     name: 'Mètre cube',     category: 'volume',    toBase: 1000 },
  'gal':    { symbol: 'gal',    name: 'Gallon US',      category: 'volume',    toBase: 3.78541 },

  // Distance (base: km)
  'm':      { symbol: 'm',      name: 'Mètre',          category: 'distance',  toBase: 0.001 },
  'km':     { symbol: 'km',     name: 'Kilomètre',      category: 'distance',  toBase: 1 },
  'mi':     { symbol: 'mi',     name: 'Mile',           category: 'distance',  toBase: 1.60934 },
  'nm':     { symbol: 'nm',     name: 'Mille nautique', category: 'distance',  toBase: 1.852 },

  // Transport (base: tkm)
  'tkm':    { symbol: 'tkm',    name: 'Tonne-kilomètre', category: 'transport', toBase: 1 },
  'kgkm':   { symbol: 'kg·km',  name: 'Kg-kilomètre',   category: 'transport', toBase: 0.001 },

  // Surface (base: m²)
  'm2':     { symbol: 'm²',     name: 'Mètre carré',    category: 'area',      toBase: 1 },
  'm²':     { symbol: 'm²',     name: 'Mètre carré',    category: 'area',      toBase: 1 },
  'ha':     { symbol: 'ha',     name: 'Hectare',        category: 'area',      toBase: 10000 },
  'km2':    { symbol: 'km²',    name: 'Kilomètre carré', category: 'area',     toBase: 1_000_000 },
};

// Normalisation des noms d'unités (gère les variations)
const UNIT_ALIASES: Record<string, string> = {
  'kilogramme': 'kg', 'kilogrammes': 'kg', 'kilo': 'kg', 'kilos': 'kg',
  'tonne': 't', 'tonnes': 't', 'ton': 't',
  'litre': 'L', 'litres': 'L', 'liter': 'L',
  'metre': 'm', 'meters': 'm', 'mètre': 'm', 'mètres': 'm',
  'kilometre': 'km', 'kilometres': 'km', 'kilomètre': 'km', 'kilomètres': 'km',
  'kilowattheure': 'kWh', 'kilowatt-heure': 'kWh',
  'megajoule': 'MJ', 'mégajoule': 'MJ',
  'gigajoule': 'GJ',
  'gramme': 'g', 'grammes': 'g', 'gram': 'g', 'grams': 'g',
  'milligramme': 'mg',
  'millilitre': 'mL', 'millilitres': 'mL',
  'gallon': 'gal',
  'mile': 'mi', 'miles': 'mi',
  'hectare': 'ha', 'hectares': 'ha',
};

// ============================================
// FONCTIONS PRINCIPALES
// ============================================

/**
 * Normalise un symbole d'unité
 */
export function normalizeUnit(unit: string): string {
  const trimmed = unit.trim();
  if (UNITS[trimmed]) return trimmed;
  const aliased = UNIT_ALIASES[trimmed.toLowerCase()];
  if (aliased) return aliased;
  return trimmed;
}

/**
 * Récupère la définition d'une unité
 */
export function getUnitDefinition(unit: string): UnitDefinition | undefined {
  return UNITS[normalizeUnit(unit)];
}

/**
 * Vérifie si deux unités sont compatibles (même catégorie)
 */
export function areUnitsCompatible(fromUnit: string, toUnit: string): boolean {
  const from = getUnitDefinition(fromUnit);
  const to = getUnitDefinition(toUnit);
  if (!from || !to) return false;
  return from.category === to.category;
}

/**
 * Convertit une valeur d'une unité à une autre
 * Retourne null si les unités sont incompatibles
 */
export function convertUnit(value: number, fromUnit: string, toUnit: string): number | null {
  const normalizedFrom = normalizeUnit(fromUnit);
  const normalizedTo = normalizeUnit(toUnit);
  
  if (normalizedFrom === normalizedTo) return value;

  const from = UNITS[normalizedFrom];
  const to = UNITS[normalizedTo];

  if (!from || !to) return null;
  if (from.category !== to.category) return null;

  // Convertir via l'unité de base : value * fromToBase / toToBase
  return (value * from.toBase) / to.toBase;
}

/**
 * Convertit vers l'unité de base de la catégorie
 */
export function convertToBase(value: number, unit: string): { value: number; baseUnit: string } | null {
  const def = getUnitDefinition(unit);
  if (!def) return null;

  const baseUnits: Record<UnitCategory, string> = {
    mass: 'kg', energy: 'MJ', volume: 'L', distance: 'km',
    transport: 'tkm', area: 'm2', power: 'kW',
  };

  return { value: value * def.toBase, baseUnit: baseUnits[def.category] };
}

/**
 * Obtient le facteur de conversion entre deux unités
 */
export function getConversionFactor(fromUnit: string, toUnit: string): number | null {
  return convertUnit(1, fromUnit, toUnit);
}

/**
 * Liste les unités disponibles pour une catégorie
 */
export function getUnitsForCategory(category: UnitCategory): UnitDefinition[] {
  return Object.values(UNITS).filter(u => u.category === category);
}

/**
 * Liste toutes les catégories avec leurs unités
 */
export function getAllUnitCategories(): { category: UnitCategory; label: string; units: UnitDefinition[] }[] {
  const labels: Record<UnitCategory, string> = {
    mass: 'Masse', energy: 'Énergie', volume: 'Volume', distance: 'Distance',
    transport: 'Transport', area: 'Surface', power: 'Puissance',
  };

  const categories: UnitCategory[] = ['mass', 'energy', 'volume', 'distance', 'transport', 'area'];
  return categories.map(cat => ({
    category: cat,
    label: labels[cat],
    units: getUnitsForCategory(cat),
  }));
}

/**
 * Convertit automatiquement une quantité pour correspondre à l'unité attendue
 * d'un facteur d'émission. Retourne la quantité convertie ou null si impossible.
 */
export function autoConvertForFactor(
  quantity: number,
  quantityUnit: string,
  factorUnit: string
): { convertedQuantity: number; conversionApplied: string } | null {
  const factor = convertUnit(quantity, quantityUnit, factorUnit);
  if (factor === null) return null;

  return {
    convertedQuantity: factor,
    conversionApplied: `${quantity} ${normalizeUnit(quantityUnit)} → ${factor.toFixed(4)} ${normalizeUnit(factorUnit)}`,
  };
}

/**
 * Formate une valeur avec son unité de manière lisible
 */
export function formatWithUnit(value: number, unit: string): string {
  const def = getUnitDefinition(unit);
  const symbol = def?.symbol ?? unit;

  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(2)} M${symbol}`;
  if (Math.abs(value) >= 1000) return `${(value / 1000).toFixed(2)} k${symbol}`;
  if (Math.abs(value) < 0.01 && value !== 0) return `${value.toExponential(2)} ${symbol}`;
  return `${value.toFixed(2)} ${symbol}`;
}
