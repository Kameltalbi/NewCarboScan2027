// Estimate CO2 reduction impact of a climate action using AI
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { action, bilan } = await req.json();
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not configured");

    const systemPrompt = `Tu es un expert en stratégie climat et bilan carbone. Tu estimes l'impact de réduction CO₂ d'une action de décarbonation pour une entreprise.

Réponds UNIQUEMENT en utilisant l'outil fourni. Base ton estimation sur :
- Les émissions actuelles de l'entreprise (scope 1, 2, 3)
- La catégorie et la priorité de l'action
- L'impact estimé en pourcentage indiqué
- Les données sectorielles moyennes

Sois précis et réaliste dans tes estimations.`;

    const userPrompt = `Voici l'action à évaluer :
- Titre : ${action.titre}
- Description : ${action.description}
- Catégorie : ${action.categorie}
- Scope ciblé : ${action.scope_cible}
- Impact estimé : ${action.impact_estime_pourcent}
- Priorité : ${action.priorite}

Contexte de l'entreprise :
- Émissions totales : ${bilan.totalEmissions} kgCO₂e
- Scope 1 : ${bilan.scope1} kgCO₂e
- Scope 2 : ${bilan.scope2} kgCO₂e
- Scope 3 : ${bilan.scope3} kgCO₂e

Estime l'impact de cette action en termes de réduction de CO₂.`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "estimate_impact",
              description: "Retourne l'estimation d'impact CO₂ d'une action de décarbonation",
              parameters: {
                type: "object",
                properties: {
                  reduction_kgco2e: {
                    type: "number",
                    description: "Réduction estimée en kgCO₂e par an"
                  },
                  reduction_percent: {
                    type: "number",
                    description: "Pourcentage de réduction par rapport aux émissions du scope ciblé"
                  },
                  confidence: {
                    type: "string",
                    enum: ["haute", "moyenne", "basse"],
                    description: "Niveau de confiance de l'estimation"
                  },
                  justification: {
                    type: "string",
                    description: "Explication courte (2-3 phrases) de l'estimation"
                  },
                  horizon_mois: {
                    type: "number",
                    description: "Délai estimé pour atteindre le plein effet (en mois)"
                  },
                  cout_estime: {
                    type: "string",
                    enum: ["faible", "moyen", "élevé"],
                    description: "Coût estimé de mise en œuvre"
                  }
                },
                required: ["reduction_kgco2e", "reduction_percent", "confidence", "justification", "horizon_mois", "cout_estime"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "estimate_impact" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Trop de requêtes, réessayez dans quelques instants." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Crédits IA épuisés. Ajoutez des crédits dans les paramètres." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "Erreur du service IA" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall) {
      return new Response(JSON.stringify({ error: "Réponse IA invalide" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const estimation = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify({ estimation }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("estimate-action-impact error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erreur inconnue" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
