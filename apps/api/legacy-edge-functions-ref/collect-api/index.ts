// Edge Function: API REST publique pour le module Collect
// Endpoints: GET/POST/PUT/DELETE activity_data
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startedAt = Date.now();
  const endpoint = new URL(req.url).pathname;
  const ipAddress = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null;
  const userAgent = req.headers.get('user-agent') ?? null;
  let apiKeyIdForLog: string | null = null;
  let orgIdForLog: string | null = null;
  let responseStatus = 500;
  let errorMsg: string | null = null;

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  const jsonResponse = (data: any, status = 200) => {
    responseStatus = status;
    if (status >= 400 && !errorMsg && data?.error) errorMsg = String(data.error);
    return new Response(JSON.stringify(data), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  };

  try {
    // Auth: Bearer token (Supabase JWT) or x-api-key header
    const authHeader = req.headers.get('authorization');
    const apiKey = req.headers.get('x-api-key');

    let supabase;
    let apiKeyOrgId: string | null = null;
    let apiKeyScopes: string[] = [];

    if (authHeader?.startsWith('Bearer ')) {
      supabase = createClient(supabaseUrl, supabaseServiceKey, {
        global: { headers: { authorization: authHeader } },
      });
    } else if (apiKey) {
      if (!/^sk_(live|test)_[a-f0-9]{64}$/.test(apiKey)) {
        return jsonResponse({ error: 'Invalid API key format' }, 401);
      }
      const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(apiKey));
      const hash = Array.from(new Uint8Array(digest))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');

      const admin = createClient(supabaseUrl, supabaseServiceKey);
      const { data: keyRow } = await admin
        .from('api_keys')
        .select('id, organization_id, scopes, is_active, revoked_at, expires_at')
        .eq('key_hash', hash)
        .maybeSingle();

      const now = Date.now();
      const expired = keyRow?.expires_at ? new Date(keyRow.expires_at).getTime() < now : false;
      if (!keyRow || !keyRow.is_active || keyRow.revoked_at || expired) {
        return jsonResponse({ error: 'Invalid or revoked API key' }, 401);
      }

      apiKeyOrgId = keyRow.organization_id;
      apiKeyScopes = keyRow.scopes ?? [];
      apiKeyIdForLog = keyRow.id;
      orgIdForLog = keyRow.organization_id;

      const needsWrite = ['POST', 'PUT', 'DELETE'].includes(req.method);
      const requiredScope = needsWrite ? 'write:activity' : 'read:activity';
      if (!apiKeyScopes.includes(requiredScope)) {
        return jsonResponse({ error: `Missing scope: ${requiredScope}` }, 403);
      }

      admin.from('api_keys').update({ last_used_at: new Date().toISOString() }).eq('id', keyRow.id).then(() => {});
      supabase = admin;
    } else {
      return jsonResponse({ error: 'Missing authorization header or x-api-key' }, 401);
    }

    const url = new URL(req.url);
    const pathParts = url.pathname.split('/').filter(Boolean);
    const resourceId = pathParts.length > 1 ? pathParts[pathParts.length - 1] : null;

    const orgId = apiKeyOrgId ?? url.searchParams.get('organization_id');
    const category = url.searchParams.get('category');
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const offset = parseInt(url.searchParams.get('offset') || '0');

    switch (req.method) {
      case 'GET': {
        if (resourceId && resourceId !== 'collect-api') {
          const { data, error } = await supabase
            .from('activity_data').select('*').eq('id', resourceId).single();
          if (error) throw error;
          return jsonResponse({ data });
        }
        let query = supabase
          .from('activity_data')
          .select('*', { count: 'exact' })
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1);
        if (orgId) query = query.eq('organization_id', orgId);
        if (category) query = query.eq('category', category);
        const { data, error, count } = await query;
        if (error) throw error;
        return jsonResponse({ data, pagination: { total: count, limit, offset } });
      }

      case 'POST': {
        const body = await req.json();
        if (apiKeyOrgId) body.organization_id = apiKeyOrgId;
        const { data, error } = await supabase
          .from('activity_data').insert(body).select().single();
        if (error) throw error;
        return jsonResponse({ data }, 201);
      }

      case 'PUT': {
        if (!resourceId || resourceId === 'collect-api') {
          return jsonResponse({ error: 'Resource ID required' }, 400);
        }
        const body = await req.json();
        const { data, error } = await supabase
          .from('activity_data').update(body).eq('id', resourceId).select().single();
        if (error) throw error;
        return jsonResponse({ data });
      }

      case 'DELETE': {
        if (!resourceId || resourceId === 'collect-api') {
          return jsonResponse({ error: 'Resource ID required' }, 400);
        }
        const { error } = await supabase
          .from('activity_data').delete().eq('id', resourceId);
        if (error) throw error;
        return jsonResponse({ success: true }, 204);
      }

      default:
        return jsonResponse({ error: 'Method not allowed' }, 405);
    }
  } catch (error: any) {
    console.error('API Error:', error);
    errorMsg = error?.message || 'Internal server error';
    return jsonResponse({ error: errorMsg }, 500);
  } finally {
    // Log async — fire and forget, ne bloque pas la réponse
    try {
      const admin = createClient(supabaseUrl, supabaseServiceKey);
      admin.from('api_request_logs').insert({
        api_key_id: apiKeyIdForLog,
        organization_id: orgIdForLog,
        endpoint,
        method: req.method,
        status: responseStatus,
        duration_ms: Date.now() - startedAt,
        ip_address: ipAddress,
        user_agent: userAgent,
        error_message: errorMsg,
      }).then(() => {});
    } catch (_) {
      // ignore log failures
    }
  }
});
