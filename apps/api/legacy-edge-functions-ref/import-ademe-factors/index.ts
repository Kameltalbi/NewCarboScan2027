// Edge Function: Import ADEME v23.9 emission factors with versioning logic
// - Insert new factors
// - Skip if same (factor_name, year, source) already exists
// - Mark older versions of same factor_name (different source/year) as superseded
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface FactorRow {
  category: string;
  subcategory: string | null;
  factor_name: string;
  nom_affiche: string;
  slug: string;
  emission_factor: number;
  unit: string;
  source: string;
  year: number;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    // Verify caller is superadmin
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: roleCheck } = await admin
      .from('user_roles')
      .select('role')
      .eq('user_id', userData.user.id)
      .eq('role', 'superadmin')
      .maybeSingle();

    if (!roleCheck) {
      return new Response(JSON.stringify({ error: 'Superadmin only' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const rows: FactorRow[] = body.rows || [];
    const supersedeOld: boolean = body.supersede_old !== false;

    if (!Array.isArray(rows) || rows.length === 0) {
      return new Response(JSON.stringify({ error: 'No rows provided' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Upsert using slug (standard unique constraint). Update FE values for existing slugs.
    const { data: inserted, error: insertErr } = await admin
      .from('emission_factors')
      .upsert(
        rows.map((r) => ({
          category: r.category,
          subcategory: r.subcategory,
          factor_name: r.factor_name,
          nom_affiche: r.nom_affiche,
          slug: r.slug,
          emission_factor: r.emission_factor,
          unit: r.unit,
          source: r.source,
          year: r.year,
          is_active: true,
        })),
        { onConflict: 'slug', ignoreDuplicates: false }
      )
      .select('id, factor_name');

    if (insertErr) {
      console.error('Insert error:', insertErr);
      return new Response(JSON.stringify({ error: insertErr.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let supersededCount = 0;
    if (supersedeOld && inserted) {
      // For each newly inserted factor, mark older versions (different source) as superseded
      for (const newFactor of inserted) {
        const { error: supErr, count } = await admin
          .from('emission_factors')
          .update({
            is_active: false,
            superseded_by: newFactor.id,
            superseded_at: new Date().toISOString(),
          }, { count: 'exact' })
          .eq('factor_name', newFactor.factor_name)
          .eq('is_active', true)
          .neq('id', newFactor.id)
          .neq('source', 'ADEME Base Carbone v23.9');
        
        if (!supErr && count) supersededCount += count;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        inserted_count: inserted?.length || 0,
        superseded_count: supersededCount,
        batch_size: rows.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (err) {
    console.error('Fatal:', err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
