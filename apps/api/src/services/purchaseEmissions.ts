/**
 * Calcul émissions lignes d'achat + indice qualité A–E CarboScan.
 * Réutilise le Core Pack monétaire et les FE physiques existants.
 * Ne prétend pas être une notation GHG/ADEME/ISO.
 */
import type { Pool, PoolClient } from "pg";

export type CalculationMethod =
  | "spend"
  | "physical"
  | "supplier_specific"
  | "hybrid";

export type DataQualityGrade = "A" | "B" | "C" | "D" | "E";

/** Core Pack TN — facteur monétaire générique (kgCO2e / TND) */
export const CORE_MONETARY_FACTOR_ID =
  "b1000000-0000-4000-8000-000000000008";

const MONETARY_UNITS = new Set([
  "TND",
  "EUR",
  "USD",
  "MAD",
  "DZD",
  "XOF",
  "XAF",
  "EGP",
  "kEUR",
  "kTND",
]);

export interface PurchaseCalcInput {
  amount?: number | null;
  currency?: string | null;
  quantity?: number | null;
  quantityUnit?: string | null;
  calculationMethod?: CalculationMethod | null;
  dataMethod?: string | null;
  isValidated?: boolean | null;
  /** Facteur fournisseur explicite */
  supplierFactorValue?: number | null;
  supplierFactorUnit?: string | null;
  supplierFactorSource?: string | null;
  supplierFactorYear?: number | null;
  factorId?: string | null;
}

export interface PurchaseCalcResult {
  calculationMethod: CalculationMethod;
  dataQualityGrade: DataQualityGrade;
  emissionsKg: number;
  factorId: string | null;
  factorValue: number | null;
  factorUnit: string | null;
  factorSource: string | null;
  factorYear: number | null;
  factorGeography: string | null;
  uncertaintyPct: number | null;
  quantityUsed: number | null;
  quantityUnitUsed: string | null;
  amountOriginal: number | null;
  currencyOriginal: string | null;
  conversionRate: number | null;
  conversionSource: string | null;
  factorCurrency: string | null;
  formula: string;
  warnings: string[];
}

export function deriveCalculationMethod(
  input: PurchaseCalcInput,
): CalculationMethod {
  if (input.calculationMethod) return input.calculationMethod;
  if (
    input.supplierFactorValue != null &&
    Number.isFinite(Number(input.supplierFactorValue))
  ) {
    return "supplier_specific";
  }
  if (input.dataMethod === "supplier_specific") return "supplier_specific";
  if (input.dataMethod === "hybrid") return "hybrid";
  const unit = String(input.quantityUnit || "").trim();
  if (
    input.quantity != null &&
    Number(input.quantity) > 0 &&
    unit &&
    !MONETARY_UNITS.has(unit.toUpperCase())
  ) {
    return "physical";
  }
  return "spend";
}

/**
 * Indice qualité CarboScan A–E — dérivé automatiquement.
 * N'évalue PAS la performance environnementale du fournisseur.
 */
export function deriveDataQualityGrade(input: {
  method: CalculationMethod;
  isValidated?: boolean | null;
  hasDocumentedFactor?: boolean;
  uncertaintyPct?: number | null;
}): DataQualityGrade {
  const { method, isValidated, hasDocumentedFactor, uncertaintyPct } = input;
  if (method === "supplier_specific" && isValidated && hasDocumentedFactor) {
    return "A";
  }
  if (method === "supplier_specific" || (method === "physical" && isValidated)) {
    return "B";
  }
  if (method === "physical") return "C";
  if (method === "hybrid") return "C";
  if (method === "spend") {
    if (uncertaintyPct != null && uncertaintyPct >= 60) return "E";
    return "D";
  }
  return "E";
}

export const QUALITY_GRADE_LABELS: Record<
  DataQualityGrade,
  { label: string; tooltip: string }
> = {
  A: {
    label: "Donnée fournisseur documentée / vérifiée",
    tooltip:
      "Indice CarboScan. Donnée spécifique documentée et validée. N'évalue pas la performance carbone.",
  },
  B: {
    label: "Donnée fournisseur ou physique de bonne qualité",
    tooltip:
      "Indice CarboScan. Donnée fournisseur ou physique solide, validation partielle.",
  },
  C: {
    label: "Donnée physique avec facteur moyen",
    tooltip:
      "Indice CarboScan. Quantité physique × facteur moyen / catalogue.",
  },
  D: {
    label: "Donnée monétaire (dépenses)",
    tooltip:
      "Indice CarboScan. Estimation spend-based. Point de départ acceptable, à améliorer.",
  },
  E: {
    label: "Proxy / estimation très approximative",
    tooltip:
      "Indice CarboScan. Proxy ou forte incertitude. Priorité d'amélioration élevée.",
  },
};

