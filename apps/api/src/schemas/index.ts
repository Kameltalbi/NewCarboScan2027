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

export const orgIdParamSchema = z.object({
  id: z.string().uuid(),
});

export const suspendOrgSchema = z.object({
  reason: z.string().max(500).optional(),
});

export const deleteOrgSchema = z.object({
  confirmName: z.string().min(1).max(200),
});

export const patchUserSchema = z.object({
  isActive: z.boolean().optional(),
  role: z.enum(["user", "admin", "superadmin", "financeur"]).optional(),
});

export const setUserPasswordSchema = z.object({
  password: z.string().min(8).max(200),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(200),
  newPassword: z.string().min(8).max(200),
});

export const patchProfileSchema = z.object({
  fullName: z.string().min(1).max(200).optional(),
  companyName: z.string().max(200).optional().nullable(),
  phone: z.string().max(40).optional().nullable(),
  sector: z.string().max(120).optional().nullable(),
});

export const patchOrganizationSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  legalName: z.string().max(200).optional().nullable(),
  sector: z.string().max(120).optional().nullable(),
  country: z.string().max(80).optional().nullable(),
  referenceYear: z.number().int().min(2000).max(2100).optional().nullable(),
  currency: z.string().max(8).optional().nullable(),
  energyUnit: z.string().max(32).optional().nullable(),
  massUnit: z.string().max(32).optional().nullable(),
  distanceUnit: z.string().max(32).optional().nullable(),
  logoUrl: z.string().max(500_000).optional().nullable(),
  pilotName: z.string().max(200).optional().nullable(),
  annualRevenue: z.number().optional().nullable(),
  employees: z.number().int().optional().nullable(),
  totalSurface: z.number().optional().nullable(),
});

const orgRoleEnum = z.enum([
  "owner",
  "admin",
  "editor",
  "viewer",
  "financeur",
  "auditor",
]);

export function normalizeOrgRole(role: string): z.infer<typeof orgRoleEnum> {
  if (role === "contributor" || role === "member") return "editor";
  const parsed = orgRoleEnum.safeParse(role);
  return parsed.success ? parsed.data : "viewer";
}

export const patchMemberSchema = z.object({
  role: z
    .string()
    .min(1)
    .transform((value) => normalizeOrgRole(value))
    .pipe(orgRoleEnum),
});

export const inviteMemberSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(200).optional(),
  firstName: z.string().max(100).optional(),
  lastName: z.string().max(100).optional(),
  fullName: z.string().max(200).optional(),
  role: z.string().min(1).optional(),
});

export const permissionOverrideSchema = z.object({
  permissionKey: z.string().min(1).max(80),
  allowed: z.boolean().nullable(),
});

export const createApiKeySchema = z.object({
  name: z.string().min(1).max(120).optional(),
  appName: z.string().min(1).max(120).optional(),
  app_name: z.string().min(1).max(120).optional(),
  scopes: z.array(z.string().max(80)).max(20).optional(),
  env: z.enum(["live", "test"]).optional(),
});

export const entitySchema = z.object({
  name: z.string().min(1).max(200),
  sector: z.string().max(120).optional().nullable(),
  annualRevenue: z.number().optional().nullable(),
  employees: z.number().int().optional().nullable(),
});

export const siteSchema = z
  .object({
    name: z.string().min(1).max(200).optional(),
    code: z.string().max(64).optional().nullable(),
    address: z.string().max(500).optional().nullable(),
    city: z.string().max(120).optional().nullable(),
    country: z.string().max(80).optional().nullable(),
    siteType: z.string().max(64).optional().nullable(),
    site_type: z.string().max(64).optional().nullable(),
    isActive: z.boolean().optional(),
    is_active: z.boolean().optional(),
    isConsolidated: z.boolean().optional(),
    is_consolidated: z.boolean().optional(),
    companyId: z.string().uuid().optional().nullable(),
    company_id: z.string().uuid().optional().nullable(),
    employeesCount: z.number().int().optional().nullable(),
    employees_count: z.number().int().optional().nullable(),
    surfaceM2: z.number().optional().nullable(),
    surface_m2: z.number().optional().nullable(),
    contactName: z.string().max(200).optional().nullable(),
    contact_name: z.string().max(200).optional().nullable(),
    contactEmail: z.string().max(200).optional().nullable(),
    contact_email: z.string().max(200).optional().nullable(),
  })
  .transform((d) => ({
    name: d.name,
    code: d.code,
    address: d.address,
    city: d.city,
    country: d.country,
    siteType: d.siteType ?? d.site_type,
    isActive: d.isActive ?? d.is_active,
    isConsolidated: d.isConsolidated ?? d.is_consolidated,
    companyId: d.companyId ?? d.company_id,
    employeesCount: d.employeesCount ?? d.employees_count,
    surfaceM2: d.surfaceM2 ?? d.surface_m2,
    contactName: d.contactName ?? d.contact_name,
    contactEmail: d.contactEmail ?? d.contact_email,
  }));

export const adminPlanSchema = z.object({
  planCode: z.string().min(1).max(64),
  status: z.enum(["active", "suspended", "cancelled"]).optional(),
});

export const adminModuleToggleSchema = z.object({
  slug: z.string().min(1).max(80),
  enabled: z.boolean(),
});

export const adminYearSchema = z.object({
  year: z.number().int().min(2000).max(2100),
  isIncluded: z.boolean().optional(),
});

export const adminQuotaSchema = z.object({
  year: z.number().int().min(2000).max(2100),
  tokensTotal: z.number().int().min(0).optional(),
  tokensUsed: z.number().int().min(0).optional(),
  addTokens: z.number().int().optional(),
  resetUsed: z.boolean().optional(),
});

export const adminBlogSchema = z.object({
  title: z.string().min(1).max(300),
  slug: z.string().min(1).max(200).optional(),
  excerpt: z.string().max(2000).optional().nullable(),
  content: z.string().max(200_000).optional().nullable(),
  authorName: z.string().max(200).optional().nullable(),
  featuredImageUrl: z.string().max(500_000).optional().nullable(),
  status: z.enum(["draft", "published"]).optional(),
  tags: z.array(z.string().max(64)).max(30).optional(),
  metaTitle: z.string().max(200).optional().nullable(),
  metaDescription: z.string().max(500).optional().nullable(),
  language: z.string().min(2).max(5).optional(),
});

export const adminPromoSchema = z.object({
  code: z.string().min(2).max(40),
  description: z.string().max(500).optional().nullable(),
  discountType: z.enum(["percentage", "fixed_amount"]).optional(),
  discountValue: z.number().min(0).optional(),
  discountPercent: z.number().min(0).max(100).optional(),
  minimumAmount: z.number().min(0).optional(),
  maxUses: z.number().int().min(0).optional().nullable(),
  validFrom: z.string().optional().nullable(),
  validUntil: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
  applicablePlans: z.array(z.string()).optional(),
});

export const adminOrderPatchSchema = z.object({
  status: z.enum(["pending", "validated", "rejected", "suspended", "cancelled"]).optional(),
  planType: z.string().max(64).optional(),
  userId: z.string().uuid().optional(),
  userData: z.record(z.unknown()).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export const adminCreateOrgSchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email(),
  password: z.string().min(8).max(200),
  fullName: z.string().min(1).max(200),
  phone: z.string().max(40).optional(),
  sector: z.string().max(120).optional(),
  plan: z.string().max(64).optional(),
});
