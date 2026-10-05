import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { pool } from "../db.js";
import { orgIdParamSchema } from "../schemas/index.js";
import {
  assertFinancedEmissionsEnabled,
  isPcafSupplierPayload,
} from "../services/orgFeatureFlags.js";
import {
  calculatePurchaseEmissions,
  deleteSyncedActivity,
  deriveCalculationMethod,
  QUALITY_GRADE_LABELS,
  recordCalculationHistory,
  syncPurchaseToActivityData,
  type CalculationMethod,
  type PurchaseCalcResult,
} from "../services/purchaseEmissions.js";

const createSupplierSchema = z.object({
  name: z.string().min(1).max(200),
  siret: z.string().max(32).optional().nullable(),
  naf_code: z.string().max(32).optional().nullable(),
  country: z.string().max(8).optional().nullable(),
  city: z.string().max(120).optional().nullable(),
  address: z.string().max(300).optional().nullable(),
  postal_code: z.string().max(32).optional().nullable(),
  contact_name: z.string().max(120).optional().nullable(),
  contact_email: z.string().email().optional().nullable().or(z.literal("")),
  contact_phone: z.string().max(40).optional().nullable(),
  contact_role: z.string().max(80).optional().nullable(),
  purchase_category: z.string().max(120).optional().nullable(),
  purchase_subcategory: z.string().max(120).optional().nullable(),
  scope3_ghg_category: z.number().int().min(1).max(15).optional().nullable(),
  carbon_score: z.string().max(8).optional().nullable(),
  confidence_index: z.number().int().min(0).max(100).optional().nullable(),
  engagement_status: z.string().max(40).optional().nullable(),
  data_method: z.string().max(40).optional().nullable(),
  has_carbon_footprint: z.boolean().optional().nullable(),
  has_sbti_target: z.boolean().optional().nullable(),
  has_cdp_disclosure: z.boolean().optional().nullable(),
  has_iso14001: z.boolean().optional().nullable(),
  has_ecovadis: z.boolean().optional().nullable(),
  cdp_score: z.string().max(8).optional().nullable(),
  annual_spend: z.number().optional().nullable(),
  annual_spend_currency: z.string().max(8).optional().nullable(),
  annual_spend_year: z.number().int().optional().nullable(),
  criticality: z.string().max(20).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  is_active: z.boolean().optional().nullable(),
});

const purchaseInputSchema = z.object({
  supplier_id: z.string().uuid(),
  site_id: z.string().uuid().optional().nullable(),
  purchase_date: z.string().max(40).optional().nullable(),
  reference_year: z.number().int().min(2000).max(2100).optional().nullable(),
  description: z.string().max(500).optional().nullable(),
  product_service: z.string().max(300).optional().nullable(),
  amount: z.number().optional().nullable(),
  currency: z.string().max(8).optional().nullable(),
  quantity: z.number().optional().nullable(),
  quantity_unit: z.string().max(40).optional().nullable(),
  purchase_category: z.string().max(120).optional().nullable(),
  purchase_subcategory: z.string().max(120).optional().nullable(),
  ghg_scope3_category: z.number().int().min(1).max(15).optional().nullable(),
  calculation_method: z
    .enum(["spend", "physical", "supplier_specific", "hybrid"])
    .optional()
    .nullable(),
  emission_factor_id: z.string().uuid().optional().nullable(),
  supplier_factor_value: z.number().optional().nullable(),
  supplier_factor_unit: z.string().max(40).optional().nullable(),
  supplier_factor_source: z.string().max(300).optional().nullable(),
  supplier_factor_year: z.number().int().optional().nullable(),
  data_method: z.string().max(40).optional().nullable(),
  source_type: z.string().max(40).optional().nullable(),
  source_document: z.string().max(500).optional().nullable(),
  is_validated: z.boolean().optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  auto_calculate: z.boolean().optional().default(true),
});

const PURCHASE_SELECT = `
  id, organization_id, supplier_id, site_id, purchase_date, reference_year,
  description, product_service, amount, currency, quantity, quantity_unit,
  purchase_category, purchase_subcategory, ghg_scope3_category,
  emission_factor_id, emission_factor_value, emission_factor_unit,
  emission_factor_source, emission_factor_year, emission_factor_geography,
  calculated_emissions_kgco2e, calculation_method, data_quality_grade,
  data_method, uncertainty_percent, source_document, source_type,
  is_validated, notes, conversion_rate, conversion_source,
  amount_original, currency_original, factor_currency,
  last_calculated_at, activity_data_id, method_change_note,
  created_at, updated_at
`;

const SUPPLIER_SELECT = `
  id, organization_id, name, siret, naf_code, country, city, address, postal_code,
  contact_name, contact_email, contact_phone, contact_role,
  purchase_category, purchase_subcategory, scope3_ghg_category,
  carbon_score, carbon_intensity_kgco2e, confidence_index,
  engagement_status, data_method,
  has_carbon_footprint, has_sbti_target, has_cdp_disclosure, cdp_score,
  has_iso14001, has_ecovadis, ecovadis_score,
  annual_spend, annual_spend_currency, annual_spend_year, criticality,
  notes, tags, is_active, last_data_update, created_at, updated_at, raw_legacy
`;

async function excludePcafClause(orgId: string): Promise<string> {
  const { rows } = await pool.query(
    `SELECT financed_emissions_enabled FROM organizations WHERE id = $1`,
    [orgId],
  );
  if (!rows[0]?.financed_emissions_enabled) {
    return "AND (s.scope3_ghg_category IS NULL OR s.scope3_ghg_category <> 15)";
  }
  return "";
}

