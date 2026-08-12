-- Rapport Grand Cabinet 25 pages (Scopes 1+2+3) + page Expert Scope 3 (chunk IA)
-- Structure : Vue d'ensemble 1-5, Cœur 6-18, Stratégie 19-25

-- 1. Insérer les templates manquants pour la structure 25 pages (requires_scope3 = true)
INSERT INTO public.report_templates (page_number, section_key, title, content_template, requires_scope3, is_active) VALUES
(2, 'ceo_message', 'Message du CEO', '<div class="ceo-message-section"><h2 class="section-title">Message du CEO</h2><p>Contenu généré par IA (vision entreprise).</p></div>', true, true),
(3, 'infographie_bilan', 'Le Bilan en un coup d''œil', '<div class="infographie-section"><h2 class="section-title">Le Bilan en un coup d''œil</h2><p>Total : <strong>{{totalEmissions}} tCO₂e</strong> | Intensité : <strong>{{intensityPerEmployee}} tCO₂e / pers.</strong></p></div>', true, true),
(5, 'perimetre', 'Périmètre', '<div class="perimetre-section"><h2 class="section-title">Périmètre</h2><p>{{sites}} site(s), {{country}}, année {{year}}. Consolidation : {{consolidationMethod}}.</p></div>', true, true),
(8, 'scope3_expert_analysis', 'Analyse Scope 3 – Expert', '<div class="scope3-expert-section"><h2 class="section-title">Analyse Scope 3 (Expert)</h2><p>Contenu généré par IA à partir des données Achats, Transport, Déplacements, Utilisation, Fin de vie.</p></div>', true, true),
(14, 'scope3_detail_14', 'Scope 3 – Détail (suite)', '<div class="scope3-detail"><p>Suite de l''analyse détaillée Scope 3.</p></div>', true, true),
(15, 'scope3_detail_15', 'Scope 3 – Détail (fin)', '<div class="scope3-detail"><p>Fin de l''analyse Scope 3.</p></div>', true, true),
(16, 'cartographie_emissions', 'Cartographie des émissions', '<div class="cartographie-section"><h2 class="section-title">Cartographie des émissions</h2><p>Tree map / Sankey – répartition des postes et scopes.</p></div>', true, true),
(17, 'cartographie_emissions_suite', 'Cartographie (suite)', '<div class="cartographie-section"><p>Suite de la cartographie.</p></div>', true, true),
(18, 'trajectoires_15_2c', 'Trajectoires 1,5°C / 2°C', '<div class="trajectoires-section"><h2 class="section-title">Comparaison aux trajectoires</h2><p>Positionnement par rapport aux objectifs SBTi / Accord de Paris.</p></div>', true, true),
(19, 'plan_action_operational', 'Plan d''action opérationnel', '<div class="plan-action-section"><h2 class="section-title">Plan d''action opérationnel</h2><p>Tableau Action / Coût / Gain carbone / Priorité.</p></div>', true, true),
(20, 'plan_action_operational_2', 'Plan d''action (suite)', '<div class="plan-action-section"><p>Suite du plan d''action.</p></div>', true, true),
(21, 'plan_action_operational_3', 'Plan d''action (suite)', '<div class="plan-action-section"><p>Suite du plan d''action.</p></div>', true, true),
(22, 'plan_action_operational_4', 'Plan d''action (fin)', '<div class="plan-action-section"><p>Fin du plan d''action.</p></div>', true, true),
(25, 'glossaire_sources', 'Glossaire et sources', '<div class="glossaire-section"><h2 class="section-title">Glossaire et sources</h2><p>GES, PRG, scopes. Facteurs d''émission : Base Carbone® ADEME, GHG Protocol.</p></div>', true, true)
ON CONFLICT (section_key) DO NOTHING;

-- 2. Rapport 25 pages : get_report_pages(true) retourne exactement 25 pages dans l'ordre Grand Cabinet
CREATE OR REPLACE FUNCTION public.get_report_pages(has_scope3 boolean)
RETURNS TABLE (
  page_number integer,
  section_key text,
  title text,
  content_template text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF has_scope3 THEN
    -- Rapport 25 pages (Grand Cabinet) : ordre fixe
    RETURN QUERY
    SELECT
      t.ord::integer AS page_number,
      rt.section_key,
      rt.title,
      rt.content_template
    FROM (
      SELECT 1 AS ord, 'cover'::text AS section_key UNION ALL SELECT 2, 'ceo_message' UNION ALL SELECT 3, 'infographie_bilan' UNION ALL SELECT 4, 'methodology' UNION ALL SELECT 5, 'perimetre'
      UNION ALL SELECT 6, 'scope1_detail' UNION ALL SELECT 7, 'scope2_detail'
      UNION ALL SELECT 8, 'scope3_expert_analysis' UNION ALL SELECT 9, 'scope3_introduction' UNION ALL SELECT 10, 'scope3_overview' UNION ALL SELECT 11, 'scope3_purchases' UNION ALL SELECT 12, 'scope3_transport' UNION ALL SELECT 13, 'scope3_other' UNION ALL SELECT 14, 'scope3_detail_14' UNION ALL SELECT 15, 'scope3_detail_15'
      UNION ALL SELECT 16, 'cartographie_emissions' UNION ALL SELECT 17, 'cartographie_emissions_suite'
      UNION ALL SELECT 18, 'trajectoires_15_2c' UNION ALL SELECT 19, 'plan_action_operational' UNION ALL SELECT 20, 'plan_action_operational_2' UNION ALL SELECT 21, 'plan_action_operational_3' UNION ALL SELECT 22, 'plan_action_operational_4'
      UNION ALL SELECT 23, 'conclusion' UNION ALL SELECT 24, 'annexes' UNION ALL SELECT 25, 'glossaire_sources'
    ) t
    JOIN public.report_templates rt ON rt.section_key = t.section_key AND rt.is_active = true
    ORDER BY t.ord;
  ELSE
    -- Rapport Scopes 1 & 2 : 8 pages (court et direct)
    RETURN QUERY
    SELECT 
      (row_number() OVER (ORDER BY ord))::integer AS page_number,
      t.section_key,
      t.title,
      t.content_template
    FROM (
      SELECT 
        rt.section_key,
        rt.title,
        rt.content_template,
        CASE rt.section_key
          WHEN 'cover' THEN 1
          WHEN 'executive_summary' THEN 2
          WHEN 'methodology' THEN 3
          WHEN 'scope1_detail' THEN 4
          WHEN 'scope2_detail' THEN 5
          WHEN 'action_plan_simple' THEN 6
          WHEN 'annexes' THEN 7
          WHEN 'annexes_end' THEN 8
          ELSE 99
        END AS ord
      FROM public.report_templates rt
      WHERE rt.is_active = true
        AND (rt.requires_scope3 = false OR rt.requires_scope3 IS NULL)
        AND rt.section_key IN (
          'cover', 'executive_summary', 'methodology',
          'scope1_detail', 'scope2_detail',
          'action_plan_simple', 'annexes', 'annexes_end'
        )
    ) t
    ORDER BY t.ord;
  END IF;
END;
$$;

COMMENT ON FUNCTION public.get_report_pages(boolean) IS 'Rapport S1+S2 : 8 pages. Rapport S1+S2+S3 : 25 pages (Grand Cabinet), page 8 = Analyse Expert Scope 3 (chunk IA).';
