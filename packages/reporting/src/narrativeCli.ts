import { execFile } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { promisify } from "node:util";
import { enrichReport, assertReadyToPublish } from "./ai/compose.js";
import type { ParagraphModel } from "./library/catalog.js";
import { loadPilotModels } from "./library/load.js";
import { assertModelProse } from "./proseGuard.js";

loadServerEnv(resolve(import.meta.dirname, "../../../.env"));

const outFlag = process.argv.indexOf("--out");
const outPath = resolve(outFlag === -1 ? "report-model.json" : process.argv[outFlag + 1]);
const publish = process.argv.includes("--publish");
const loaded = await loadPilotModels(readLibraryFromDatabase);
const { model, records, usage, library } = await enrichReport(undefined, undefined, { allowNetwork: true, catalog: loaded.models });
assertModelProse(model);
if (publish) assertReadyToPublish(records);

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(
  outPath,
  `${JSON.stringify({ ...model, narrative: { publication: publish ? "published" : "pending_human_review", records, usage, library, librarySource: { source: loaded.source, reason: loaded.reason } } }, null, 2)}\n`,
);
const generated = records.filter((record) => record.status === "generated").length;
const rejected = records.filter((record) => record.status === "rejected").length;
const fallback = records.filter((record) => record.status === "fallback").length;
process.stdout.write(
  `${outPath}\n${records.length} passages · générés ${generated} · rejetés ${rejected} · repli ${fallback} · jetons ${usage.totalTokens} sur ${usage.calls} appels\nbibliothèque ${loaded.source}${loaded.reason ? ` · ${loaded.reason}` : ""}\n`,
);
for (const record of records) {
  if (record.failureReason) process.stdout.write(`${record.slotKey} · ${record.status} · ${record.failureReason}\n`);
}

const execFileAsync = promisify(execFile);

async function readLibraryFromDatabase(): Promise<ParagraphModel[] | null> {
  const container = process.env.POSTGRES_CONTAINER ?? "newcarboscan-postgres";
  const user = process.env.PGUSER ?? "newcarboscan";
  const database = process.env.PGDATABASE ?? "newcarboscan";
  const { stdout } = await execFileAsync(
    "docker",
    [
      "exec",
      container,
      "psql",
      "-U",
      user,
      "-d",
      database,
      "-tA",
      "-c",
      `SELECT coalesce(json_agg(json_build_object(
        'code', code_paragraph,
        'title', title,
        'chapter', report_section,
        'analysisType', subsection,
        'rule', activation_conditions->>'regle',
        'requiredVariables', variables_list,
        'body', body_text,
        'version', version,
        'status', status
      )), '[]'::json) FROM report_paragraphs WHERE status = 'active'`,
    ],
    { timeout: 8000 },
  );
  const rows = JSON.parse(stdout.trim()) as Array<Record<string, unknown>>;
  if (!Array.isArray(rows) || rows.length === 0) return null;
  return rows.map((row) => ({
    code: String(row.code),
    title: String(row.title ?? row.code),
    chapter: String(row.chapter ?? ""),
    analysisType: String(row.analysisType ?? ""),
    rule: String(row.rule ?? ""),
    requiredVariables: Array.isArray(row.requiredVariables) ? row.requiredVariables.map(String) : [],
    body: String(row.body ?? ""),
    version: Number(row.version ?? 1),
    status: row.status === "draft" || row.status === "deprecated" ? row.status : "active",
  }));
}

function loadServerEnv(path: string) {
  let raw = "";
  try {
    raw = readFileSync(path, "utf8");
  } catch {
    return;
  }
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const index = trimmed.indexOf("=");
    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim().replace(/^["']|["']$/g, "");
    if (key && process.env[key] === undefined) process.env[key] = value;
  }
}
