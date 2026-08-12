import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface BilanData {
  id: string;
  questionnaire_data: any;
  total_emission: number;
  scope1_emission: number;
  scope2_emission: number;
  scope3_emission: number;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )

    console.log('Début du recalcul des bilans carbone...');

    // Récupérer tous les bilans avec des données de questionnaire
    const { data: bilans, error: fetchError } = await supabaseClient
      .from('bilans_carbone')
      .select('id, questionnaire_data, total_emission, scope1_emission, scope2_emission, scope3_emission')
      .not('questionnaire_data', 'is', null);

    if (fetchError) {
      console.error('Erreur lors de la récupération des bilans:', fetchError);
      throw fetchError;
    }

    console.log(`Trouvé ${bilans?.length || 0} bilans à recalculer`);

    const updates: Array<{id: string, newEmissions: any}> = [];

    for (const bilan of bilans || []) {
      try {
        const newEmissions = await recalculateBilan(bilan.questionnaire_data);
        
        if (newEmissions) {
          // Vérifier si les émissions ont significativement changé (plus de 10% de différence)
          const oldTotal = bilan.total_emission;
          const newTotal = newEmissions.total;
          // Seuil plus bas pour détecter même les petites variations dues aux facteurs d'émission
          const percentageDiff = Math.abs((newTotal - oldTotal) / oldTotal) * 100;

          if (percentageDiff > 0.5) { // Seuil abaissé de 10% à 0.5%
            updates.push({
              id: bilan.id,
              newEmissions: {
                total_emission: newTotal,
                scope1_emission: newEmissions.scope1,
                scope2_emission: newEmissions.scope2,
                scope3_emission: newEmissions.scope3
              }
            });

            console.log(`Bilan ${bilan.id}: ${oldTotal} → ${newTotal} kg CO₂e (${percentageDiff.toFixed(1)}% de différence)`);
          }
        }
      } catch (error) {
        console.error(`Erreur lors du recalcul du bilan ${bilan.id}:`, error);
      }
    }

    // Effectuer les mises à jour en batch
    const updateResults = [];
    for (const update of updates) {
      const { error: updateError } = await supabaseClient
        .from('bilans_carbone')
        .update(update.newEmissions)
        .eq('id', update.id);

      if (updateError) {
        console.error(`Erreur lors de la mise à jour du bilan ${update.id}:`, updateError);
      } else {
        updateResults.push(update.id);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Recalcul terminé`,
        bilansAnalyses: bilans?.length || 0,
        bilansModifies: updateResults.length,
        updates: updates
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )

  } catch (error) {
    console.error('Erreur générale:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})

async function recalculateBilan(questionnaireData: any) {
  if (!questionnaireData || typeof questionnaireData !== 'object') {
    return null;
  }

  let scope1 = 0;
  let scope2 = 0;
  let scope3 = 0;

  // Électricité (Scope 2)
  if (questionnaireData.electricite_consommation) {
    const kWh = parseFloat(questionnaireData.electricite_consommation);
    const facteurElec = 0.58; // kgCO₂/kWh mis à jour
    scope2 += kWh * facteurElec;
  }

  // Essence (Scope 1)  
  if (questionnaireData.essence_consommation) {
    const litres = parseFloat(questionnaireData.essence_consommation);
    const facteurEssence = 2.31; // kgCO₂/L
    scope1 += litres * facteurEssence;
  }

  // Gasoil (Scope 1)
  if (questionnaireData.gasoil_consommation) {
    const litres = parseFloat(questionnaireData.gasoil_consommation);
    const facteurGasoil = 2.68; // kgCO₂/L  
    scope1 += litres * facteurGasoil;
  }

  // Gaz naturel (Scope 1)
  if (questionnaireData.gaz_naturel && questionnaireData.gaz_naturel_quantite) {
    const m3 = parseFloat(questionnaireData.gaz_naturel_quantite);
    const facteurGaz = 2.03; // kgCO₂/m³
    scope1 += m3 * facteurGaz;
  }

  // GPL (Scope 1)
  if (questionnaireData.gpl && questionnaireData.gpl_quantite) {
    const kg = parseFloat(questionnaireData.gpl_quantite);
    const facteurGPL = 3.02; // kgCO₂/kg
    scope1 += kg * facteurGPL;
  }

  // Fioul (Scope 1) 
  if (questionnaireData.fioul && questionnaireData.fioul_quantite) {
    const litres = parseFloat(questionnaireData.fioul_quantite);
    const facteurFioul = 2.68; // kgCO₂/L
    scope1 += litres * facteurFioul;
  }

  // Réfrigérants (Scope 1)
  if (questionnaireData.recharge_gaz && questionnaireData.type_gaz_refrigerant) {
    const kg = parseFloat(questionnaireData.recharge_gaz);
    const prgValues: { [key: string]: number } = {
      'R134a': 1430,
      'R410A': 2088,
      'R32': 675,
      'R404A': 3922,
      'R22': 1810
    };
    const prg = prgValues[questionnaireData.type_gaz_refrigerant] || 1500;
    scope1 += kg * prg; // Résultat directement en kg CO₂e
  }

  const total = scope1 + scope2 + scope3;

  return {
    total: Math.round(total),
    scope1: Math.round(scope1),
    scope2: Math.round(scope2), 
    scope3: Math.round(scope3)
  };
}