import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { UK_EXPECTED_SHA256 } from "./types.js";

export function sha256File(path: string): string {
  const buf = readFileSync(path);
  return createHash("sha256").update(buf).digest("hex");
}

export function assertUkWorkbookSha256(path: string): string {
  const actual = sha256File(path);
  if (actual !== UK_EXPECTED_SHA256) {
    throw new Error(
      `UK workbook SHA-256 mismatch.\n expected: ${UK_EXPECTED_SHA256}\n actual:   ${actual}`,
    );
  }
  return actual;
}
