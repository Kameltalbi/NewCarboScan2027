import { z } from "zod";

const answerSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("choice"), value: z.string().min(1).max(64) }).strict(),
  z
    .object({
      kind: z.literal("multi"),
      values: z.array(z.string().min(1).max(64)).min(1).max(8),
    })
    .strict(),
  z.object({ kind: z.literal("unknown") }).strict(),
  z.object({ kind: z.literal("number"), value: z.number().finite() }).strict(),
]);

export const createDiagnosticSchema = z
  .object({
    language: z.enum(["fr", "en", "de", "es"]).optional(),
  })
  .strict();

export const saveAnswersSchema = z
  .object({
    answers: z.record(z.string().regex(/^[a-z0-9_]+$/).max(64), answerSchema),
  })
  .strict();

export const emptyDiagnosticSchema = z.object({}).strict();

export const reportRequestSchema = z
  .object({
    fullName: z.string().trim().min(1).max(160),
    companyName: z.string().trim().min(1).max(160),
    email: z.string().trim().email().max(200),
    marketingConsent: z.boolean().optional(),
  })
  .strict();

export const claimDiagnosticSchema = z
  .object({
    sessionId: z.string().uuid(),
    resumeToken: z.string().min(20).max(200),
  })
  .strict();
