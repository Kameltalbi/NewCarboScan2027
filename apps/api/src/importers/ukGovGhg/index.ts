import type { Pool } from "pg";
import { runUkImport } from "./importRegistry.js";
import { normalizeUkRows } from "./normalize.js";
import {
  assertReconcileInvariants,
  parseUkWorkbook,
  reconcileUkRows,
} from "./parseWorkbook.js";
import { assertUkWorkbookSha256 } from "./sha256.js";
import type { UkImportResult } from "./types.js";

export async function importUkGovGhg2026(
  pool: Pool,
  workbookPath: string,
): Promise<UkImportResult> {
  const fileSha256 = assertUkWorkbookSha256(workbookPath);
  const rows = await parseUkWorkbook(workbookPath);
  const reconcile = reconcileUkRows(rows);
  assertReconcileInvariants(reconcile);

  const { dtos, skippedNullCo2e, componentsNotImported, secrNotImported, zerosImported } =
    normalizeUkRows(rows);

  if (dtos.length !== reconcile.kgCo2eValuedRows) {
    throw new Error(
      `DTO count ${dtos.length} != valued kg CO2e ${reconcile.kgCo2eValuedRows}`,
    );
  }

  return runUkImport(pool, {
    workbookPath,
    fileSha256,
    dtos,
    reconcile,
    skippedNullCo2e,
    componentsNotImported,
    secrNotImported,
    zerosImported,
  });
}

export * from "./types.js";
export * from "./parseWorkbook.js";
export * from "./normalize.js";
export * from "./sha256.js";
export * from "./mapUnitsLifecycle.js";
export * from "./mapGwp.js";
export * from "./mapGeography.js";
export * from "./mapTaxonomy.js";
export * from "./fixedIds.js";
export * from "./buildMetadata.js";
export * from "./generateSeed.js";
