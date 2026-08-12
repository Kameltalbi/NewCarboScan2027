-- Ajout de la Page 9 : Détail des émissions du Scope 1
INSERT INTO public.report_templates (page_number, section_key, title, content_template, requires_scope3) VALUES
(9, 'scope1_detail', 'Détail des émissions du Scope 1',
'<div class="scope-detail-section scope1-detail">
  <h2 class="section-title">Détail des émissions du Scope 1</h2>
  
  <div class="scope-intro">
    <p>Le <strong>Scope 1</strong> regroupe l''ensemble des émissions directes de gaz à effet de serre générées par les sources détenues ou contrôlées par <strong>{{companyName}}</strong>. Ces émissions résultent principalement de la combustion de combustibles sur site, de l''utilisation de véhicules appartenant à l''organisation et, le cas échéant, d''émissions fugitives liées à certains équipements ou procédés.</p>
    
    <p>Pour l''année de référence {{year}}, les émissions du Scope 1 s''élèvent à <strong>{{scope1}} tCO₂e</strong>, représentant <strong>{{scope1Percent}} %</strong> des émissions totales du bilan carbone. Cette part reflète l''intensité des activités directement dépendantes de sources énergétiques ou de procédés internes à l''organisation.</p>
    
    <p>L''analyse détaillée par poste montre que les émissions du Scope 1 sont principalement liées à <strong>{{scope1TopPoste}}</strong>. Les autres postes contributifs comprennent notamment {{scope1SecondaryPostes}}, dont les niveaux d''émissions restent variables selon les caractéristiques opérationnelles des sites inclus dans le périmètre de l''étude.</p>
    
    <p>La répartition des émissions du Scope 1 met en évidence les leviers directement maîtrisables par l''organisation, dans la mesure où ces émissions sont associées à des sources internes. Les résultats présentés permettent ainsi d''identifier les activités générant les émissions directes les plus significatives et constituent une base objective pour le suivi de leur évolution dans le temps. Cette analyse détaillée du Scope 1 s''inscrit dans une lecture globale du bilan carbone et prépare l''examen des autres périmètres d''émissions présentés dans les pages suivantes.</p>
  </div>

  <div class="scope-summary-box scope1-box">
    <div class="summary-header">
      <span class="scope-icon">🏭</span>
      <h3>Synthèse Scope 1</h3>
    </div>
    <div class="summary-content">
      <div class="summary-stat">
        <span class="stat-label">Émissions totales</span>
        <span class="stat-value">{{scope1}} tCO₂e</span>
      </div>
      <div class="summary-stat">
        <span class="stat-label">Part du bilan total</span>
        <span class="stat-value">{{scope1Percent}}%</span>
      </div>
      <div class="summary-stat">
        <span class="stat-label">Intensité par collaborateur</span>
        <span class="stat-value">{{intensityPerEmployee}} tCO₂e/pers</span>
      </div>
    </div>
  </div>

  <div class="scope-breakdown">
    <h3>Répartition des émissions par poste</h3>
    
    <div class="breakdown-table">
      <table>
        <thead>
          <tr>
            <th>Poste d''émission</th>
            <th class="text-right">Émissions (tCO₂e)</th>
            <th class="text-right">Part du Scope 1</th>
          </tr>
        </thead>
        <tbody>
          {{#each scope1Posts}}
          <tr>
            <td>
              <strong>{{name}}</strong>
              {{#if description}}
              <div class="post-description">{{description}}</div>
              {{/if}}
            </td>
            <td class="text-right"><strong>{{value}}</strong></td>
            <td class="text-right">
              <span class="percent-badge">{{percent}}%</span>
              <div class="progress-bar">
                <div class="progress-fill scope1-fill" style="width: {{percent}}%"></div>
              </div>
            </td>
          </tr>
          {{/each}}
        </tbody>
      </table>
    </div>
  </div>

  <div class="scope-analysis">
    <h3>Analyse des sources d''émissions</h3>
    <div class="analysis-grid">
      <div class="analysis-card">
        <div class="analysis-icon">🔥</div>
        <h4>Combustion sur site</h4>
        <p>Émissions issues de la combustion de combustibles fossiles (gaz naturel, fioul, GPL) pour le chauffage, les procédés industriels ou la production d''énergie sur site.</p>
      </div>
      
      <div class="analysis-card">
        <div class="analysis-icon">🚗</div>
        <h4>Véhicules détenus</h4>
        <p>Émissions générées par les véhicules appartenant à l''organisation (voitures de fonction, utilitaires, engins de chantier, véhicules de service).</p>
      </div>
      
      <div class="analysis-card">
        <div class="analysis-icon">❄️</div>
        <h4>Émissions fugitives</h4>
        <p>Fuites de fluides frigorigènes des systèmes de climatisation et de réfrigération, émissions de gaz industriels ou autres émissions non liées à la combustion.</p>
      </div>
      
      <div class="analysis-card">
        <div class="analysis-icon">⚙️</div>
        <h4>Procédés industriels</h4>
        <p>Émissions directes issues de procédés de fabrication, de transformation ou de traitement spécifiques aux activités de l''organisation.</p>
      </div>
    </div>
  </div>

  <div class="scope-note">
    <strong>Note :</strong> Les émissions du Scope 1 sont directement maîtrisables par l''organisation. Elles constituent un levier d''action prioritaire dans le cadre d''une stratégie de réduction des émissions de gaz à effet de serre.
  </div>
</div>', false);