async function applyCalcToPurchase(
  client: typeof pool,
  orgId: string,
  userId: string,
  purchaseId: string,
  previous: Record<string, unknown> | null,
  input: z.infer<typeof purchaseInputSchema>,
  changeReason?: string,
): Promise<{ purchase: Record<string, unknown>; calc: PurchaseCalcResult }> {
  if (Number(input.ghg_scope3_category) === 15) {
    if (previous?.activity_data_id) {
      await deleteSyncedActivity(
        client,
        orgId,
        purchaseId,
        String(previous.activity_data_id),
      );
    }
    const { rows } = await client.query(
      `UPDATE supplier_purchases SET
         supplier_id = COALESCE($3, supplier_id),
         reference_year = COALESCE($4, reference_year),
         description = COALESCE($5, description),
         amount = COALESCE($6, amount),
         currency = COALESCE($7, currency),
         purchase_category = COALESCE($8, purchase_category),
         ghg_scope3_category = 15,
         calculation_method = NULL,
         data_quality_grade = NULL,
         emission_factor_id = NULL,
         emission_factor_value = NULL,
         emission_factor_unit = NULL,
         emission_factor_source = NULL,
         emission_factor_year = NULL,
         emission_factor_geography = NULL,
         activity_data_id = NULL,
         notes = COALESCE($9, notes),
         updated_at = now()
       WHERE id = $1 AND organization_id = $2
       RETURNING ${PURCHASE_SELECT}`,
      [
        purchaseId,
        orgId,
        input.supplier_id,
        input.reference_year ?? null,
        input.description ?? null,
        input.amount ?? null,
        input.currency ?? "TND",
        input.purchase_category ?? null,
        input.notes ?? null,
      ],
    );
    const purchase = rows[0] as Record<string, unknown>;
    return {
      purchase,
      calc: {
        calculationMethod: "supplier_specific",
        dataQualityGrade: "E",
        emissionsKg:
          purchase.calculated_emissions_kgco2e != null
            ? Number(purchase.calculated_emissions_kgco2e)
            : 0,
        factorId: null,
        factorValue: null,
        factorUnit: null,
        factorSource: null,
        factorYear: null,
        factorGeography: null,
        uncertaintyPct: null,
        quantityUsed: null,
        quantityUnitUsed: null,
        amountOriginal: input.amount ?? null,
        currencyOriginal: String(input.currency || "TND"),
        conversionRate: null,
        conversionSource: null,
        factorCurrency: null,
        formula:
          "Catégorie 15 — le facteur monétaire achats n'est pas appliqué.",
        warnings: [
          "Émissions financées calculées par le moteur PCAF business loans. Aucun facteur kgCO₂e/TND générique. Ligne non recopiée dans le bilan opérationnel.",
        ],
      },
    };
  }

  const method = deriveCalculationMethod({
    amount: input.amount,
    currency: input.currency,
    quantity: input.quantity,
    quantityUnit: input.quantity_unit,
    calculationMethod: input.calculation_method as CalculationMethod | null,
    dataMethod: input.data_method,
    supplierFactorValue: input.supplier_factor_value,
  });

  const calc = await calculatePurchaseEmissions(client, {
    amount: input.amount,
    currency: input.currency,
    quantity: input.quantity,
    quantityUnit: input.quantity_unit,
    calculationMethod: method,
    dataMethod: input.data_method,
    isValidated: input.is_validated,
    supplierFactorValue: input.supplier_factor_value,
    supplierFactorUnit: input.supplier_factor_unit,
    supplierFactorSource: input.supplier_factor_source,
    supplierFactorYear: input.supplier_factor_year,
    factorId: input.emission_factor_id,
  });

  if (previous) {
    await recordCalculationHistory(client, {
      organizationId: orgId,
      purchaseId,
      userId,
      changeReason: changeReason ?? null,
      previous,
      next: {
        ...calc,
        amount: input.amount,
        currency: input.currency,
        quantity: input.quantity,
        quantityUnit: input.quantity_unit,
      },
    });
  }

  const { rows } = await client.query(
    `UPDATE supplier_purchases SET
       supplier_id = COALESCE($3, supplier_id),
       site_id = $4,
       purchase_date = COALESCE($5::date, purchase_date),
       reference_year = COALESCE($6, reference_year),
       description = COALESCE($7, description),
       product_service = COALESCE($8, product_service),
       amount = COALESCE($9, amount),
       currency = COALESCE($10, currency),
       quantity = COALESCE($11, quantity),
       quantity_unit = COALESCE($12, quantity_unit),
       purchase_category = COALESCE($13, purchase_category),
       purchase_subcategory = COALESCE($14, purchase_subcategory),
       ghg_scope3_category = COALESCE($15, ghg_scope3_category),
       calculation_method = $16,
       data_quality_grade = $17,
       emission_factor_id = $18,
       emission_factor_value = $19,
       emission_factor_unit = $20,
       emission_factor_source = $21,
       emission_factor_year = $22,
       emission_factor_geography = $23,
       calculated_emissions_kgco2e = $24,
       data_method = COALESCE($25, data_method),
       uncertainty_percent = $26,
       source_type = COALESCE($27, source_type),
       source_document = COALESCE($28, source_document),
       is_validated = COALESCE($29, is_validated),
       notes = COALESCE($30, notes),
       conversion_rate = $31,
       conversion_source = $32,
       amount_original = $33,
       currency_original = $34,
       factor_currency = $35,
       last_calculated_at = now(),
       last_calculated_by = $36,
       method_change_note = CASE
         WHEN $37::boolean THEN 'Réévaluation liée à l''amélioration des données'
         ELSE method_change_note
       END,
       updated_at = now()
     WHERE id = $1 AND organization_id = $2
     RETURNING ${PURCHASE_SELECT}`,
    [
      purchaseId,
      orgId,
      input.supplier_id,
      input.site_id ?? null,
      input.purchase_date ?? null,
      input.reference_year ?? null,
      input.description ?? null,
      input.product_service ?? null,
      input.amount ?? null,
      input.currency ?? "TND",
      input.quantity ?? null,
      input.quantity_unit ?? null,
      input.purchase_category ?? null,
      input.purchase_subcategory ?? null,
      input.ghg_scope3_category ?? 1,
      calc.calculationMethod,
      calc.dataQualityGrade,
      calc.factorId,
      calc.factorValue,
      calc.factorUnit,
      calc.factorSource,
      calc.factorYear,
      calc.factorGeography,
      calc.emissionsKg,
      input.data_method ?? calc.calculationMethod,
      calc.uncertaintyPct,
      input.source_type ?? "invoice",
      input.source_document ?? null,
      input.is_validated ?? false,
      input.notes ?? null,
      calc.conversionRate,
      calc.conversionSource,
      calc.amountOriginal,
      calc.currencyOriginal,
      calc.factorCurrency,
      userId,
      Boolean(
        previous &&
          previous.calculation_method &&
          String(previous.calculation_method) !== calc.calculationMethod,
      ),
    ],
  );

  const purchase = rows[0] as Record<string, unknown>;
  const activityId = await syncPurchaseToActivityData(client, {
    organizationId: orgId,
    userId,
    purchase: {
      id: String(purchase.id),
      supplier_id: (purchase.supplier_id as string) || null,
      site_id: (purchase.site_id as string) || null,
      reference_year: purchase.reference_year != null ? Number(purchase.reference_year) : null,
      description: (purchase.description as string) || null,
      product_service: (purchase.product_service as string) || null,
      amount: purchase.amount != null ? Number(purchase.amount) : null,
      currency: (purchase.currency as string) || null,
      quantity: purchase.quantity != null ? Number(purchase.quantity) : null,
      quantity_unit: (purchase.quantity_unit as string) || null,
      purchase_category: (purchase.purchase_category as string) || null,
      ghg_scope3_category:
        purchase.ghg_scope3_category != null
          ? Number(purchase.ghg_scope3_category)
          : null,
      emission_factor_id: (purchase.emission_factor_id as string) || null,
      emission_factor_value:
        purchase.emission_factor_value != null
          ? Number(purchase.emission_factor_value)
          : null,
      emission_factor_source: (purchase.emission_factor_source as string) || null,
      emission_factor_year:
        purchase.emission_factor_year != null
          ? Number(purchase.emission_factor_year)
          : null,
      calculated_emissions_kgco2e:
        purchase.calculated_emissions_kgco2e != null
          ? Number(purchase.calculated_emissions_kgco2e)
          : null,
      calculation_method: (purchase.calculation_method as string) || null,
      data_quality_grade: (purchase.data_quality_grade as string) || null,
      data_method: (purchase.data_method as string) || null,
      uncertainty_percent:
        purchase.uncertainty_percent != null
          ? Number(purchase.uncertainty_percent)
          : null,
      activity_data_id: (purchase.activity_data_id as string) || null,
    },
    calc,
  });

  if (activityId && activityId !== purchase.activity_data_id) {
    await client.query(
      `UPDATE supplier_purchases SET activity_data_id = $1 WHERE id = $2 AND organization_id = $3`,
      [activityId, purchaseId, orgId],
    );
    purchase.activity_data_id = activityId;
  }

  return { purchase, calc };
}

