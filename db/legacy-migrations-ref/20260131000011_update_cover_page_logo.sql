-- Migration : Ajouter le logo CarboScan dans le footer de la page de couverture

UPDATE public.report_templates
SET content_template = '<div class="report-cover">
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
    <div class="carboscan-branding">
      <div class="carboscan-logo">
        <img src="/logos/CarboScan-logo.png" alt="CarboScan" class="logo-image" />
      </div>
      <div class="carboscan-tagline">
        <p class="branding-text">Rapport édité par <strong>CarboScan</strong></p>
        <p class="branding-subtitle">Plateforme climat</p>
      </div>
    </div>
    <div class="cover-date-section">
      <p class="cover-label">Date d''édition :</p>
      <p class="cover-date">{{generatedDate}}</p>
    </div>
  </div>
</div>',
updated_at = now()
WHERE section_key = 'cover';

COMMENT ON COLUMN public.report_templates.updated_at IS 'Dernière mise à jour du template';
