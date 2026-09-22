import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import {
  claimDiagnosticSchema,
  createDiagnosticSchema,
  emptyDiagnosticSchema,
  reportRequestSchema,
  saveAnswersSchema,
} from "../schemas/diagnostic.js";
import { createPgDiagnosticRepository } from "../services/diagnostic/pgRepository.js";
import type { DiagnosticRepository } from "../services/diagnostic/repository.js";
import { createDiagnosticService, DiagnosticHttpError } from "../services/diagnostic/sessionService.js";
import type { AnswerMap } from "../services/diagnostic/types.js";

const NOT_FOUND = { error: "Diagnostic introuvable", code: "diagnostic_not_found" };

function sendError(reply: FastifyReply, error: unknown) {
  if (error instanceof DiagnosticHttpError) {
    return reply.code(error.statusCode).send({ error: error.message, code: error.code, ...error.details });
  }
  throw error;
}

function tokenFrom(request: FastifyRequest): string | undefined {
  const header = request.headers["x-diagnostic-token"];
  return typeof header === "string" && header.length > 0 ? header : undefined;
}

function invalidPayload(reply: FastifyReply) {
  return reply.code(400).send({ error: "Payload invalide", code: "invalid_payload" });
}

export async function registerDiagnosticRoutes(
  app: FastifyInstance,
  deps: { repo?: DiagnosticRepository } = {},
) {
  const service = createDiagnosticService(deps.repo ?? createPgDiagnosticRepository());

  app.post(
    "/v1/public/diagnostics",
    { config: { rateLimit: { max: 10, timeWindow: "1 minute" } } },
    async (request, reply) => {
      const parsed = createDiagnosticSchema.safeParse(request.body ?? {});
      if (!parsed.success) return invalidPayload(reply);
      const created = await service.create(parsed.data.language ?? "fr");
      return reply.code(201).send(created);
    },
  );

  app.get(
    "/v1/public/diagnostics/:sessionId",
    { config: { rateLimit: { max: 60, timeWindow: "1 minute" } } },
    async (request, reply) => {
      const { sessionId } = request.params as { sessionId: string };
      try {
        return await service.read(sessionId, tokenFrom(request));
      } catch (error) {
        if (error instanceof DiagnosticHttpError && error.statusCode === 404) {
          return reply.code(404).send(NOT_FOUND);
        }
        return sendError(reply, error);
      }
    },
  );

  app.put(
    "/v1/public/diagnostics/:sessionId/answers",
    { config: { rateLimit: { max: 30, timeWindow: "1 minute" } } },
    async (request, reply) => {
      const parsed = saveAnswersSchema.safeParse(request.body);
      if (!parsed.success) return invalidPayload(reply);
      const { sessionId } = request.params as { sessionId: string };
      try {
        return await service.saveAnswers(sessionId, tokenFrom(request), parsed.data.answers as AnswerMap);
      } catch (error) {
        return sendError(reply, error);
      }
    },
  );

  app.post(
    "/v1/public/diagnostics/:sessionId/complete",
    { config: { rateLimit: { max: 10, timeWindow: "1 minute" } } },
    async (request, reply) => {
      const parsed = emptyDiagnosticSchema.safeParse(request.body ?? {});
      if (!parsed.success) return invalidPayload(reply);
      const { sessionId } = request.params as { sessionId: string };
      try {
        return await service.complete(sessionId, tokenFrom(request));
      } catch (error) {
        return sendError(reply, error);
      }
    },
  );

  app.post(
    "/v1/public/diagnostics/:sessionId/report-request",
    { config: { rateLimit: { max: 5, timeWindow: "1 minute" } } },
    async (request, reply) => {
      const parsed = reportRequestSchema.safeParse(request.body);
      if (!parsed.success) return invalidPayload(reply);
      const { sessionId } = request.params as { sessionId: string };
      try {
        return await service.requestReport(sessionId, tokenFrom(request), parsed.data);
      } catch (error) {
        return sendError(reply, error);
      }
    },
  );

  app.post(
    "/v1/diagnostics/claim",
    {
      preHandler: [app.requireAuth, app.requireOrgMember],
      config: { rateLimit: { max: 10, timeWindow: "1 minute" } },
    },
    async (request, reply) => {
      const parsed = claimDiagnosticSchema.safeParse(request.body);
      if (!parsed.success) return invalidPayload(reply);
      const organizationId = request.user?.organizationId;
      const userId = request.user?.id;
      if (!organizationId || !userId) {
        return reply.code(403).send({ error: "Organisation requise", code: "organization_required" });
      }
      try {
        return await service.claim({
          sessionId: parsed.data.sessionId,
          resumeToken: parsed.data.resumeToken,
          organizationId,
          userId,
        });
      } catch (error) {
        return sendError(reply, error);
      }
    },
  );

  app.get(
    "/v1/diagnostics",
    { preHandler: [app.requireAuth, app.requireOrgMember] },
    async (request, reply) => {
      const organizationId = request.user?.organizationId;
      if (!organizationId) return reply.code(403).send({ error: "Organisation requise" });
      return { diagnostics: await service.listForOrganization(organizationId) };
    },
  );

  app.get(
    "/v1/diagnostics/:sessionId",
    { preHandler: [app.requireAuth, app.requireOrgMember] },
    async (request, reply) => {
      const organizationId = request.user?.organizationId;
      if (!organizationId) return reply.code(403).send({ error: "Organisation requise" });
      const { sessionId } = request.params as { sessionId: string };
      try {
        return await service.getForOrganization(organizationId, sessionId);
      } catch (error) {
        if (error instanceof DiagnosticHttpError && error.statusCode === 404) {
          return reply.code(404).send(NOT_FOUND);
        }
        return sendError(reply, error);
      }
    },
  );
}
