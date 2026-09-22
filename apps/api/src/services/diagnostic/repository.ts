import type { AnswerMap } from "./types.js";
import type { PublicSnapshot } from "./access.js";

export type SessionStatus = "in_progress" | "completed" | "abandoned";

export type DiagnosticSession = {
  id: string;
  templateVersion: string;
  resumeTokenHash: string;
  language: string;
  status: SessionStatus;
  country: string | null;
  sector: string | null;
  startedAt: string;
  completedAt: string | null;
  maturityScore: number | null;
  dataReadinessScore: number | null;
  reliability: "high" | "medium" | "low" | null;
};

export type OrgDiagnosticSummary = {
  sessionId: string;
  templateVersion: string;
  language: string;
  status: SessionStatus;
  startedAt: string;
  completedAt: string | null;
  maturityScore: number | null;
  dataReadinessScore: number | null;
  reliability: "high" | "medium" | "low" | null;
  maturityLevel: string | null;
  displayLevelFr: string | null;
  reliabilityLimited: boolean | null;
};

export type SessionLock = {
  session: DiagnosticSession;
  answers: AnswerMap;
  saveAnswers(answers: AnswerMap): Promise<void>;
  readSnapshot(): Promise<PublicSnapshot | null>;
  storeSnapshot(snapshot: PublicSnapshot): Promise<void>;
  saveLead(input: {
    fullName: string;
    companyName: string;
    email: string;
    marketingConsent: boolean | null;
  }): Promise<{ marketingConsent: boolean; reportRequestedAt: string }>;
};

export type DiagnosticRepository = {
  createSession(input: {
    id?: string;
    templateVersion: string;
    resumeTokenHash: string;
    language: string;
  }): Promise<DiagnosticSession>;
  findSession(id: string): Promise<DiagnosticSession | null>;
  listAnswers(sessionId: string): Promise<AnswerMap>;
  withLockedSession<T>(sessionId: string, fn: (lock: SessionLock) => Promise<T>): Promise<T>;
  linkOrganization(input: {
    sessionId: string;
    organizationId: string;
    userId: string;
  }): Promise<"linked" | "already">;
  listForOrganization(organizationId: string): Promise<OrgDiagnosticSummary[]>;
  getForOrganization(
    organizationId: string,
    sessionId: string,
  ): Promise<{ session: DiagnosticSession; snapshot: PublicSnapshot | null } | null>;
};
