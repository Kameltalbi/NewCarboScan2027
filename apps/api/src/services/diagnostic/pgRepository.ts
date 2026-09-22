import { randomUUID } from "node:crypto";
import type { PoolClient } from "pg";
import { rawPool, withOrgClient } from "../../db.js";
import type { AnswerMap, DiagnosticAnswer } from "./types.js";
import type { PublicSnapshot } from "./access.js";
import type {
  DiagnosticRepository,
  DiagnosticSession,
  OrgDiagnosticSummary,
  SessionLock,
} from "./repository.js";

type SessionDb = {
  id: string;
  template_version: string;
  resume_token_hash: string;
  language: string;
  status: DiagnosticSession["status"];
  country: string | null;
  sector: string | null;
  started_at: Date;
  completed_at: Date | null;
  maturity_score: number | null;
  data_readiness_score: number | null;
  reliability: DiagnosticSession["reliability"];
};

function mapSession(row: SessionDb): DiagnosticSession {
  return {
    id: row.id,
    templateVersion: row.template_version,
    resumeTokenHash: row.resume_token_hash,
    language: row.language,
    status: row.status,
    country: row.country,
    sector: row.sector,
    startedAt: row.started_at.toISOString(),
    completedAt: row.completed_at ? row.completed_at.toISOString() : null,
    maturityScore: row.maturity_score,
    dataReadinessScore: row.data_readiness_score,
    reliability: row.reliability,
  };
}

async function readAnswers(client: PoolClient, sessionId: string): Promise<AnswerMap> {
  const { rows } = await client.query<{ question_code: string; value: DiagnosticAnswer }>(
    `SELECT question_code, value FROM diagnostic_answers WHERE session_id = $1`,
    [sessionId],
  );
  const answers: AnswerMap = {};
  for (const row of rows) answers[row.question_code] = row.value;
  return answers;
}

function lockFor(client: PoolClient, session: DiagnosticSession, answers: AnswerMap): SessionLock {
  return {
    session,
    answers,
    async saveAnswers(next) {
      const clientAnswers = next;
      for (const [code, value] of Object.entries(clientAnswers)) {
        await client.query(
          `INSERT INTO diagnostic_answers (session_id, question_code, value)
           VALUES ($1, $2, $3::jsonb)
           ON CONFLICT (session_id, question_code)
           DO UPDATE SET value = EXCLUDED.value, answered_at = now()`,
          [session.id, code, JSON.stringify(value)],
        );
      }
      const country = next.country?.kind === "choice" ? next.country.value : null;
      const sector = next.sector?.kind === "choice" ? next.sector.value : null;
      if (country || sector) {
        await client.query(
          `UPDATE diagnostic_sessions
             SET country = COALESCE($2, country), sector = COALESCE($3, sector)
           WHERE id = $1`,
          [session.id, country, sector],
        );
      }
    },
    async readSnapshot() {
      const { rows } = await client.query<{ snapshot: PublicSnapshot }>(
        `SELECT snapshot FROM diagnostic_results WHERE session_id = $1`,
        [session.id],
      );
      return rows[0]?.snapshot ?? null;
    },
    async storeSnapshot(snapshot) {
      await client.query(
        `INSERT INTO diagnostic_results (session_id, template_version, snapshot)
         VALUES ($1, $2, $3::jsonb)`,
        [session.id, snapshot.templateVersion, JSON.stringify(snapshot)],
      );
      await client.query(
        `UPDATE diagnostic_sessions
           SET status = 'completed',
               completed_at = now(),
               maturity_score = $2,
               data_readiness_score = $3,
               reliability = $4
         WHERE id = $1`,
        [session.id, snapshot.maturityScore, snapshot.dataReadinessScore, snapshot.reliability],
      );
    },
    async saveLead(input) {
      const { rows } = await client.query<{ marketing_consent: boolean; report_requested_at: Date }>(
        `INSERT INTO diagnostic_leads (
           session_id, full_name, company_name, email, marketing_consent, marketing_consent_at, report_requested_at
         ) VALUES (
           $1, $2, $3, $4, COALESCE($5, false),
           CASE WHEN $5 IS TRUE THEN now() ELSE NULL END,
           now()
         )
         ON CONFLICT (session_id) DO UPDATE SET
           full_name = EXCLUDED.full_name,
           company_name = EXCLUDED.company_name,
           email = EXCLUDED.email,
           marketing_consent = CASE
             WHEN $5::boolean IS NULL THEN diagnostic_leads.marketing_consent
             ELSE $5::boolean
           END,
           marketing_consent_at = CASE
             WHEN $5::boolean IS TRUE AND diagnostic_leads.marketing_consent IS NOT TRUE THEN now()
             WHEN $5::boolean IS FALSE THEN NULL
             ELSE diagnostic_leads.marketing_consent_at
           END,
           report_requested_at = now()
         RETURNING marketing_consent, report_requested_at`,
        [session.id, input.fullName, input.companyName, input.email, input.marketingConsent],
      );
      const row = rows[0];
      if (!row) throw new Error("lead was not stored");
      return {
        marketingConsent: row.marketing_consent,
        reportRequestedAt: row.report_requested_at.toISOString(),
      };
    },
  };
}

