import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { SiteRollupCard } from "./SiteRollupCard";

vi.mock("@/integrations/api/client", () => ({
  api: {
    listSites: vi.fn().mockResolvedValue({
      items: [{ id: "a", name: "Usine" }],
    }),
  },
}));

describe("SiteRollupCard", () => {
  it("affiche le total et le site sans ajouter une seconde fois la ligne", async () => {
    render(
      <MemoryRouter>
        <SiteRollupCard
          organizationKg={2040}
          lines={[{ siteId: "a", scope: 1, kg: 2040 }]}
        />
      </MemoryRouter>,
    );
    expect(screen.getByText(/Total organisation : 2 tCO₂e/)).toBeInTheDocument();
    expect(await screen.findByText(/Usine : 2 tCO₂e/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Note de méthode" })).toHaveAttribute(
      "href",
      "/app/methode#doubles-comptes",
    );
  });
});
