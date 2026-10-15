import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { enrichReport, reportDataFromRun, type LedgerLineInput, type RunReportContext } from "@newcarboscan/reporting";
import type pg from "pg";

const execFileAsync = promisify(execFile);

export interface StandardReportFile {
  pdf: Buffer;
  filename: string;
  generated: number;
  rejected: number;
  fallback: number;
}

export async function buildStandardReport(
  client: pg.PoolClient,
  orgId: string,
  year: number,
  runId?: string,
): Promise<StandardReportFile> {
  const context = await loadRunContext(client, orgId, year, runId);
  const data = reportDataFromRun(context);
  const enriched = await enrichReport(data, undefined, { allowNetwork: true });
  const pdf = await renderPdf(enriched.model);
  const slug = context.companyName
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return {
    pdf,
    filename: `CarboScan_${slug || "Organisation"}_${year}_Rapport-standard.pdf`,
    generated: enriched.records.filter((record) => record.status === "generated").length,
    rejected: enriched.records.filter((record) => record.status === "rejected").length,
    fallback: enriched.records.filter((record) => record.status === "fallback").length,
  };
}

async function loadRunContext(
  client: pg.PoolClient,
  orgId: string,
  year: number,
  runId?: string,
): Promise<RunReportContext> {
  const org = await client.query(
    `SELECT name, sector, country, currency, consolidation_method,
            employees, annual_revenue, production_unit_label, production_unit_quantity
     FROM organizations WHERE id = $1`,
    [orgId],
  );
  if (!org.rows[0]) throw new Error("Organisation introuvable");
  const run = await client.query(
    runId
      ? `SELECT id, method, methodology_version, period_start, period_end, published_snapshot
         FROM calculation_runs
         WHERE id = $1 AND organization_id = $2 AND publish_status = 'published'`
      : `SELECT id, method, methodology_version, period_start, period_end, published_snapshot
         FROM calculation_runs
         WHERE organization_id = $1 AND publish_status = 'published'
           AND period_start IS NOT NULL
           AND EXTRACT(YEAR FROM period_start) = $2
         ORDER BY published_at DESC NULLS LAST
         LIMIT 1`,
    runId ? [runId, orgId] : [orgId, year],
  );
  if (!run.rows[0]) {
    throw new Error("Aucun inventaire publié pour cet exercice. Clôturez le bilan avant de rédiger le rapport.");
  }
  const lines = await client.query(
    `SELECT line_key, scope, activity_quantity, activity_unit, factor_value, factor_unit,
            allocation_factor, result_kgco2e, uncertainty_pct, factor_id, provenance
     FROM calculation_ledger
     WHERE run_id = $1 AND organization_id = $2
     ORDER BY line_key`,
    [run.rows[0].id, orgId],
  );
  const sites = await client.query(
    `SELECT name FROM collect_sites
     WHERE organization_id = $1 AND COALESCE(is_active, true)
     ORDER BY name`,
    [orgId],
  );
  const prior = await client.query(
    `SELECT SUM(l.result_kgco2e) FILTER (
        WHERE COALESCE(l.provenance->>'accountingClass', 'scope') <> 'biogenic_co2'
          AND COALESCE(l.provenance->>'biogenicCo2', 'false') <> 'true'
      ) AS total
     FROM calculation_runs r
     JOIN calculation_ledger l ON l.run_id = r.id
     WHERE r.organization_id = $1 AND r.publish_status = 'published'
       AND r.period_start IS NOT NULL
       AND EXTRACT(YEAR FROM r.period_start) = $2`,
    [orgId, year - 1],
  );
  const labels = snapshotLabels(run.rows[0].published_snapshot);
  const mapped: LedgerLineInput[] = lines.rows.map((row) => {
    const key = String(row.line_key);
    const meta = labels.get(key);
    const provenance = (row.provenance ?? {}) as { accountingClass?: string; biogenicCo2?: boolean };
    const biogenic = provenance.accountingClass === "biogenic_co2" || provenance.biogenicCo2 === true;
    return {
      lineKey: key,
      scope: row.scope == null ? null : Number(row.scope),
      activityQuantity: String(row.activity_quantity),
      activityUnit: String(row.activity_unit),
      factorValue: String(row.factor_value),
      factorUnit: String(row.factor_unit),
      allocationFactor: String(row.allocation_factor ?? "1"),
      resultKgCo2e: String(row.result_kgco2e),
      uncertaintyPct: row.uncertainty_pct == null ? null : String(row.uncertainty_pct),
      factorId: row.factor_id == null ? meta?.factorId ?? null : String(row.factor_id),
      factorVersion: meta?.factorVersion ?? null,
      factorSource: meta?.factorSource ?? null,
      label: meta?.label ?? null,
      category: meta?.category ?? null,
      site: null,
      dataQuality: null,
      accountingClass: biogenic ? "biogenic_co2" : "scope",
    };
  });
  const row = org.rows[0];
  const priorTotal = prior.rows[0]?.total == null ? null : String(prior.rows[0].total);
  const hasPrior = priorTotal != null && priorTotal !== "0";
  return {
    companyName: String(row.name),
    country: row.country ? String(row.country) : "",
    sector: row.sector ? String(row.sector) : "",
    sites: sites.rows.map((site) => String(site.name)),
    year,
    periodLabel: periodLabel(year, run.rows[0].period_start, run.rows[0].period_end),
    methodology: methodLabel(String(run.rows[0].method ?? "")),
    methodologyVersion: String(run.rows[0].methodology_version ?? ""),
    consolidation: row.consolidation_method === "financial_control" ? "Contrôle financier" : "Contrôle opérationnel",
    electricityAccounting: "Location-based",
    employees: row.employees == null ? null : String(row.employees),
    revenue: row.annual_revenue == null ? null : String(row.annual_revenue),
    revenueUnit: row.currency ? String(row.currency) : "unité",
    production: row.production_unit_quantity == null ? null : String(row.production_unit_quantity),
    productionUnit: row.production_unit_label ? String(row.production_unit_label) : "unité",
    priorYear: hasPrior ? year - 1 : null,
    priorTotalKgCo2e: hasPrior ? priorTotal : null,
    lines: mapped,
  };
}

