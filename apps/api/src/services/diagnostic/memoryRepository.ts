import { randomUUID } from "node:crypto";
import type { AnswerMap, DiagnosticAnswer } from "./types.js";
import type { PublicSnapshot } from "./access.js";
import type {
  DiagnosticRepository,
  DiagnosticSession,
  OrgDiagnosticSummary,
  SessionLock,
} from "./repository.js";

type LeadRow = {
  fullName: string;
  companyName: string;
  email: string;
  marketingConsent: boolean;
  reportRequestedAt: string;
};

type MemoryRow = {
  session: DiagnosticSession;
  answers: AnswerMap;
  snapshot: PublicSnapshot | null;
  lead: LeadRow | null;
  organizationId: string | null;
  linkedBy: string | null;
};

export type MemoryDiagnosticRepository = DiagnosticRepository & {
  replaceAnswerForTest(sessionId: string, code: string, answer: DiagnosticAnswer): void;
};

export function createMemoryDiagnosticRepository(): MemoryDiagnosticRepository {
  const rows = new Map<string, MemoryRow>();
  const queues = new Map<string, Promise<void>>();

  function requireRow(sessionId: string): MemoryRow {
    const row = rows.get(sessionId);
    if (!row) throw new Error("missing session");
    return row;
  }

  async function withLockedSession<T>(sessionId: string, fn: (lock: SessionLock) => Promise<T>): Promise<T> {
    const previous = queues.get(sessionId) ?? Promise.resolve();
    let release: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const tail = previous.then(() => gate);
    queues.set(sessionId, tail);
    await previous;
    try {
      const row = requireRow(sessionId);
      const lock: SessionLock = {
        session: row.session,
        answers: { ...row.answers },
        async saveAnswers(answers) {
          row.answers = { ...answers };
          const country = answers.country;
          const sector = answers.sector;
          row.session = {
            ...row.session,
            country: country?.kind === "choice" ? country.value : row.session.country,
            sector: sector?.kind === "choice" ? sector.value : row.session.sector,
          };
        },
        async readSnapshot() {
          return row.snapshot ? structuredClone(row.snapshot) : null;
        },
        async storeSnapshot(snapshot) {
          row.snapshot = structuredClone(snapshot);
          row.session = {
            ...row.session,
            status: "completed",
            completedAt: row.session.completedAt ?? new Date().toISOString(),
            maturityScore: snapshot.maturityScore,
            dataReadinessScore: snapshot.dataReadinessScore,
            reliability: snapshot.reliability,
          };
        },
        async saveLead(input) {
          const now = new Date().toISOString();
          const previousLead = row.lead;
          let marketingConsent = previousLead?.marketingConsent ?? false;
          if (input.marketingConsent === true) marketingConsent = true;
          if (input.marketingConsent === false) marketingConsent = false;
          row.lead = {
            fullName: input.fullName,
            companyName: input.companyName,
            email: input.email,
            marketingConsent,
            reportRequestedAt: now,
          };
          return { marketingConsent, reportRequestedAt: now };
        },
      };
      return await fn(lock);
    } finally {
      release();
    }
  }

  return {
    async createSession(input) {
      const session: DiagnosticSession = {
        id: input.id ?? randomUUID(),
        templateVersion: input.templateVersion,
        resumeTokenHash: input.resumeTokenHash,
        language: input.language,
        status: "in_progress",
        country: null,
        sector: null,
        startedAt: new Date().toISOString(),
        completedAt: null,
        maturityScore: null,
        dataReadinessScore: null,
        reliability: null,
      };
      rows.set(session.id, {
        session,
        answers: {},
        snapshot: null,
        lead: null,
        organizationId: null,
        linkedBy: null,
      });
      return session;
    },
    async findSession(id) {
      return rows.get(id)?.session ?? null;
    },
    async listAnswers(sessionId) {
      return { ...(rows.get(sessionId)?.answers ?? {}) };
    },
    withLockedSession,
    async linkOrganization(input) {
      const row = requireRow(input.sessionId);
      if (row.organizationId === input.organizationId) return "already";
      if (row.organizationId && row.organizationId !== input.organizationId) {
        const error = new Error("duplicate key") as Error & { code?: string };
        error.code = "23505";
        throw error;
      }
      row.organizationId = input.organizationId;
      row.linkedBy = input.userId;
      return "linked";
    },
    async listForOrganization(organizationId) {
      const summaries: OrgDiagnosticSummary[] = [];
      for (const row of rows.values()) {
        if (row.organizationId !== organizationId) continue;
        summaries.push(summarize(row.session, row.snapshot));
      }
      return summaries;
    },
    async getForOrganization(organizationId, sessionId) {
      const row = rows.get(sessionId);
      if (!row || row.organizationId !== organizationId) return null;
      return {
        session: row.session,
        snapshot: row.snapshot ? structuredClone(row.snapshot) : null,
      };
    },
    replaceAnswerForTest(sessionId, code, answer) {
      const row = requireRow(sessionId);
      row.answers = { ...row.answers, [code]: answer };
    },
  };
}

function summarize(session: DiagnosticSession, snapshot: PublicSnapshot | null): OrgDiagnosticSummary {
  return {
    sessionId: session.id,
    templateVersion: session.templateVersion,
    language: session.language,
    status: session.status,
    startedAt: session.startedAt,
    completedAt: session.completedAt,
    maturityScore: session.maturityScore,
    dataReadinessScore: session.dataReadinessScore,
    reliability: session.reliability,
    maturityLevel: snapshot?.maturityLevel ?? null,
    displayLevelFr: snapshot?.presentation.displayLevelFr ?? null,
    reliabilityLimited: snapshot?.reliabilityLimited ?? null,
  };
}