type Queryable = Pool | PoolClient;

async function loadFactor(
  db: Queryable,
  factorId: string,
): Promise<{
  id: string;
  value: number;
  unit: string;
  source: string;
  year: number | null;
  geography: string | null;
  uncertainty: number | null;
} | null> {
  const { rows } = await db.query(
    `SELECT id, value,
            CASE
              WHEN unit_denominator IS NOT NULL AND unit_denominator <> ''
                THEN unit_numerator || '/' || unit_denominator
              ELSE COALESCE(unit_numerator, 'kgCO2e')
            END AS unit,
            COALESCE(name, source_category, 'catalogue') AS source,
            COALESCE(
              factor_year,
              EXTRACT(YEAR FROM valid_from)::int
            ) AS year,
            COALESCE(geography, country_code) AS geography,
            uncertainty_pct AS uncertainty
     FROM emission_factors
     WHERE id = $1
     LIMIT 1`,
    [factorId],
  );
  if (!rows[0]) return null;
  return {
    id: String(rows[0].id),
    value: Number(rows[0].value),
    unit: String(rows[0].unit || ""),
    source: String(rows[0].source || ""),
    year: rows[0].year != null ? Number(rows[0].year) : null,
    geography: rows[0].geography ? String(rows[0].geography) : null,
    uncertainty:
      rows[0].uncertainty != null ? Number(rows[0].uncertainty) : null,
  };
}

/** Taux de change documentés vers TND (proxy démo — source affichée). */
const FX_TO_TND: Record<string, { rate: number; source: string }> = {
  TND: { rate: 1, source: "identité" },
  EUR: { rate: 3.3, source: "proxy CarboScan (à remplacer par taux officiel)" },
  USD: { rate: 3.1, source: "proxy CarboScan (à remplacer par taux officiel)" },
  MAD: { rate: 0.31, source: "proxy CarboScan (à remplacer par taux officiel)" },
  DZD: { rate: 0.023, source: "proxy CarboScan (à remplacer par taux officiel)" },
  XOF: { rate: 0.005, source: "proxy CarboScan (à remplacer par taux officiel)" },
  XAF: { rate: 0.005, source: "proxy CarboScan (à remplacer par taux officiel)" },
  EGP: { rate: 0.063, source: "proxy CarboScan (à remplacer par taux officiel)" },
};

