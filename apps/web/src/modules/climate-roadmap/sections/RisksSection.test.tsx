import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { RisksSection } from "./RisksSection";

vi.mock("@/integrations/api/client", () => ({
  api: { listClimateRisks: vi.fn().mockResolvedValue({ items: [] }) },
}));

describe("RisksSection", () => {
  it("propose les champs de qualification", async () => {
    render(<RisksSection actions={[]} />);
    await waitFor(() => expect(screen.getByText("Aucun risque enregistré.")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "Ajouter un risque" }));
    expect(screen.getByLabelText("Risque")).toBeInTheDocument();
    expect(screen.getByText("Catégorie")).toBeInTheDocument();
    expect(screen.getByText("Probabilité")).toBeInTheDocument();
    expect(screen.getByText("Impact")).toBeInTheDocument();
    expect(screen.getByText("Niveau de risque")).toBeInTheDocument();
    expect(screen.getByLabelText("Mesure ou adaptation")).toBeInTheDocument();
    expect(screen.getByText(/ne change pas le total du bilan/)).toBeInTheDocument();
  });
});
