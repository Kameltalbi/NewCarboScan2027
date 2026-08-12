-- Ajout de la Page 10 : Détail des émissions du Scope 2
INSERT INTO public.report_templates (page_number, section_key, title, content_template, requires_scope3) VALUES
(10, 'scope2_detail', 'Détail des émissions du Scope 2',
'<div class="scope-detail-section scope2-detail">
  <h2 class="section-title">Détail des émissions du Scope 2</h2>
  
  <div class="scope-intro">
    <p>Le <strong>Scope 2</strong> regroupe les émissions indirectes de gaz à effet de serre associées à la production de l''énergie achetée et consommée par <strong>{{companyName}}</strong>, principalement l''électricité. Bien que ces émissions ne soient pas produites directement sur les sites de l''organisation, elles résultent de ses choix de consommation énergétique et sont intégrées au périmètre du bilan carbone conformément aux référentiels méthodologiques en vigueur.</p>
    
    <p>Pour l''année de référence {{year}}, les émissions du Scope 2 s''élèvent à <strong>{{scope2}} tCO₂e</strong>, représentant <strong>{{scope2Percent}} %</strong> des émissions totales. Ce niveau d''émissions est directement lié aux volumes d''énergie consommés, au mix énergétique du réseau d''approvisionnement et aux caractéristiques des sites inclus dans le périmètre de l''étude.</p>
    
    <p>L''analyse détaillée met en évidence une concentration des émissions du Scope 2 sur <strong>{{scope2TopPoste}}</strong>, qui regroupe la majorité des consommations électriques. Les différences observées entre les sites s''expliquent notamment par les niveaux d''activité, les surfaces exploitées et les usages énergétiques spécifiques à chaque implantation.</p>
    
    <p>La répartition des émissions du Scope 2 permet d''identifier la part des émissions associées à la consommation d''énergie achetée et de mettre en perspective le rôle de l''électricité dans l''empreinte carbone globale de l''organisation. Les résultats présentés constituent une base de référence pour le suivi des consommations énergétiques et de leur évolution dans le temps, en cohérence avec les objectifs de pilotage environnemental de l''organisation.</p>
  </div>

  <div class="scope-summary-box scope2-box">
    <div class="summary-header">
      <span class="scope-icon">⚡</span>
      <h3>Synthèse Scope 2</h3>
    </div>
    <div class="summary-content">
      <div class="summary-stat">
        <span class="stat-label">Émissions totales</span>
        <span class="stat-value">{{scope2}} tCO₂e</span>
      </div>
      <div class="summary-stat">
        <span class="stat-label">Part du bilan total</span>
        <span class="stat-value">{{scope2Percent}}%</span>
      </div>
      <div class="summary-stat">
        <span class="stat-label">Intensité par m²</span>
        <span class="stat-value">{{intensityPerM2}} kgCO₂e/m²</span>
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
            <th class="text-right">Part du Scope 2</th>
          </tr>
        </thead>
        <tbody>
          {{#each scope2Posts}}
          <tr>
            <td><strong>{{name}}</strong></td>
            <td class="text-right"><strong>{{value}}</strong></td>
            <td class="text-right">
              <span class="percent-badge">{{percent}}%</span>
              <div class="progress-bar">
                <div class="progress-fill scope2-fill" style="width: {{percent}}%"></div>
              </div>
            </td>
          </tr>
          {{/each}}
        </tbody>
      </table>
    </div>
  </div>

  <div class="scope-analysis">
    <h3>Sources d''émissions du Scope 2</h3>
    <div class="analysis-grid">
      <div class="analysis-card">
        <div class="analysis-icon">💡</div>
        <h4>Électricité achetée</h4>
        <p>Émissions indirectes liées à la consommation d''électricité provenant du réseau. Le facteur d''émission dépend du mix énergétique du pays d''approvisionnement.</p>
      </div>
      
      <div class="analysis-card">
        <div class="analysis-icon">🏢</div>
        <h4>Usages tertiaires</h4>
        <p>Consommation électrique pour l''éclairage, la climatisation, le chauffage électrique, les équipements informatiques et les systèmes de ventilation des bâtiments.</p>
      </div>
      
      <div class="analysis-card">
        <div class="analysis-icon">🔌</div>
        <h4>Équipements industriels</h4>
        <p>Consommation électrique des machines de production, des systèmes de compression, des pompes, des convoyeurs et autres équipements industriels.</p>
      </div>
      
      <div class="analysis-card">
        <div class="analysis-icon">🌡️</div>
        <h4>Chaleur et froid achetés</h4>
        <p>Émissions indirectes associées à l''achat de chaleur (réseaux de chaleur urbains) ou de froid (réseaux de froid) pour les besoins de l''organisation.</p>
      </div>
    </div>
  </div>

  <div class="energy-mix-info">
    <h3>Facteurs d''influence</h3>
    <div class="info-cards">
      <div class="info-card">
        <div class="info-icon">🌍</div>
        <h4>Mix énergétique</h4>
        <p>Le facteur d''émission de l''électricité varie selon le mix énergétique du pays (charbon, gaz, nucléaire, renouvelables). Le mix de <strong>{{country}}</strong> détermine l''intensité carbone de l''électricité consommée.</p>
      </div>
      
      <div class="info-card">
        <div class="info-icon">📊</div>
        <h4>Volumes consommés</h4>
        <p>Les émissions du Scope 2 sont proportionnelles aux volumes d''énergie achetée. Une réduction de la consommation énergétique impacte directement les émissions de ce périmètre.</p>
      </div>
      
      <div class="info-card">
        <div class="info-icon">♻️</div>
        <h4>Énergies renouvelables</h4>
        <p>L''achat d''électricité d''origine renouvelable (garanties d''origine, PPA) ou l''autoconsommation d''énergie renouvelable produite sur site peuvent réduire les émissions du Scope 2.</p>
      </div>
    </div>
  </div>

  <div class="scope-note">
    <strong>Note :</strong> Les émissions du Scope 2 dépendent à la fois des volumes d''énergie consommés et du mix énergétique du réseau. Elles constituent un levier d''action indirect mais significatif dans le cadre d''une stratégie de décarbonation.
  </div>
</div>', false);
