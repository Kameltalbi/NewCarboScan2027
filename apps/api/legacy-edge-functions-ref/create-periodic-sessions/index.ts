// Edge Function pour créer automatiquement les sessions périodiques
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { session_id, periodicity } = await req.json();

    if (!session_id || !periodicity) {
      return new Response(
        JSON.stringify({ error: 'session_id and periodicity are required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Récupérer la session parent
    const { data: parentSession, error: sessionError } = await supabaseClient
      .from('collect_sessions')
      .select('*')
      .eq('id', session_id)
      .single();

    if (sessionError || !parentSession) {
      return new Response(
        JSON.stringify({ error: 'Parent session not found' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const now = new Date();
    const currentYear = now.getFullYear();
    const sessionsCreated: string[] = [];

    // Calculer les dates selon la périodicité
    let periods: Array<{ start: Date; end: Date }> = [];

    if (periodicity === 'monthly') {
      // Créer 12 sessions pour l'année en cours
      for (let month = 0; month < 12; month++) {
        const start = new Date(currentYear, month, 1);
        const end = new Date(currentYear, month + 1, 0); // Dernier jour du mois
        periods.push({ start, end });
      }
    } else if (periodicity === 'quarterly') {
      // Créer 4 sessions trimestrielles
      for (let quarter = 0; quarter < 4; quarter++) {
        const start = new Date(currentYear, quarter * 3, 1);
        const end = new Date(currentYear, (quarter + 1) * 3, 0);
        periods.push({ start, end });
      }
    } else if (periodicity === 'yearly') {
      // Créer une session annuelle
      const start = new Date(currentYear, 0, 1);
      const end = new Date(currentYear, 11, 31);
      periods.push({ start, end });
    }

    // Créer les sessions pour chaque période
    for (const period of periods) {
      // Vérifier si la session existe déjà
      const { data: existing } = await supabaseClient
        .from('collect_periodic_history')
        .select('session_id')
        .eq('parent_session_id', session_id)
        .eq('period_start_date', period.start.toISOString().split('T')[0])
        .eq('period_end_date', period.end.toISOString().split('T')[0])
        .single();

      if (existing) {
        continue; // Session déjà créée
      }

      // Créer la session via RPC
      const { data: newSessionId, error: createError } = await supabaseClient.rpc(
        'create_periodic_session',
        {
          p_parent_session_id: session_id,
          p_period_start_date: period.start.toISOString().split('T')[0],
          p_period_end_date: period.end.toISOString().split('T')[0],
        }
      );

      if (createError) {
        console.error('Error creating periodic session:', createError);
        continue;
      }

      sessionsCreated.push(newSessionId);
    }

    // Mettre à jour la session parent avec la périodicité
    await supabaseClient
      .from('collect_sessions')
      .update({
        is_periodic: true,
        periodicity: periodicity,
        next_due_date: periods[0]?.end || null,
      })
      .eq('id', session_id);

    return new Response(
      JSON.stringify({
        success: true,
        sessions_created: sessionsCreated.length,
        session_ids: sessionsCreated,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});



