import { describe, expect, it } from "vitest";
import {
  consolidationLabel,
  fromOperationChoice,
  scopeKeptAfterPerimeterChange,
  suggestScopeForOperation,
} from "./consolidation";

describe("périmètre organisationnel", () => {
  it("affiche la méthode choisie", () => {
    expect(consolidationLabel("operational_control")).toBe("contrôle opérationnel");
    expect(consolidationLabel("financial_control")).toBe("contrôle financier");
  });

  it("reprend la phrase déjà imprimée quand aucune méthode n'est enregistrée", () => {
    expect(consolidationLabel(null)).toBe("contrôle opérationnel");
    expect(consolidationLabel(undefined)).toBe("contrôle opérationnel");
  });

  it("laisse le scope en place quand la méthode change", () => {
    const lines = [
      { id: "gaz", scope: 1 as const },
      { id: "achat", scope: 3 as const },
    ];
    const kept = lines.map((line) => scopeKeptAfterPerimeterChange(line));
    expect(kept.map((line) => line.scope)).toEqual([1, 3]);
  });

  it("propose le Scope 3 pour un site non opéré et laisse un Scope 1 justifié", () => {
    const line = { id: "vehicule", scope: 1 as const };
    expect(suggestScopeForOperation("not_operated")).toBe(3);
    expect(suggestScopeForOperation("operated")).toBeNull();
    expect(fromOperationChoice("unspecified")).toBeNull();
    const kept = scopeKeptAfterPerimeterChange(line);
    expect(kept.scope).toBe(1);
    expect(kept.scope).not.toBe(suggestScopeForOperation("not_operated"));
  });
});
