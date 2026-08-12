-- Ajout de la Page 5 : Méthodologie et référentiels utilisés
INSERT INTO public.report_templates (page_number, section_key, title, content_template, requires_scope3) VALUES
(5, 'methodology', 'Méthodologie et référentiels utilisés', 
'<div class="methodology-section">
  <h2 class="section-title">Méthodologie et référentiels utilisés</h2>
  
  <div class="methodology-text">
    <p>Le présent bilan carbone a été réalisé selon une méthodologie structurée conforme aux référentiels reconnus en matière de comptabilité des émissions de gaz à effet de serre, notamment le <strong>GHG Protocol</strong> et la méthode <strong>Bilan Carbone®</strong>. Ces référentiels constituent des cadres de référence internationaux visant à assurer la cohérence, la comparabilité et la transparence des résultats.</p>
    
    <p>La méthodologie repose sur l''identification des activités génératrices d''émissions de gaz à effet de serre, la collecte des données d''activité associées, puis l''application de facteurs d''émission adaptés afin de convertir ces données en équivalent dioxyde de carbone (CO₂e). Les émissions sont exprimées en <strong>tonnes de CO₂ équivalent (tCO₂e)</strong>, conformément aux standards en vigueur.</p>
    
    <p>Les données d''activité ont été collectées auprès de <strong>{{companyName}}</strong> pour l''année de référence <strong>{{year}}</strong>. Elles portent notamment sur les consommations énergétiques, l''utilisation de combustibles, les déplacements professionnels et, le cas échéant, certaines activités indirectes relevant de la chaîne de valeur. Lorsque des données spécifiques n''étaient pas disponibles, des hypothèses raisonnables ont été formulées sur la base des informations accessibles, en veillant à en documenter les limites.</p>
    
    <p>Les facteurs d''émission utilisés proviennent de bases de données reconnues et régulièrement mises à jour. Le choix des facteurs d''émission a été effectué de manière cohérente avec le contexte géographique, sectoriel et temporel de l''étude. L''ensemble des hypothèses, choix méthodologiques et sources de données est documenté afin de garantir la traçabilité des calculs et la reproductibilité des résultats.</p>
  </div>

  <div class="methodology-framework">
    <h3>Référentiels appliqués</h3>
    <div class="framework-cards">
      <div class="framework-card">
        <div class="framework-icon">🌍</div>
        <div class="framework-name">GHG Protocol</div>
        <div class="framework-desc">Standard international de comptabilité carbone</div>
      </div>
      <div class="framework-card">
        <div class="framework-icon">🇫🇷</div>
        <div class="framework-name">Bilan Carbone®</div>
        <div class="framework-desc">Méthode de référence française (ADEME)</div>
      </div>
    </div>
  </div>

  <div class="methodology-steps">
    <h3>Étapes méthodologiques</h3>
    <ol class="steps-list">
      <li><strong>Identification</strong> des activités émettrices</li>
      <li><strong>Collecte</strong> des données d''activité</li>
      <li><strong>Application</strong> des facteurs d''émission</li>
      <li><strong>Calcul</strong> des émissions en tCO₂e</li>
      <li><strong>Analyse</strong> et hiérarchisation des postes</li>
    </ol>
  </div>
</div>', false);
