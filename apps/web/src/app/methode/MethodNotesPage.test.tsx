import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { MethodNotesPage } from "./MethodNotesPage";

describe("MethodNotesPage", () => {
  it("affiche le sommaire et la réserve sur les ratios", () => {
    render(
      <MemoryRouter>
        <MethodNotesPage />
      </MemoryRouter>,
    );
    expect(screen.getByRole("navigation", { name: "Sommaire des notes de méthode" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Procédés" })).toBeInTheDocument();
    expect(screen.getByText(/Ratio monétaire non validé ABC/)).toBeInTheDocument();
    expect(screen.getAllByText(/hors du total du bilan/).length).toBeGreaterThan(0);
  });
});
