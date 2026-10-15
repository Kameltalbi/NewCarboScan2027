import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { assertReportProse } from "./proseGuard.js";

const outFlag = process.argv.indexOf("--out");
const outPath = resolve(outFlag === -1 ? "report-model.json" : process.argv[outFlag + 1]);
const model = assertReportProse();
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, `${JSON.stringify(model, null, 2)}\n`);
process.stdout.write(`${outPath}\n`);