export async function registerSupplierRoutes(app: FastifyInstance) {
  app.get(
    "/v1/suppliers",
    { preHandler: [app.requireOrgMember] },
    async (request) => {
      const orgId = request.user!.organizationId!;
      const q = request.query as Record<string, string | undefined>;
      const activeOnly = q.active !== "false";
      const params: unknown[] = [orgId];
      const where = ["organization_id = $1"];
      if (activeOnly) {
        where.push("COALESCE(is_active, true) IS DISTINCT FROM false");
      }
      const { rows: flagRows } = await pool.query(
        `SELECT financed_emissions_enabled FROM organizations WHERE id = $1`,
        [orgId],
      );
      if (!flagRows[0]?.financed_emissions_enabled) {
        where.push("(scope3_ghg_category IS NULL OR scope3_ghg_category <> 15)");
      }
      if (q.search) {
        params.push(`%${q.search}%`);
        where.push(`(name ILIKE $${params.length} OR city ILIKE $${params.length})`);
      }
      if (q.country) {
        params.push(q.country);
        where.push(`country = $${params.length}`);
      }
      if (q.category) {
        params.push(q.category);
        where.push(`purchase_category = $${params.length}`);
      }
      const { rows } = await pool.query(
        `SELECT ${SUPPLIER_SELECT}
         FROM suppliers
         WHERE ${where.join(" AND ")}
         ORDER BY name NULLS LAST`,
        params,
      );
      return { items: rows };
    },
  );

  app.get(
    "/v1/suppliers/stats",
    { preHandler: [app.requireOrgMember] },
    async (request) => {
      const orgId = request.user!.organizationId!;
      const q = request.query as Record<string, string | undefined>;
      const year = q.year ? Number(q.year) : null;
      const pcaf = await excludePcafClause(orgId);

      const { rows } = await pool.query(
        `SELECT
           COUNT(*)::int AS total_suppliers,
           COUNT(*) FILTER (WHERE engagement_status IN ('engaged', 'scored'))::int AS engaged_suppliers,
           COUNT(*) FILTER (WHERE carbon_score IS NOT NULL)::int AS scored_suppliers,
           COUNT(*) FILTER (WHERE carbon_score IN ('A+', 'A'))::int AS top_performers,
           COALESCE(SUM(annual_spend), 0)::float8 AS total_spend,
           COALESCE(AVG(confidence_index) FILTER (WHERE confidence_index IS NOT NULL), 0)::int AS avg_confidence,
           COUNT(DISTINCT NULLIF(country, ''))::int AS countries_count
         FROM suppliers s
         WHERE s.organization_id = $1
           AND COALESCE(s.is_active, true) IS DISTINCT FROM false
           ${pcaf.replace(/s\./g, "s.")}`,
        [orgId],
      );

      const purchaseParams: unknown[] = [orgId];
      let yearClause = "";
      if (year) {
        purchaseParams.push(year);
        yearClause = `AND p.reference_year = $${purchaseParams.length}`;
      }

      const { rows: purchaseRows } = await pool.query(
        `SELECT
           COALESCE(SUM(p.calculated_emissions_kgco2e), 0)::float8 AS total_emissions,
           COALESCE(SUM(p.amount), 0)::float8 AS purchase_spend,
           COUNT(*)::int AS purchase_rows,
           COUNT(*) FILTER (WHERE p.calculated_emissions_kgco2e IS NOT NULL AND p.calculated_emissions_kgco2e > 0)::int AS covered_rows,
           COALESCE(SUM(p.amount) FILTER (WHERE p.calculated_emissions_kgco2e IS NOT NULL AND p.calculated_emissions_kgco2e > 0), 0)::float8 AS covered_spend,
           COALESCE(SUM(p.calculated_emissions_kgco2e) FILTER (
             WHERE p.calculation_method IN ('physical', 'supplier_specific')
                OR p.data_quality_grade IN ('A','B')
           ), 0)::float8 AS primary_emissions
         FROM supplier_purchases p
         JOIN suppliers s ON s.id = p.supplier_id
         WHERE p.organization_id = $1
           ${pcaf}
           ${yearClause}`,
        purchaseParams,
      );

      const { rows: orgRows } = await pool.query(
        `SELECT purchases_primary_data_target_pct FROM organizations WHERE id = $1`,
        [orgId],
      );

      const base = rows[0] || {};
      const purchases = purchaseRows[0] || {};
      const totalEmissions = Number(purchases.total_emissions || 0);
      const purchaseSpend = Number(purchases.purchase_spend || 0);
      const coveredSpend = Number(purchases.covered_spend || 0);
      const primaryEmissions = Number(purchases.primary_emissions || 0);

      return {
        stats: {
          total_suppliers: Number(base.total_suppliers || 0),
          engaged_suppliers: Number(base.engaged_suppliers || 0),
          scored_suppliers: Number(base.scored_suppliers || 0),
          top_performers: Number(base.top_performers || 0),
          total_spend: purchaseSpend || Number(base.total_spend || 0),
          total_emissions: totalEmissions,
          total_emissions_tco2e: totalEmissions / 1000,
          avg_confidence: Number(base.avg_confidence || 0),
          questionnaires_sent: 0,
          questionnaires_completed: 0,
          countries_count: Number(base.countries_count || 0),
          purchase_rows: Number(purchases.purchase_rows || 0),
          coverage_pct:
            purchaseSpend > 0 ? Math.round((coveredSpend / purchaseSpend) * 1000) / 10 : 0,
          primary_data_pct:
            totalEmissions > 0
              ? Math.round((primaryEmissions / totalEmissions) * 1000) / 10
              : 0,
          primary_data_target_pct: Number(
            orgRows[0]?.purchases_primary_data_target_pct ?? 30,
          ),
          year,
        },
      };
    },
  );

  app.get(
    "/v1/suppliers/dashboard",
    { preHandler: [app.requireOrgMember] },
    async (request) => {
      const orgId = request.user!.organizationId!;
      const q = request.query as Record<string, string | undefined>;
      const year = q.year ? Number(q.year) : new Date().getFullYear();
      const pcaf = await excludePcafClause(orgId);

      const { rows: byCategory } = await pool.query(
        `SELECT COALESCE(NULLIF(p.purchase_category, ''), 'Autres') AS category,
                COALESCE(SUM(p.calculated_emissions_kgco2e), 0)::float8 AS emissions_kg,
                COALESCE(SUM(p.amount), 0)::float8 AS spend
         FROM supplier_purchases p
         JOIN suppliers s ON s.id = p.supplier_id
         WHERE p.organization_id = $1 AND p.reference_year = $2 ${pcaf}
         GROUP BY 1 ORDER BY 2 DESC LIMIT 12`,
        [orgId, year],
      );

      const { rows: topByEmissions } = await pool.query(
        `SELECT s.id, s.name, s.country, s.purchase_category,
                COALESCE(SUM(p.calculated_emissions_kgco2e), 0)::float8 AS emissions_kg,
                COALESCE(SUM(p.amount), 0)::float8 AS spend,
                (
                  SELECT p2.calculation_method
                  FROM supplier_purchases p2
                  WHERE p2.supplier_id = s.id AND p2.organization_id = $1 AND p2.reference_year = $2
                  ORDER BY p2.calculated_emissions_kgco2e DESC NULLS LAST
                  LIMIT 1
                ) AS main_method,
                (
                  SELECT p2.data_quality_grade
                  FROM supplier_purchases p2
                  WHERE p2.supplier_id = s.id AND p2.organization_id = $1 AND p2.reference_year = $2
                  ORDER BY p2.calculated_emissions_kgco2e DESC NULLS LAST
                  LIMIT 1
                ) AS main_grade
         FROM supplier_purchases p
         JOIN suppliers s ON s.id = p.supplier_id
         WHERE p.organization_id = $1 AND p.reference_year = $2 ${pcaf}
         GROUP BY s.id, s.name, s.country, s.purchase_category
         ORDER BY 5 DESC LIMIT 10`,
        [orgId, year],
      );

      const { rows: topBySpend } = await pool.query(
        `SELECT s.id, s.name,
                COALESCE(SUM(p.amount), 0)::float8 AS spend,
                COALESCE(SUM(p.calculated_emissions_kgco2e), 0)::float8 AS emissions_kg
         FROM supplier_purchases p
         JOIN suppliers s ON s.id = p.supplier_id
         WHERE p.organization_id = $1 AND p.reference_year = $2 ${pcaf}
         GROUP BY s.id, s.name
         ORDER BY 3 DESC LIMIT 10`,
        [orgId, year],
      );

      const { rows: byMethod } = await pool.query(
        `SELECT COALESCE(p.calculation_method, 'spend') AS method,
                COUNT(*)::int AS rows,
                COALESCE(SUM(p.calculated_emissions_kgco2e), 0)::float8 AS emissions_kg
         FROM supplier_purchases p
         JOIN suppliers s ON s.id = p.supplier_id
         WHERE p.organization_id = $1 AND p.reference_year = $2 ${pcaf}
         GROUP BY 1 ORDER BY 3 DESC`,
        [orgId, year],
      );

      const { rows: byGrade } = await pool.query(
        `SELECT COALESCE(p.data_quality_grade, 'E') AS grade,
                COUNT(*)::int AS rows,
                COALESCE(SUM(p.calculated_emissions_kgco2e), 0)::float8 AS emissions_kg
         FROM supplier_purchases p
         JOIN suppliers s ON s.id = p.supplier_id
         WHERE p.organization_id = $1 AND p.reference_year = $2 ${pcaf}
         GROUP BY 1 ORDER BY 1`,
        [orgId, year],
      );

      const { rows: byYear } = await pool.query(
        `SELECT p.reference_year AS year,
                COALESCE(SUM(p.calculated_emissions_kgco2e), 0)::float8 AS emissions_kg,
                COALESCE(SUM(p.calculated_emissions_kgco2e) FILTER (
                  WHERE p.calculation_method IN ('physical','supplier_specific')
                     OR p.data_quality_grade IN ('A','B')
                ), 0)::float8 AS primary_kg
         FROM supplier_purchases p
         JOIN suppliers s ON s.id = p.supplier_id
         WHERE p.organization_id = $1 AND p.reference_year IS NOT NULL ${pcaf}
         GROUP BY 1 ORDER BY 1`,
        [orgId],
      );

      const { rows: orgRows } = await pool.query(
        `SELECT purchases_primary_data_target_pct FROM organizations WHERE id = $1`,
        [orgId],
      );

      const totalEmissions = byMethod.reduce(
        (n, r) => n + Number(r.emissions_kg || 0),
        0,
      );

      // Pareto 80%
      const { rows: allSuppliers } = await pool.query(
        `SELECT s.id, s.name,
                COALESCE(SUM(p.calculated_emissions_kgco2e), 0)::float8 AS emissions_kg,
                COALESCE(SUM(p.amount), 0)::float8 AS spend,
                (
                  SELECT p2.calculation_method
                  FROM supplier_purchases p2
                  WHERE p2.supplier_id = s.id AND p2.organization_id = $1 AND p2.reference_year = $2
                  ORDER BY p2.calculated_emissions_kgco2e DESC NULLS LAST
                  LIMIT 1
                ) AS main_method,
                (
                  SELECT p2.data_quality_grade
                  FROM supplier_purchases p2
                  WHERE p2.supplier_id = s.id AND p2.organization_id = $1 AND p2.reference_year = $2
                  ORDER BY p2.calculated_emissions_kgco2e DESC NULLS LAST
                  LIMIT 1
                ) AS main_grade
         FROM supplier_purchases p
         JOIN suppliers s ON s.id = p.supplier_id
         WHERE p.organization_id = $1 AND p.reference_year = $2 ${pcaf}
         GROUP BY s.id, s.name
         HAVING COALESCE(SUM(p.calculated_emissions_kgco2e), 0) > 0
         ORDER BY 3 DESC`,
        [orgId, year],
      );

      let cumul = 0;
      const pareto = [];
      for (const row of allSuppliers) {
        cumul += Number(row.emissions_kg);
        pareto.push({
          ...row,
          emissions_tco2e: Number(row.emissions_kg) / 1000,
          share_pct:
            totalEmissions > 0
              ? Math.round((Number(row.emissions_kg) / totalEmissions) * 1000) / 10
              : 0,
          cumulative_pct:
            totalEmissions > 0
              ? Math.round((cumul / totalEmissions) * 1000) / 10
              : 0,
        });
        if (totalEmissions > 0 && cumul / totalEmissions >= 0.8) break;
      }

      return {
        year,
        qualityLabels: QUALITY_GRADE_LABELS,
        primaryDataTargetPct: Number(
          orgRows[0]?.purchases_primary_data_target_pct ?? 30,
        ),
        byCategory: byCategory.map((r) => ({
          category: r.category,
          emissions_tco2e: Number(r.emissions_kg) / 1000,
          spend: Number(r.spend),
        })),
        topByEmissions: topByEmissions.map((r) => ({
          ...r,
          emissions_tco2e: Number(r.emissions_kg) / 1000,
          spend: Number(r.spend),
        })),
        topBySpend: topBySpend.map((r) => ({
          ...r,
          emissions_tco2e: Number(r.emissions_kg) / 1000,
          spend: Number(r.spend),
        })),
        byMethod: byMethod.map((r) => ({
          method: r.method,
          rows: Number(r.rows),
          emissions_tco2e: Number(r.emissions_kg) / 1000,
          label:
            r.method === "spend"
              ? "Dépenses"
              : r.method === "physical"
                ? "Données physiques"
                : r.method === "supplier_specific"
                  ? "Données fournisseur"
                  : "Hybride",
          tooltip:
            r.method === "spend"
              ? "Spend-based"
              : r.method === "physical"
                ? "Average-data / activity-based"
                : r.method === "supplier_specific"
                  ? "Supplier-specific"
                  : "Hybrid method",
        })),
        byGrade: byGrade.map((r) => ({
          grade: r.grade,
          rows: Number(r.rows),
          emissions_tco2e: Number(r.emissions_kg) / 1000,
          ...(QUALITY_GRADE_LABELS[r.grade as keyof typeof QUALITY_GRADE_LABELS] ||
            QUALITY_GRADE_LABELS.E),
        })),
        qualityByYear: byYear.map((r) => ({
          year: Number(r.year),
          emissions_tco2e: Number(r.emissions_kg) / 1000,
          primary_pct:
            Number(r.emissions_kg) > 0
              ? Math.round((Number(r.primary_kg) / Number(r.emissions_kg)) * 1000) /
                10
              : 0,
        })),
        pareto: {
          count: pareto.length,
          suppliers: pareto,
          message:
            pareto.length > 0
              ? `${pareto.length} fournisseur${pareto.length > 1 ? "s" : ""} représentent 80 % des émissions liées aux achats.`
              : "Pas encore assez de données pour une analyse Pareto.",
        },
      };
    },
  );

  // ---- Purchases list (paginated) ----
  app.get(
    "/v1/suppliers/purchases",
    { preHandler: [app.requireOrgMember] },
    async (request) => {
      const orgId = request.user!.organizationId!;
      const q = request.query as Record<string, string | undefined>;
      const limit = Math.min(Number(q.limit || 50), 200);
      const offset = Math.max(Number(q.offset || 0), 0);
      const pcaf = await excludePcafClause(orgId);
      const params: unknown[] = [orgId];
      const where = ["p.organization_id = $1"];

      if (q.year) {
        params.push(Number(q.year));
        where.push(`p.reference_year = $${params.length}`);
      }
      if (q.supplierId) {
        params.push(q.supplierId);
        where.push(`p.supplier_id = $${params.length}`);
      }
      if (q.siteId) {
        params.push(q.siteId);
        where.push(`p.site_id = $${params.length}`);
      }
      if (q.category) {
        params.push(q.category);
        where.push(`p.purchase_category = $${params.length}`);
      }
      if (q.method) {
        params.push(q.method);
        where.push(`p.calculation_method = $${params.length}`);
      }
      if (q.grade) {
        params.push(q.grade);
        where.push(`p.data_quality_grade = $${params.length}`);
      }
      if (q.search) {
        params.push(`%${q.search}%`);
        where.push(
          `(p.description ILIKE $${params.length} OR p.product_service ILIKE $${params.length} OR s.name ILIKE $${params.length})`,
        );
      }

      const whereSql = where.join(" AND ") + " " + pcaf;
      const countRes = await pool.query(
        `SELECT COUNT(*)::int AS n
         FROM supplier_purchases p
         JOIN suppliers s ON s.id = p.supplier_id
         WHERE ${whereSql}`,
        params,
      );
      params.push(limit, offset);
      const { rows } = await pool.query(
        `SELECT p.*, s.name AS supplier_name, cs.name AS site_name
         FROM supplier_purchases p
         JOIN suppliers s ON s.id = p.supplier_id
         LEFT JOIN collect_sites cs ON cs.id = p.site_id
         WHERE ${whereSql}
         ORDER BY p.reference_year DESC NULLS LAST, p.created_at DESC
         LIMIT $${params.length - 1} OFFSET $${params.length}`,
        params,
      );
      return {
        items: rows,
        total: Number(countRes.rows[0]?.n || 0),
        limit,
        offset,
      };
    },
  );

  app.post(
    "/v1/suppliers/purchases",
    { preHandler: [app.requireOrgMember] },
    async (request, reply) => {
      const parsed = purchaseInputSchema.safeParse(request.body ?? {});
      if (!parsed.success) {
        return reply.code(400).send({ error: parsed.error.flatten() });
      }
      const d = parsed.data;
      const orgId = request.user!.organizationId!;
      const userId = request.user!.id;

      const { rows: sup } = await pool.query(
        `SELECT id, scope3_ghg_category FROM suppliers WHERE id = $1 AND organization_id = $2`,
        [d.supplier_id, orgId],
      );
      if (!sup[0]) return reply.code(404).send({ error: "Fournisseur introuvable" });
      if (Number(sup[0].scope3_ghg_category) === 15) {
        const ok = await assertFinancedEmissionsEnabled(orgId, reply);
        if (!ok) return;
      }
      if (d.ghg_scope3_category === 15) {
        const ok = await assertFinancedEmissionsEnabled(orgId, reply);
        if (!ok) return;
      }

      const year =
        d.reference_year ||
        (d.purchase_date ? Number(String(d.purchase_date).slice(0, 4)) : new Date().getFullYear());

      const { rows: inserted } = await pool.query(
        `INSERT INTO supplier_purchases (
           organization_id, supplier_id, site_id, purchase_date, reference_year,
           description, product_service, amount, currency, quantity, quantity_unit,
           purchase_category, purchase_subcategory, ghg_scope3_category,
           data_method, source_type, source_document, is_validated, notes
         ) VALUES (
           $1,$2,$3,$4::date,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19
         ) RETURNING ${PURCHASE_SELECT}`,
        [
          orgId,
          d.supplier_id,
          d.site_id ?? null,
          d.purchase_date ?? null,
          year,
          d.description ?? null,
          d.product_service ?? null,
          d.amount ?? null,
          d.currency ?? "TND",
          d.quantity ?? null,
          d.quantity_unit ?? null,
          d.purchase_category ?? null,
          d.purchase_subcategory ?? null,
          d.ghg_scope3_category ?? 1,
          d.data_method ?? null,
          d.source_type ?? "invoice",
          d.source_document ?? null,
          d.is_validated ?? false,
          d.notes ?? null,
        ],
      );

      if (d.auto_calculate !== false) {
        const { purchase, calc } = await applyCalcToPurchase(
          pool,
          orgId,
          userId,
          String(inserted[0].id),
          null,
          { ...d, reference_year: year },
        );
        return { item: purchase, calculation: calc, warnings: calc.warnings };
      }
      return { item: inserted[0] };
    },
  );

  app.patch(
    "/v1/suppliers/purchases/:id",
    { preHandler: [app.requireOrgMember] },
    async (request, reply) => {
      const params = orgIdParamSchema.safeParse(request.params);
      const parsed = purchaseInputSchema.partial().safeParse(request.body ?? {});
      if (!params.success || !parsed.success) {
        return reply.code(400).send({ error: "Payload invalide" });
      }
      const orgId = request.user!.organizationId!;
      const userId = request.user!.id;
      const { rows: existing } = await pool.query(
        `SELECT ${PURCHASE_SELECT} FROM supplier_purchases WHERE id = $1 AND organization_id = $2`,
        [params.data.id, orgId],
      );
      if (!existing[0]) return reply.code(404).send({ error: "Achat introuvable" });

      const merged = {
        supplier_id: String(parsed.data.supplier_id || existing[0].supplier_id),
        site_id: parsed.data.site_id !== undefined ? parsed.data.site_id : existing[0].site_id,
        purchase_date: parsed.data.purchase_date ?? existing[0].purchase_date,
        reference_year:
          parsed.data.reference_year ?? existing[0].reference_year,
        description: parsed.data.description ?? existing[0].description,
        product_service:
          parsed.data.product_service ?? existing[0].product_service,
        amount:
          parsed.data.amount !== undefined
            ? parsed.data.amount
            : existing[0].amount != null
              ? Number(existing[0].amount)
              : null,
        currency: parsed.data.currency ?? existing[0].currency ?? "TND",
        quantity:
          parsed.data.quantity !== undefined
            ? parsed.data.quantity
            : existing[0].quantity != null
              ? Number(existing[0].quantity)
              : null,
        quantity_unit:
          parsed.data.quantity_unit ?? existing[0].quantity_unit,
        purchase_category:
          parsed.data.purchase_category ?? existing[0].purchase_category,
        purchase_subcategory:
          parsed.data.purchase_subcategory ?? existing[0].purchase_subcategory,
        ghg_scope3_category:
          parsed.data.ghg_scope3_category ??
          (existing[0].ghg_scope3_category != null
            ? Number(existing[0].ghg_scope3_category)
            : 1),
        calculation_method:
          parsed.data.calculation_method ?? existing[0].calculation_method,
        emission_factor_id:
          parsed.data.emission_factor_id ?? existing[0].emission_factor_id,
        supplier_factor_value: parsed.data.supplier_factor_value ?? null,
        supplier_factor_unit: parsed.data.supplier_factor_unit ?? null,
        supplier_factor_source: parsed.data.supplier_factor_source ?? null,
        supplier_factor_year: parsed.data.supplier_factor_year ?? null,
        data_method: parsed.data.data_method ?? existing[0].data_method,
        source_type: parsed.data.source_type ?? existing[0].source_type,
        source_document:
          parsed.data.source_document ?? existing[0].source_document,
        is_validated:
          parsed.data.is_validated ?? Boolean(existing[0].is_validated),
        notes: parsed.data.notes ?? existing[0].notes,
        auto_calculate: true,
      };

      const { purchase, calc } = await applyCalcToPurchase(
        pool,
        orgId,
        userId,
        params.data.id,
        existing[0] as Record<string, unknown>,
        merged as z.infer<typeof purchaseInputSchema>,
      );
      return { item: purchase, calculation: calc, warnings: calc.warnings };
    },
  );

  app.delete(
    "/v1/suppliers/purchases/:id",
    { preHandler: [app.requireOrgMember] },
    async (request, reply) => {
      const params = orgIdParamSchema.safeParse(request.params);
      if (!params.success) return reply.code(400).send({ error: "id invalide" });
      const orgId = request.user!.organizationId!;
      const { rows } = await pool.query(
        `SELECT id, activity_data_id FROM supplier_purchases WHERE id = $1 AND organization_id = $2`,
        [params.data.id, orgId],
      );
      if (!rows[0]) return reply.code(404).send({ error: "Achat introuvable" });
      await deleteSyncedActivity(
        pool,
        orgId,
        params.data.id,
        rows[0].activity_data_id ? String(rows[0].activity_data_id) : null,
      );
      await pool.query(
        `DELETE FROM supplier_purchases WHERE id = $1 AND organization_id = $2`,
        [params.data.id, orgId],
      );
      return { ok: true };
    },
  );

  app.get(
    "/v1/suppliers/purchases/:id/history",
    { preHandler: [app.requireOrgMember] },
    async (request, reply) => {
      const params = orgIdParamSchema.safeParse(request.params);
      if (!params.success) return reply.code(400).send({ error: "id invalide" });
      const orgId = request.user!.organizationId!;
      const { rows } = await pool.query(
        `SELECT * FROM supplier_purchase_calculation_history
         WHERE organization_id = $1 AND purchase_id = $2
         ORDER BY changed_at DESC LIMIT 50`,
        [orgId, params.data.id],
      );
      return { items: rows };
    },
  );

  app.post(
    "/v1/suppliers/purchases/:id/recalculate",
    { preHandler: [app.requireOrgMember] },
    async (request, reply) => {
      const params = orgIdParamSchema.safeParse(request.params);
      if (!params.success) return reply.code(400).send({ error: "id invalide" });
      const orgId = request.user!.organizationId!;
      const userId = request.user!.id;
      const { rows: existing } = await pool.query(
        `SELECT ${PURCHASE_SELECT} FROM supplier_purchases WHERE id = $1 AND organization_id = $2`,
        [params.data.id, orgId],
      );
      if (!existing[0]) return reply.code(404).send({ error: "Achat introuvable" });
      const e = existing[0];
      const { purchase, calc } = await applyCalcToPurchase(
        pool,
        orgId,
        userId,
        params.data.id,
        e as Record<string, unknown>,
        {
          supplier_id: String(e.supplier_id),
          site_id: e.site_id,
          purchase_date: e.purchase_date,
          reference_year: e.reference_year != null ? Number(e.reference_year) : null,
          description: e.description,
          product_service: e.product_service,
          amount: e.amount != null ? Number(e.amount) : null,
          currency: e.currency || "TND",
          quantity: e.quantity != null ? Number(e.quantity) : null,
          quantity_unit: e.quantity_unit,
          purchase_category: e.purchase_category,
          purchase_subcategory: e.purchase_subcategory,
          ghg_scope3_category:
            e.ghg_scope3_category != null ? Number(e.ghg_scope3_category) : 1,
          calculation_method: e.calculation_method,
          emission_factor_id: e.emission_factor_id,
          data_method: e.data_method,
          source_type: e.source_type,
          source_document: e.source_document,
          is_validated: Boolean(e.is_validated),
          notes: e.notes,
          auto_calculate: true,
        } as z.infer<typeof purchaseInputSchema>,
        "Recalcul demandé",
      );
      return { item: purchase, calculation: calc, warnings: calc.warnings };
    },
  );

  // ---- Import JSON rows (client parse CSV/Excel) ----
  app.post(
    "/v1/suppliers/purchases/import",
    { preHandler: [app.requireOrgMember] },
    async (request, reply) => {
      const schema = z.object({
        dryRun: z.boolean().optional().default(false),
        defaultYear: z.number().int().optional(),
        defaultCurrency: z.string().max(8).optional(),
        rows: z
          .array(
            z.object({
              supplier_name: z.string().min(1).max(200),
              amount: z.number().optional().nullable(),
              currency: z.string().max(8).optional().nullable(),
              quantity: z.number().optional().nullable(),
              quantity_unit: z.string().max(40).optional().nullable(),
              purchase_category: z.string().max(120).optional().nullable(),
              product_service: z.string().max(300).optional().nullable(),
              description: z.string().max(500).optional().nullable(),
              site_name: z.string().max(200).optional().nullable(),
              reference_year: z.number().int().optional().nullable(),
              purchase_date: z.string().max(40).optional().nullable(),
              ghg_scope3_category: z.number().int().optional().nullable(),
              country: z.string().max(8).optional().nullable(),
            }),
          )
          .min(1)
          .max(5000),
      });
      const parsed = schema.safeParse(request.body ?? {});
      if (!parsed.success) {
        return reply.code(400).send({ error: parsed.error.flatten() });
      }
      const orgId = request.user!.organizationId!;
      const userId = request.user!.id;
      const dryRun = parsed.data.dryRun;
      const defaultYear = parsed.data.defaultYear || new Date().getFullYear();
      const defaultCurrency = parsed.data.defaultCurrency || "TND";

      const { rows: existingSuppliers } = await pool.query(
        `SELECT id, name FROM suppliers WHERE organization_id = $1`,
        [orgId],
      );
      const supplierByName = new Map(
        existingSuppliers.map((s) => [String(s.name).toLowerCase().trim(), String(s.id)]),
      );
      const { rows: sites } = await pool.query(
        `SELECT id, name FROM collect_sites WHERE organization_id = $1 AND COALESCE(is_active,true)`,
        [orgId],
      );
      const siteByName = new Map(
        sites.map((s) => [String(s.name).toLowerCase().trim(), String(s.id)]),
      );

      const preview = {
        total: parsed.data.rows.length,
        newSuppliers: 0,
        matchedSuppliers: 0,
        withAmount: 0,
        withQuantity: 0,
        suggestedCategories: {} as Record<string, number>,
      };

      const normalized = parsed.data.rows.map((r) => {
        const key = r.supplier_name.toLowerCase().trim();
        const existingId = supplierByName.get(key);
        if (existingId) preview.matchedSuppliers += 1;
        else preview.newSuppliers += 1;
        if (r.amount != null) preview.withAmount += 1;
        if (r.quantity != null) preview.withQuantity += 1;
        const cat =
          r.purchase_category ||
          suggestCategory(r.description || r.product_service || r.supplier_name);
        preview.suggestedCategories[cat] =
          (preview.suggestedCategories[cat] || 0) + 1;
        return { ...r, resolved_category: cat, existing_supplier_id: existingId || null };
      });

      if (dryRun) {
        return { dryRun: true, preview, sample: normalized.slice(0, 20) };
      }

      let createdSuppliers = 0;
      let createdPurchases = 0;
      const errors: string[] = [];

      for (const row of normalized) {
        try {
          let supplierId = row.existing_supplier_id;
          if (!supplierId) {
            const { rows: created } = await pool.query(
              `INSERT INTO suppliers (
                 organization_id, name, country, purchase_category,
                 scope3_ghg_category, engagement_status, data_method, is_active
               ) VALUES ($1,$2,$3,$4,1,'not_contacted','estimated',true)
               RETURNING id`,
              [
                orgId,
                row.supplier_name.trim(),
                row.country || "TN",
                row.resolved_category,
              ],
            );
            supplierId = String(created[0].id);
            supplierByName.set(row.supplier_name.toLowerCase().trim(), supplierId);
            createdSuppliers += 1;
          }
          const siteId = row.site_name
            ? siteByName.get(row.site_name.toLowerCase().trim()) || null
            : null;
          const year =
            row.reference_year ||
            (row.purchase_date
              ? Number(String(row.purchase_date).slice(0, 4))
              : defaultYear);

          const input = {
            supplier_id: supplierId,
            site_id: siteId,
            purchase_date: row.purchase_date ?? null,
            reference_year: year,
            description: row.description ?? row.product_service ?? null,
            product_service: row.product_service ?? null,
            amount: row.amount ?? null,
            currency: row.currency || defaultCurrency,
            quantity: row.quantity ?? null,
            quantity_unit: row.quantity_unit ?? null,
            purchase_category: row.resolved_category,
            purchase_subcategory: null,
            ghg_scope3_category: row.ghg_scope3_category ?? 1,
            calculation_method: null,
            emission_factor_id: null,
            data_method: null,
            source_type: "excel",
            source_document: null,
            is_validated: false,
            notes: "Import Fournisseurs & Achats",
            auto_calculate: true,
          } as z.infer<typeof purchaseInputSchema>;

          const { rows: inserted } = await pool.query(
            `INSERT INTO supplier_purchases (
               organization_id, supplier_id, site_id, purchase_date, reference_year,
               description, product_service, amount, currency, quantity, quantity_unit,
               purchase_category, ghg_scope3_category, source_type, notes
             ) VALUES ($1,$2,$3,$4::date,$5,$6,$7,$8,$9,$10,$11,$12,$13,'excel',$14)
             RETURNING id`,
            [
              orgId,
              supplierId,
              siteId,
              row.purchase_date ?? null,
              year,
              input.description,
              input.product_service,
              input.amount,
              input.currency,
              input.quantity,
              input.quantity_unit,
              input.purchase_category,
              input.ghg_scope3_category,
              input.notes,
            ],
          );
          await applyCalcToPurchase(
            pool,
            orgId,
            userId,
            String(inserted[0].id),
            null,
            input,
            "Import initial",
          );
          createdPurchases += 1;
        } catch (e) {
          errors.push(
            `${row.supplier_name}: ${e instanceof Error ? e.message : "erreur"}`,
          );
        }
      }

      return {
        dryRun: false,
        preview,
        createdSuppliers,
        createdPurchases,
        errors: errors.slice(0, 50),
      };
    },
  );

  app.patch(
    "/v1/suppliers/settings",
    { preHandler: [app.requireOrgAdmin] },
    async (request, reply) => {
      const schema = z.object({
        purchases_primary_data_target_pct: z.number().min(0).max(100),
      });
      const parsed = schema.safeParse(request.body ?? {});
      if (!parsed.success) {
        return reply.code(400).send({ error: parsed.error.flatten() });
      }
      const orgId = request.user!.organizationId!;
      const { rows } = await pool.query(
        `UPDATE organizations
         SET purchases_primary_data_target_pct = $2, updated_at = now()
         WHERE id = $1
         RETURNING purchases_primary_data_target_pct`,
        [orgId, parsed.data.purchases_primary_data_target_pct],
      );
      return { item: rows[0] };
    },
  );

  app.post(
    "/v1/suppliers",
    { preHandler: [app.requireOrgAdmin] },
    async (request, reply) => {
      const parsed = createSupplierSchema.safeParse(request.body ?? {});
      if (!parsed.success) {
        return reply.code(400).send({ error: parsed.error.flatten() });
      }
      const d = parsed.data;
      const orgId = request.user!.organizationId!;
      if (isPcafSupplierPayload(d)) {
        const ok = await assertFinancedEmissionsEnabled(orgId, reply);
        if (!ok) return;
      }
      const { rows } = await pool.query(
        `INSERT INTO suppliers (
           organization_id, name, siret, naf_code, country, city, address, postal_code,
           contact_name, contact_email, contact_phone, contact_role,
           purchase_category, purchase_subcategory, scope3_ghg_category,
           carbon_score, confidence_index, engagement_status, data_method,
           has_carbon_footprint, has_sbti_target, has_cdp_disclosure,
           has_iso14001, has_ecovadis, cdp_score,
           annual_spend, annual_spend_currency, annual_spend_year, criticality,
           notes, is_active
         ) VALUES (
           $1,$2,$3,$4,$5,$6,$7,$8,
           $9,$10,$11,$12,
           $13,$14,$15,
           $16,$17,$18,$19,
           $20,$21,$22,
           $23,$24,$25,
           $26,$27,$28,$29,
           $30,COALESCE($31, true)
         )
         RETURNING ${SUPPLIER_SELECT}`,
        [
          orgId,
          d.name,
          d.siret ?? null,
          d.naf_code ?? null,
          d.country ?? "TN",
          d.city ?? null,
          d.address ?? null,
          d.postal_code ?? null,
          d.contact_name ?? null,
          d.contact_email || null,
          d.contact_phone ?? null,
          d.contact_role ?? null,
          d.purchase_category ?? null,
          d.purchase_subcategory ?? null,
          d.scope3_ghg_category ?? 1,
          d.carbon_score ?? null,
          d.confidence_index ?? 0,
          d.engagement_status ?? "not_contacted",
          d.data_method ?? "estimated",
          d.has_carbon_footprint ?? false,
          d.has_sbti_target ?? false,
          d.has_cdp_disclosure ?? false,
          d.has_iso14001 ?? false,
          d.has_ecovadis ?? false,
          d.cdp_score ?? null,
          d.annual_spend ?? null,
          d.annual_spend_currency ?? null,
          d.annual_spend_year ?? null,
          d.criticality ?? "medium",
          d.notes ?? null,
          d.is_active ?? true,
        ],
      );
      return { item: rows[0] };
    },
  );

  app.get(
    "/v1/suppliers/:id",
    { preHandler: [app.requireOrgMember] },
    async (request, reply) => {
      const params = orgIdParamSchema.safeParse(request.params);
      if (!params.success) {
        return reply.code(400).send({ error: "id invalide" });
      }
      const orgId = request.user!.organizationId!;
      const { rows } = await pool.query(
        `SELECT ${SUPPLIER_SELECT}
         FROM suppliers
         WHERE id = $1 AND organization_id = $2`,
        [params.data.id, orgId],
      );
      if (!rows[0]) {
        return reply.code(404).send({ error: "Fournisseur introuvable" });
      }
      if (Number(rows[0].scope3_ghg_category) === 15) {
        const ok = await assertFinancedEmissionsEnabled(orgId, reply);
        if (!ok) return;
      }
      const { rows: purchases } = await pool.query(
        `SELECT ${PURCHASE_SELECT}
         FROM supplier_purchases
         WHERE organization_id = $1 AND supplier_id = $2
         ORDER BY reference_year DESC NULLS LAST, created_at DESC`,
        [orgId, params.data.id],
      );
      return { item: rows[0], purchases };
    },
  );
}

function suggestCategory(label: string): string {
  const t = label.toLowerCase();
  if (/ciment|acier|aluminium|matériau|materiau|béton|beton/.test(t)) {
    return "Matériaux";
  }
  if (/emballage|carton|plastique|film/.test(t)) return "Emballages";
  if (/ordi|dell|hp|laptop|informatique|software|licence/.test(t)) {
    return "Informatique";
  }
  if (/transport|logistique|freight|camion/.test(t)) return "Transport / logistique";
  if (/maintenance|répar|repar/.test(t)) return "Maintenance";
  if (/conseil|prestation|service|audit/.test(t)) return "Prestations de services";
  if (/fourniture|bureau|papeterie/.test(t)) return "Fournitures";
  if (/sous.?trait/.test(t)) return "Sous-traitance";
  if (/fruit|agro|aliment|ingredient|ingrédient/.test(t)) {
    return "Matières premières";
  }
  return "Autres";
}
