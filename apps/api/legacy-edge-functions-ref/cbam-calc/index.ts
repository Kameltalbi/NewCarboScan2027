/**
 * CBAM Calculation Edge Function
 * Receives Excel-parsed JSON, calculates emissions, generates PDF, saves to DB
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { calculateCBAM } from './calculateCBAM.ts';
import { generateCBAMPDF } from './pdfGenerator.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CBAMPayload {
  general: {
    product_name: string;
    hs_code: string;
    country: string;
    period: string;
    unit: string;
    quantity_imported: number;
  };
  energy: Array<{
    type: string;
    unit: string;
    quantity: number;
    FE?: number;
  }>;
  materials: Array<{
    type: string;
    unit: string;
    quantity: number;
    FE?: number;
  }>;
  transport: Array<{
    mode: string;
    distance_km: number;
    tonnage: number;
    FE?: number;
  }>;
  process: Array<{
    process_name: string;
    unit: string;
    value: number;
  }>;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: {
        headers: { Authorization: authHeader },
      },
    });

    // Get authenticated user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const payload: CBAMPayload = await req.json();

    // Validate payload structure
    if (!payload.general || !payload.energy || !payload.materials || !payload.transport || !payload.process) {
      return new Response(
        JSON.stringify({ error: 'Invalid payload structure' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate CBAM emissions
    const result = calculateCBAM({
      energy: payload.energy,
      materials: payload.materials,
      transport: payload.transport,
      process: payload.process,
    });

    // Generate PDF
    let pdfUrl: string | null = null;
    try {
      pdfUrl = await generateCBAMPDF(
        {
          general: payload.general,
          result,
        },
        supabaseUrl,
        supabaseKey
      );
    } catch (pdfError) {
      console.error('PDF generation failed:', pdfError);
      // Continue without PDF - don't fail the whole request
    }

    // Save to database
    const { data: reportData, error: dbError } = await supabase
      .from('cbam_reports')
      .insert({
        product_name: payload.general.product_name,
        country: payload.general.country,
        period: payload.general.period,
        energy_em: result.energyEm,
        materials_em: result.materialsEm,
        transport_em: result.transportEm,
        process_em: result.processEm,
        total_em: result.total,
        pdf_url: pdfUrl,
        raw_json: payload,
        user_id: user.id,
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database error:', dbError);
      return new Response(
        JSON.stringify({ error: 'Failed to save report', details: dbError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        result,
        pdf_url: pdfUrl,
        report_id: reportData?.id,
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