function snapshotLabels(snapshot: unknown): Map<string, { label: string; category: string; factorSource: string; factorVersion: string | null; factorId: string | null }> {
  const lines = (snapshot as { lines?: Array<Record<string, unknown>> } | null)?.lines ?? [];
  const map = new Map<string, { label: string; category: string; factorSource: string; factorVersion: string | null; factorId: string | null }>();
  for (const line of lines) {
    const key = String(line.lineKey ?? "");
    if (!key) continue;
    map.set(key, {
      label: String(line.name ?? key),
      category: String(line.category ?? ""),
      factorSource: String(line.factorSource ?? ""),
      factorVersion: line.factorVersion == null ? null : String(line.factorVersion),
      factorId: line.factorId == null ? null : String(line.factorId),
    });
  }
  return map;
}

function periodLabel(year: number, start: unknown, end: unknown): string {
  if (start && end) return `${String(start).slice(0, 10)} — ${String(end).slice(0, 10)}`;
  return `Exercice ${year}`;
}

function methodLabel(method: string): string {
  if (method === "ghg_protocol") return "GHG Protocol";
  if (method === "bilan_carbone") return "Bilan Carbone";
  return method || "GHG Protocol";
}

async function renderPdf(model: unknown): Promise<Buffer> {
  const here = fileURLToPath(new URL(".", import.meta.url));
  const root = resolve(here, "../../..");
  const python = process.env.REPORT_PDF_PYTHON ?? join(root, "services/pdf/.venv/bin/python");
  const script = join(root, "services/pdf/render.py");
  const dir = await mkdtemp(join(tmpdir(), "ncs-report-"));
  const modelPath = join(dir, "model.json");
  const pdfPath = join(dir, "report.pdf");
  try {
    await writeFile(modelPath, JSON.stringify(model));
    await execFileAsync(python, [script, modelPath, "-o", pdfPath], { timeout: 60_000 });
    return await readFile(pdfPath);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