export function createPgDiagnosticRepository(): DiagnosticRepository {
  return {
    async createSession(input) {
      const id = input.id ?? randomUUID();
      const { rows } = await rawPool.query<SessionDb>(
        `INSERT INTO diagnostic_sessions (id, template_version, resume_token_hash, language)
         VALUES ($1, $2, $3, $4)
         RETURNING id, template_version, resume_token_hash, language, status, country, sector,
                   started_at, completed_at, maturity_score, data_readiness_score, reliability`,
        [id, input.templateVersion, input.resumeTokenHash, input.language],
      );
      const row = rows[0];
      if (!row) throw new Error("session was not created");
      return mapSession(row);
    },
    async findSession(id) {
      const { rows } = await rawPool.query<SessionDb>(
        `SELECT id, template_version, resume_token_hash, language, status, country, sector,
                started_at, completed_at, maturity_score, data_readiness_score, reliability
         FROM diagnostic_sessions WHERE id = $1`,
        [id],
      );
      return rows[0] ? mapSession(rows[0]) : null;
    },
    async listAnswers(sessionId) {
      const client = await rawPool.connect();
      try {
        return await readAnswers(client, sessionId);
      } finally {
        client.release();
      }
    },
    async withLockedSession(sessionId, fn) {
      const client = await rawPool.connect();
      try {
        await client.query("BEGIN");
        const { rows } = await client.query<SessionDb>(
          `SELECT id, template_version, resume_token_hash, language, status, country, sector,
                  started_at, completed_at, maturity_score, data_readiness_score, reliability
           FROM diagnostic_sessions WHERE id = $1 FOR UPDATE`,
          [sessionId],
        );
        const row = rows[0];
        if (!row) throw new Error("missing session");
        const answers = await readAnswers(client, sessionId);
        const result = await fn(lockFor(client, mapSession(row), answers));
        await client.query("COMMIT");
        return result;
      } catch (error) {
        try {
          await client.query("ROLLBACK");
        } catch {
          /* ignore */
        }
        throw error;
      } finally {
        client.release();
      }
    },
    async linkOrganization(input) {
      return withOrgClient(input.organizationId, async (client) => {
        await client.query(`SELECT set_config('app.user_id', $1, true)`, [input.userId]);
        const existing = await client.query<{ organization_id: string }>(
          `SELECT organization_id FROM diagnostic_org_links WHERE session_id = $1`,
          [input.sessionId],
        );
        if (existing.rows[0]?.organization_id === input.organizationId) return "already" as const;
        try {
          await client.query(
            `INSERT INTO diagnostic_org_links (session_id, organization_id, linked_by)
             VALUES ($1, $2, $3)`,
            [input.sessionId, input.organizationId, input.userId],
          );
        } catch (error) {
          const code = (error as { code?: string }).code;
          if (code === "23505") {
            const conflict = new Error("already linked") as Error & { code?: string };
            conflict.code = "23505";
            throw conflict;
          }
          throw error;
        }
        return "linked" as const;
      });
    },
    async listForOrganization(organizationId) {
      return withOrgClient(organizationId, async (client) => {
        const { rows } = await client.query<SessionDb & {
          maturity_level: string | null;
          display_level_fr: string | null;
          reliability_limited: boolean | null;
        }>(
          `SELECT s.id, s.template_version, s.resume_token_hash, s.language, s.status, s.country, s.sector,
                  s.started_at, s.completed_at, s.maturity_score, s.data_readiness_score, s.reliability,
                  r.snapshot->>'maturityLevel' AS maturity_level,
                  r.snapshot->'presentation'->>'displayLevelFr' AS display_level_fr,
                  CASE WHEN r.snapshot ? 'reliabilityLimited'
                    THEN (r.snapshot->>'reliabilityLimited')::boolean
                    ELSE NULL END AS reliability_limited
           FROM diagnostic_org_links l
           JOIN diagnostic_sessions s ON s.id = l.session_id
           LEFT JOIN diagnostic_results r ON r.session_id = s.id
           WHERE l.organization_id = $1
           ORDER BY s.started_at DESC`,
          [organizationId],
        );
        return rows.map((row) => {
          const session = mapSession(row);
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
            maturityLevel: row.maturity_level,
            displayLevelFr: row.display_level_fr,
            reliabilityLimited: row.reliability_limited,
          } satisfies OrgDiagnosticSummary;
        });
      });
    },
    async getForOrganization(organizationId, sessionId) {
      return withOrgClient(organizationId, async (client) => {
        const { rows } = await client.query<SessionDb & { snapshot: PublicSnapshot | null }>(
          `SELECT s.id, s.template_version, s.resume_token_hash, s.language, s.status, s.country, s.sector,
                  s.started_at, s.completed_at, s.maturity_score, s.data_readiness_score, s.reliability,
                  r.snapshot
           FROM diagnostic_org_links l
           JOIN diagnostic_sessions s ON s.id = l.session_id
           LEFT JOIN diagnostic_results r ON r.session_id = s.id
           WHERE l.session_id = $1
             AND l.organization_id = $2`,
          [sessionId, organizationId],
        );
        const row = rows[0];
        if (!row) return null;
        return { session: mapSession(row), snapshot: row.snapshot };
      });
    },
  };
}
