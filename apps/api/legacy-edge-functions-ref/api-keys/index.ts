// Edge Function: gestion des clés API par organisation
// Endpoints (auth = Bearer JWT Supabase, l'utilisateur doit être org admin):
//   GET    /api-keys?organization_id=...      -> liste (sans key en clair)
//   POST   /api-keys                          -> { organization_id, app_name, scopes?, env?, expires_at? }
//                                              -> retourne la clé en clair UNE SEULE FOIS
//   DELETE /api-keys/:id                      -> révoque (soft: is_active=false, revoked_at=now)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
};

const ALLOWED_SCOPES = new Set([
  'read:activity',
  'write:activity',
  'read:factors',
  'write:calculate',
  'admin:webhooks',
]);

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// Génération d'une clé : sk_live_xxx / sk_test_xxx
async function generateApiKey(env: 'live' | 'test'): Promise<{ raw: string; hash: string; prefix: string }> {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  const secret = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  const raw = `sk_${env}_${secret}`;
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw));
  const hash = Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  const prefix = raw.substring(0, 12); // ex. sk_live_1a2b
  return { raw, hash, prefix };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return json({ error: 'Unauthorized' }, 401);
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace('Bearer ', '');
    const { data: claims, error: authErr } = await userClient.auth.getClaims(token);
    if (authErr || !claims?.claims) return json({ error: 'Unauthorized' }, 401);
    const userId = claims.claims.sub as string;

    const admin = createClient(supabaseUrl, serviceKey);

    const url = new URL(req.url);
    const parts = url.pathname.split('/').filter(Boolean);
    const resourceId = parts.length > 1 ? parts[parts.length - 1] : null;

    // Helper: vérifier admin de l'org
    async function assertOrgAdmin(orgId: string) {
      const { data, error } = await admin.rpc('is_org_admin', {
        _user_id: userId,
        _org_id: orgId,
      });
      if (error) throw error;
      if (!data) throw new Error('forbidden');
    }

    if (req.method === 'GET') {
      const orgId = url.searchParams.get('organization_id');
      if (!orgId) return json({ error: 'organization_id required' }, 400);
      await assertOrgAdmin(orgId);

      const { data, error } = await admin
        .from('api_keys')
        .select('id, app_name, key_prefix, scopes, env, is_active, revoked_at, expires_at, last_used_at, created_at')
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return json({ data });
    }

    if (req.method === 'POST') {
      const body = await req.json().catch(() => ({}));
      const {
        organization_id,
        app_name,
        scopes = ['read:activity'],
        env = 'live',
        expires_at = null,
      } = body ?? {};

      if (!organization_id || typeof organization_id !== 'string')
        return json({ error: 'organization_id required' }, 400);
      if (!app_name || typeof app_name !== 'string' || app_name.length > 80)
        return json({ error: 'app_name required (max 80 chars)' }, 400);
      if (env !== 'live' && env !== 'test')
        return json({ error: 'env must be live or test' }, 400);
      if (!Array.isArray(scopes) || scopes.length === 0)
        return json({ error: 'scopes must be a non-empty array' }, 400);
      for (const s of scopes) {
        if (!ALLOWED_SCOPES.has(s))
          return json({ error: `invalid scope: ${s}` }, 400);
      }

      await assertOrgAdmin(organization_id);

      const { raw, hash, prefix } = await generateApiKey(env);

      const { data, error } = await admin
        .from('api_keys')
        .insert({
          organization_id,
          app_name,
          key_hash: hash,
          key_prefix: prefix,
          scopes,
          env,
          expires_at,
          created_by: userId,
          is_active: true,
        })
        .select('id, app_name, key_prefix, scopes, env, expires_at, created_at')
        .single();
      if (error) throw error;

      // On retourne la clé en clair UNE seule fois
      return json({ data: { ...data, key: raw } }, 201);
    }

    if (req.method === 'DELETE') {
      if (!resourceId || resourceId === 'api-keys')
        return json({ error: 'key id required' }, 400);

      const { data: existing, error: findErr } = await admin
        .from('api_keys')
        .select('id, organization_id')
        .eq('id', resourceId)
        .maybeSingle();
      if (findErr) throw findErr;
      if (!existing) return json({ error: 'not found' }, 404);

      await assertOrgAdmin(existing.organization_id);

      const { error } = await admin
        .from('api_keys')
        .update({ is_active: false, revoked_at: new Date().toISOString() })
        .eq('id', resourceId);
      if (error) throw error;
      return json({ success: true });
    }

    return json({ error: 'method not allowed' }, 405);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'internal error';
    const status = msg === 'forbidden' ? 403 : 500;
    console.error('api-keys error:', msg);
    return json({ error: msg }, status);
  }
});
