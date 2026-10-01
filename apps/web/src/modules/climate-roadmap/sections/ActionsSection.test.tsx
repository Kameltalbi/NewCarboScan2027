import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ActionsSection } from "./ActionsSection";

vi.mock("@/integrations/api/client", () => ({
  api: { listSites: vi.fn().mockResolvedValue({ items: [] }) },
}));

describe("ActionsSection", () => {
  it("propose les types et le potentiel estimé", () => {
    render(
      <MemoryRouter>
        <ActionsSection actions={[]} levers={[]} onCreateAction={async () => undefined} onUpdateAction={async () => true} />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getAllByRole("button", { name: "Créer une action" })[0]);
    expect(screen.getByText("Type d'action")).toBeInTheDocument();
    expect(screen.getByLabelText("Poste")).toBeInTheDocument();
    expect(screen.getByLabelText("Responsable")).toBeInTheDocument();
    expect(screen.getByLabelText("Potentiel estimé (tCO₂e)")).toBeInTheDocument();
    expect(screen.getByText("Méthode d'estimation")).toBeInTheDocument();
    expect(screen.getByLabelText("Indicateur")).toBeInTheDocument();
  });
});
