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

const { calculate, downloadStandardReport } = vi.hoisted(() => ({
  calculate: vi.fn(),
  downloadStandardReport: vi.fn(),
}));

vi.mock("@/integrations/api/client", () => ({
  api: { downloadStandardReport: (...args: unknown[]) => downloadStandardReport(...args) },
}));
vi.mock("@/lib/calculators/BilanCarboneCalculator", () => ({
  BilanCarboneCalculator: {
    calculate: (...args: unknown[]) => calculate(...args),
  },
}));

describe("GenerateGesReport", () => {
  beforeEach(() => {
    calculate.mockReset();
    downloadStandardReport.mockReset();
    URL.createObjectURL = vi.fn(() => "blob:ges-report");
    URL.revokeObjectURL = vi.fn();
  });

  it("ouvre le PDF rédigé depuis l'inventaire publié", async () => {
    downloadStandardReport.mockResolvedValue({
      bytes: new Uint8Array([37, 80, 68, 70, 45, 49, 46, 55]),
      filename: "CarboScan_Banque-Atlas_2025_Rapport-standard.pdf",
      mime: "application/pdf",
    });
    render(<GenerateGesReport />);
    fireEvent.click(await screen.findByRole("button", { name: "Générer" }));
    expect(await screen.findByText("CarboScan_Banque-Atlas_2025_Rapport-standard.pdf")).toBeInTheDocument();
    expect(downloadStandardReport).toHaveBeenCalledWith(2025);
    expect(calculate).not.toHaveBeenCalled();
    expect(document.querySelector("object")?.getAttribute("data")).toBe("blob:ges-report");
  });

  it("affiche l'erreur au lieu d'une page vide", async () => {
    downloadStandardReport.mockRejectedValue(new Error("Aucun inventaire publié pour cet exercice."));
    render(<GenerateGesReport />);
    fireEvent.click(await screen.findByRole("button", { name: "Générer" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Aucun inventaire publié");
    expect(document.querySelector("object")).toBeNull();
  });
});
