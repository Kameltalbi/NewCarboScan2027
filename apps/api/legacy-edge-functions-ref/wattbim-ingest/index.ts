// Edge function: WattBim IoT ingestion
// POST /wattbim-ingest with header X-API-Key
// Body: { meter_external_id, period_start, period_end, value, unit?, cost_amount?, currency?, notes? }
// Or batch: { readings: [ ... ] }
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-api-key",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

interface ReadingInput {
  meter_external_id: string;
  period_start: string;
  period_end: string;
  value: number;
  unit?: string;
  cost_amount?: number;
  currency?: string;
  notes?: string;
}

function validate(r: any): string | null {
  if (!r || typeof r !== "object") return "invalid reading";
  if (!r.meter_external_id || typeof r.meter_external_id !== "string") return "meter_external_id required";
  if (!r.period_start || !r.period_end) return "period_start and period_end required";
  if (typeof r.value !== "number" || !isFinite(r.value)) return "value must be a number";
  if (r.value < 0) return "value must be >= 0";
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "method_not_allowed" }, 405);

  const apiKey = req.headers.get("x-api-key");
  if (!apiKey) return jsonResponse({ error: "missing_x_api_key" }, 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  const keyHash = await sha256Hex(apiKey);
  const { data: keyRow, error: keyErr } = await supabase
    .from("wattbim_api_keys")
    .select("id, organization_id, is_active, revoked_at")
    .eq("key_hash", keyHash)
    .maybeSingle();

  if (keyErr || !keyRow) return jsonResponse({ error: "invalid_api_key" }, 401);
  if (!keyRow.is_active || keyRow.revoked_at) return jsonResponse({ error: "api_key_revoked" }, 401);

  let payload: any;
  try { payload = await req.json(); } catch { return jsonResponse({ error: "invalid_json" }, 400); }

  const readings: ReadingInput[] = Array.isArray(payload?.readings) ? payload.readings : [payload];
  if (readings.length === 0) return jsonResponse({ error: "no_readings" }, 400);
  if (readings.length > 500) return jsonResponse({ error: "too_many_readings", max: 500 }, 400);

  // Validate
  for (let i = 0; i < readings.length; i++) {
    const err = validate(readings[i]);
    if (err) return jsonResponse({ error: "validation_error", index: i, message: err }, 400);
  }

  // Resolve meters by external_id within this org
  const externalIds = [...new Set(readings.map((r) => r.meter_external_id))];
  const { data: meters, error: metersErr } = await supabase
    .from("wattbim_meters")
    .select("id, external_id, unit")
    .eq("organization_id", keyRow.organization_id)
    .in("external_id", externalIds);

  if (metersErr) return jsonResponse({ error: "db_error", details: metersErr.message }, 500);

  const meterMap = new Map((meters ?? []).map((m: any) => [m.external_id, m]));
  const unknown = externalIds.filter((id) => !meterMap.has(id));
  if (unknown.length > 0) return jsonResponse({ error: "unknown_meters", external_ids: unknown }, 404);

  const rows = readings.map((r) => {
    const m = meterMap.get(r.meter_external_id)!;
    return {
      organization_id: keyRow.organization_id,
      meter_id: m.id,
      period_start: r.period_start,
      period_end: r.period_end,
      value: r.value,
      unit: r.unit ?? m.unit ?? "kWh",
      cost_amount: r.cost_amount ?? null,
      currency: r.currency ?? null,
      notes: r.notes ?? null,
      source: "iot",
      is_validated: false,
    };
  });

  const { data: inserted, error: insErr } = await supabase
    .from("wattbim_readings")
    .insert(rows)
    .select("id");

  if (insErr) return jsonResponse({ error: "insert_failed", details: insErr.message }, 500);

  // Update last_used_at (best effort)
  await supabase
    .from("wattbim_api_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", keyRow.id);

  return jsonResponse({ success: true, inserted: inserted?.length ?? 0, ids: inserted?.map((r: any) => r.id) ?? [] }, 201);
});
