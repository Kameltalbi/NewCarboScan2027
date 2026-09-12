import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { EPA_EXPECTED_SHA256 } from "./types.js";

export function sha256File(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

export function assertEpaWorkbookSha256(path: string): string {
  const sha = sha256File(path);
  if (sha !== EPA_EXPECTED_SHA256) {
    throw new Error(
      `EPA XLSX SHA-256 mismatch: got ${sha}, expected ${EPA_EXPECTED_SHA256}`,
    );
  }
  return sha;
}
