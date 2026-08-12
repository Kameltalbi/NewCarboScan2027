import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    const { 
      email, 
      password, 
      organizationData,
      planType,
      amount 
    } = await req.json()

    // 1. Créer l'utilisateur avec l'Admin API
    const { data: newUser, error: userError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true // Auto-confirmer l'email
    })

    if (userError) {
      throw new Error(`Erreur création utilisateur: ${userError.message}`)
    }

    if (!newUser.user) {
      throw new Error('Utilisateur non créé')
    }

    // 2. Créer le profil
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        user_id: newUser.user.id,
        company_name: organizationData.nom_entreprise,
        sector: organizationData.secteur,
        company_size: organizationData.collaborateurs,
        phone: organizationData.phone || null
      })

    if (profileError) {
      throw new Error(`Erreur création profil: ${profileError.message}`)
    }

    // 3. Créer l'entreprise
    const { data: companyData, error: companyError } = await supabaseAdmin
      .from('companies')
      .insert({
        user_id: newUser.user.id,
        nom_entreprise: organizationData.nom_entreprise,
        secteur: organizationData.secteur,
        collaborateurs: parseInt(organizationData.collaborateurs) || 0,
        ca_annuel: parseFloat(organizationData.ca_annuel) || 0
      })
      .select()
      .single()

    if (companyError) {
      throw new Error(`Erreur création entreprise: ${companyError.message}`)
    }

    // 4. Créer la commande
    const { error: orderError } = await supabaseAdmin
      .from('orders')
      .insert({
        user_id: newUser.user.id,
        plan_type: planType,
        amount: parseFloat(amount),
        currency: 'TND',
        payment_method: 'manual',
        status: 'validated', // Auto-valider la commande
        validated_at: new Date().toISOString(),
        user_data: {
          email: email,
          company_name: organizationData.nom_entreprise
        }
      })

    if (orderError) {
      throw new Error(`Erreur création commande: ${orderError.message}`)
    }

    // 5. Assigner le rôle admin à l'utilisateur
    const { error: roleError } = await supabaseAdmin
      .from('user_roles')
      .insert({
        user_id: newUser.user.id,
        role: 'admin'
      })

    if (roleError) {
      throw new Error(`Erreur assignation rôle: ${roleError.message}`)
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        user: newUser.user,
        company: companyData,
        message: 'Organisation et admin créés avec succès' 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('Error in create-organization-admin:', error)
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Une erreur est survenue',
        success: false 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    )
  }
})