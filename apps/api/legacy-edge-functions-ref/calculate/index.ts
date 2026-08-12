// Edge Function: POST /v1/calculate
// Calcule les émissions kgCO2e à partir d'une activité.
// - Requiert une clé sk_live_ (env=live) avec scope write:activity.
// - Supporte l'idempotence via header Idempotency-Key.
import { authenticateApiKey, corsHeaders, logApiRequest } from '../_shared/api-auth.ts';

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const startedAt = Date.now();
  const endpoint = new URL(req.url).pathname;
  const ipAddress = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null;
  const userAgent = req.headers.get('user-agent') ?? null;
  let apiKeyIdForLog: string | null = null;
  let orgIdForLog: string | null = null;
  let responseStatus = 500;
  let errorMsg: string | null = null;
  let adminForLog: any = null;

  const json = (data: unknown, status: number) => {
    responseStatus = status;
    if (status >= 400 && (data as any)?.error) errorMsg = String((data as any).error);
    return new Response(JSON.stringify(data), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  };

  try {
    if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

    const auth = await authenticateApiKey(req, 'write:activity');
    if (!auth.ok) return auth.response;
    apiKeyIdForLog = auth.apiKeyId;
    orgIdForLog = auth.orgId;
    adminForLog = auth.admin;

    if (auth.env !== 'live') {
      return json({ error: 'Calculate endpoint requires a live API key (sk_live_...)' }, 402);
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object') return json({ error: 'Invalid JSON body' }, 400);

    const { activity_type, quantity, unit, factor_id, category, subcategory } = body as Record<string, any>;
    if (typeof quantity !== 'number' || !isFinite(quantity) || quantity < 0) {
      return json({ error: 'quantity must be a positive number' }, 400);
    }
    if (!unit || typeof unit !== 'string') return json({ error: 'unit is required' }, 400);

    // Idempotency: si la clé + orgId ont déjà répondu, renvoyer la même réponse.
    const idemKey = req.headers.get('idempotency-key');
    if (idemKey) {
      const { data: prev } = await auth.admin
        .from('api_request_logs')
        .select('id, status, error_message')
        .eq('api_key_id', auth.apiKeyId)
        .eq('endpoint', endpoint)
        .eq('error_message', `idem:${idemKey}`)
        .maybeSingle();
      if (prev) return json({ error: 'Duplicate request (idempotency-key already used)', log_id: prev.id }, 409);
    }

    // Résolution du facteur
    let factor: any = null;
    if (factor_id) {
      const { data } = await auth.admin
        .from('emission_factors')
        .select('id, factor_name, emission_factor, unit, source, year, category, subcategory')
        .eq('id', factor_id).maybeSingle();
      factor = data;
    } else if (category) {
      let q = auth.admin.from('emission_factors')
        .select('id, factor_name, emission_factor, unit, source, year, category, subcategory')
        .eq('is_active', true).is('superseded_at', null)
        .eq('category', category).order('year', { ascending: false }).limit(1);
      if (subcategory) q = q.eq('subcategory', subcategory);
      const { data } = await q;
      factor = data?.[0] ?? null;
    }

    if (!factor) return json({ error: 'Emission factor not found (provide factor_id or category)' }, 404);

    const emissions_kgco2e = Number((quantity * Number(factor.emission_factor)).toFixed(6));

    // Log idempotence marker via champ error_message (léger, réutilise la table logs).
    if (idemKey) {
      errorMsg = `idem:${idemKey}`;
    }

    return json({
      emissions_kgco2e,
      emissions_tco2e: Number((emissions_kgco2e / 1000).toFixed(6)),
      factor_used: {
        id: factor.id,
        name: factor.factor_name,
        value: factor.emission_factor,
        unit: factor.unit,
        source: factor.source,
        year: factor.year,
      },
      breakdown: {
        activity_type: activity_type ?? null,
        quantity,
        unit,
        formula: `${quantity} × ${factor.emission_factor} = ${emissions_kgco2e} kgCO2e`,
      },
    }, 200);
  } catch (e) {
    errorMsg = (e as Error).message;
    return json({ error: errorMsg }, 500);
  } finally {
    if (adminForLog) {
      logApiRequest({
        admin: adminForLog, apiKeyId: apiKeyIdForLog, orgId: orgIdForLog,
        endpoint, method: req.method, status: responseStatus,
        durationMs: Date.now() - startedAt, ipAddress, userAgent, errorMessage: errorMsg,
      });
    }
  }
});
