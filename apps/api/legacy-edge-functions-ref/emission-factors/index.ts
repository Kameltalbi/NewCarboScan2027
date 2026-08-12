// Edge Function: GET /v1/emission-factors
// Lecture publique du référentiel de facteurs d'émission (clé test acceptée).
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
    if (req.method !== 'GET') return json({ error: 'Method not allowed' }, 405);

    const auth = await authenticateApiKey(req, 'read:activity');
    if (!auth.ok) return auth.response;
    apiKeyIdForLog = auth.apiKeyId;
    orgIdForLog = auth.orgId;
    adminForLog = auth.admin;

    const url = new URL(req.url);
    const category = url.searchParams.get('category');
    const subcategory = url.searchParams.get('subcategory');
    const source = url.searchParams.get('source');
    const year = url.searchParams.get('year');
    const q = url.searchParams.get('q');
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 200);
    const cursor = url.searchParams.get('cursor'); // id-based

    let query = auth.admin
      .from('emission_factors')
      .select('id, factor_name, nom_affiche, category, subcategory, source, year, emission_factor, unit, slug')
      .eq('is_active', true)
      .is('superseded_at', null)
      .order('id', { ascending: true })
      .limit(limit + 1);

    if (category) query = query.eq('category', category);
    if (subcategory) query = query.eq('subcategory', subcategory);
    if (source) query = query.eq('source', source);
    if (year) query = query.eq('year', parseInt(year));
    if (q) query = query.or(`factor_name.ilike.%${q}%,nom_affiche.ilike.%${q}%`);
    if (cursor) query = query.gt('id', cursor);

    const { data, error } = await query;
    if (error) throw error;

    const hasMore = (data?.length ?? 0) > limit;
    const items = hasMore ? data!.slice(0, limit) : data ?? [];
    const nextCursor = hasMore ? items[items.length - 1].id : null;

    return json({ data: items, pagination: { limit, next_cursor: nextCursor } }, 200);
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
