-- Ajout de la Page 11 : Analyse globale des postes émetteurs
INSERT INTO public.report_templates (page_number, section_key, title, content_template, requires_scope3) VALUES
(11, 'global_analysis', 'Analyse globale des postes émetteurs',
'<div class="global-analysis-section">
  <h2 class="section-title">Analyse globale des postes émetteurs</h2>
  
  <div class="analysis-intro">
    <p>L''analyse globale des postes émetteurs permet d''identifier les principales sources de gaz à effet de serre contribuant à l''empreinte carbone de <strong>{{companyName}}</strong> pour l''année {{year}}. Cette lecture transversale repose sur la consolidation des émissions issues des différents périmètres analysés et vise à hiérarchiser les postes selon leur niveau de contribution.</p>
    
    <p>Les résultats mettent en évidence une concentration significative des émissions sur un nombre limité de postes. Le poste <strong>{{topPoste}}</strong> constitue le principal contributeur, représentant <strong>{{topPostsPercent}} %</strong> des émissions totales. Les autres postes significatifs figurent également parmi les sources d''émissions les plus importantes, confirmant une distribution inégale de l''empreinte carbone entre les différentes activités de l''organisation.</p>
    
    <p>Cette structure des émissions reflète les caractéristiques propres au modèle opérationnel de <strong>{{companyName}}</strong>, notamment en matière de consommation énergétique, de mobilité et, le cas échéant, d''activités indirectes liées à la chaîne de valeur. Elle met en évidence l''intérêt d''une approche fondée sur la priorisation des postes à fort impact afin de concentrer les efforts d''analyse et de suivi sur les sources les plus contributrices.</p>
    
    <p>L''analyse par poste constitue une étape clé du bilan carbone, en ce qu''elle permet de dépasser une lecture globale des émissions pour en comprendre la répartition interne. Elle fournit ainsi un socle analytique indispensable pour le suivi de l''évolution des émissions dans le temps et pour l''évaluation de l''efficacité des actions mises en œuvre lors de futurs exercices de bilan carbone.</p>
  </div>

  <div class="top-posts-summary">
    <h3>Hiérarchisation des postes émetteurs</h3>
    
    <div class="top-posts-chart">
      <div class="chart-header">
        <span class="chart-title">Top 5 des postes contributeurs</span>
        <span class="chart-subtitle">Représentant {{topPostsPercent}}% des émissions totales</span>
      </div>
      
      <div class="posts-ranking">
        {{#each topPostsRanking}}
        <div class="ranking-item rank-{{position}}">
          <div class="rank-number">{{position}}</div>
          <div class="rank-content">
            <div class="rank-header">
              <span class="rank-name">{{name}}</span>
              <span class="rank-scope-badge scope{{scope}}-badge">Scope {{scope}}</span>
            </div>
            <div class="rank-stats">
              <span class="rank-value">{{value}} tCO₂e</span>
              <span class="rank-percent">{{percent}}%</span>
            </div>
            <div class="rank-bar">
              <div class="rank-fill scope{{scope}}-fill" style="width: {{barWidth}}%"></div>
            </div>
          </div>
        </div>
        {{/each}}
      </div>
    </div>
  </div>

  <div class="concentration-analysis">
    <h3>Concentration des émissions</h3>
    
    <div class="concentration-grid">
      <div class="concentration-card primary-card">
        <div class="concentration-icon">🎯</div>
        <div class="concentration-label">Poste principal</div>
        <div class="concentration-value">{{topPoste}}</div>
        <div class="concentration-stat">{{topPostsPercent}}% des émissions</div>
      </div>
      
      <div class="concentration-card scope-card">
        <div class="concentration-icon">📊</div>
        <div class="concentration-label">Scope dominant</div>
        <div class="concentration-value">Scope {{scopeDominant}}</div>
        <div class="concentration-stat">{{scopeDominantPercent}}% des émissions</div>
      </div>
      
      <div class="concentration-card intensity-card">
        <div class="concentration-icon">👥</div>
        <div class="concentration-label">Intensité carbone</div>
        <div class="concentration-value">{{intensityPerEmployee}} tCO₂e</div>
        <div class="concentration-stat">par collaborateur</div>
      </div>
    </div>
  </div>

  <div class="distribution-analysis">
    <h3>Répartition par catégorie d''émissions</h3>
    
    <div class="distribution-cards">
      <div class="distribution-card">
        <h4>🏭 Émissions directes (Scope 1)</h4>
        <div class="distribution-value">{{scope1}} tCO₂e ({{scope1Percent}}%)</div>
        <p>Sources détenues ou contrôlées par l''organisation : combustion sur site, véhicules détenus, émissions fugitives.</p>
        <div class="distribution-bar">
          <div class="distribution-fill scope1-fill" style="width: {{scope1Percent}}%"></div>
        </div>
      </div>
      
      <div class="distribution-card">
        <h4>⚡ Émissions indirectes énergétiques (Scope 2)</h4>
        <div class="distribution-value">{{scope2}} tCO₂e ({{scope2Percent}}%)</div>
        <p>Énergie achetée et consommée : électricité, chaleur, vapeur, froid provenant du réseau.</p>
        <div class="distribution-bar">
          <div class="distribution-fill scope2-fill" style="width: {{scope2Percent}}%"></div>
        </div>
      </div>
      
      {{#if hasScope3}}
      <div class="distribution-card">
        <h4>🔗 Autres émissions indirectes (Scope 3)</h4>
        <div class="distribution-value">{{scope3}} tCO₂e ({{scope3Percent}}%)</div>
        <p>Chaîne de valeur : achats, transport, déplacements, déchets, utilisation des produits.</p>
        <div class="distribution-bar">
          <div class="distribution-fill scope3-fill" style="width: {{scope3Percent}}%"></div>
        </div>
      </div>
      {{/if}}
    </div>
  </div>

  <div class="analytical-comment-box">
    <h3>Commentaire analytique</h3>
    <div class="comment-content">
      <p>{{analyticalComment}}</p>
    </div>
  </div>

  <div class="analysis-note">
    <strong>Note méthodologique :</strong> L''analyse par poste permet d''identifier les leviers d''action prioritaires en concentrant les efforts sur les sources d''émissions les plus significatives. Cette approche constitue un préalable indispensable à l''élaboration d''une stratégie de réduction cohérente et efficace.
  </div>
</div>', false);
