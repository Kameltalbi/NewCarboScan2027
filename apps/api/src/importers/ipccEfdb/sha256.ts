import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { IPCC_EFDB_EXPECTED_SHA256 } from "./types.js";

export function sha256File(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

export function assertIpccEfdbWorkbookSha256(path: string): string {
  const sha = sha256File(path);
  if (sha !== IPCC_EFDB_EXPECTED_SHA256) {
    throw new Error(
      `IPCC EFDB XLSX SHA-256 mismatch: got ${sha}, expected ${IPCC_EFDB_EXPECTED_SHA256}`,
    );
  }
  return sha;
}
