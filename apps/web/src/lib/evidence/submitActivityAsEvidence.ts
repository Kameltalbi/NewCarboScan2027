/**
 * Adapter mince : soumettre une activité legacy comme evidence_record.
 * Ne réécrit pas ActivityDataService (encore Supabase-proxy).
 */
import { api } from "@/integrations/api/client";

export type ActivityLike = {
  id?: string;
  quantity?: number | string | null;
  unit?: string | null;
  period_start?: string | null;
  period_end?: string | null;
  data_quality?: string | null;
  source?: string | null;
  scope_hint?: number | null;
};

export async function submitActivityAsEvidence(activity: ActivityLike) {
  const quantity = activity.quantity;
  const unit = activity.unit;
  if (quantity == null || !unit) {
    throw new Error("Activité sans quantité/unité — impossible de créer une preuve");
  }

  const origin =
    activity.source === "excel" || activity.data_quality === "imported"
      ? "excel_import"
      : activity.source === "ocr"
        ? "invoice_ocr"
        : "manual";

  return api.createEvidence({
    origin,
    extractionMethod: origin === "invoice_ocr" ? "ocr" : origin === "excel_import" ? "parser" : "human",
    originalQuantity: String(quantity),
    originalUnit: unit,
    periodStart: activity.period_start ?? undefined,
    periodEnd: activity.period_end ?? undefined,
    sourceFilename: activity.id ? `activity:${activity.id}` : undefined,
    sourceType:
      origin === "excel_import"
        ? "excel"
        : origin === "invoice_ocr"
          ? "invoice"
          : "manual",
    dataClass:
      activity.data_quality === "estimated"
        ? "estimated"
        : activity.data_quality === "real"
          ? "measured"
          : "calculated",
    validationStatus: "submitted",
  });
}
