/**
 * Arithmétique décimale pour résultats officiels (pas de Number IEEE).
 */
import { Decimal } from "decimal.js";

Decimal.set({
  precision: 40,
  rounding: Decimal.ROUND_HALF_UP,
});

export type DecimalInput = Decimal.Value;

export function d(value: DecimalInput): Decimal.Instance {
  try {
    return new Decimal(value);
  } catch {
    throw new Error(`Invalid decimal: ${String(value)}`);
  }
}

/** Format stable pour ledger / hash (trim trailing zeros, keep significant). */
export function formatDecimal(value: Decimal.Instance, maxScale = 10): string {
  const fixed = value.toFixed(maxScale);
  if (!fixed.includes(".")) return fixed;
  return fixed.replace(/\.?0+$/, "");
}

export function multiply(...values: DecimalInput[]): Decimal.Instance {
  return values.reduce<Decimal.Instance>((acc, v) => acc.mul(d(v)), d(1));
}

export function add(...values: DecimalInput[]): Decimal.Instance {
  return values.reduce<Decimal.Instance>((acc, v) => acc.add(d(v)), d(0));
}

export { Decimal };
