import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { DiagnosticExperience } from "./DiagnosticExperience";

vi.mock("./api", () => ({
  createDiagnostic: vi.fn(),
  readDiagnostic: vi.fn(),
  saveDiagnosticAnswers: vi.fn(),
  completeDiagnostic: vi.fn(),
  requestDiagnosticReport: vi.fn(),
  DiagnosticRequestError: class DiagnosticRequestError extends Error {
    status: number;
    code: string;
    missing: string[];
    constructor(status: number, code: string, message: string, missing: string[] = []) {
      super(message);
      this.status = status;
      this.code = code;
      this.missing = missing;
    }
  },
}));

import { completeDiagnostic, createDiagnostic, readDiagnostic, saveDiagnosticAnswers } from "./api";

const question = {
  code: "country",
  type: "single" as const,
  labelFr: "Pays principal",
  labelEn: "Main country",
  axisId: null,
  axisLabelFr: null,
  axisLabelEn: null,
  options: [
    { value: "TN", labelFr: "Tunisie", labelEn: "Tunisia" },
    { value: "EU", labelFr: "Union européenne", labelEn: "European Union" },
  ],
};

const created = {
  sessionId: "session-1",
  resumeToken: "token-1",
  templateVersion: "diag-360-2026.1",
  status: "in_progress" as const,
  language: "fr",
  shownQuestions: [question],
  answers: {},
  progress: { answered: 0, total: 1 },
  result: null,
};

function renderDiagnostic() {
  return render(
    <MemoryRouter>
      <DiagnosticExperience language="fr" />
    </MemoryRouter>,
  );
}

describe("diagnostic experience", () => {
  beforeEach(() => {
    vi.mocked(readDiagnostic).mockReset();
    vi.mocked(createDiagnostic).mockReset();
    vi.mocked(saveDiagnosticAnswers).mockReset();
    vi.mocked(completeDiagnostic).mockReset();
    localStorage.getItem = vi.fn().mockReturnValue(null);
    localStorage.setItem = vi.fn();
    localStorage.removeItem = vi.fn();
  });

  it("shows the maturity introduction without asking for an email", async () => {
    renderDiagnostic();
    expect(await screen.findByRole("heading", { level: 1, name: /maturité carbone/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Commencer mon diagnostic/i })).toBeInTheDocument();
    expect(screen.getByText(/ne constitue pas un bilan/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/email/i)).not.toBeInTheDocument();
  });

  it("does not advance before an answer is chosen", async () => {
    vi.mocked(createDiagnostic).mockResolvedValue(created);
    const user = { click: (element: HTMLElement) => fireEvent.click(element) };
    renderDiagnostic();
    await user.click(await screen.findByRole("button", { name: /Commencer mon diagnostic/i }));
    expect(await screen.findByRole("heading", { level: 2, name: "Pays principal" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Voir mon diagnostic" }));
    expect(saveDiagnosticAnswers).not.toHaveBeenCalled();
    expect(await screen.findByRole("alert")).toHaveTextContent(/Choisissez une réponse/i);
  });

  it("resumes after refresh and shows API progress", async () => {
    localStorage.getItem = vi.fn().mockReturnValue(JSON.stringify({ sessionId: "session-1", resumeToken: "token-1" }));
    vi.mocked(readDiagnostic).mockResolvedValue({
      ...created,
      answers: {},
      progress: { answered: 6, total: 18 },
      shownQuestions: [question],
    });
    renderDiagnostic();
    expect(await screen.findByText("33 % complété")).toBeInTheDocument();
    expect(screen.queryByText(/\/ 24/)).not.toBeInTheDocument();
  });

  it("shows the reliability warning and ignores a second complete click", async () => {
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query.includes("767"),
      media: query,
      onchange: null,
      addListener: () => undefined,
      removeListener: () => undefined,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      dispatchEvent: () => false,
    }));
    vi.mocked(createDiagnostic).mockResolvedValue(created);
    vi.mocked(saveDiagnosticAnswers).mockResolvedValue({
      ...created,
      answers: { country: { kind: "choice", value: "TN" } },
      progress: { answered: 1, total: 1 },
    });
    let completeCalls = 0;
    vi.mocked(completeDiagnostic).mockImplementation(async () => {
      completeCalls += 1;
      await new Promise((resolve) => setTimeout(resolve, 30));
      return {
        idempotent: completeCalls > 1,
        snapshot: {
          templateVersion: "diag-360-2026.1",
          maturityScore: 18,
          maturityLevel: "initial",
          presentation: {
            scoreQualifierFr: "Maturité estimée",
            scoreQualifierEn: "Estimated maturity",
            level: "initial",
            levelLabelFr: "Initial",
            levelLabelEn: "Initial",
            reliabilityWarningFr: "Fiabilité limitée : trop de réponses « Je ne sais pas ».",
            reliabilityWarningEn: "Limited reliability.",
            displayLevelFr: "Initial. Fiabilité limitée : trop de réponses « Je ne sais pas ».",
            displayLevelEn: "Initial. Limited reliability.",
          },
          dataReadinessScore: 28,
          reliability: "low",
          reliabilityLimited: true,
          axisScores: [{ axisId: "measure", maturity: 10 }],
          recommendations: [
            {
              id: "no_ghg_inventory",
              axisId: "measure",
              priority: "high",
              module: "bilan",
              titleFr: "Réaliser un premier bilan",
              titleEn: "Complete a first inventory",
              bodyFr: "Aucune mesure n'est encore en place.",
              bodyEn: "No measurement is in place yet.",
            },
          ],
          applicableAnswers: { country: { kind: "choice", value: "TN" } },
        },
      };
    });
    const user = { click: (element: HTMLElement) => fireEvent.click(element) };
    renderDiagnostic();
    await user.click(await screen.findByRole("button", { name: /Commencer mon diagnostic/i }));
    await user.click(await screen.findByRole("radio", { name: "Tunisie" }));
    const see = screen.getByRole("button", { name: "Voir mon diagnostic" });
    await user.click(see);
    await user.click(see);
    expect(await screen.findByRole("alert")).toHaveTextContent(/Fiabilité limitée/i);
    expect(screen.getByText("18")).toBeInTheDocument();
    expect(completeCalls).toBe(1);
    const consent = screen.getByRole("checkbox");
    expect(consent).not.toBeChecked();
    expect(consent).not.toBeRequired();
    expect(screen.getByRole("link", { name: /Politique de confidentialité/i })).toHaveAttribute("href", "/privacy-policy");
  });
});
