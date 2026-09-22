import type { DiagnosticAnswer, PublicQuestion } from "./types";

const RESUME_KEY = "ncs_diagnostic_360";

export type DiagnosticResume = { sessionId: string; resumeToken: string };

export function readResume(): DiagnosticResume | null {
  try {
    const raw = localStorage.getItem(RESUME_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<DiagnosticResume>;
    if (typeof parsed.sessionId !== "string" || typeof parsed.resumeToken !== "string") return null;
    if (!parsed.sessionId || !parsed.resumeToken) return null;
    return { sessionId: parsed.sessionId, resumeToken: parsed.resumeToken };
  } catch {
    return null;
  }
}

export function writeResume(resume: DiagnosticResume) {
  localStorage.setItem(RESUME_KEY, JSON.stringify({ sessionId: resume.sessionId, resumeToken: resume.resumeToken }));
}

export function clearResume() {
  localStorage.removeItem(RESUME_KEY);
}

export function progressPercent(progress: { answered: number; total: number }): number {
  if (progress.total <= 0) return 0;
  return Math.round((100 * progress.answered) / progress.total);
}

export function questionText(question: PublicQuestion, english: boolean): string {
  return english ? question.labelEn : question.labelFr;
}

export function optionText(option: PublicQuestion["options"][number], english: boolean): string {
  return english ? option.labelEn : option.labelFr;
}

export function axisText(question: PublicQuestion, english: boolean): string | null {
  return english ? question.axisLabelEn : question.axisLabelFr;
}

export function splitOptions(question: PublicQuestion) {
  return {
    main: question.options.filter((option) => option.value !== "unknown"),
    unknown: question.options.find((option) => option.value === "unknown") ?? null,
  };
}

export function shownAnswer(
  answers: Record<string, DiagnosticAnswer>,
  question: PublicQuestion,
): DiagnosticAnswer | null {
  return answers[question.code] ?? null;
}

export function selectionFromAnswer(answer: DiagnosticAnswer | null): {
  choice: string | null;
  multi: string[];
  quantity: string;
} {
  if (!answer) return { choice: null, multi: [], quantity: "" };
  if (answer.kind === "unknown") return { choice: "unknown", multi: [], quantity: "" };
  if (answer.kind === "multi") return { choice: null, multi: answer.values, quantity: "" };
  if (answer.kind === "number") return { choice: null, multi: [], quantity: String(answer.value) };
  if (answer.value === "unknown") return { choice: "unknown", multi: [], quantity: "" };
  return { choice: answer.value, multi: [], quantity: "" };
}

export function parseQuantity(raw: string): number | null {
  const normalized = raw.trim().replace(/\s/g, "").replace(",", ".");
  if (!/^\d+(\.\d+)?$/.test(normalized)) return null;
  const value = Number(normalized);
  if (!Number.isFinite(value) || value < 0) return null;
  return value;
}

export function formatQuantity(value: number): string {
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(value);
}

export function buildAnswer(
  question: PublicQuestion,
  selection: { choice: string | null; multi: string[]; quantity: string },
): DiagnosticAnswer | null {
  if (question.type === "multi") {
    if (selection.choice === "unknown") return { kind: "unknown" };
    if (selection.multi.length === 0) return null;
    return { kind: "multi", values: selection.multi };
  }
  if (question.type === "number") {
    if (selection.choice === "unknown") return { kind: "unknown" };
    const value = parseQuantity(selection.quantity);
    if (value == null) return null;
    return { kind: "number", value };
  }
  if (!selection.choice) return null;
  if (selection.choice === "unknown") return { kind: "unknown" };
  return { kind: "choice", value: selection.choice };
}

/** Next index in the path returned by the API. No local visibility rules. */
export function indexAfterSave(currentCode: string, questions: PublicQuestion[]): number {
  const index = questions.findIndex((question) => question.code === currentCode);
  if (index < 0) return 0;
  return Math.min(index + 1, questions.length - 1);
}

export function indexBefore(currentCode: string, questions: PublicQuestion[]): number {
  const index = questions.findIndex((question) => question.code === currentCode);
  if (index <= 0) return 0;
  return index - 1;
}

export function firstUnansweredIndex(
  questions: PublicQuestion[],
  answers: Record<string, DiagnosticAnswer>,
): number {
  const index = questions.findIndex((question) => !answers[question.code]);
  return index < 0 ? Math.max(questions.length - 1, 0) : index;
}

export function axisJustCompleted(
  current: PublicQuestion,
  next: PublicQuestion | null,
): string | null {
  if (!current.axisId) return null;
  if (next?.axisId === current.axisId) return null;
  return current.axisId;
}

const MODULE_LINKS: Record<string, { href: string; labelFr: string; labelEn: string }> = {
  bilan: { href: "/bilan-carbone", labelFr: "Démarrer un bilan carbone", labelEn: "Start a carbon inventory" },
  collect: { href: "/collect", labelFr: "Organiser la collecte", labelEn: "Organise data collection" },
  wattbim: { href: "/wattbim", labelFr: "Suivre l'énergie avec WattBim", labelEn: "Track energy with WattBim" },
  pcaf: { href: "/bilan-carbone-finance", labelFr: "Adapter la mesure au secteur financier", labelEn: "Adapt measurement for finance" },
  pcf: { href: "/empreinte-produit", labelFr: "Mesurer l'empreinte produit", labelEn: "Measure product footprint" },
  cbam: { href: "/cbam", labelFr: "Vérifier votre exposition MACF", labelEn: "Check your CBAM exposure" },
  history: { href: "/contact", labelFr: "Échanger avec CarboScan", labelEn: "Talk with CarboScan" },
  contact: { href: "/contact", labelFr: "Échanger avec CarboScan", labelEn: "Talk with CarboScan" },
};

export function moduleLink(module: string, english: boolean): { href: string; label: string } | null {
  const link = MODULE_LINKS[module];
  if (!link) return null;
  return { href: link.href, label: english ? link.labelEn : link.labelFr };
}

export const RESULT_AXIS_LABELS: Record<string, { fr: string; en: string }> = {
  measure: { fr: "Mesure carbone", en: "Carbon measurement" },
  energy: { fr: "Énergie", en: "Energy" },
  mobility: { fr: "Mobilité", en: "Mobility" },
  purchases: { fr: "Achats & chaîne de valeur", en: "Purchasing & value chain" },
  steering: { fr: "Réduction & pilotage", en: "Reduction & steering" },
  governance: { fr: "Gouvernance carbone", en: "Carbon governance" },
};
