-- Ajout de la Page 8 : Résultats globaux des émissions de gaz à effet de serre
INSERT INTO public.report_templates (page_number, section_key, title, content_template, requires_scope3) VALUES
(8, 'global_results', 'Résultats globaux des émissions de gaz à effet de serre',
'<div class="global-results-section">
  <h2 class="section-title">Résultats globaux des émissions de gaz à effet de serre</h2>
  
  <div class="results-text">
    <p>Les résultats globaux du bilan carbone de <strong>{{companyName}}</strong> pour l''année {{year}} mettent en évidence le niveau total des émissions de gaz à effet de serre générées par les activités incluses dans le périmètre de l''étude. L''ensemble des émissions s''élève à <strong>{{totalEmissions}} tCO₂e</strong> sur la période analysée, tous scopes confondus.</p>
    
    <p>La répartition des émissions par périmètre montre que le <strong>Scope 1</strong> représente <strong>{{scope1}} tCO₂e</strong>, correspondant aux émissions directes issues des sources détenues ou contrôlées par l''organisation. Le <strong>Scope 2</strong> représente <strong>{{scope2}} tCO₂e</strong> et regroupe les émissions indirectes associées à la consommation d''énergie achetée, principalement l''électricité. {{#if hasScope3}}Le <strong>Scope 3</strong> représente <strong>{{scope3}} tCO₂e</strong> et correspond aux émissions indirectes générées en amont et en aval des activités de l''organisation au sein de sa chaîne de valeur.{{/if}}</p>
    
    <p>L''analyse de la répartition relative des émissions met en évidence une contribution dominante du <strong>Scope {{scopeDominant}}</strong>, qui représente <strong>{{scopeDominantPercent}} %</strong> des émissions totales. Cette structure reflète les caractéristiques des activités de <strong>{{companyName}}</strong>, ainsi que les choix organisationnels, énergétiques et opérationnels associés à son fonctionnement.</p>
    
    <p>Les résultats présentés constituent une photographie des émissions pour l''année de référence considérée. Ils permettent d''identifier les périmètres les plus contributeurs à l''empreinte carbone globale et servent de base pour les analyses détaillées par poste développées dans les sections suivantes du rapport. Cette vision consolidée des émissions est essentielle pour assurer une compréhension globale des enjeux carbone et pour structurer un suivi cohérent des émissions dans le temps.</p>
  </div>

  <div class="results-summary-cards">
    <div class="result-card total-card">
      <div class="result-icon">🌍</div>
      <div class="result-label">Émissions totales</div>
      <div class="result-value">{{totalEmissions}}</div>
      <div class="result-unit">tCO₂e</div>
    </div>

    <div class="result-card scope1-result">
      <div class="result-icon">🏭</div>
      <div class="result-label">Scope 1</div>
      <div class="result-value">{{scope1}}</div>
      <div class="result-unit">tCO₂e ({{scope1Percent}}%)</div>
    </div>

    <div class="result-card scope2-result">
      <div class="result-icon">⚡</div>
      <div class="result-label">Scope 2</div>
      <div class="result-value">{{scope2}}</div>
      <div class="result-unit">tCO₂e ({{scope2Percent}}%)</div>
    </div>

    {{#if hasScope3}}
    <div class="result-card scope3-result">
      <div class="result-icon">🔗</div>
      <div class="result-label">Scope 3</div>
      <div class="result-value">{{scope3}}</div>
      <div class="result-unit">tCO₂e ({{scope3Percent}}%)</div>
    </div>
    {{/if}}
  </div>

  <div class="results-chart-section">
    <h3>Répartition des émissions par scope</h3>
    <div class="results-chart-container">
      <div class="chart-placeholder">
        <div class="pie-chart">
          <div class="pie-segment scope1-segment" style="--percentage: {{scope1Percent}}">
            <span class="segment-label">Scope 1<br>{{scope1Percent}}%</span>
          </div>
          <div class="pie-segment scope2-segment" style="--percentage: {{scope2Percent}}">
            <span class="segment-label">Scope 2<br>{{scope2Percent}}%</span>
          </div>
          {{#if hasScope3}}
          <div class="pie-segment scope3-segment" style="--percentage: {{scope3Percent}}">
            <span class="segment-label">Scope 3<br>{{scope3Percent}}%</span>
          </div>
          {{/if}}
        </div>
      </div>
      
      <div class="chart-legend">
        <div class="legend-item">
          <span class="legend-color scope1-color"></span>
          <span class="legend-text">Scope 1 : Émissions directes ({{scope1}} tCO₂e)</span>
        </div>
        <div class="legend-item">
          <span class="legend-color scope2-color"></span>
          <span class="legend-text">Scope 2 : Énergie achetée ({{scope2}} tCO₂e)</span>
        </div>
        {{#if hasScope3}}
        <div class="legend-item">
          <span class="legend-color scope3-color"></span>
          <span class="legend-text">Scope 3 : Chaîne de valeur ({{scope3}} tCO₂e)</span>
        </div>
        {{/if}}
      </div>
    </div>
  </div>

  <div class="key-findings">
    <h3>Points clés</h3>
    <ul class="findings-list">
      <li>Le <strong>Scope {{scopeDominant}}</strong> est le périmètre le plus contributeur avec <strong>{{scopeDominantPercent}}%</strong> des émissions totales</li>
      <li>Les émissions directes (Scope 1) représentent <strong>{{scope1Percent}}%</strong> de l''empreinte carbone</li>
      <li>Les émissions liées à l''énergie achetée (Scope 2) représentent <strong>{{scope2Percent}}%</strong></li>
      {{#if hasScope3}}
      <li>Les émissions de la chaîne de valeur (Scope 3) représentent <strong>{{scope3Percent}}%</strong></li>
      {{/if}}
    </ul>
  </div>
</div>', false);
