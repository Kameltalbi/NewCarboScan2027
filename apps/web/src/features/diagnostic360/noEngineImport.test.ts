import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function filesUnder(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return filesUnder(path);
    return /\.(ts|tsx)$/.test(name) ? [path] : [];
  });
}

describe("diagnostic frontend boundary", () => {
  it("never imports the scoring engine or the free bilan calculator", () => {
    const root = join(process.cwd(), "src/features/diagnostic360");
    const offenders = filesUnder(root).filter((path) => {
      if (path.endsWith(".test.ts") || path.endsWith(".test.tsx")) return false;
      const source = readFileSync(path, "utf8");
      return /evaluateDiagnostic|services\/diagnostic\/engine|services\/diagnostic\/catalog|free-bilan\/calculate/.test(source);
    });
    expect(offenders).toEqual([]);
  });
});
