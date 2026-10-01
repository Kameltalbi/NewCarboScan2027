import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { IntensityCard } from "./IntensityCard";

vi.mock("@/integrations/api/client", () => ({
  api: {
    getOrganization: vi.fn().mockResolvedValue({
      organization: {
        employees: 10,
        totalSurface: null,
        annualRevenue: null,
        currency: "TND",
        productionUnitLabel: null,
        productionUnitQuantity: null,
      },
    }),
    listSites: vi.fn().mockResolvedValue({ items: [] }),
  },
}));

describe("IntensityCard", () => {
  it("affiche 10 t par salarié et pas d'unité produite", async () => {
    render(<IntensityCard totalKg={100_000} />);
    expect(await screen.findByText(/Par salarié : 10 tCO₂e \/ salarié/)).toBeInTheDocument();
    expect(screen.queryByText(/pièce|unité produite/i)).not.toBeInTheDocument();
  });
});
