-- Table pour stocker les templates de rapport Bilan Carbone
CREATE TABLE IF NOT EXISTS public.report_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_number integer NOT NULL,
  section_key text NOT NULL UNIQUE,
  title text NOT NULL,
  content_template text NOT NULL,
  requires_scope3 boolean DEFAULT false,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Index pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_report_templates_page_number ON public.report_templates(page_number);
CREATE INDEX IF NOT EXISTS idx_report_templates_section_key ON public.report_templates(section_key);
CREATE INDEX IF NOT EXISTS idx_report_templates_active ON public.report_templates(is_active);

-- RLS : Lecture publique (templates standards)
ALTER TABLE public.report_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Templates lisibles par tous les utilisateurs authentifiés"
  ON public.report_templates
  FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Templates modifiables par les admins uniquement"
  ON public.report_templates
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

-- Insertion des templates (Pages 1-4 déjà rédigées)
INSERT INTO public.report_templates (page_number, section_key, title, content_template, requires_scope3) VALUES
(1, 'cover', 'Page de couverture', 
'<div class="report-cover">
  <div class="cover-header">
    <h1 class="cover-title">RAPPORT BILAN CARBONE</h1>
    <h2 class="cover-company">{{companyName}}</h2>
  </div>
  
  <div class="cover-info">
    <div class="cover-section">
      <p class="cover-label">Année de référence :</p>
      <p class="cover-value">{{year}}</p>
    </div>
    
    <div class="cover-section">
      <p class="cover-label">Périmètre de l''étude :</p>
      <p class="cover-value">{{sites}} site(s) — {{country}}</p>
    </div>
    
    <div class="cover-section">
      <p class="cover-label">Scénario d''analyse :</p>
      <p class="cover-value">{{#if hasScope3}}Scopes 1, 2 et 3{{else}}Scopes 1 et 2{{/if}}</p>
    </div>
    
    <div class="cover-description">
      <p>Ce rapport présente les résultats du bilan des émissions de gaz à effet de serre de <strong>{{companyName}}</strong>, réalisé conformément aux principes du GHG Protocol et de la méthode Bilan Carbone®, sur la base des données disponibles pour l''année {{year}}.</p>
    </div>
  </div>
  
  <div class="cover-footer">
    <div class="cover-tool">
      <p class="cover-label">Outil de calcul et de pilotage carbone :</p>
      <p class="cover-brand">CarboScan</p>
    </div>
    <div class="cover-date-section">
      <p class="cover-label">Date d''édition :</p>
      <p class="cover-date">{{generatedDate}}</p>
    </div>
  </div>
</div>', false),

(2, 'executive_summary', 'Résumé exécutif',
'<div class="executive-summary">
  <h2 class="section-title">Résumé exécutif</h2>
  
  <div class="executive-text">
    <p>Le présent rapport expose les résultats du bilan des émissions de gaz à effet de serre de <strong>{{companyName}}</strong> pour l''année {{year}}. Cette étude a été réalisée à partir des données disponibles communiquées par l''organisation et conformément aux principes méthodologiques reconnus en matière de comptabilité carbone, notamment le GHG Protocol et la méthode Bilan Carbone®.</p>
    
    <p>Les émissions totales de gaz à effet de serre s''élèvent à <strong>{{totalEmissions}} tCO₂e</strong> sur la période analysée. La répartition des émissions par périmètre met en évidence une contribution majoritaire du Scope {{scopeDominant}}, qui représente <strong>{{scopeDominantPercent}} %</strong> des émissions totales. Les émissions relevant du Scope 1, correspondant aux émissions directes générées par les activités de l''organisation, représentent <strong>{{scope1Percent}} %</strong> du total. Les émissions du Scope 2, liées à la consommation d''énergie achetée, représentent quant à elles <strong>{{scope2Percent}} %</strong>{{#if hasScope3}}, tandis que les émissions du Scope 3, associées aux activités indirectes de la chaîne de valeur, représentent <strong>{{scope3Percent}} %</strong>{{/if}}.</p>
    
    <p>L''analyse par poste d''émissions met en évidence une concentration significative des émissions sur le poste <strong>{{topPoste}}</strong>, qui constitue le principal contributeur à l''empreinte carbone globale de l''organisation. Cette structure des émissions souligne l''intérêt d''une approche fondée sur la hiérarchisation des sources d''émissions afin d''identifier les leviers d''action prioritaires.</p>
    
    <p>Ce bilan carbone constitue une base de référence permettant à <strong>{{companyName}}</strong> de disposer d''une vision consolidée et structurée de son empreinte carbone. Il s''inscrit dans une démarche progressive de compréhension des enjeux climatiques associés aux activités de l''organisation et constitue un socle pour le suivi et l''évolution future de sa performance environnementale.</p>
  </div>

  <div class="summary-chart">
    <h3>Répartition des émissions par scope</h3>
    <div class="scope-bars">
      <div class="scope-bar scope1" style="width: {{scope1Percent}}%">
        <span>Scope 1: {{scope1}} tCO₂e ({{scope1Percent}}%)</span>
      </div>
      <div class="scope-bar scope2" style="width: {{scope2Percent}}%">
        <span>Scope 2: {{scope2}} tCO₂e ({{scope2Percent}}%)</span>
      </div>
      {{#if hasScope3}}
      <div class="scope-bar scope3" style="width: {{scope3Percent}}%">
        <span>Scope 3: {{scope3}} tCO₂e ({{scope3Percent}}%)</span>
      </div>
      {{/if}}
    </div>
  </div>
</div>', false),

(3, 'organization', 'Présentation de l''organisation',
'<div class="organization-section">
  <h2 class="section-title">Présentation de l''organisation</h2>
  
  <div class="org-text">
    <p><strong>{{companyName}}</strong> exerce ses activités dans le secteur <strong>{{sector}}</strong> et opère sur le territoire <strong>{{country}}</strong>. L''organisation développe ses activités à travers <strong>{{sites}} site(s)</strong> inclus dans le périmètre du présent bilan carbone. Ces sites regroupent les principales fonctions opérationnelles et supports nécessaires au fonctionnement de l''organisation.</p>
    
    <p>L''activité de <strong>{{companyName}}</strong> repose sur des processus qui mobilisent des ressources humaines, énergétiques et matérielles, générant des émissions de gaz à effet de serre à différents niveaux. L''effectif de l''organisation s''élève à <strong>{{employees}} collaborateur(s)</strong> pour l''année de référence {{year}}. Les activités analysées couvrent l''ensemble des opérations relevant du périmètre organisationnel défini pour cette étude.</p>
    
    <p>Le présent bilan carbone prend en compte les émissions associées aux activités exercées sur les sites inclus, telles que la consommation d''énergie, l''utilisation de combustibles, les déplacements professionnels et, le cas échéant, certaines activités indirectes liées à la chaîne de valeur. Les fonctions non incluses dans le périmètre de l''étude ont été exclues de manière explicite et justifiée, conformément aux principes de transparence et de cohérence méthodologique.</p>
    
    <p>Cette présentation a pour objectif de fournir un cadre de lecture permettant de contextualiser les résultats du bilan carbone. Elle vise à faciliter la compréhension des activités de <strong>{{companyName}}</strong>, de son mode de fonctionnement et de l''étendue du périmètre analysé, afin d''assurer une lecture claire et cohérente des résultats présentés dans les sections suivantes du rapport.</p>
  </div>

  <div class="org-metrics">
    <div class="metric-card">
      <div class="metric-icon">👥</div>
      <div class="metric-value">{{employees}}</div>
      <div class="metric-label">collaborateurs</div>
    </div>

    <div class="metric-card">
      <div class="metric-icon">📍</div>
      <div class="metric-value">{{sites}}</div>
      <div class="metric-label">site(s)</div>
    </div>

    <div class="metric-card">
      <div class="metric-icon">🏢</div>
      <div class="metric-value">{{surface}}</div>
      <div class="metric-label">m²</div>
    </div>

    {{#if hasRevenue}}
    <div class="metric-card">
      <div class="metric-icon">💰</div>
      <div class="metric-value">{{revenue}}</div>
      <div class="metric-label">€ de CA</div>
    </div>
    {{/if}}
  </div>
</div>', false),

(4, 'objectives', 'Objectifs et cadre de l''étude',
'<div class="objectives-section">
  <h2 class="section-title">Objectifs et cadre de l''étude</h2>
  
  <div class="objectives-text">
    <p>Le présent bilan carbone a été réalisé afin d''évaluer de manière structurée les émissions de gaz à effet de serre générées par les activités de <strong>{{companyName}}</strong> sur l''année de référence <strong>{{year}}</strong>. Cette démarche s''inscrit dans une volonté de disposer d''un diagnostic quantifié permettant de mieux comprendre l''origine des émissions et leur répartition par poste et par périmètre.</p>
    
    <p>L''objectif principal de l''étude est d''établir un état des lieux des émissions de gaz à effet de serre associées aux activités de l''organisation, en identifiant les sources d''émissions significatives et en hiérarchisant les principaux postes contributeurs. Ce diagnostic constitue une base de référence indispensable pour le suivi des émissions dans le temps et pour l''évaluation de l''évolution future de l''empreinte carbone de l''organisation.</p>
    
    <p>Le bilan carbone a été réalisé conformément aux référentiels méthodologiques reconnus, notamment le GHG Protocol et la méthode Bilan Carbone®. Il couvre les périmètres <strong>{{#if hasScope3}}Scopes 1, 2 et 3{{else}}Scopes 1 et 2{{/if}}</strong>, tels que définis dans le cadre méthodologique de l''étude. Le choix de ces périmètres vise à assurer une cohérence entre le niveau de maturité de l''organisation, la disponibilité des données et les objectifs poursuivis.</p>
    
    <p>Le cadre de l''étude précise également les hypothèses retenues, les limites méthodologiques et les éventuelles exclusions appliquées. Ces éléments sont explicités afin de garantir la transparence des résultats présentés et de faciliter leur interprétation. Le présent bilan carbone constitue ainsi un outil d''aide à la décision, fondé sur des données objectivées et une méthodologie structurée.</p>
  </div>
</div>', false);

-- Commentaires
COMMENT ON TABLE public.report_templates IS 'Templates de pages pour les rapports Bilan Carbone professionnels';
COMMENT ON COLUMN public.report_templates.page_number IS 'Numéro de page dans le rapport (1-12 ou 1-18)';
COMMENT ON COLUMN public.report_templates.section_key IS 'Clé unique identifiant la section (ex: cover, executive_summary)';
COMMENT ON COLUMN public.report_templates.content_template IS 'Template HTML avec variables {{variable}}';
COMMENT ON COLUMN public.report_templates.requires_scope3 IS 'True si cette page est uniquement pour les rapports avec Scope 3';