export async function calculatePurchaseEmissions(
  db: Queryable,
  input: PurchaseCalcInput,
): Promise<PurchaseCalcResult> {
  const warnings: string[] = [];
  const method = deriveCalculationMethod(input);
  const currency = String(input.currency || "TND").toUpperCase();

  // --- Supplier-specific ---
  if (
    method === "supplier_specific" &&
    input.supplierFactorValue != null &&
    input.quantity != null
  ) {
    const qty = Number(input.quantity);
    const fv = Number(input.supplierFactorValue);
    const emissionsKg = qty * fv;
    const grade = deriveDataQualityGrade({
      method,
      isValidated: input.isValidated,
      hasDocumentedFactor: Boolean(input.supplierFactorSource),
    });
    return {
      calculationMethod: method,
      dataQualityGrade: grade,
      emissionsKg,
      factorId: null,
      factorValue: fv,
      factorUnit: String(input.supplierFactorUnit || "kgCO2e"),
      factorSource: String(input.supplierFactorSource || "Donnée fournisseur"),
      factorYear: input.supplierFactorYear ?? null,
      factorGeography: null,
      uncertaintyPct: 15,
      quantityUsed: qty,
      quantityUnitUsed: String(input.quantityUnit || "unité"),
      amountOriginal: input.amount ?? null,
      currencyOriginal: currency,
      conversionRate: null,
      conversionSource: null,
      factorCurrency: null,
      formula: `${qty} × ${fv} = ${emissionsKg} kgCO₂e`,
      warnings,
    };
  }

  // --- Physical ---
  if (method === "physical" || method === "hybrid") {
    const qty = Number(input.quantity);
    if (!Number.isFinite(qty) || qty <= 0) {
      warnings.push("Quantité physique manquante — repli spend si montant disponible.");
    } else {
      const factor = input.factorId
        ? await loadFactor(db, input.factorId)
        : null;
      if (!factor) {
        // tenter un FE physique générique via Core Pack diesel/elec n'est pas adapté ;
        // exiger factorId ou basculer
        warnings.push(
          "Aucun facteur physique lié — bascule estimation monétaire si possible.",
        );
      } else {
        const emissionsKg = qty * factor.value;
        const grade = deriveDataQualityGrade({
          method: "physical",
          isValidated: input.isValidated,
          hasDocumentedFactor: true,
          uncertaintyPct: factor.uncertainty,
        });
        return {
          calculationMethod: "physical",
          dataQualityGrade: grade,
          emissionsKg,
          factorId: factor.id,
          factorValue: factor.value,
          factorUnit: factor.unit,
          factorSource: factor.source,
          factorYear: factor.year,
          factorGeography: factor.geography,
          uncertaintyPct: factor.uncertainty ?? 25,
          quantityUsed: qty,
          quantityUnitUsed: String(input.quantityUnit || ""),
          amountOriginal: input.amount ?? null,
          currencyOriginal: currency,
          conversionRate: null,
          conversionSource: null,
          factorCurrency: null,
          formula: `${qty} × ${factor.value} = ${emissionsKg} kgCO₂e`,
          warnings,
        };
      }
    }
  }

  // --- Spend-based (default / fallback) ---
  const amount = Number(input.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    return {
      calculationMethod: "spend",
      dataQualityGrade: "E",
      emissionsKg: 0,
      factorId: null,
      factorValue: null,
      factorUnit: null,
      factorSource: null,
      factorYear: null,
      factorGeography: null,
      uncertaintyPct: 80,
      quantityUsed: null,
      quantityUnitUsed: null,
      amountOriginal: input.amount ?? null,
      currencyOriginal: currency,
      conversionRate: null,
      conversionSource: null,
      factorCurrency: "TND",
      formula: "montant manquant — 0 kgCO₂e",
      warnings: [...warnings, "Montant manquant pour estimation dépenses."],
    };
  }

  const fx = FX_TO_TND[currency] || {
    rate: 1,
    source: "devise non listée — taux 1:1 (à corriger)",
  };
  if (!FX_TO_TND[currency]) {
    warnings.push(`Devise ${currency} sans taux documenté — proxy 1:1.`);
  } else if (currency !== "TND") {
    warnings.push(
      `Conversion ${currency}→TND via ${fx.source}. Montant comptable original conservé.`,
    );
  }

  const amountTnd = amount * fx.rate;
  let factor = input.factorId
    ? await loadFactor(db, input.factorId)
    : await loadFactor(db, CORE_MONETARY_FACTOR_ID);

  if (!factor) {
    // fallback hardcode aligned with Core Pack seed
    factor = {
      id: CORE_MONETARY_FACTOR_ID,
      value: 0.5,
      unit: "kgCO2e/TND",
      source: "Newcarboscan Core Pack TN",
      year: 2027,
      geography: "TN",
      uncertainty: 50,
    };
    warnings.push("Facteur monétaire catalogue introuvable — valeur Core Pack embarquée.");
  }

  const emissionsKg = amountTnd * factor.value;
  const grade = deriveDataQualityGrade({
    method: "spend",
    uncertaintyPct: factor.uncertainty,
  });

  return {
    calculationMethod: "spend",
    dataQualityGrade: grade,
    emissionsKg,
    factorId: factor.id,
    factorValue: factor.value,
    factorUnit: factor.unit,
    factorSource: factor.source,
    factorYear: factor.year,
    factorGeography: factor.geography,
    uncertaintyPct: factor.uncertainty ?? 50,
    quantityUsed: amountTnd,
    quantityUnitUsed: "TND",
    amountOriginal: amount,
    currencyOriginal: currency,
    conversionRate: fx.rate,
    conversionSource: fx.source,
    factorCurrency: "TND",
    formula:
      currency === "TND"
        ? `${amount} TND × ${factor.value} = ${emissionsKg} kgCO₂e`
        : `${amount} ${currency} × ${fx.rate} = ${amountTnd} TND × ${factor.value} = ${emissionsKg} kgCO₂e`,
    warnings,
  };
}

