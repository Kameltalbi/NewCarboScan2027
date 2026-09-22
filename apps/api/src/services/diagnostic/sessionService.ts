import { randomBytes } from "node:crypto";
import { DIAGNOSTIC_TEMPLATE_VERSION, type AnswerMap } from "./types.js";
import { evaluateDiagnostic } from "./engine.js";
import {
  applicableAnswers,
  hashResumeToken,
  planAnswerUpdate,
  progressOf,
  publicQuestions,
  resumeTokenMatches,
  toPublicSnapshot,
  type PublicQuestion,
  type PublicSnapshot,
} from "./access.js";
import type { DiagnosticRepository, DiagnosticSession, OrgDiagnosticSummary } from "./repository.js";

export class DiagnosticHttpError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly details: Record<string, unknown>;

  constructor(statusCode: number, code: string, message: string, details: Record<string, unknown> = {}) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

const NOT_FOUND = () =>
  new DiagnosticHttpError(404, "diagnostic_not_found", "Diagnostic introuvable");

export type SessionView = {
  sessionId: string;
  templateVersion: string;
  status: DiagnosticSession["status"];
  language: string;
  shownQuestions: PublicQuestion[];
  answers: AnswerMap;
  progress: { answered: number; total: number };
  completedAt: string | null;
  result: PublicSnapshot | null;
};

function viewOf(session: DiagnosticSession, answers: AnswerMap, result: PublicSnapshot | null): SessionView {
  return {
    sessionId: session.id,
    templateVersion: session.templateVersion,
    status: session.status,
    language: session.language,
    shownQuestions: publicQuestions(answers),
    answers,
    progress: progressOf(answers),
    completedAt: session.completedAt,
    result,
  };
}

async function authorizedSession(
  repo: DiagnosticRepository,
  sessionId: string,
  token: string | undefined,
): Promise<DiagnosticSession> {
  if (!token) throw NOT_FOUND();
  const session = await repo.findSession(sessionId);
  if (!session || !resumeTokenMatches(session.resumeTokenHash, token)) throw NOT_FOUND();
  return session;
}

function assertCurrentMethodology(session: DiagnosticSession): void {
  if (session.templateVersion !== DIAGNOSTIC_TEMPLATE_VERSION) {
    throw new DiagnosticHttpError(
      409,
      "methodology_unavailable",
      "Cette session utilise une méthodologie qui n'est plus calculable.",
    );
  }
}

export function createDiagnosticService(repo: DiagnosticRepository) {
  return {
    async create(language: string) {
      const resumeToken = randomBytes(32).toString("base64url");
      const session = await repo.createSession({
        templateVersion: DIAGNOSTIC_TEMPLATE_VERSION,
        resumeTokenHash: hashResumeToken(resumeToken),
        language,
      });
      return { resumeToken, ...viewOf(session, {}, null) };
    },

    async read(sessionId: string, token: string | undefined): Promise<SessionView> {
      const session = await authorizedSession(repo, sessionId, token);
      const answers = await repo.listAnswers(session.id);
      const result =
        session.status === "completed"
          ? await repo.withLockedSession(session.id, (lock) => lock.readSnapshot())
          : null;
      return viewOf(session, answers, result);
    },

    async saveAnswers(sessionId: string, token: string | undefined, incoming: AnswerMap): Promise<SessionView> {
      const session = await authorizedSession(repo, sessionId, token);
      return repo.withLockedSession(session.id, async (lock) => {
        if (lock.session.status === "completed") {
          throw new DiagnosticHttpError(409, "session_completed", "Ce diagnostic est déjà terminé.");
        }
        assertCurrentMethodology(lock.session);
        const plan = planAnswerUpdate(lock.answers, incoming);
        if (!plan.ok) {
          const status = plan.code === "question_not_in_path" ? 422 : 400;
          throw new DiagnosticHttpError(status, plan.code, "Réponse refusée.", { question: plan.question });
        }
        await lock.saveAnswers(plan.stored);
        return viewOf({ ...lock.session, status: "in_progress" }, plan.stored, null);
      });
    },

    async complete(sessionId: string, token: string | undefined): Promise<{ idempotent: boolean; snapshot: PublicSnapshot }> {
      const session = await authorizedSession(repo, sessionId, token);
      return repo.withLockedSession(session.id, async (lock) => {
        if (lock.session.status === "completed") {
          const stored = await lock.readSnapshot();
          if (!stored) {
            throw new DiagnosticHttpError(409, "methodology_unavailable", "Résultat figé introuvable.");
          }
          return { idempotent: true, snapshot: stored };
        }
        assertCurrentMethodology(lock.session);
        const applicable = applicableAnswers(lock.answers);
        const missing = publicQuestions(applicable)
          .map((question) => question.code)
          .filter((code) => !applicable[code]);
        if (missing.length > 0) {
          throw new DiagnosticHttpError(422, "incomplete", "Des questions du parcours sont sans réponse.", {
            missing,
          });
        }
        const evaluated = evaluateDiagnostic(applicable);
        const snapshot = toPublicSnapshot(evaluated, applicable);
        await lock.storeSnapshot(snapshot);
        return { idempotent: false, snapshot };
      });
    },

    async requestReport(
      sessionId: string,
      token: string | undefined,
      input: { fullName: string; companyName: string; email: string; marketingConsent?: boolean },
    ) {
      const session = await authorizedSession(repo, sessionId, token);
      return repo.withLockedSession(session.id, async (lock) => {
        if (lock.session.status !== "completed") {
          throw new DiagnosticHttpError(
            409,
            "report_requires_completion",
            "Le rapport se demande après la clôture du diagnostic.",
          );
        }
        const lead = await lock.saveLead({
          fullName: input.fullName,
          companyName: input.companyName,
          email: input.email,
          marketingConsent: input.marketingConsent ?? null,
        });
        return {
          reportRequested: true,
          marketingConsent: lead.marketingConsent,
        };
      });
    },

    async claim(input: { sessionId: string; resumeToken: string; organizationId: string; userId: string }) {
      const session = await authorizedSession(repo, input.sessionId, input.resumeToken);
      try {
        const outcome = await repo.linkOrganization({
          sessionId: session.id,
          organizationId: input.organizationId,
          userId: input.userId,
        });
        return { sessionId: session.id, organizationId: input.organizationId, already: outcome === "already" };
      } catch (error) {
        if ((error as { code?: string }).code === "23505") {
          throw new DiagnosticHttpError(409, "already_linked", "Ce diagnostic est déjà rattaché à une autre organisation.");
        }
        throw error;
      }
    },

    listForOrganization(organizationId: string): Promise<OrgDiagnosticSummary[]> {
      return repo.listForOrganization(organizationId);
    },

    async getForOrganization(organizationId: string, sessionId: string) {
      const found = await repo.getForOrganization(organizationId, sessionId);
      if (!found) throw NOT_FOUND();
      return {
        sessionId: found.session.id,
        templateVersion: found.session.templateVersion,
        status: found.session.status,
        completedAt: found.session.completedAt,
        result: found.snapshot,
      };
    },
  };
}
