/** Deterministic UUIDs for IPCC EFDB bootstrap. */

import { createHash } from "node:crypto";

/** a1000000… Core · a2000000… ADEME · a3000000… UK · a4000000… EPA · a5000000… IPCC EFDB */
export const IPCC_EFDB_SOURCE_UUID = "a5000000-0000-4000-8000-000000000001";
export const IPCC_EFDB_VERSION_UUID = "a5000000-0000-4000-8000-000000000002";
export const IPCC_EFDB_FACTOR_UUID_NAMESPACE = IPCC_EFDB_VERSION_UUID;

export const IPCC_EFDB_SOURCE_FILE_BASENAME = "EFDB_output.xlsx";
export const IPCC_EFDB_SEED_CREATED_AT = "2026-09-12T00:00:00.000Z";

function parseUuidBytes(uuid: string): Buffer {
  const hex = uuid.replace(/-/g, "");
  if (hex.length !== 32) throw new Error(`Invalid UUID: ${uuid}`);
  return Buffer.from(hex, "hex");
}

export function uuidV5(name: string, namespaceUuid: string): string {
  const ns = parseUuidBytes(namespaceUuid);
  const hash = createHash("sha1").update(ns).update(name, "utf8").digest();
  hash[6] = (hash[6]! & 0x0f) | 0x50;
  hash[8] = (hash[8]! & 0x3f) | 0x80;
  const h = hash.subarray(0, 16).toString("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`;
}

export function ipccEfdbFactorUuid(stableFactorId: string): string {
  return uuidV5(stableFactorId, IPCC_EFDB_FACTOR_UUID_NAMESPACE);
}

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