export async function recordCalculationHistory(
  db: Queryable,
  args: {
    organizationId: string;
    purchaseId: string;
    userId: string | null;
    changeReason?: string | null;
    previous: Record<string, unknown> | null;
    next: PurchaseCalcResult & {
      amount?: number | null;
      currency?: string | null;
      quantity?: number | null;
      quantityUnit?: string | null;
    };
  },
): Promise<void> {
  const p = args.previous || {};
  const n = args.next;
  const prevEmissions =
    p.calculated_emissions_kgco2e != null
      ? Number(p.calculated_emissions_kgco2e)
      : null;
  const methodological =
    p.calculation_method != null &&
    String(p.calculation_method) !== n.calculationMethod;

  await db.query(
    `INSERT INTO supplier_purchase_calculation_history (
       organization_id, purchase_id, changed_by, change_reason,
       previous_method, previous_data_quality_grade, previous_factor_id,
       previous_factor_value, previous_factor_unit, previous_factor_source,
       previous_factor_year, previous_emissions_kgco2e,
       previous_quantity, previous_quantity_unit, previous_amount, previous_currency,
       new_method, new_data_quality_grade, new_factor_id,
       new_factor_value, new_factor_unit, new_factor_source,
       new_factor_year, new_emissions_kgco2e,
       new_quantity, new_quantity_unit, new_amount, new_currency,
       is_methodological_revaluation, notes
     ) VALUES (
       $1,$2,$3,$4,
       $5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,
       $17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,
       $29,$30
     )`,
    [
      args.organizationId,
      args.purchaseId,
      args.userId,
      args.changeReason ??
        (methodological
          ? "Réévaluation liée à l'amélioration des données"
          : "Recalcul"),
      p.calculation_method ?? null,
      p.data_quality_grade ?? null,
      p.emission_factor_id ?? null,
      p.emission_factor_value ?? null,
      p.emission_factor_unit ?? null,
      p.emission_factor_source ?? null,
      p.emission_factor_year ?? null,
      prevEmissions,
      p.quantity ?? null,
      p.quantity_unit ?? null,
      p.amount ?? null,
      p.currency ?? null,
      n.calculationMethod,
      n.dataQualityGrade,
      n.factorId,
      n.factorValue,
      n.factorUnit,
      n.factorSource,
      n.factorYear,
      n.emissionsKg,
      n.quantity ?? n.quantityUsed,
      n.quantityUnit ?? n.quantityUnitUsed,
      n.amount ?? n.amountOriginal,
      n.currency ?? n.currencyOriginal,
      methodological || prevEmissions == null,
      n.formula,
    ],
  );
}

/** Map GHG cat → activity subcategory for bilan consolidation */
export function purchaseToActivitySubcategory(
  ghgCat: number | null | undefined,
  purchaseCategory: string | null | undefined,
): { category: string; subcategory: string } {
  const cat = Number(ghgCat) || 1;
  if (cat === 2) {
    return {
      category: "scope3_upstream",
      subcategory: "cat2_capital_goods:cat2_capex_general",
    };
  }
  if (cat === 4) {
    return {
      category: "scope3_upstream",
      subcategory: "cat4_upstream_transport:cat4_road_freight_local",
    };
  }
  const label = String(purchaseCategory || "achats")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .slice(0, 40);
  return {
    category: "scope3_upstream",
    subcategory: `cat1_purchased_goods:cat1_${label || "general"}`,
  };
}

/**
 * Consolide une ligne d'achat vers activity_data (source de vérité = purchase).
 * legacy_source = 'supplier_purchase', legacy_id = purchase.id
 */
