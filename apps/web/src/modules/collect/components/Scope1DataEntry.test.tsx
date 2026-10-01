import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Scope1DataEntry } from "./Scope1DataEntry";

const { toast, create } = vi.hoisted(() => ({
  toast: vi.fn(),
  create: vi.fn(),
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: "user-1" } }),
}));

vi.mock("@/hooks/useOrganizationData", () => ({
  useOrganizationData: () => ({ organizationId: "org-1", referenceYear: 2026 }),
}));

vi.mock("@/hooks/useOrganizationSites", () => ({
  useOrganizationSites: () => ({ sites: [{ id: "site-1", name: "Usine" }] }),
}));

vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast }),
}));

vi.mock("@/lib/activity-data/ActivityDataService", () => ({
  ActivityDataService: { create },
}));

describe("Scope1DataEntry", () => {
  it("garde les quatre familles et ouvre la fiche procédé", () => {
    render(<MemoryRouter><Scope1DataEntry /></MemoryRouter>);

    expect(screen.getByTestId("scope1-category-fossil_fuels")).toBeInTheDocument();
    expect(screen.getByTestId("scope1-category-vehicle_fuels")).toBeInTheDocument();
    expect(screen.getByTestId("scope1-category-biomass")).toBeInTheDocument();
    expect(screen.getByTestId("scope1-category-fugitive")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Note : procédés" })).toHaveAttribute("href", "/app/methode#procedes");

    fireEvent.click(screen.getByTestId("scope1-category-process_other"));

    expect(screen.getByTestId("scope1-process-form")).toBeInTheDocument();
    expect(screen.getByLabelText("Nom du procédé *")).toBeInTheDocument();
    expect(screen.getByLabelText("Donnée d'activité *")).toBeInTheDocument();
    expect(screen.getByLabelText("Facteur d'émission *")).toBeInTheDocument();
    expect(screen.getByLabelText("Type de source")).toBeInTheDocument();
    expect(screen.getByLabelText("Incertitude (%)")).toBeInTheDocument();
    expect(screen.queryByText("Sélectionnez le type d'émission et saisissez la quantité consommée")).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId("scope1-category-fossil_fuels"));
    expect(screen.getByText("Sélectionnez le type d'émission et saisissez la quantité consommée")).toBeInTheDocument();
    expect(screen.queryByTestId("scope1-process-form")).not.toBeInTheDocument();
  });

  it("refuse l'enregistrement d'un procédé sans facteur ni émission connue", () => {
    render(<MemoryRouter><Scope1DataEntry /></MemoryRouter>);
    fireEvent.click(screen.getByTestId("scope1-category-process_other"));
    fireEvent.change(screen.getByLabelText("Nom du procédé *"), {
      target: { value: "Four" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }));

    expect(create).not.toHaveBeenCalled();
    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Fiche incomplète" }),
    );
  });
});
