import { describe, expect, it } from "vitest";
import { mobilizationDateInput, toMobilizationPayload } from "./mobilization";

describe("toMobilizationPayload", () => {
  it("relit le public, les parties, l'action, la date, le responsable et le support", () => {
    const payload = toMobilizationPayload({
      audience: "management",
      stakeholders: "Comité de direction",
      title: "Réunion de lancement",
      occurredOn: "2026-03-12",
      ownerName: "Amina",
      support: "Ordre du jour",
      actionId: "",
    });
    expect(payload).toEqual({
      audience: "management",
      stakeholders: "Comité de direction",
      title: "Réunion de lancement",
      occurred_on: "2026-03-12",
      owner_name: "Amina",
      support: "Ordre du jour",
      action_id: null,
    });
    expect(payload).not.toHaveProperty("emissions");
  });

  it("accepte un support vide et une action du plan", () => {
    const payload = toMobilizationPayload({
      audience: "suppliers",
      stakeholders: "Fournisseurs emballage",
      title: "Atelier de collecte",
      occurredOn: "2026-04-02",
      ownerName: "Karim",
      support: "  ",
      actionId: "11111111-1111-4111-8111-111111111111",
    });
    expect(payload).toMatchObject({
      support: null,
      action_id: "11111111-1111-4111-8111-111111111111",
    });
  });

  it("refuse une date absente", () => {
    expect(toMobilizationPayload({
      audience: "employees",
      stakeholders: "Équipe site",
      title: "Sensibilisation",
      occurredOn: "",
      ownerName: "Leïla",
      support: "",
      actionId: "",
    })).toEqual({ error: "La date est requise." });
  });
});

describe("mobilizationDateInput", () => {
  it("restaure le jour calendaire local", () => {
    const localMidnight = new Date(2026, 0, 1, 0, 0, 0);
    expect(mobilizationDateInput(localMidnight.toISOString())).toBe("2026-01-01");
  });
});