export async function syncPurchaseToActivityData(
  db: Queryable,
  args: {
    organizationId: string;
    userId: string;
    purchase: {
      id: string;
      supplier_id: string | null;
      site_id: string | null;
      reference_year: number | null;
      description: string | null;
      product_service: string | null;
      amount: number | null;
      currency: string | null;
      quantity: number | null;
      quantity_unit: string | null;
      purchase_category: string | null;
      ghg_scope3_category: number | null;
      emission_factor_id: string | null;
      emission_factor_value: number | null;
      emission_factor_source: string | null;
      emission_factor_year: number | null;
      calculated_emissions_kgco2e: number | null;
      calculation_method: string | null;
      data_quality_grade: string | null;
      data_method: string | null;
      uncertainty_percent: number | null;
      activity_data_id: string | null;
    };
    calc: PurchaseCalcResult;
  },
): Promise<string | null> {
  const p = args.purchase;
  const year = p.reference_year || new Date().getFullYear();
  const periodStart = `${year}-01-01`;
  const periodEnd = `${year}-12-31`;
  const { category, subcategory } = purchaseToActivitySubcategory(
    p.ghg_scope3_category,
    p.purchase_category,
  );

  const methodMap: Record<string, string> = {
    spend: "monetary",
    physical: "physical",
    supplier_specific: "supplier_specific",
    hybrid: "other",
  };
  const dataMethod =
    methodMap[String(p.calculation_method || args.calc.calculationMethod)] ||
    "monetary";
  const dataQuality =
    args.calc.dataQualityGrade === "A" || args.calc.dataQualityGrade === "B"
      ? "real"
      : args.calc.dataQualityGrade === "E"
        ? "default"
        : "estimated";

  // Quantity for activity: prefer physical qty; else amount in factor currency
  const qty =
    args.calc.quantityUsed ??
    (p.quantity != null ? Number(p.quantity) : Number(p.amount) || 0);
  const unit = args.calc.quantityUnitUsed || p.quantity_unit || p.currency || "TND";

  const notes = [
    `Source: Module Fournisseurs & Achats`,
    p.description || p.product_service || "",
    `Méthode: ${args.calc.calculationMethod}`,
    `Qualité CarboScan: ${args.calc.dataQualityGrade}`,
    args.calc.formula,
  ]
    .filter(Boolean)
    .join(" · ");

  if (p.activity_data_id) {
    await db.query(
      `UPDATE activity_data SET
         site_id = $2, supplier_id = $3, category = $4, subcategory = $5,
         scope = 3, quantity = $6, unit = $7,
         period_start = $8, period_end = $9,
         factor_id = $10, activity_type = 'purchase',
         data_quality = $11, data_method = $12, source_type = 'invoice',
         uncertainty_pct = $13,
         emission_factor_source = $14, emission_factor_year = $15,
         emission_factor_region = $16, notes = $17,
         validation_status = 'validated', updated_at = now()
       WHERE id = $1 AND organization_id = $18`,
      [
        p.activity_data_id,
        p.site_id,
        p.supplier_id,
        category,
        subcategory,
        qty,
        unit,
        periodStart,
        periodEnd,
        args.calc.factorId,
        dataQuality,
        dataMethod,
        args.calc.uncertaintyPct,
        args.calc.factorSource,
        args.calc.factorYear,
        args.calc.factorGeography,
        notes,
        args.organizationId,
      ],
    );
    return p.activity_data_id;
  }

  const { rows } = await db.query(
    `INSERT INTO activity_data (
       organization_id, site_id, supplier_id, category, subcategory, scope,
       quantity, unit, period_start, period_end, factor_id, activity_type,
       data_quality, data_method, source_type, uncertainty_pct,
       emission_factor_source, emission_factor_year, emission_factor_region,
       notes, created_by, validation_status, legacy_source, legacy_id
     ) VALUES (
       $1,$2,$3,$4,$5,3,
       $6,$7,$8,$9,$10,'purchase',
       $11,$12,'invoice',$13,
       $14,$15,$16,
       $17,$18,'validated','supplier_purchase',$19
     )
     RETURNING id`,
    [
      args.organizationId,
      p.site_id,
      p.supplier_id,
      category,
      subcategory,
      qty,
      unit,
      periodStart,
      periodEnd,
      args.calc.factorId,
      dataQuality,
      dataMethod,
      args.calc.uncertaintyPct,
      args.calc.factorSource,
      args.calc.factorYear,
      args.calc.factorGeography,
      notes,
      args.userId,
      p.id,
    ],
  );
  return rows[0]?.id ? String(rows[0].id) : null;
}

export async function deleteSyncedActivity(
  db: Queryable,
  organizationId: string,
  purchaseId: string,
  activityDataId: string | null,
): Promise<void> {
  if (activityDataId) {
    await db.query(
      `DELETE FROM activity_data WHERE id = $1 AND organization_id = $2`,
      [activityDataId, organizationId],
    );
  }
  await db.query(
    `DELETE FROM activity_data
     WHERE organization_id = $1 AND legacy_source = 'supplier_purchase' AND legacy_id = $2`,
    [organizationId, purchaseId],
  );
}
