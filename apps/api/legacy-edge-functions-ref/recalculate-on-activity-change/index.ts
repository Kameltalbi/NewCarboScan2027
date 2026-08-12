// Edge Function: Recalcul automatique lors de modification de activity_data
// Déclenchée par webhook Supabase sur INSERT/UPDATE/DELETE de activity_data

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WebhookPayload {
  type: 'INSERT' | 'UPDATE' | 'DELETE';
  table: string;
  record: any;
  old_record?: any;
  schema: string;
}

interface RecalculationTask {
  organization_id: string;
  product_id?: string;
  period_start?: string;
  period_end?: string;
  trigger_type: 'activity_data_change';
  trigger_details: any;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse webhook payload
    const payload: WebhookPayload = await req.json();
    console.log('Webhook received:', payload.type, 'on', payload.table);

    // Vérifier que c'est bien activity_data
    if (payload.table !== 'activity_data') {
      return new Response(
        JSON.stringify({ error: 'Invalid table' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extraire les informations de l'enregistrement
    const record = payload.record || payload.old_record;
    if (!record) {
      return new Response(
        JSON.stringify({ error: 'No record data' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const organizationId = record.organization_id;
    const productId = record.product_id;
    const periodStart = record.period_start;
    const periodEnd = record.period_end;

    console.log('Triggering recalculation for organization:', organizationId);

    // 1. Créer une tâche de recalcul dans la queue
    const recalculationTask: RecalculationTask = {
      organization_id: organizationId,
      product_id: productId,
      period_start: periodStart,
      period_end: periodEnd,
      trigger_type: 'activity_data_change',
      trigger_details: {
        change_type: payload.type,
        activity_id: record.id,
        activity_type: record.activity_type,
        category: record.category,
        timestamp: new Date().toISOString(),
      },
    };

    const { error: queueError } = await supabase
      .from('recalculation_queue')
      .insert({
        organization_id: organizationId,
        product_id: productId,
        trigger_type: 'activity_data_change',
        trigger_details: recalculationTask.trigger_details,
        status: 'pending',
        created_at: new Date().toISOString(),
      });

    if (queueError) {
      console.error('Error creating recalculation task:', queueError);
      // Ne pas bloquer - continuer avec le recalcul direct
    }

    // 2. Invalider les caches existants
    await invalidateCaches(supabase, organizationId, productId, periodStart, periodEnd);

    // 3. Déclencher les recalculs nécessaires
    const recalculationResults = await performRecalculations(
      supabase,
      organizationId,
      productId,
      periodStart,
      periodEnd
    );

    // 4. Mettre à jour le statut de la tâche
    if (!queueError) {
      await supabase
        .from('recalculation_queue')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          result: recalculationResults,
        })
        .eq('organization_id', organizationId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(1);
    }

    // 5. Créer des notifications pour les utilisateurs concernés
    await createRecalculationNotifications(supabase, organizationId, recalculationResults);

    return new Response(
      JSON.stringify({
        success: true,
        organization_id: organizationId,
        recalculations: recalculationResults,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Function error:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

/**
 * Invalider les caches existants (bilans_carbone, etc.)
 */
async function invalidateCaches(
  supabase: any,
  organizationId: string,
  productId?: string,
  periodStart?: string,
  periodEnd?: string
) {
  console.log('Invalidating caches for organization:', organizationId);

  // Marquer les bilans_carbone comme obsolètes
  // Note: On ne les supprime pas pour garder l'historique, mais on ajoute un flag
  const { error: bilanError } = await supabase
    .from('bilans_carbone')
    .update({
      is_cache_valid: false,
      cache_invalidated_at: new Date().toISOString(),
    })
    .eq('organization_id', organizationId);

  if (bilanError) {
    console.error('Error invalidating bilan cache:', bilanError);
  }

  // Si un produit est concerné, invalider aussi les caches produit
  if (productId) {
    // TODO: Invalider les caches d'empreinte produit si nécessaire
    console.log('Product cache invalidation for:', productId);
  }

  return { success: true };
}

/**
 * Effectuer les recalculs nécessaires
 */
async function performRecalculations(
  supabase: any,
  organizationId: string,
  productId?: string,
  periodStart?: string,
  periodEnd?: string
) {
  const results: any = {
    bilan_carbone: null,
    product_footprint: null,
    dashboard_metrics: null,
  };

  try {
    // 1. Recalculer le Bilan Carbone
    console.log('Recalculating Bilan Carbone...');
    const { data: bilanData, error: bilanError } = await supabase.rpc(
      'calculate_bilan_carbone_from_activity_data',
      {
        p_organization_id: organizationId,
        p_period_start: periodStart || null,
        p_period_end: periodEnd || null,
      }
    );

    if (bilanError) {
      console.error('Error recalculating Bilan Carbone:', bilanError);
      results.bilan_carbone = { error: bilanError.message };
    } else {
      results.bilan_carbone = bilanData;
      console.log('Bilan Carbone recalculated:', bilanData);
    }

    // 2. Si un produit est concerné, recalculer l'empreinte produit
    if (productId) {
      console.log('Recalculating Product Footprint for:', productId);
      const { data: productData, error: productError } = await supabase.rpc(
        'calculate_product_footprint_from_activity_data',
        {
          p_organization_id: organizationId,
          p_product_id: productId,
        }
      );

      if (productError) {
        console.error('Error recalculating Product Footprint:', productError);
        results.product_footprint = { error: productError.message };
      } else {
        results.product_footprint = productData;
        console.log('Product Footprint recalculated:', productData);
      }
    }

    // 3. Recalculer les métriques du dashboard
    console.log('Recalculating Dashboard metrics...');
    const { data: dashboardData, error: dashboardError } = await supabase.rpc(
      'calculate_dashboard_metrics_from_activity_data',
      {
        p_organization_id: organizationId,
      }
    );

    if (dashboardError) {
      console.error('Error recalculating Dashboard metrics:', dashboardError);
      results.dashboard_metrics = { error: dashboardError.message };
    } else {
      results.dashboard_metrics = dashboardData;
      console.log('Dashboard metrics recalculated:', dashboardData);
    }
  } catch (error) {
    console.error('Error in performRecalculations:', error);
  }

  return results;
}

/**
 * Créer des notifications pour informer les utilisateurs du recalcul
 */
async function createRecalculationNotifications(
  supabase: any,
  organizationId: string,
  recalculationResults: any
) {
  try {
    // Récupérer les membres de l'organisation
    const { data: members, error: membersError } = await supabase
      .from('organization_members')
      .select('user_id')
      .eq('organization_id', organizationId);

    if (membersError || !members || members.length === 0) {
      console.log('No members found for organization:', organizationId);
      return;
    }

    // Créer une notification pour chaque membre
    const notifications = members.map((member: any) => ({
      user_id: member.user_id,
      organization_id: organizationId,
      type: 'recalculation_completed',
      message: 'Vos données carbone ont été recalculées automatiquement suite à une modification.',
      link: '/dashboard',
      is_read: false,
      created_at: new Date().toISOString(),
    }));

    const { error: notifError } = await supabase
      .from('collect_notifications')
      .insert(notifications);

    if (notifError) {
      console.error('Error creating notifications:', notifError);
    } else {
      console.log(`Created ${notifications.length} notifications`);
    }
  } catch (error) {
    console.error('Error in createRecalculationNotifications:', error);
  }
}
