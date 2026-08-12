/**
 * Edge Function : Chunking rapport Bilan Carbone — v2
 * Génère le contenu IA de CHAQUE page du rapport (25 sections).
 * Le client assemble les chunks dans le template PDF avec header/styling cohérent.
 */
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const openAIApiKey = Deno.env.get("OPENAI_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/** Contexte riche envoyé par le client pour toutes les sections */
interface FullReportContext {
  companyName: string;
  year: number;
  sector: string;
  country: string;
  employees: number;
  sites: number;
  surface: number;
  totalEmissions: number;
  scope1: number;
  scope2: number;
  scope3: number;
  scope1Percent: number;
  scope2Percent: number;
  scope3Percent: number;
  hasScope3: boolean;
  topPoste: string;
  topPosts: string;
  intensityPerEmployee: number;
  intensityPerM2: number;
  scopeDominant: string;
  scopeDominantPercent: number;
  paretoCount: number;
  paretoPercent: number;
  remainingPercent: number;
  reductionTarget: number;
  scope1TopPoste: string;
  scope1SecondaryPostes: string;
  scope2TopPoste: string;
  scope2SecondaryPostes: string;
  scope3PurchasesEmissions: number;
  scope3PurchasesPercent: number;
  scope3TransportEmissions: number;
  scope3TransportPercent: number;
  scope3DeplacementsEmissions: number;
  scope3FinDeVieEmissions: number;
  scope3OtherEmissions: number;
  scope3AchatsTop3Details: string;
  siteNames: string;
  consolidationMethod: string;
}

const P = `font-size:14px;line-height:1.8;color:#334155;margin-bottom:16px;text-align:justify;`;
const H3 = `font-size:16px;font-weight:600;color:#1e293b;margin:24px 0 12px 0;`;
const LI = `font-size:14px;line-height:1.7;color:#334155;margin-bottom:8px;padding-left:16px;`;
const BOX = `background:#f8fafc;border-left:4px solid #64748b;padding:16px 20px;margin:16px 0;border-radius:0 8px 8px 0;font-size:13px;line-height:1.7;color:#334155;`;

const SYSTEM_PROMPT = `Tu es un consultant senior en bilan carbone et stratégie climat. Tu rédiges une section d'un rapport professionnel Bilan Carbone® pour une entreprise.

RÈGLES STRICTES :
- Réponds UNIQUEMENT en HTML valide avec des balises inline-style.
- Styles à utiliser :
  * Paragraphes : <p style="${P}">
  * Sous-titres : <h3 style="${H3}">
  * Listes à puces : <p style="${LI}">• texte</p>
  * Encadrés : <div style="${BOX}">
- PAS de titre h1 ni h2 (le header de page est déjà généré côté client).
- Ton sobre, professionnel, audit-proof. Pas de marketing, pas d'emojis, pas de gras excessif.
- Utilise UNIQUEMENT les chiffres fournis dans le contexte. Ne jamais inventer de données.
- Contexte tunisien : CDN (Contribution Déterminée au niveau National), pas d'EU ETS ni de réglementation européenne, monnaie TND si besoin.
- Rédige un texte DENSE qui remplit une page A4 complète (minimum 500 mots, idéalement 600-700).
- Alterne paragraphes analytiques, listes à puces et encadrés pour structurer et remplir la page.
- Chaque paragraphe doit apporter de la valeur : analyse, contexte, chiffres, recommandations.`;

function buildPrompt(section: string, c: FullReportContext): string {
  const facts = `Entreprise: ${c.companyName} | Secteur: ${c.sector} | Pays: ${c.country} | Année: ${c.year} | Sites: ${c.sites} (${c.siteNames || 'non précisé'}) | Effectif: ${c.employees} | Surface: ${c.surface} m² | Émissions totales: ${c.totalEmissions.toFixed(1)} tCO₂e | Scope 1: ${c.scope1.toFixed(1)} tCO₂e (${c.scope1Percent.toFixed(0)}%) | Scope 2: ${c.scope2.toFixed(1)} tCO₂e (${c.scope2Percent.toFixed(0)}%)${c.hasScope3 ? ` | Scope 3: ${c.scope3.toFixed(1)} tCO₂e (${c.scope3Percent.toFixed(0)}%)` : ''} | Poste principal: ${c.topPoste} | Top postes: ${c.topPosts} | Intensité/pers: ${c.intensityPerEmployee.toFixed(2)} tCO₂e | Intensité/m²: ${c.intensityPerM2.toFixed(1)} kgCO₂e | Scope dominant: ${c.scopeDominant} (${c.scopeDominantPercent.toFixed(0)}%) | Consolidation: ${c.consolidationMethod || 'contrôle opérationnel'}`;

  const scope3Facts = c.hasScope3 ? ` | Achats: ${c.scope3PurchasesEmissions?.toFixed(1) || 0} tCO₂e (${c.scope3PurchasesPercent?.toFixed(0) || 0}%) | Transport: ${c.scope3TransportEmissions?.toFixed(1) || 0} tCO₂e | Déplacements: ${c.scope3DeplacementsEmissions?.toFixed(1) || 0} tCO₂e | Fin de vie: ${c.scope3FinDeVieEmissions?.toFixed(1) || 0} tCO₂e | Top achats: ${c.scope3AchatsTop3Details || 'non détaillé'}` : '';

  switch (section) {
    case 'executive_summary':
      return `Rédige la SYNTHÈSE EXÉCUTIVE du bilan carbone.
Données: ${facts}
Structure: 1) Introduction rappelant l'objet et le total. 2) Répartition par scope avec analyse du scope dominant. 3) Poste principal et concentration des émissions (${c.paretoCount} postes = ${c.paretoPercent}%). 4) Message stratégique pour la direction. 5) Paragraphe de conclusion sur les enjeux.`;

    case 'organization':
      return `Rédige la PRÉSENTATION DE L'ENTREPRISE pour le rapport bilan carbone.
Données: ${facts}
Structure: 1) Présentation générale de l'entreprise, son secteur d'activité et son positionnement. 2) Données clés (effectif, sites, surface, localisation). 3) Description des activités principales et de leur lien avec les émissions de GES. 4) Contexte économique et opérationnel pertinent pour comprendre le profil carbone. 5) Enjeux spécifiques au secteur ${c.sector} en matière d'émissions.`;

    case 'climate_context':
      return `Rédige la section CONTEXTE ET ENJEUX CLIMATIQUES.
Données: ${facts}
Structure: 1) Rappel des enjeux climatiques mondiaux (Accord de Paris, objectif 1.5°C). 2) Contexte tunisien : CDN de la Tunisie, objectifs nationaux de réduction, vulnérabilité climatique du pays. 3) Enjeux spécifiques au secteur ${c.sector}. 4) Pourquoi un bilan carbone est essentiel pour ${c.companyName}. 5) Cadre réglementaire tunisien en matière d'environnement et de climat.`;

    case 'objectives':
      return `Rédige la section OBJECTIFS DE LA DÉMARCHE bilan carbone.
Données: ${facts}
Structure: 1) Objectif principal : quantifier les émissions de GES de ${c.companyName}. 2) Objectifs secondaires : identifier les postes majeurs, établir une base de référence, préparer un plan d'actions. 3) Périmètre retenu (Scopes ${c.hasScope3 ? '1, 2 et 3' : '1 et 2'}) et justification. 4) Année de référence ${c.year} et période couverte. 5) Bénéfices attendus pour l'organisation.`;

    case 'methodology':
      return `Rédige la section RÉFÉRENTIELS ET CADRE MÉTHODOLOGIQUE.
Données: ${facts}
Structure: 1) Présentation des référentiels (GHG Protocol, Bilan Carbone® ADEME, ISO 14064). 2) Principe de calcul : Émissions = Donnée d'activité × Facteur d'émission. 3) Sources des facteurs d'émission (Base Carbone® ADEME). 4) Outil de calcul CarboScan et traçabilité. 5) Limites méthodologiques et incertitudes. 6) Gaz couverts (CO₂, CH₄, N₂O, HFC, PFC, SF₆).`;

    case 'org_perimeter':
      return `Rédige la section PÉRIMÈTRE ORGANISATIONNEL.
Données: ${facts}
Structure: 1) Méthode de consolidation retenue (${c.consolidationMethod || 'contrôle opérationnel'}) et justification. 2) Entités et sites inclus dans le périmètre (${c.sites} sites : ${c.siteNames || 'à préciser'}). 3) Exclusions éventuelles et justification. 4) Année de référence ${c.year}. 5) Comparaison avec les bonnes pratiques sectorielles en matière de périmètre.`;

    case 'op_perimeter':
      return `Rédige la section PÉRIMÈTRE OPÉRATIONNEL ET SCOPES.
Données: ${facts}
Structure: 1) Définition détaillée du Scope 1 (émissions directes) avec exemples concrets pour ${c.companyName}. 2) Définition du Scope 2 (énergie achetée) et lien avec le mix électrique tunisien. 3) ${c.hasScope3 ? 'Définition du Scope 3 (chaîne de valeur) et catégories retenues.' : 'Justification de l\'exclusion du Scope 3.'} 4) Schéma conceptuel des flux d'émissions. 5) Catégories d'émissions couvertes pour chaque scope.`;

    case 'data_collection':
      return `Rédige la section COLLECTE DES DONNÉES.
Données: ${facts}
Structure: 1) Méthodologie de collecte (questionnaires, factures, relevés). 2) Sources de données par scope (factures énergie, relevés kilométriques, données achats). 3) Période de collecte et couverture temporelle. 4) Responsables de la collecte au sein de ${c.companyName}. 5) Contrôles qualité appliqués aux données. 6) Difficultés rencontrées et solutions apportées.`;

    case 'data_hypotheses':
      return `Rédige la section TRAITEMENT DES DONNÉES ET HYPOTHÈSES.
Données: ${facts}
Structure: 1) Hypothèses de calcul retenues (allocations, estimations, proxys). 2) Facteurs d'émission utilisés et leurs sources. 3) Traitement des données manquantes ou incomplètes. 4) Niveaux d'incertitude par scope (5-30% selon les postes). 5) Règles d'allocation entre sites si applicable. 6) Transparence sur les limites des résultats.`;

    case 'site_allocation':
      return `Rédige la section RÉPARTITION DES ÉMISSIONS PAR SITE.
Données: ${facts}
Sites: ${c.siteNames || 'non précisé'}
Structure: 1) Vue d'ensemble de la répartition des émissions entre les ${c.sites} sites. 2) Analyse des disparités entre sites (taille, activité, mix énergétique). 3) Facteurs explicatifs des écarts (surface, effectif, type d'activité). 4) Identification des sites prioritaires pour les actions de réduction. 5) Recommandations de mutualisation ou de bonnes pratiques inter-sites.`;

    case 'results_global':
      return `Rédige la section RÉSULTATS GLOBAUX du bilan carbone.
Données: ${facts}
Structure: 1) Total des émissions : ${c.totalEmissions.toFixed(1)} tCO₂e. 2) Répartition détaillée par scope avec analyse. 3) Scope dominant : Scope ${c.scopeDominant} (${c.scopeDominantPercent.toFixed(0)}%). 4) Indicateurs d'intensité : ${c.intensityPerEmployee.toFixed(2)} tCO₂e/pers et ${c.intensityPerM2.toFixed(1)} kgCO₂e/m². 5) Comparaison avec les ordres de grandeur sectoriels. 6) Premiers enseignements et orientations.`;

    case 'scope1_detail':
      return `Rédige la section RÉSULTATS SCOPE 1 (émissions directes).
Données: ${facts} | Poste principal S1: ${c.scope1TopPoste} | Postes secondaires: ${c.scope1SecondaryPostes}
Structure: 1) Total Scope 1 : ${c.scope1.toFixed(1)} tCO₂e (${c.scope1Percent.toFixed(0)}%). 2) Analyse détaillée du poste principal (${c.scope1TopPoste}). 3) Postes secondaires et leur contribution. 4) Facteurs explicatifs (type de flotte, combustibles, climatisation). 5) Comparaison avec les moyennes sectorielles. 6) Premiers leviers de réduction identifiés.`;

    case 'scope2_detail':
      return `Rédige la section RÉSULTATS SCOPE 2 (énergie achetée).
Données: ${facts} | Poste principal S2: ${c.scope2TopPoste} | Postes secondaires: ${c.scope2SecondaryPostes}
Structure: 1) Total Scope 2 : ${c.scope2.toFixed(1)} tCO₂e (${c.scope2Percent.toFixed(0)}%). 2) Analyse de la consommation électrique et du mix énergétique tunisien. 3) Poste principal (${c.scope2TopPoste}) et facteurs explicatifs. 4) Impact du facteur d'émission du réseau électrique tunisien. 5) Potentiel de réduction par l'efficacité énergétique et les ENR. 6) Comparaison avec les benchmarks sectoriels.`;

    case 'scope3_overview':
      return `Rédige la section RÉSULTATS SCOPE 3 — VUE D'ENSEMBLE.
Données: ${facts}${scope3Facts}
Structure: 1) Total Scope 3 : ${c.scope3.toFixed(1)} tCO₂e (${c.scope3Percent.toFixed(0)}%). 2) Répartition par catégorie (achats, transport, déplacements, déchets, fin de vie). 3) Catégorie dominante et analyse. 4) Enjeux de la chaîne de valeur pour ${c.companyName}. 5) Limites de l'exercice Scope 3 (données disponibles, estimations). 6) Importance stratégique du Scope 3 pour la trajectoire de réduction.`;

    case 'focus_achats':
      return `Rédige la section FOCUS : ACHATS ET BIENS (Scope 3).
Données: ${facts}${scope3Facts}
Structure: 1) Émissions liées aux achats : ${c.scope3PurchasesEmissions?.toFixed(1) || 0} tCO₂e. 2) Catégories d'achats les plus émettrices (${c.scope3AchatsTop3Details || 'à détailler'}). 3) Facteurs explicatifs (intensité carbone des matières premières, volumes). 4) Leviers de réduction : politique d'achats responsables, critères environnementaux, fournisseurs locaux. 5) Bonnes pratiques sectorielles. 6) Objectifs recommandés.`;

    case 'focus_transport':
      return `Rédige la section FOCUS : TRANSPORT AMONT (Scope 3).
Données: ${facts}${scope3Facts}
Structure: 1) Émissions liées au transport : ${c.scope3TransportEmissions?.toFixed(1) || 0} tCO₂e. 2) Modes de transport utilisés et leur intensité carbone. 3) Distances et fréquences des flux logistiques. 4) Leviers : optimisation logistique, consolidation des flux, report modal. 5) Potentiel de réduction estimé. 6) Recommandations opérationnelles.`;

    case 'focus_mobilite':
      return `Rédige la section FOCUS : DÉPLACEMENTS ET MOBILITÉ (Scope 3).
Données: ${facts}${scope3Facts}
Structure: 1) Émissions liées aux déplacements : ${c.scope3DeplacementsEmissions?.toFixed(1) || 0} tCO₂e. 2) Déplacements domicile-travail (modes, distances moyennes). 3) Voyages d'affaires (avion, voiture). 4) Leviers : télétravail, covoiturage, mobilités douces, politique voyage. 5) Plan de mobilité durable pour ${c.companyName}. 6) Estimation du potentiel de réduction.`;

    case 'focus_dechets':
      return `Rédige la section FOCUS : DÉCHETS (Scope 3).
Données: ${facts}${scope3Facts}
Structure: 1) Émissions liées aux déchets de ${c.companyName}. 2) Types de déchets générés (papier, plastique, DEEE, déchets organiques). 3) Filières de traitement actuelles (enfouissement, incinération, recyclage). 4) Leviers : tri sélectif, réduction à la source, valorisation, économie circulaire. 5) Réglementation tunisienne sur les déchets. 6) Objectifs de réduction et bonnes pratiques.`;

    case 'focus_fin_de_vie':
      return `Rédige la section FOCUS : FIN DE VIE DES PRODUITS/VÉHICULES (Scope 3).
Données: ${facts}${scope3Facts}
Structure: 1) Émissions liées à la fin de vie : ${c.scope3FinDeVieEmissions?.toFixed(1) || 0} tCO₂e. 2) Types de produits/équipements concernés. 3) Filières de traitement en fin de vie. 4) Leviers : éco-conception, allongement de la durée de vie, reconditionnement. 5) Économie circulaire et opportunités. 6) Recommandations pour ${c.companyName}.`;

    case 'top_emitters':
      return `Rédige la section ANALYSE DES POSTES LES PLUS ÉMETTEURS.
Données: ${facts}
Structure: 1) Les ${c.paretoCount} premiers postes concentrent ${c.paretoPercent}% des émissions. 2) Analyse détaillée de chaque poste majeur (${c.topPosts}). 3) Facteurs explicatifs de cette concentration. 4) Analyse de Pareto et implications stratégiques. 5) Priorisation des actions de réduction. 6) Quick wins identifiés vs actions structurelles.`;

    case 'kpi_performance':
      return `Rédige la section INDICATEURS DE PERFORMANCE CARBONE.
Données: ${facts}
Structure: 1) Intensité carbone par collaborateur : ${c.intensityPerEmployee.toFixed(2)} tCO₂e/pers. 2) Intensité carbone par m² : ${c.intensityPerM2.toFixed(1)} kgCO₂e/m². 3) Comparaison avec les moyennes sectorielles (${c.sector}). 4) Évolution attendue avec les actions de réduction. 5) KPIs de suivi recommandés (tableau de bord). 6) Objectifs cibles à 3 et 5 ans.`;

    case 'economic_analysis':
      return `Rédige la section ANALYSE ÉCONOMIQUE PROSPECTIVE.
Données: ${facts}
Structure: 1) Coût estimé de la tonne de CO₂ (contexte international et tunisien). 2) Valorisation économique des émissions de ${c.companyName} (${c.totalEmissions.toFixed(1)} tCO₂e). 3) Coûts d'inaction vs coûts de transition. 4) Retour sur investissement des actions de réduction (efficacité énergétique, ENR). 5) Opportunités économiques (économies d'énergie, image, marchés verts). 6) Risques financiers liés au carbone (réglementation, clients, investisseurs).`;

    case 'action_plan':
      return `Rédige la section PLAN D'ACTIONS ET RECOMMANDATIONS.
Données: ${facts}
Structure: 1) Objectif global de réduction : ${c.reductionTarget}% d'ici 2030. 2) Actions court terme (0-12 mois) : éco-conduite, LED, maintenance climatisation, tri déchets. 3) Actions moyen terme (1-3 ans) : électrification flotte, photovoltaïque, achats responsables. 4) Actions long terme (3-5 ans) : transition énergétique complète, engagement fournisseurs. 5) Estimation des réductions par action. 6) Gouvernance et pilotage : comité carbone, KPIs, bilan annuel.`;

    case 'conclusion':
      return `Rédige la CONCLUSION ET ÉTAPES SUIVANTES du rapport.
Données: ${facts}
Structure: 1) Rappel des résultats clés (${c.totalEmissions.toFixed(1)} tCO₂e, scope dominant, postes majeurs). 2) Acquis de la démarche pour ${c.companyName}. 3) Feuille de route : validation direction, déploiement actions, bilan de suivi. 4) Calendrier recommandé (T1: validation, T2: actions court terme, S2: actions structurelles, T4: bilan). 5) Engagement de ${c.companyName} dans la durée. 6) Mention CarboScan et conformité GHG Protocol / Bilan Carbone® ADEME.`;

    default:
      return `Rédige la section "${section}" du rapport bilan carbone.
Données: ${facts}
Rédige un contenu professionnel, dense et structuré en lien avec le sujet de cette section.`;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!openAIApiKey) {
      return new Response(
        JSON.stringify({ error: "OPENAI_API_KEY non configurée" }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const section: string = body.section;
    const context: FullReportContext = body.context;

    if (!section || !context) {
      return new Response(
        JSON.stringify({ error: "Paramètres section et context requis" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userPrompt = buildPrompt(section, context);

    const aiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openAIApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 2500,
        temperature: 0.35,
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("OpenAI error:", aiResponse.status, errText);
      return new Response(
        JSON.stringify({ error: "Erreur API génération contenu", details: errText }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiData = await aiResponse.json();
    const raw = aiData?.choices?.[0]?.message?.content ?? "";
    const content = typeof raw === "string" ? raw.trim() : "";

    return new Response(
      JSON.stringify({ content }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("generate-report-chunk error:", error);
    return new Response(
      JSON.stringify({
        error: "Erreur lors de la génération du chunk",
        details: error instanceof Error ? error.message : "Unknown",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
