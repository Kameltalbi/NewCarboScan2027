import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(200),
});

export const calculateSchema = z.object({
  method: z.enum(["ghg_protocol", "bilan_carbone", "cbam", "pcf"]),
  periodStart: z.string().date().optional(),
  periodEnd: z.string().date().optional(),
  lines: z
    .array(
      z.object({
        lineKey: z.string().min(1),
        scope: z.union([z.literal(1), z.literal(2), z.literal(3)]),
        evidenceId: z.string().uuid().optional(),
        factorId: z.string().uuid(),
        activityQuantity: z.string().min(1),
        activityUnit: z.string().min(1),
        /** Si omis, résolu depuis emission_factors (source de vérité). */
        factorValue: z.string().min(1).optional(),
        factorUnit: z.string().min(1).optional(),
        allocationFactor: z.string().optional(),
        uncertaintyPct: z.string().optional(),
        activityUncertaintyPct: z.string().optional(),
        factorUncertaintyPct: z.string().optional(),
        formula: z.string().optional(),
      }),
    )
    .min(1)
    .max(10_000),
});

export const evidenceValidateSchema = z.object({
  status: z.enum(["validated", "rejected", "submitted"]),
  note: z.string().max(2000).optional(),
});

export const evidenceCreateSchema = z.object({
  origin: z.enum([
    "manual",
    "excel_import",
    "invoice_ocr",
    "api",
    "estimated",
    "third_party",
  ]),
  extractionMethod: z
    .enum(["human", "ocr", "parser", "api_sync", "model_assist"])
    .default("human"),
  originalUnit: z.string().min(1),
  originalQuantity: z.string().min(1),
  periodStart: z.string().date().optional(),
  periodEnd: z.string().date().optional(),
  sourceFilename: z.string().optional(),
  sourceType: z
    .enum(["invoice", "excel", "erp", "manual", "supplier", "estimate"])
    .optional(),
  sourcePage: z.number().int().positive().optional(),
  sourceCell: z.string().max(64).optional(),
  extractionConfidence: z.number().min(0).max(1).optional(),
  dataClass: z
    .enum(["measured", "calculated", "estimated", "sector_proxy", "missing"])
    .optional(),
  temporalQuality: z.string().optional(),
  geographicQuality: z.string().optional(),
  technologyRepresentativeness: z.string().optional(),
  uncertaintyPct: z.string().optional(),
  validationStatus: z
    .enum(["draft", "submitted", "validated", "rejected", "superseded"])
    .default("draft"),
});

export const publishRunSchema = z.object({
  supersedePrevious: z.boolean().optional().default(true),
});

export const reportFromRunSchema = z.object({
  runId: z.string().uuid(),
  title: z.string().min(1).max(200),
});
