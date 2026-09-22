import { hasAnalyticsConsent, trackEvent } from "@/lib/analytics";

const ALLOWED = new Set([
  "template_version",
  "question_code",
  "axis_id",
  "question_type",
  "answer_kind",
  "reliability",
  "reliability_limited",
  "maturity_level",
  "module",
  "marketing_consent",
]);

export function diagnosticParams(
  params: Record<string, string | number | boolean | undefined>,
): Record<string, string | number | boolean | undefined> {
  const safe: Record<string, string | number | boolean | undefined> = {};
  for (const [key, value] of Object.entries(params)) {
    if (!ALLOWED.has(key) || value === undefined) continue;
    safe[key] = value;
  }
  return safe;
}

export function trackDiagnostic(
  name:
    | "diagnostic_started"
    | "diagnostic_question_answered"
    | "diagnostic_answered"
    | "diagnostic_axis_completed"
    | "diagnostic_abandoned"
    | "diagnostic_completed"
    | "diagnostic_report_requested"
    | "diagnostic_report_downloaded"
    | "diagnostic_cta_clicked"
    | "diagnostic_claimed",
  params: Record<string, string | number | boolean | undefined> = {},
) {
  if (!hasAnalyticsConsent()) return;
  trackEvent(name, diagnosticParams(params));
}
