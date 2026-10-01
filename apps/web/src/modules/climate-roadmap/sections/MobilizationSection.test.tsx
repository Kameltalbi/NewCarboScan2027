import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { MobilizationSection } from "./MobilizationSection";

vi.mock("@/integrations/api/client", () => ({
  api: { listMobilizations: vi.fn().mockResolvedValue({ items: [] }) },
}));

describe("MobilizationSection", () => {
  it("propose les champs du registre et le lien fournisseurs", async () => {
    render(
      <MemoryRouter>
        <MobilizationSection actions={[]} />
      </MemoryRouter>,
    );
    await waitFor(() => expect(screen.getByText("Aucune mobilisation enregistrée.")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "Ajouter une mobilisation" }));
    expect(screen.getByText("Public")).toBeInTheDocument();
    expect(screen.getByLabelText("Parties prenantes")).toBeInTheDocument();
    expect(screen.getByLabelText("Action réalisée")).toBeInTheDocument();
    expect(screen.getByLabelText("Date")).toBeInTheDocument();
    expect(screen.getByLabelText("Responsable")).toBeInTheDocument();
    expect(screen.getByLabelText("Preuve ou support")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "module Fournisseurs" })).toHaveAttribute("href", "/app/fournisseurs");
    expect(screen.getByText(/ne change pas le total du bilan/)).toBeInTheDocument();
  });
});
