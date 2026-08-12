import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
}

// Facteurs carbone par défaut (kgCO2e par unité)
const DEFAULT_FACTORS: Record<string, number> = {
  service: 0.5,
  materiau: 2.0,
  transport: 1.5,
  autre: 0.8,
}

// Authentification double : API Key ou JWT
async function authenticate(req: Request, supabase: any): Promise<string | null> {
  // 1. API Key
  const apiKey = req.headers.get('x-api-key')
  if (apiKey) {
    const encoder = new TextEncoder()
    const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(apiKey))
    const keyHash = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('')

    const { data } = await supabase
      .from('api_keys')
      .select('organization_id, is_active')
      .eq('key_hash', keyHash)
      .single()

    if (data?.is_active) {
      await supabase.from('api_keys').update({ last_used_at: new Date().toISOString() }).eq('key_hash', keyHash)
      return data.organization_id
    }
    return null
  }

  // 2. JWT Bearer
  const auth = req.headers.get('authorization')
  if (auth?.startsWith('Bearer ')) {
    const { data: { user } } = await supabase.auth.getUser(auth.replace('Bearer ', ''))
    if (!user) return null

    const { data: org } = await supabase
      .from('organizations')
      .select('id')
      .eq('user_id', user.id)
      .limit(1)
      .single()

    if (org) return org.id

    const { data: member } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)
      .limit(1)
      .single()

    return member?.organization_id || null
  }

  return null
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Auth
    const orgId = await authenticate(req, supabase)
    if (!orgId) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized', message: 'Clé API invalide ou token JWT manquant' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const body = await req.json()

    // Validation
    if (!Array.isArray(body.items) || body.items.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Invalid input', message: 'Le body doit contenir items (array non vide)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    for (const item of body.items) {
      if (typeof item.quantity !== 'number' || item.quantity < 0) {
        return new Response(
          JSON.stringify({ error: 'Invalid item', message: `quantity doit être un nombre >= 0 pour "${item.name || 'inconnu'}"` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      if (!item.category || !['service', 'materiau', 'transport', 'autre'].includes(item.category)) {
        return new Response(
          JSON.stringify({ error: 'Invalid category', message: `category doit être: service, materiau, transport ou autre` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // Charger les facteurs custom de l'org (si existants), sinon facteurs par défaut
    const { data: customFactors } = await supabase
      .from('invoice_emission_factors')
      .select('category, factor')
      .eq('organization_id', orgId)

    const factors = { ...DEFAULT_FACTORS }
    if (customFactors && customFactors.length > 0) {
      for (const cf of customFactors) {
        factors[cf.category] = cf.factor
      }
    }

    // Calcul simple : somme de (quantity × facteur)
    let total = 0
    for (const item of body.items) {
      const factor = factors[item.category] ?? factors.autre
      total += item.quantity * factor
    }

    // Arrondi à 1 décimale
    const totalCo2e = Math.round(total * 10) / 10

    // Texte d'affichage pour la facture
    const displayText = `Empreinte carbone estimée de cette facture : ${totalCo2e} kg CO₂e`

    // Sauvegarder le résultat si invoice_id fourni
    if (body.invoice_id) {
      await supabase
        .from('invoice_carbon_results')
        .upsert({
          organization_id: orgId,
          invoice_id: body.invoice_id,
          invoice_date: body.invoice_date || null,
          client_name: body.client_name || null,
          total_kgco2e: totalCo2e,
          lines: body.items,
          display_text: displayText,
        }, { onConflict: 'invoice_id' })
    }

    return new Response(
      JSON.stringify({
        total_co2e: totalCo2e,
        unit: 'kgCO2e',
        display_text: displayText,
        mention: 'Estimation basée sur des facteurs standards.',
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('CarboScan API error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal error', message: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
