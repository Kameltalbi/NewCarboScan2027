import { getStoredToken } from "@/integrations/api/client";
import type { CreatedSession, DiagnosticAnswer, OrgDiagnosticSummary, PublicSnapshot, SessionView } from "./types";

const API_URL =
  import.meta.env.VITE_API_URL ?? (import.meta.env.DEV ? "http://localhost:8080" : "");

export class DiagnosticRequestError extends Error {
  readonly status: number;
  readonly code: string;
  readonly missing: string[];

  constructor(status: number, code: string, message: string, missing: string[] = []) {
    super(message);
    this.status = status;
    this.code = code;
    this.missing = missing;
  }
}

async function call<T>(path: string, init: RequestInit, token?: string): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  if (token) headers.set("x-diagnostic-token", token);
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, { ...init, headers });
  } catch {
    throw new DiagnosticRequestError(0, "network", "Connexion interrompue.");
  }
  const body = (await response.json().catch(() => ({}))) as {
    error?: string;
    code?: string;
    missing?: string[];
  };
  if (!response.ok) {
    throw new DiagnosticRequestError(
      response.status,
      body.code ?? "request_failed",
      body.error ?? "La requête a échoué.",
      Array.isArray(body.missing) ? body.missing : [],
    );
  }
  return body as T;
}

export function createDiagnostic(language: "fr" | "en" | "de" | "es") {
  return call<CreatedSession>("/v1/public/diagnostics", {
    method: "POST",
    body: JSON.stringify({ language }),
  });
}

export function readDiagnostic(sessionId: string, token: string) {
  return call<SessionView>(`/v1/public/diagnostics/${sessionId}`, { method: "GET" }, token);
}

export function saveDiagnosticAnswers(
  sessionId: string,
  token: string,
  answers: Record<string, DiagnosticAnswer>,
) {
  return call<SessionView>(
    `/v1/public/diagnostics/${sessionId}/answers`,
    { method: "PUT", body: JSON.stringify({ answers }) },
    token,
  );
}

export function completeDiagnostic(sessionId: string, token: string) {
  return call<{ idempotent: boolean; snapshot: SessionView["result"] }>(
    `/v1/public/diagnostics/${sessionId}/complete`,
    { method: "POST", body: JSON.stringify({}) },
    token,
  );
}

export function requestDiagnosticReport(
  sessionId: string,
  token: string,
  input: { fullName: string; companyName: string; email: string; marketingConsent?: boolean },
) {
  return call<{ reportRequested: boolean; marketingConsent: boolean }>(
    `/v1/public/diagnostics/${sessionId}/report-request`,
    { method: "POST", body: JSON.stringify(input) },
    token,
  );
}

export function claimDiagnostic(sessionId: string, resumeToken: string) {
  return authed<{ sessionId: string; already: boolean }>("/v1/diagnostics/claim", {
    method: "POST",
    body: JSON.stringify({ sessionId, resumeToken }),
  });
}

export function listDiagnostics() {
  return authed<{ diagnostics: OrgDiagnosticSummary[] }>("/v1/diagnostics", { method: "GET" });
}

export function readOwnedDiagnostic(sessionId: string) {
  return authed<{
    sessionId: string;
    templateVersion: string;
    status: string;
    completedAt: string | null;
    result: PublicSnapshot | null;
  }>(`/v1/diagnostics/${sessionId}`, { method: "GET" });
}

async function authed<T>(path: string, init: RequestInit): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  const token = getStoredToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, { ...init, headers, credentials: "include" });
  } catch {
    throw new DiagnosticRequestError(0, "network", "Connexion interrompue.");
  }
  const body = (await response.json().catch(() => ({}))) as { error?: string; code?: string };
  if (!response.ok) {
    throw new DiagnosticRequestError(response.status, body.code ?? "request_failed", body.error ?? "Diagnostic introuvable");
  }
  return body as T;
}
