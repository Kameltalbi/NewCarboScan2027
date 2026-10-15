import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { ateliersDuSahel } from "./fixtures/ateliersDuSahel.js";
import { buildChapter6Preview } from "./library/preview.js";
import { assertReportProse } from "./proseGuard.js";

const outFlag = process.argv.indexOf("--out");
const previewPath = resolve(outFlag === -1 ? "ch06-preview.json" : process.argv[outFlag + 1]);
const beforePath = previewPath.replace(/\.ch06-preview\.json$/, ".ch06-avant.json");
const before = assertReportProse(ateliersDuSahel);
const preview = buildChapter6Preview(ateliersDuSahel);

mkdirSync(dirname(previewPath), { recursive: true });
writeFileSync(beforePath, `${JSON.stringify(before, null, 2)}\n`);
writeFileSync(
  previewPath,
  `${JSON.stringify({ ...preview.model, preview: { activated: preview.activated, selections: preview.selections } }, null, 2)}\n`,
);
const proposed = preview.selections.filter((item) => item.rendered).length;
process.stdout.write(`${beforePath}\n${previewPath}\n${proposed} textes proposés · activation ${preview.activated}\n`);
