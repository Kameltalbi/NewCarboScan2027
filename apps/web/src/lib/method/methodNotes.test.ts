import { describe, expect, it } from "vitest";
import { METHOD_NOTES, METHOD_NOTE_IDS, methodNoteHref } from "./methodNotes";

const REQUIRED = [
  "principes",
  "facteurs",
  "prg",
  "ges",
  "perimetres",
  "scopes",
  "procedes",
  "fugitives",
  "donnees-physiques",
  "ratios",
  "incertitude",
  "sources",
  "doubles-comptes",
  "emissions-evitees",
  "sequestration",
  "net-zero-initiative",
  "trajectoire",
  "plan-de-transition",
  "amelioration-continue",
  "communication",
];

const FORBIDDEN = [
  /Bilan Carbone/i,
  /neutralité atteinte/i,
  /organisation neutre/i,
  /émissions?\s*[-−–]\s*évité/i,
  /±\s*15/,
  /\b42\s*%/,
];

describe("methodNotes", () => {
  it("couvre les thèmes demandés, une fois chacun", () => {
    expect(METHOD_NOTE_IDS).toEqual(REQUIRED);
    expect(new Set(METHOD_NOTE_IDS).size).toBe(REQUIRED.length);
  });

  it("reste descriptif et hors du total pour les postes sensibles", () => {
    const text = METHOD_NOTES.flatMap((note) => note.paragraphs).join("\n");
    for (const pattern of FORBIDDEN) {
      expect(text).not.toMatch(pattern);
    }
    const avoided = METHOD_NOTES.find((note) => note.id === "emissions-evitees");
    expect(avoided?.paragraphs.join(" ")).toMatch(/hors du total/);
    const stored = METHOD_NOTES.find((note) => note.id === "sequestration");
    expect(stored?.paragraphs.join(" ")).toMatch(/hors du total/);
    expect(METHOD_NOTES.find((note) => note.id === "ratios")?.status).toBe("bloque");
  });

  it("ouvre une ancre de note", () => {
    expect(methodNoteHref("procedes")).toBe("/app/methode#procedes");
  });
});
