// Shared API-key auth for public v1 endpoints.
// Validates x-api-key header, returns { orgId, scopes, apiKeyId, env, admin } or a Response error.
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key, idempotency-key',
};

export type ApiAuthResult = {
  ok: true;
  orgId: string;
  scopes: string[];
  apiKeyId: string;
  env: 'test' | 'live';
  admin: SupabaseClient;
} | {
  ok: false;
  response: Response;
};

export async function authenticateApiKey(req: Request, requiredScope: string): Promise<ApiAuthResult> {
  const json = (data: unknown, status: number) =>
    new Response(JSON.stringify(data), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  const apiKey = req.headers.get('x-api-key');
  if (!apiKey) return { ok: false, response: json({ error: 'Missing x-api-key header' }, 401) };
  if (!/^sk_(live|test)_[a-f0-9]{64}$/.test(apiKey)) {
    return { ok: false, response: json({ error: 'Invalid API key format' }, 401) };
  }
  const env: 'test' | 'live' = apiKey.startsWith('sk_live_') ? 'live' : 'test';

  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(apiKey));
  const hash = Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const { data: keyRow } = await admin
    .from('api_keys')
    .select('id, organization_id, scopes, is_active, revoked_at, expires_at')
    .eq('key_hash', hash)
    .maybeSingle();

  const expired = keyRow?.expires_at ? new Date(keyRow.expires_at).getTime() < Date.now() : false;
  if (!keyRow || !keyRow.is_active || keyRow.revoked_at || expired) {
    return { ok: false, response: json({ error: 'Invalid or revoked API key' }, 401) };
  }

  const scopes: string[] = keyRow.scopes ?? [];
  if (requiredScope && !scopes.includes(requiredScope)) {
    return { ok: false, response: json({ error: `Missing scope: ${requiredScope}` }, 403) };
  }

  admin.from('api_keys').update({ last_used_at: new Date().toISOString() }).eq('id', keyRow.id).then(() => {});

  return { ok: true, orgId: keyRow.organization_id, scopes, apiKeyId: keyRow.id, env, admin };
}

export async function logApiRequest(params: {
  admin: SupabaseClient;
  apiKeyId: string | null;
  orgId: string | null;
  endpoint: string;
  method: string;
  status: number;
  durationMs: number;
  ipAddress: string | null;
  userAgent: string | null;
  errorMessage: string | null;
}) {
  try {
    await params.admin.from('api_request_logs').insert({
      api_key_id: params.apiKeyId,
      organization_id: params.orgId,
      endpoint: params.endpoint,
      method: params.method,
      status: params.status,
      duration_ms: params.durationMs,
      ip_address: params.ipAddress,
      user_agent: params.userAgent,
      error_message: params.errorMessage,
    });
  } catch (_) { /* ignore */ }
}
