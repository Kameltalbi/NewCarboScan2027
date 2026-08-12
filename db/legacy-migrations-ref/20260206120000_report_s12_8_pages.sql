-- Rapport Scopes 1 & 2 : version courte 8 pages
-- Structure : Page de garde, Sommaire & Synthèse, Méthodologie, Détail S1, Détail S2, Plan d'action simplifié, Annexes

-- 1. Insérer les 3 templates manquants pour la structure 8 pages (requires_scope3 = false)
INSERT INTO public.report_templates (page_number, section_key, title, content_template, requires_scope3, is_active) VALUES
(6, 'action_plan_simple', 'Plan d''action simplifié',
'<div class="action-plan-section">
  <h2 class="section-title">Plan d''action simplifié</h2>
  <p class="section-intro">À l''issue du bilan carbone de <strong>{{companyName}}</strong>, les pistes de réduction suivantes sont proposées, en cohérence avec les postes principaux identifiés (Scopes 1 et 2).</p>
  
  <div class="action-cards">
    <div class="action-card">
      <h3>1. Maîtrise des consommations énergétiques</h3>
      <p>Réduire les consommations d''électricité et de chauffage (écogestes, réglages, rénovation des équipements). Suivi régulier des index et objectifs de réduction.</p>
    </div>
    <div class="action-card">
      <h3>2. Flotte et mobilité</h3>
      <p>Optimisation de l''usage des véhicules (éco-conduite, mutualisation), maintenance préventive, et à moyen terme électrification ou renouvellement vers des véhicules moins émetteurs.</p>
    </div>
    <div class="action-card">
      <h3>3. Combustibles et fluides</h3>
      <p>Réduction des consommations de combustibles fossiles (gaz, fioul) et limitation des fuites de fluides frigorigènes par maintenance et remplacement ciblé des équipements.</p>
    </div>
    <div class="action-card">
      <h3>4. Pilotage et suivi</h3>
      <p>Mise en place d''indicateurs de suivi (consommations, émissions) et revues régulières pour ajuster les actions et viser une baisse progressive des émissions.</p>
    </div>
  </div>
  <p class="action-footer">Ces pistes constituent un cadre de réflexion et pourront être précisées et chiffrées dans le cadre d''un plan de réduction dédié.</p>
</div>', false, true),

(7, 'annexes', 'Annexes',
'<div class="annexes-section">
  <h2 class="section-title">Annexes</h2>
  
  <h3>Annexe 1 – Périmètre et sites inclus</h3>
  <p>Périmètre de l''étude : <strong>{{sites}} site(s)</strong>, année de référence <strong>{{year}}</strong>, pays <strong>{{country}}</strong>. Méthode de consolidation : {{consolidationMethod}}.</p>
  {{#if sitesInScope}}
  <p>Liste des sites dans le périmètre : voir détail dans les données organisation (Paramètres).</p>
  {{/if}}
  
  <h3>Annexe 2 – Résultats synthétiques</h3>
  <table class="annex-table">
    <tr><td>Émissions totales</td><td><strong>{{totalEmissions}} tCO₂e</strong></td></tr>
    <tr><td>Scope 1</td><td>{{scope1}} tCO₂e ({{scope1Percent}} %)</td></tr>
    <tr><td>Scope 2</td><td>{{scope2}} tCO₂e ({{scope2Percent}} %)</td></tr>
    <tr><td>Intensité par collaborateur</td><td>{{intensityPerEmployee}} tCO₂e / pers.</td></tr>
    <tr><td>Intensité par m²</td><td>{{intensityPerM2}} kgCO₂e / m²</td></tr>
  </table>
  
  <h3>Annexe 3 – Référentiels</h3>
  <p>GHG Protocol, méthode Bilan Carbone® (ADEME). Facteurs d''émission : Base Empreinte® ADEME ou équivalent, selon disponibilité et périmètre géographique.</p>
</div>', false, true),

(8, 'annexes_end', 'Annexes (suite)',
'<div class="annexes-end-section">
  <h3>Mentions et traçabilité</h3>
  <p>Rapport généré par <strong>CarboScan</strong>. Date d''édition : {{generatedDate}}.</p>
  <p>Ce document présente les résultats du bilan des émissions de gaz à effet de serre de <strong>{{companyName}}</strong> pour l''année {{year}}, conformément aux principes du GHG Protocol et de la méthode Bilan Carbone®. Les données utilisées sont celles communiquées par l''organisation et intégrées dans l''outil CarboScan.</p>
  <p>Pour toute question sur les facteurs d''émission ou les hypothèses de calcul, se référer aux paramètres organisation et aux données d''activité saisies dans l''application.</p>
</div>', false, true)
ON CONFLICT (section_key) DO NOTHING;

-- 2. Remplacer la fonction get_report_pages : rapport S1+S2 = 8 pages (structure courte)
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
    -- Rapport 18 pages : toutes les pages Scope 3 (sauf action_plan remplacé par version étendue)
    RETURN QUERY
    SELECT 
      rt.page_number::integer,
      rt.section_key,
      rt.title,
      rt.content_template
    FROM public.report_templates rt
    WHERE rt.is_active = true
      AND rt.section_key != 'action_plan'
    ORDER BY rt.page_number;
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

COMMENT ON FUNCTION public.get_report_pages(boolean) IS 'Rapport S1+S2 : 8 pages (couverture, synthèse, méthodologie, détail S1, détail S2, plan d''action simplifié, annexes). Rapport S1+S2+S3 : 18 pages.';
