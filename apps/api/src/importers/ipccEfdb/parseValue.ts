/**
 * EFDB values are exported as text. Never use parseFloat on a partial prefix.
 * Supports numbers, simple intervals, central±bounds, inequalities, missing.
 */
import type { ValueParseResult } from "./types.js";

function normalizeDecimal(token: string): string {
  return token.replace(/\s+/g, "").replace(",", ".");
}

function parseFullNumber(token: string): number | null {
  const t = normalizeDecimal(token);
  if (!/^[+-]?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?$/.test(t)) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

export function parseEfdbValue(raw: unknown): ValueParseResult {
  if (raw === null || raw === undefined) {
    return {
      class: "missing",
      raw: null,
      number: null,
      lower: null,
      upper: null,
      inequalityOp: null,
      notes: ["absent"],
    };
  }

  const original = String(raw);
  const s = original.replace(/\u00a0/g, " ").trim();
  if (s === "") {
    return {
      class: "missing",
      raw: "",
      number: null,
      lower: null,
      upper: null,
      inequalityOp: null,
      notes: ["blank"],
    };
  }

  const notes: string[] = [];
  if (s === "0" || s === "0.0" || s === "+0" || s === "-0") {
    notes.push("true_zero");
  }

  const ineq = s.match(/^([<>]=?)\s*(.+)$/);
  if (ineq) {
    const op = ineq[1] as "<" | "<=" | ">" | ">=";
    const n = parseFullNumber(ineq[2]!);
    if (n === null) {
      return {
        class: "other_text",
        raw: s,
        number: null,
        lower: null,
        upper: null,
        inequalityOp: null,
        notes: ["inequality_unparsed_rhs"],
      };
    }
    return {
      class: "inequality",
      raw: s,
      number: null,
      lower: op.startsWith(">") ? n : null,
      upper: op.startsWith("<") ? n : null,
      inequalityOp: op,
      notes,
    };
  }

  // Central with bounds: 24 (16-32) or 24 (16 – 32)
  const central = s.match(
    /^([+-]?\d+(?:[.,]\d+)?(?:[eE][+-]?\d+)?)\s*\(\s*([+-]?\d+(?:[.,]\d+)?)\s*[-–—]\s*([+-]?\d+(?:[.,]\d+)?)\s*\)$/,
  );
  if (central) {
    const mid = parseFullNumber(central[1]!);
    const lo = parseFullNumber(central[2]!);
    const hi = parseFullNumber(central[3]!);
    if (mid === null || lo === null || hi === null) {
      return {
        class: "other_text",
        raw: s,
        number: null,
        lower: null,
        upper: null,
        inequalityOp: null,
        notes: ["central_bounds_unparsed"],
      };
    }
    if (mid < 0 || lo < 0 || hi < 0) notes.push("negative_present");
    return {
      class: "central_with_bounds",
      raw: s,
      number: null, // do not silently choose mid without justification
      lower: lo,
      upper: hi,
      inequalityOp: null,
      notes: [...notes, `central_observed=${mid}`, "central_not_selected"],
    };
  }

  // Simple interval: 0.18-0.21 or 5–9 (entire string)
  const interval = s.match(
    /^([+-]?\d+(?:[.,]\d+)?)\s*[-–—]\s*([+-]?\d+(?:[.,]\d+)?)$/,
  );
  if (interval) {
    const lo = parseFullNumber(interval[1]!);
    const hi = parseFullNumber(interval[2]!);
    if (lo === null || hi === null) {
      return {
        class: "other_text",
        raw: s,
        number: null,
        lower: null,
        upper: null,
        inequalityOp: null,
        notes: ["interval_unparsed"],
      };
    }
    if (lo < 0 || hi < 0) notes.push("negative_present");
    return {
      class: "simple_interval",
      raw: s,
      number: null,
      lower: lo,
      upper: hi,
      inequalityOp: null,
      notes: [...notes, "interval_not_averaged"],
    };
  }

  const num = parseFullNumber(s);
  if (num !== null) {
    if (num < 0) notes.push("negative_present");
    if (num === 0) notes.push("true_zero");
    return {
      class: "number",
      raw: s,
      number: num,
      lower: null,
      upper: null,
      inequalityOp: null,
      notes,
    };
  }

  return {
    class: "other_text",
    raw: s,
    number: null,
    lower: null,
    upper: null,
    inequalityOp: null,
    notes: ["unclassified_text"],
  };
}
