import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildPublishedSnapshot } from "../services/bilanSnapshot.js";

describe("bilan factor snapshot", () => {
  it("keeps the closed factor after the live catalog value changes", () => {
    const catalog = { fossil_gas: 2.04 };
    const snapshot = buildPublishedSnapshot({
      frozenAt: "2026-09-29T15:00:00.000Z",
      periodStart: "2026-01-01",
      periodEnd: "2026-12-31",
      engineVersion: "bilan-ui-1",
      methodologyVersion: "bilan-carbone-ui-1",
      lines: [
        {
          lineKey: "1:scope1:fossil_gas:0",
          name: "Gaz naturel",
          category: "scope1",
          scope: 1,
          quantity: 1200,
          activityUnit: "m³",
          factorValue: catalog.fossil_gas,
          factorUnit: "kgCO2e/m³",
          factorSource: "catalogue",
          factorName: "Gaz naturel",
          resultKgCo2e: 1200 * catalog.fossil_gas,
          factorVersion: "défaut",
          factorYear: 2024,
          factorGeography: null,
        },
      ],
    });

    catalog.fossil_gas = 2.1;

    assert.equal(snapshot.lines[0].factorValue, 2.04);
    assert.equal(snapshot.lines[0].resultKgCo2e, 2448);
    assert.equal(snapshot.lines[0].factorUnit, "kgCO2e/m³");
    assert.equal(snapshot.lines[0].factorSource, "catalogue");
    assert.equal(snapshot.lines[0].factorVersion, "défaut");
    assert.equal(snapshot.lines[0].factorYear, 2024);
    assert.equal(snapshot.lines[0].factorGeography, null);
    assert.equal(snapshot.lines[0].usedAt, "2026-09-29T15:00:00.000Z");
    assert.equal(snapshot.lines[0].factorId, null);
  });
});
