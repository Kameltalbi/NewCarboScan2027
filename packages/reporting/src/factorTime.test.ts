import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { factorTimeLabel, factorTimeStatus } from "./factorTime.js";

describe("statut temporel des facteurs", () => {
  it("donne la priorité au jeu fictif, puis au millésime postérieur, puis au non daté", () => {
    assert.equal(factorTimeStatus("Démonstration", "core-tn-2027.1", 2025), "jeu_fictif");
    assert.equal(factorTimeStatus("Core TN", "DEMONSTRATION-1.0", 2025), "jeu_fictif");
    assert.equal(factorTimeStatus("démonstration", "core-tn-2020.1", 2025), "jeu_fictif");
    assert.equal(factorTimeStatus("Core TN", "core-tn-2027.1", 2025), "posterieur");
    assert.equal(factorTimeStatus("Core TN", "core-tn-2025.1", 2025), "non_date");
    assert.equal(factorTimeStatus("Core TN", "core-tn-2024.1", 2025), "non_date");
    assert.equal(factorTimeStatus("Core TN", "sans-millesime", 2025), "non_date");
  });

  it("n'affiche que les trois lectures prévues", () => {
    const labels = ["jeu_fictif", "posterieur", "non_date"].map((status) => factorTimeLabel(status as "jeu_fictif" | "posterieur" | "non_date"));
    assert.deepEqual(labels, ["Jeu fictif", "Postérieur", "Non daté"]);
    assert.equal(labels.includes("Antérieur" as never), false);
    assert.equal(labels.includes("Contemporain" as never), false);
  });
});
