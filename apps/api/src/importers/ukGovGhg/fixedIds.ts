/** Deterministic UUIDs for UK Government GHG 2026 bootstrap (Option B). */

import { createHash } from "node:crypto";

/** Fixed factor_sources.id for uk_gov_ghg — documented, never random.
 *  NOTE: a1000000… = Core TN, a2000000… = ADEME (016). UK uses a3000000….
 */
export const UK_SOURCE_UUID = "a3000000-0000-4000-8000-000000000001";

/** Fixed emission_factor_versions.id for 2026-flat-1.2 — documented, never random. */
export const UK_VERSION_UUID = "a3000000-0000-4000-8000-000000000002";

/** UUID namespace for factor row ids (v5). */
export const UK_FACTOR_UUID_NAMESPACE = UK_VERSION_UUID;

/** Canonical source file basename stored in provenance (not a local path). */
export const UK_SOURCE_FILE_BASENAME =
  "ghg-conversion-factors-2026-flat-format-revised.xlsx";

/** Fixed created_at for seed rows (UTC) — no dynamic timestamps in artifact. */
export const UK_SEED_CREATED_AT = "2026-09-11T00:00:00.000Z";

function parseUuidBytes(uuid: string): Buffer {
  const hex = uuid.replace(/-/g, "");
  if (hex.length !== 32) throw new Error(`Invalid UUID: ${uuid}`);
  return Buffer.from(hex, "hex");
}

/** RFC 4122 UUID v5 (SHA-1). */
export function uuidV5(name: string, namespaceUuid: string): string {
  const ns = parseUuidBytes(namespaceUuid);
  const hash = createHash("sha1").update(ns).update(name, "utf8").digest();
  hash[6] = (hash[6]! & 0x0f) | 0x50;
  hash[8] = (hash[8]! & 0x3f) | 0x80;
  const h = hash.subarray(0, 16).toString("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`;
}

export function ukFactorUuid(stableFactorId: string): string {
  return uuidV5(stableFactorId, UK_FACTOR_UUID_NAMESPACE);
}

/**
 * Mirror of ef_factor_checksum_v2 (017):
 * encode(digest(concat_ws('|', ...), 'sha256'), 'hex')
 * value text must match (original_value::numeric)::text in PostgreSQL.
 */
export function efFactorChecksumV2(input: {
  stableFactorId: string;
  datasetVersion: string;
  name: string;
  valueText: string;
  unitNumerator: string;
  unitDenominator: string;
  countryCode: string | null;
  sourceCategory: string | null;
  factorType: string;
}): string {
  const payload = [
    input.stableFactorId ?? "",
    input.datasetVersion ?? "",
    input.name ?? "",
    input.valueText ?? "",
    input.unitNumerator ?? "",
    input.unitDenominator ?? "",
    input.countryCode ?? "",
    input.sourceCategory ?? "",
    input.factorType ?? "",
  ].join("|");
  return createHash("sha256").update(payload, "utf8").digest("hex");
}
