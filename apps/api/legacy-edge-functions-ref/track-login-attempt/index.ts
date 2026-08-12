import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.52.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface LoginAttemptRequest {
  email?: string;
  success: boolean;
  userAgent?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Obtenir l'adresse IP du client
    const forwardedFor = req.headers.get('x-forwarded-for');
    const clientIP = req.headers.get('x-real-ip') || forwardedFor?.split(',')[0] || '127.0.0.1';
    
    console.log(`[TRACK-LOGIN] Processing request from IP: ${clientIP}`);

    if (req.method === 'POST') {
      const { email, success, userAgent }: LoginAttemptRequest = await req.json();

      // Vérifier d'abord si l'IP est bloquée
      const { data: isBlocked } = await supabase.rpc('is_ip_blocked', {
        _ip_address: clientIP
      });

      if (isBlocked && !success) {
        console.log(`[TRACK-LOGIN] IP ${clientIP} is blocked`);
        return new Response(
          JSON.stringify({ 
            error: 'IP_BLOCKED',
            message: 'Votre adresse IP est temporairement bloquée suite à plusieurs tentatives de connexion échouées. Réessayez dans 24 heures.',
            blockedUntil: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
          }),
          {
            status: 429,
            headers: { 'Content-Type': 'application/json', ...corsHeaders },
          }
        );
      }

      // Enregistrer la tentative de connexion
      const { error: recordError } = await supabase.rpc('record_login_attempt', {
        _ip_address: clientIP,
        _email: email || null,
        _success: success,
        _user_agent: userAgent || null
      });

      if (recordError) {
        console.error('[TRACK-LOGIN] Error recording attempt:', recordError);
      } else {
        console.log(`[TRACK-LOGIN] Recorded ${success ? 'successful' : 'failed'} attempt for IP ${clientIP}`);
      }

      return new Response(
        JSON.stringify({ success: true }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    if (req.method === 'GET') {
      // Vérifier si l'IP est bloquée
      const { data: isBlocked } = await supabase.rpc('is_ip_blocked', {
        _ip_address: clientIP
      });

      return new Response(
        JSON.stringify({ 
          ip: clientIP,
          isBlocked: !!isBlocked
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      {
        status: 405,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );

  } catch (error) {
    console.error('[TRACK-LOGIN] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
};

serve(handler);