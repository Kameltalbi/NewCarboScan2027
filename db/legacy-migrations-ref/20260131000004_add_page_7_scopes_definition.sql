-- Ajout de la Page 7 : Définition des scopes et périmètre des émissions
INSERT INTO public.report_templates (page_number, section_key, title, content_template, requires_scope3) VALUES
(7, 'scopes_definition', 'Définition des scopes et périmètre des émissions',
'<div class="scopes-definition-section">
  <h2 class="section-title">Définition des scopes et périmètre des émissions</h2>
  
  <div class="scopes-text">
    <p>Le présent bilan carbone est structuré selon la classification des émissions de gaz à effet de serre en trois périmètres distincts, appelés <strong>Scopes</strong>, conformément aux principes du GHG Protocol. Cette approche permet de distinguer les émissions directes de celles indirectes, tout en assurant une lecture claire et homogène des résultats.</p>
    
    <p>Le <strong>Scope 1</strong> regroupe les émissions directes générées par les sources détenues ou contrôlées par <strong>{{companyName}}</strong>. Il inclut notamment les émissions issues de la combustion de combustibles sur site, de l''utilisation de véhicules appartenant à l''organisation et, le cas échéant, les émissions fugitives liées à certains équipements. Ces émissions sont directement imputables aux activités opérationnelles de l''organisation.</p>
    
    <p>Le <strong>Scope 2</strong> couvre les émissions indirectes associées à la production de l''énergie achetée et consommée par l''organisation, principalement l''électricité. Bien que ces émissions ne soient pas produites physiquement sur les sites de <strong>{{companyName}}</strong>, elles résultent de ses choix de consommation énergétique et sont donc intégrées au périmètre d''analyse.</p>
    
    {{#if hasScope3}}
    <p>Le <strong>Scope 3</strong> regroupe les autres émissions indirectes générées tout au long de la chaîne de valeur de l''organisation, en amont et en aval de ses activités. Il peut inclure, selon le périmètre retenu et la disponibilité des données, les émissions liées aux achats de biens et services, au transport, aux déplacements professionnels, à la gestion des déchets ou encore à l''utilisation des produits.</p>
    {{/if}}
    
    <p>La définition précise des scopes analysés dans le cadre de cette étude vise à garantir la cohérence du périmètre, la transparence des résultats et la comparabilité des données dans le temps.</p>
  </div>

  <div class="scopes-visual">
    <h3>Classification des émissions par scope</h3>
    
    <div class="scope-card scope1-card">
      <div class="scope-header">
        <span class="scope-badge scope1-badge">Scope 1</span>
        <span class="scope-label">Émissions directes</span>
      </div>
      <div class="scope-content">
        <ul class="scope-examples">
          <li>Combustion de combustibles sur site</li>
          <li>Véhicules de l''organisation</li>
          <li>Émissions fugitives (climatisation, réfrigération)</li>
          <li>Procédés industriels directs</li>
        </ul>
      </div>
      <div class="scope-footer">
        <strong>{{scope1}}</strong> tCO₂e ({{scope1Percent}}%)
      </div>
    </div>

    <div class="scope-card scope2-card">
      <div class="scope-header">
        <span class="scope-badge scope2-badge">Scope 2</span>
        <span class="scope-label">Émissions indirectes énergétiques</span>
      </div>
      <div class="scope-content">
        <ul class="scope-examples">
          <li>Consommation d''électricité achetée</li>
          <li>Consommation de chaleur/vapeur achetée</li>
          <li>Consommation de froid acheté</li>
        </ul>
      </div>
      <div class="scope-footer">
        <strong>{{scope2}}</strong> tCO₂e ({{scope2Percent}}%)
      </div>
    </div>

    {{#if hasScope3}}
    <div class="scope-card scope3-card">
      <div class="scope-header">
        <span class="scope-badge scope3-badge">Scope 3</span>
        <span class="scope-label">Autres émissions indirectes</span>
      </div>
      <div class="scope-content">
        <ul class="scope-examples">
          <li>Achats de biens et services</li>
          <li>Transport et distribution</li>
          <li>Déplacements professionnels</li>
          <li>Gestion des déchets</li>
          <li>Utilisation des produits vendus</li>
        </ul>
      </div>
      <div class="scope-footer">
        <strong>{{scope3}}</strong> tCO₂e ({{scope3Percent}}%)
      </div>
    </div>
    {{/if}}
  </div>

  <div class="scopes-note">
    <p><strong>Note méthodologique :</strong> La classification en scopes permet d''identifier les leviers d''action prioritaires et de structurer les efforts de réduction des émissions en fonction du niveau de contrôle exercé par l''organisation sur les sources d''émissions.</p>
  </div>
</div>', false);
