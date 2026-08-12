-- Migration pour créer la table des templates de rapport professionnel Bilan Carbone
-- Structure standardisée, auditable, conforme GHG Protocol / Bilan Carbone®

-- Table principale des templates
CREATE TABLE IF NOT EXISTS report_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_key TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  content_template TEXT NOT NULL,
  page_number INTEGER NOT NULL,
  order_in_page INTEGER DEFAULT 1,
  
  -- Conditions d'affichage
  requires_scope3 BOOLEAN DEFAULT false,
  min_employees INTEGER,
  max_employees INTEGER,
  sectors TEXT[],
  
  -- Métadonnées
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true
);

CREATE INDEX idx_report_templates_section_key ON report_templates(section_key);
CREATE INDEX idx_report_templates_page_number ON report_templates(page_number);

-- Fonction pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_report_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_report_templates_updated_at
  BEFORE UPDATE ON report_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_report_templates_updated_at();

-- ============================================
-- VERSION A : SCOPES 1 & 2 (12 PAGES)
-- ============================================

-- PAGE 1 : Couverture (générée dynamiquement par le code)

-- PAGE 2 : Message clé & résumé exécutif
INSERT INTO report_templates (section_key, title, content_template, page_number) VALUES
('executive_summary', 'Résumé exécutif', 
'<div class="executive-summary">
  <h2>Messages clés</h2>
  
  <div class="key-message">
    <h3>📊 Bilan global</h3>
    <p>Les émissions de gaz à effet de serre de <strong>{{companyName}}</strong> s''élèvent à <strong>{{totalEmissions}} tCO₂e</strong> pour l''année {{year}}, réparties entre émissions directes (Scope 1) et émissions indirectes liées à l''énergie (Scope 2).</p>
  </div>

  <div class="key-message">
    <h3>🎯 Postes dominants</h3>
    <p>Les principaux postes émetteurs sont : <strong>{{topPosts}}</strong>. Ces postes représentent {{topPostsPercent}}% des émissions totales et constituent les leviers prioritaires de réduction.</p>
  </div>

  <div class="key-message">
    <h3>🌍 Positionnement climatique</h3>
    <p>Avec une intensité carbone de <strong>{{intensityPerEmployee}} tCO₂e par collaborateur</strong>, l''organisation se positionne {{benchmarkStatus}} par rapport aux moyennes du secteur {{sector}}. Une trajectoire de réduction de {{reductionTarget}}% d''ici 2030 permettrait de s''aligner sur les objectifs de l''Accord de Paris.</p>
  </div>

  <div class="chart-container">
    <p class="chart-title">Répartition des émissions par scope</p>
    <!-- Graphique généré dynamiquement -->
  </div>
</div>', 2);

-- PAGE 3 : Présentation de l'organisation
INSERT INTO report_templates (section_key, title, content_template, page_number) VALUES
('organization_presentation', 'Présentation de l''organisation', 
'<div class="organization-info">
  <h2>Présentation de l''organisation</h2>
  
  <div class="info-section">
    <h3>Activité principale</h3>
    <p><strong>{{companyName}}</strong> exerce son activité dans le secteur <strong>{{sector}}</strong>. L''organisation est spécialisée dans {{activityDescription}}.</p>
  </div>

  <div class="info-grid">
    <div class="info-card">
      <h4>👥 Effectif</h4>
      <p class="value">{{employees}}</p>
      <p class="label">collaborateurs</p>
    </div>

    <div class="info-card">
      <h4>📍 Implantation</h4>
      <p class="value">{{sites}}</p>
      <p class="label">site(s)</p>
    </div>

    <div class="info-card">
      <h4>🏢 Surface</h4>
      <p class="value">{{surface}}</p>
      <p class="label">m²</p>
    </div>

    {{#if revenue}}
    <div class="info-card">
      <h4>💰 Chiffre d''affaires</h4>
      <p class="value">{{revenue}}</p>
      <p class="label">€</p>
    </div>
    {{/if}}
  </div>

  <div class="info-section">
    <h3>Sites inclus dans le périmètre</h3>
    <ul>
      {{#each sites}}
      <li><strong>{{name}}</strong> - {{address}} ({{surface}} m²)</li>
      {{/each}}
    </ul>
  </div>

  <div class="info-section">
    <h3>Description synthétique</h3>
    <p>{{organizationDescription}}</p>
  </div>
</div>', 3);

-- PAGE 4 : Objectifs et cadre de l'étude
INSERT INTO report_templates (section_key, title, content_template, page_number) VALUES
('study_objectives', 'Objectifs et cadre de l''étude', 
'<div class="study-framework">
  <h2>Objectifs et cadre de l''étude</h2>
  
  <div class="objectives-section">
    <h3>Pourquoi ce bilan carbone ?</h3>
    <p>Dans un contexte de transition énergétique et de lutte contre le changement climatique, <strong>{{companyName}}</strong> s''engage dans une démarche volontaire de quantification de ses émissions de gaz à effet de serre. Cette initiative s''inscrit dans une stratégie globale de responsabilité sociétale et environnementale.</p>
  </div>

  <div class="objectives-grid">
    <div class="objective-card">
      <h4>📊 Diagnostic</h4>
      <p>Établir un état des lieux précis et fiable des émissions de GES</p>
    </div>

    <div class="objective-card">
      <h4>✅ Conformité</h4>
      <p>Anticiper les évolutions réglementaires et les obligations de reporting</p>
    </div>

    <div class="objective-card">
      <h4>🎯 Stratégie</h4>
      <p>Identifier les leviers de réduction et définir une trajectoire bas-carbone</p>
    </div>

    <div class="objective-card">
      <h4>📈 Pilotage</h4>
      <p>Mettre en place des indicateurs de suivi et un système de management carbone</p>
    </div>
  </div>

  <div class="study-details">
    <h3>Paramètres de l''étude</h3>
    <table class="details-table">
      <tr>
        <td><strong>Année de référence</strong></td>
        <td>{{year}}</td>
      </tr>
      <tr>
        <td><strong>Période de collecte</strong></td>
        <td>{{collectionPeriod}}</td>
      </tr>
      <tr>
        <td><strong>Scopes analysés</strong></td>
        <td>Scope 1 (émissions directes) + Scope 2 (émissions indirectes liées à l''énergie)</td>
      </tr>
      <tr>
        <td><strong>Méthode</strong></td>
        <td>GHG Protocol / Bilan Carbone®</td>
      </tr>
    </table>
  </div>
</div>', 4);

-- PAGE 5 : Méthodologie CarboScan
INSERT INTO report_templates (section_key, title, content_template, page_number) VALUES
('methodology', 'Méthodologie CarboScan', 
'<div class="methodology">
  <h2>Méthodologie CarboScan</h2>
  
  <div class="method-section">
    <h3>Référentiels utilisés</h3>
    <p>Ce bilan carbone est réalisé selon les standards internationaux reconnus :</p>
    <ul>
      <li><strong>GHG Protocol</strong> (Greenhouse Gas Protocol) – Corporate Accounting and Reporting Standard</li>
      <li><strong>Bilan Carbone®</strong> – Méthode de l''Association Bilan Carbone (ABC)</li>
      <li><strong>ISO 14064-1:2018</strong> – Quantification et déclaration des émissions de GES</li>
    </ul>
  </div>

  <div class="method-section">
    <h3>Principe de calcul</h3>
    <p>Le calcul des émissions repose sur la formule suivante :</p>
    <div class="formula">
      <strong>Émissions (kgCO₂e) = Donnée d''activité × Facteur d''émission</strong>
    </div>
    <p>Où :</p>
    <ul>
      <li><strong>Donnée d''activité</strong> : quantité consommée (litres, kWh, km, etc.)</li>
      <li><strong>Facteur d''émission</strong> : coefficient de conversion en kgCO₂e par unité</li>
    </ul>
  </div>

  <div class="method-section">
    <h3>Logique multi-postes</h3>
    <p>Les émissions sont calculées poste par poste, puis agrégées par scope. Cette approche permet d''identifier précisément les sources d''émissions et les leviers de réduction.</p>
  </div>

  <div class="method-section">
    <h3>Facteurs d''émission utilisés</h3>
    <p>Les facteurs d''émission proviennent de sources officielles et reconnues :</p>
    <ul>
      <li><strong>Base Carbone® ADEME</strong> (version 2024) pour les facteurs génériques</li>
      <li><strong>Facteurs personnalisés</strong> pour certains postes spécifiques (validés par des sources tierces)</li>
      <li><strong>Mix électrique tunisien</strong> : {{electricityFactor}} kgCO₂e/kWh (source : STEG / AIE)</li>
    </ul>
  </div>

  <div class="method-section">
    <h3>Hypothèses structurantes</h3>
    <ul>
      <li>Périmètre organisationnel : approche de contrôle opérationnel</li>
      <li>Année de référence complète (12 mois)</li>
      <li>Données primaires privilégiées (factures, relevés)</li>
      <li>Incertitude globale estimée à ±15%</li>
    </ul>
  </div>
</div>', 5);

-- PAGE 6 : Périmètre organisationnel
INSERT INTO report_templates (section_key, title, content_template, page_number) VALUES
('organizational_boundary', 'Périmètre organisationnel', 
'<div class="organizational-boundary">
  <h2>Périmètre organisationnel</h2>
  
  <div class="boundary-section">
    <h3>Méthode de consolidation</h3>
    <p>Le périmètre organisationnel est défini selon l''approche du <strong>contrôle opérationnel</strong> : sont incluses toutes les entités sur lesquelles <strong>{{companyName}}</strong> exerce un contrôle opérationnel, c''est-à-dire la capacité de diriger les politiques opérationnelles.</p>
  </div>

  <div class="boundary-section">
    <h3>Entités incluses</h3>
    <table class="entities-table">
      <thead>
        <tr>
          <th>Entité / Site</th>
          <th>Localisation</th>
          <th>Activité</th>
          <th>% Contrôle</th>
        </tr>
      </thead>
      <tbody>
        {{#each includedEntities}}
        <tr>
          <td>{{name}}</td>
          <td>{{location}}</td>
          <td>{{activity}}</td>
          <td>{{control}}%</td>
        </tr>
        {{/each}}
      </tbody>
    </table>
  </div>

  {{#if excludedEntities}}
  <div class="boundary-section">
    <h3>Entités exclues</h3>
    <table class="entities-table">
      <thead>
        <tr>
          <th>Entité</th>
          <th>Justification de l''exclusion</th>
        </tr>
      </thead>
      <tbody>
        {{#each excludedEntities}}
        <tr>
          <td>{{name}}</td>
          <td>{{reason}}</td>
        </tr>
        {{/each}}
      </tbody>
    </table>
  </div>
  {{/if}}

  <div class="boundary-section">
    <h3>Schéma de périmètre</h3>
    <div class="boundary-diagram">
      <!-- Diagramme généré dynamiquement -->
      <p class="diagram-caption">Périmètre organisationnel de <strong>{{companyName}}</strong> – Année {{year}}</p>
    </div>
  </div>
</div>', 6);

-- PAGE 7 : Définition des Scopes 1 et 2
INSERT INTO report_templates (section_key, title, content_template, page_number) VALUES
('scopes_definition', 'Définition des Scopes 1 et 2', 
'<div class="scopes-definition">
  <h2>Définition des Scopes 1 et 2</h2>
  
  <div class="scope-card scope1">
    <h3>🔴 Scope 1 : Émissions directes</h3>
    <p>Le Scope 1 regroupe les émissions directes de gaz à effet de serre provenant de sources détenues ou contrôlées par l''organisation.</p>
    
    <h4>Postes analysés :</h4>
    <ul>
      <li><strong>Combustion fixe</strong> : chaudières, groupes électrogènes (fioul, gaz naturel)</li>
      <li><strong>Combustion mobile</strong> : flotte de véhicules de l''entreprise (essence, diesel)</li>
      <li><strong>Émissions fugitives</strong> : fuites de fluides frigorigènes (climatisation, réfrigération)</li>
      <li><strong>Procédés industriels</strong> : réactions chimiques, transformations (si applicable)</li>
    </ul>
  </div>

  <div class="scope-card scope2">
    <h3>🟠 Scope 2 : Émissions indirectes liées à l''énergie</h3>
    <p>Le Scope 2 concerne les émissions indirectes associées à la production d''électricité, de chaleur ou de vapeur achetée et consommée par l''organisation.</p>
    
    <h4>Postes analysés :</h4>
    <ul>
      <li><strong>Électricité achetée</strong> : consommation électrique de tous les sites</li>
      <li><strong>Réseaux de chaleur/froid</strong> : si applicable</li>
    </ul>
    
    <p class="note"><strong>Note</strong> : Les émissions du Scope 2 dépendent du mix électrique du pays. En Tunisie, le facteur d''émission moyen est de {{electricityFactor}} kgCO₂e/kWh.</p>
  </div>

  <div class="responsibility-table">
    <h3>Frontières de responsabilité</h3>
    <table>
      <thead>
        <tr>
          <th>Scope</th>
          <th>Nature</th>
          <th>Responsabilité</th>
          <th>Leviers de réduction</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>Scope 1</strong></td>
          <td>Directe</td>
          <td>Contrôle total</td>
          <td>Efficacité énergétique, substitution énergétique, électrification</td>
        </tr>
        <tr>
          <td><strong>Scope 2</strong></td>
          <td>Indirecte</td>
          <td>Contrôle partiel</td>
          <td>Sobriété, efficacité, énergies renouvelables (autoconsommation)</td>
        </tr>
      </tbody>
    </table>
  </div>
</div>', 7);

-- Continuer avec les pages 8-12...
-- PAGE 8 : Résultats globaux
INSERT INTO report_templates (section_key, title, content_template, page_number) VALUES
('global_results', 'Résultats globaux Scopes 1 & 2', 
'<div class="global-results">
  <h2>Résultats globaux Scopes 1 & 2</h2>
  
  <div class="total-emissions">
    <h3>Bilan global</h3>
    <div class="big-number">
      <span class="value">{{totalEmissions}}</span>
      <span class="unit">tCO₂e</span>
    </div>
    <p class="subtitle">Émissions totales de gaz à effet de serre – Année {{year}}</p>
  </div>

  <div class="scope-breakdown">
    <div class="scope-result scope1">
      <h4>Scope 1</h4>
      <p class="value">{{scope1}} tCO₂e</p>
      <p class="percent">{{scope1Percent}}%</p>
    </div>
    <div class="scope-result scope2">
      <h4>Scope 2</h4>
      <p class="value">{{scope2}} tCO₂e</p>
      <p class="percent">{{scope2Percent}}%</p>
    </div>
  </div>

  <div class="chart-container">
    <!-- Graphique camembert généré dynamiquement -->
  </div>

  <div class="intensity-indicators">
    <h3>Indicateurs d''intensité carbone</h3>
    <div class="indicators-grid">
      <div class="indicator">
        <p class="label">Par collaborateur</p>
        <p class="value">{{intensityPerEmployee}} tCO₂e</p>
      </div>
      <div class="indicator">
        <p class="label">Par m²</p>
        <p class="value">{{intensityPerM2}} kgCO₂e</p>
      </div>
      {{#if revenue}}
      <div class="indicator">
        <p class="label">Par k€ de CA</p>
        <p class="value">{{intensityPerRevenue}} kgCO₂e</p>
      </div>
      {{/if}}
    </div>
  </div>

  <div class="analysis">
    <h3>Commentaire analytique</h3>
    <p>{{analyticalComment}}</p>
  </div>
</div>', 8);

-- Je continue avec les autres pages...

COMMENT ON TABLE report_templates IS 'Templates professionnels pour rapports Bilan Carbone standardisés (12 ou 18 pages selon scopes)';
