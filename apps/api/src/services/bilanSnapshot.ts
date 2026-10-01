import { createHash } from "node:crypto";

export interface BilanFactorLineInput {
  lineKey: string;
  name: string;
  category: string;
  scope: 1 | 2 | 3;
  quantity: number;
  activityUnit: string;
  factorValue: number;
  factorUnit: string;
  factorSource: string;
  factorName: string;
  resultKgCo2e: number;
  factorId?: string | null;
  factorVersion?: string | null;
  factorYear?: number | null;
  factorGeography?: string | null;
}

export interface FrozenFactorLine extends BilanFactorLineInput {
  factorId: string | null;
  factorVersion: string | null;
  factorYear: number | null;
  factorGeography: string | null;
  usedAt: string;
}

export interface PublishedBilanSnapshot {
  frozenAt: string;
  engineVersion: string;
  methodologyVersion: string;
  method: "bilan_carbone";
  periodStart: string | null;
  periodEnd: string | null;
  inputHash: string;
  resultHash: string;
  lines: FrozenFactorLine[];
}

const CLOSED = new Set(["submitted", "validated"]);

export function isClosedBilanStatus(status: unknown): boolean {
  return typeof status === "string" && CLOSED.has(status);
}

export function normalizeFactorLines(
  lines: BilanFactorLineInput[],
  usedAt: string,
): FrozenFactorLine[] {
  if (lines.length === 0) {
    throw new Error("Un bilan clôturé contient au moins une ligne.");
  }
  const keys = new Set<string>();
  return lines.map((line, index) => {
    const lineKey = String(line.lineKey || "").trim() || `line-${index + 1}`;
    if (keys.has(lineKey)) {
      throw new Error(`Ligne en double : ${lineKey}`);
    }
    keys.add(lineKey);
    const quantity = Number(line.quantity);
    const factorValue = Number(line.factorValue);
    const resultKgCo2e = Number(line.resultKgCo2e);
    if (!Number.isFinite(quantity) || quantity < 0) {
      throw new Error(`Quantité invalide sur ${lineKey}`);
    }
    if (!Number.isFinite(factorValue) || factorValue < 0) {
      throw new Error(`Facteur invalide sur ${lineKey}`);
    }
    if (!Number.isFinite(resultKgCo2e) || resultKgCo2e < 0) {
      throw new Error(`Résultat invalide sur ${lineKey}`);
    }
    if (![1, 2, 3].includes(line.scope)) {
      throw new Error(`Scope invalide sur ${lineKey}`);
    }
    return {
      lineKey,
      name: String(line.name || line.factorName || line.category || lineKey),
      category: String(line.category || "other"),
      scope: line.scope,
      quantity,
      activityUnit: String(line.activityUnit || "unité"),
      factorValue,
      factorUnit: String(line.factorUnit || "kgCO2e"),
      factorSource: String(line.factorSource || "Non trouvé"),
      factorName: String(line.factorName || line.name || lineKey),
      resultKgCo2e,
      factorId: line.factorId ?? null,
      factorVersion: line.factorVersion ?? null,
      factorYear: line.factorYear ?? null,
      factorGeography: line.factorGeography ?? null,
      usedAt,
    };
  });
}

export function buildPublishedSnapshot(input: {
  lines: BilanFactorLineInput[];
  frozenAt: string;
  periodStart: string | null;
  periodEnd: string | null;
  engineVersion: string;
  methodologyVersion: string;
}): PublishedBilanSnapshot {
  const lines = normalizeFactorLines(input.lines, input.frozenAt);
  const canonical = JSON.stringify(lines);
  return {
    frozenAt: input.frozenAt,
    engineVersion: input.engineVersion,
    methodologyVersion: input.methodologyVersion,
    method: "bilan_carbone",
    periodStart: input.periodStart,
    periodEnd: input.periodEnd,
    inputHash: createHash("sha256").update(canonical).digest("hex"),
    resultHash: createHash("sha256")
      .update(lines.map((line) => String(line.resultKgCo2e)).join("|"))
      .digest("hex"),
    lines,
  };
}
