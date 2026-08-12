// Edge Function pour générer des estimations automatiques avec IA
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface HistoricalData {
  question_key: string;
  question_category: string;
  values: Array<{ value: number; unit: string; period: string; created_at: string }>;
  avg_value: number;
  trend_direction: string;
  trend_slope: number;
  seasonal_factors: Record<string, number>;
}

interface EstimationRequest {
  session_id: string;
  company_id: string;
  question_keys?: string[]; // Si vide, estimer toutes les questions manquantes
  current_month?: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { session_id, company_id, question_keys, current_month } = await req.json() as EstimationRequest;

    if (!session_id || !company_id) {
      return new Response(
        JSON.stringify({ error: 'session_id and company_id are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const month = current_month || new Date().getMonth() + 1;
    console.log(`Generating estimations for session ${session_id}, company ${company_id}, month ${month}`);

    // 1. Récupérer les réponses existantes pour cette session
    const { data: existingResponses } = await supabaseClient
      .from('collect_responses')
      .select('question_key')
      .eq('session_id', session_id);

    const answeredKeys = new Set(existingResponses?.map(r => r.question_key) || []);

    // 2. Récupérer l'historique des données de l'entreprise
    const { data: historicalData, error: histError } = await supabaseClient
      .from('collect_responses')
      .select(`
        question_key,
        question_category,
        value,
        unit,
        created_at,
        collect_sessions!inner(company_id, period_start_date, year)
      `)
      .eq('collect_sessions.company_id', company_id)
      .neq('session_id', session_id)
      .not('value', 'is', null);

    if (histError) {
      console.error('Error fetching historical data:', histError);
    }

    // 3. Grouper les données par question
    const historyByQuestion: Record<string, HistoricalData> = {};
    
    for (const row of historicalData || []) {
      const key = row.question_key;
      const valueStr = typeof row.value === 'object' ? JSON.stringify(row.value) : String(row.value);
      const numValue = parseFloat(valueStr);
      
      if (isNaN(numValue)) continue;

      if (!historyByQuestion[key]) {
        historyByQuestion[key] = {
          question_key: key,
          question_category: row.question_category,
          values: [],
          avg_value: 0,
          trend_direction: 'stable',
          trend_slope: 0,
          seasonal_factors: {},
        };
      }

      historyByQuestion[key].values.push({
        value: numValue,
        unit: row.unit || '',
        period: (row.collect_sessions as any)?.period_start_date || row.created_at,
        created_at: row.created_at,
      });
    }

    // 4. Calculer les statistiques pour chaque question
    for (const key in historyByQuestion) {
      const data = historyByQuestion[key];
      if (data.values.length === 0) continue;

      // Moyenne
      const sum = data.values.reduce((acc, v) => acc + v.value, 0);
      data.avg_value = sum / data.values.length;

      // Tendance (régression linéaire simple)
      if (data.values.length >= 2) {
        const sorted = [...data.values].sort((a, b) => 
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
        
        const n = sorted.length;
        let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
        
        for (let i = 0; i < n; i++) {
          sumX += i;
          sumY += sorted[i].value;
          sumXY += i * sorted[i].value;
          sumX2 += i * i;
        }
        
        const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
        data.trend_slope = isNaN(slope) ? 0 : slope;
        
        if (data.trend_slope > 0.05 * data.avg_value) {
          data.trend_direction = 'increasing';
        } else if (data.trend_slope < -0.05 * data.avg_value) {
          data.trend_direction = 'decreasing';
        }
      }

      // Facteurs saisonniers
      const valuesByMonth: Record<number, number[]> = {};
      for (const v of data.values) {
        const m = new Date(v.period || v.created_at).getMonth() + 1;
        if (!valuesByMonth[m]) valuesByMonth[m] = [];
        valuesByMonth[m].push(v.value);
      }
      
      for (const m in valuesByMonth) {
        const monthAvg = valuesByMonth[m].reduce((a, b) => a + b, 0) / valuesByMonth[m].length;
        data.seasonal_factors[m] = data.avg_value > 0 ? monthAvg / data.avg_value : 1;
      }
    }

    // 5. Identifier les questions à estimer
    const questionsToEstimate = question_keys?.length
      ? question_keys.filter(k => !answeredKeys.has(k) && historyByQuestion[k])
      : Object.keys(historyByQuestion).filter(k => !answeredKeys.has(k));

    console.log(`Questions to estimate: ${questionsToEstimate.length}`);

    if (questionsToEstimate.length === 0) {
      return new Response(
        JSON.stringify({ success: true, estimations_created: 0, message: 'No questions to estimate' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 6. Préparer le prompt pour l'IA
    const questionsData = questionsToEstimate.map(key => {
      const hist = historyByQuestion[key];
      return {
        key,
        category: hist.question_category,
        avg_value: hist.avg_value,
        trend: hist.trend_direction,
        trend_slope: hist.trend_slope,
        data_points: hist.values.length,
        seasonal_factor: hist.seasonal_factors[month] || 1,
        recent_values: hist.values.slice(-5).map(v => ({ value: v.value, period: v.period })),
      };
    });

    // 7. Appeler l'IA pour affiner les estimations
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    let aiEnhancedEstimations: Record<string, { value: number; reasoning: string; confidence: number }> = {};

    if (OPENAI_API_KEY && questionsData.length > 0) {
      try {
        const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${OPENAI_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              {
                role: 'system',
                content: `Tu es un expert en analyse de données environnementales et bilan carbone.
                
Ton rôle est d'analyser les données historiques de consommation d'une entreprise et de fournir des estimations précises pour les périodes manquantes.

Pour chaque question, tu dois:
1. Analyser la tendance historique
2. Appliquer les facteurs saisonniers appropriés
3. Considérer le contexte économique général
4. Fournir une estimation avec un niveau de confiance

Réponds UNIQUEMENT avec un JSON valide sans autre texte.`
              },
              {
                role: 'user',
                content: `Analyse ces données historiques et fournis des estimations pour le mois ${month}:

${JSON.stringify(questionsData, null, 2)}

Réponds avec un objet JSON au format:
{
  "estimations": [
    {
      "key": "question_key",
      "estimated_value": 123.45,
      "confidence": 0.85,
      "reasoning": "Explication courte de l'estimation"
    }
  ]
}`
              }
            ],
            temperature: 0.3,
          }),
        });

        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          const content = aiData.choices?.[0]?.message?.content || '';
          
          // Extraire le JSON de la réponse
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            for (const est of parsed.estimations || []) {
              aiEnhancedEstimations[est.key] = {
                value: est.estimated_value,
                reasoning: est.reasoning,
                confidence: est.confidence,
              };
            }
          }
        } else {
          console.error('AI response not ok:', await aiResponse.text());
        }
      } catch (aiError) {
        console.error('Error calling AI:', aiError);
      }
    }

    // 8. Créer les estimations dans la base
    const estimationsToInsert = questionsToEstimate.map(key => {
      const hist = historyByQuestion[key];
      const aiEst = aiEnhancedEstimations[key];
      
      // Calcul de l'estimation
      let estimatedValue = hist.avg_value;
      let estimationMethod = 'historical_average';
      let reasoning = `Basé sur la moyenne historique de ${hist.values.length} points de données.`;
      
      // Appliquer le facteur saisonnier si disponible
      const seasonalFactor = hist.seasonal_factors[month];
      if (seasonalFactor && Math.abs(seasonalFactor - 1) > 0.1) {
        estimatedValue *= seasonalFactor;
        estimationMethod = 'seasonal_pattern';
        reasoning = `Moyenne ajustée avec facteur saisonnier de ${seasonalFactor.toFixed(2)} pour le mois ${month}.`;
      }
      
      // Appliquer la tendance si significative
      if (hist.trend_direction !== 'stable' && hist.values.length >= 3) {
        const trendAdjustment = hist.trend_slope * (hist.values.length / 2);
        estimatedValue += trendAdjustment;
        estimationMethod = 'trend_analysis';
        reasoning = `Tendance ${hist.trend_direction === 'increasing' ? 'à la hausse' : 'à la baisse'} détectée. `;
      }
      
      // Utiliser l'estimation IA si disponible
      if (aiEst) {
        estimatedValue = aiEst.value;
        estimationMethod = 'ai_prediction';
        reasoning = aiEst.reasoning;
      }
      
      // Calculer le niveau de confiance
      let confidenceScore = 0.5;
      if (hist.values.length >= 12) confidenceScore = 0.9;
      else if (hist.values.length >= 6) confidenceScore = 0.75;
      else if (hist.values.length >= 3) confidenceScore = 0.6;
      
      if (aiEst?.confidence) confidenceScore = aiEst.confidence;
      
      return {
        session_id,
        question_key: key,
        question_category: hist.question_category,
        estimated_value: Math.round(estimatedValue * 100) / 100,
        estimated_unit: hist.values[0]?.unit || null,
        confidence_score: confidenceScore,
        confidence_level: confidenceScore >= 0.75 ? 'high' : confidenceScore >= 0.5 ? 'medium' : 'low',
        estimation_method: estimationMethod,
        source_data: { avg: hist.avg_value, count: hist.values.length },
        historical_values: hist.values.slice(-6),
        trend_direction: hist.trend_direction,
        seasonal_factor: seasonalFactor || null,
        reasoning,
        status: 'pending',
      };
    });

    // Insérer les estimations
    const { data: insertedEstimations, error: insertError } = await supabaseClient
      .from('collect_estimations')
      .upsert(estimationsToInsert, { 
        onConflict: 'session_id,question_key',
        ignoreDuplicates: false 
      })
      .select();

    if (insertError) {
      console.error('Error inserting estimations:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to create estimations', details: insertError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Created ${insertedEstimations?.length || 0} estimations`);

    return new Response(
      JSON.stringify({
        success: true,
        estimations_created: insertedEstimations?.length || 0,
        estimations: insertedEstimations,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
