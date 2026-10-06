import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GenerateGesReport } from "./GenerateGesReport";

vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock("@/hooks/useOrganizationId", () => ({ useOrganizationId: () => ({ organizationId: "org-1" }) }));
vi.mock("@/hooks/useOrganizationData", () => ({
  useOrganizationData: () => ({
    organization: { name: "Banque Atlas", financed_emissions_enabled: false, currency: "TND" },
  }),
}));
vi.mock("@/hooks/useOrganizationYears", () => ({
  useOrganizationYears: () => ({ defaultYear: 2025, allowedYears: [2025] }),
}));
vi.mock("@/hooks/useOrganizationSites", () => ({ useOrganizationSites: () => ({ sites: [] }) }));

const calculate = vi.fn();
vi.mock("@/lib/calculators/BilanCarboneCalculator", () => ({
  BilanCarboneCalculator: {
    calculate: (...args: unknown[]) => calculate(...args),
  },
}));

const bilan = {
  totalEmissions: 1_500_000,
  scope1: 400_000,
  scope2: 300_000,
  scope3: 800_000,
  breakdown: [{ category: "Gaz", emissions: 400_000, percentage: 26.7 }],
  detailedBreakdown: [
    { category: "Énergie", subcategory: "Gaz", emissions: 400_000, scope: 1 as const, dataQuality: "real" as const },
    { category: "Énergie", subcategory: "Électricité", emissions: 300_000, scope: 2 as const, dataQuality: "real" as const },
    { category: "Achats", subcategory: "Services", emissions: 800_000, scope: 3 as const, dataQuality: "estimated" as const },
  ],
};

describe("GenerateGesReport", () => {
  beforeEach(() => {
    calculate.mockReset();
    URL.createObjectURL = vi.fn(() => "blob:ges-report");
    URL.revokeObjectURL = vi.fn();
  });

  it("ouvre le PDF à l'écran", async () => {
    calculate.mockResolvedValue(bilan);
    render(<GenerateGesReport />);
    fireEvent.click(await screen.findByRole("button", { name: "Générer" }));
    expect(await screen.findByText("CarboScan_Banque-Atlas_2025_Rapport-GES.pdf")).toBeInTheDocument();
    expect(document.querySelector("object")?.getAttribute("data")).toBe("blob:ges-report");
    expect(screen.getByRole("link", { name: "Télécharger" })).toHaveAttribute("download", "CarboScan_Banque-Atlas_2025_Rapport-GES.pdf");
  });

  it("affiche l'erreur au lieu d'une page vide", async () => {
    calculate.mockRejectedValue(new Error("Bilan indisponible"));
    render(<GenerateGesReport />);
    fireEvent.click(await screen.findByRole("button", { name: "Générer" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Bilan indisponible");
    expect(document.querySelector("object")).toBeNull();
  });
});
