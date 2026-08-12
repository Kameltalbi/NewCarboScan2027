-- Ajout de la Page 6 : Périmètre organisationnel et opérationnel
INSERT INTO public.report_templates (page_number, section_key, title, content_template, requires_scope3) VALUES
(6, 'perimeter', 'Périmètre organisationnel et opérationnel',
'<div class="perimeter-section">
  <h2 class="section-title">Périmètre organisationnel et opérationnel</h2>
  
  <div class="perimeter-text">
    <p>Le périmètre organisationnel du présent bilan carbone a été défini afin de refléter de manière cohérente les activités sur lesquelles <strong>{{companyName}}</strong> exerce un contrôle direct ou une influence opérationnelle significative. La définition de ce périmètre constitue une étape essentielle pour garantir la pertinence et la comparabilité des résultats.</p>
    
    <p>La méthode de consolidation retenue pour cette étude est la méthode <strong>{{consolidationMethod}}</strong>, conformément aux recommandations du GHG Protocol. Cette approche permet de déterminer les entités, sites et activités inclus dans le périmètre du bilan carbone en fonction du niveau de contrôle exercé par l''organisation. Les sites inclus dans l''étude correspondent aux <strong>{{sites}} site(s)</strong> identifiés comme représentatifs des activités analysées pour l''année de référence {{year}}.</p>
    
    <p>Le périmètre opérationnel couvre les activités générant des émissions de gaz à effet de serre relevant des <strong>{{#if hasScope3}}Scopes 1, 2 et 3{{else}}Scopes 1 et 2{{/if}}</strong>. Il inclut notamment les consommations d''énergie, l''utilisation de combustibles, les déplacements professionnels et, le cas échéant, certaines activités indirectes liées à la chaîne de valeur. Les postes non retenus dans le cadre de cette étude ont été exclus de manière explicite et justifiée, soit en raison de leur caractère non significatif, soit en raison d''une indisponibilité de données fiables.</p>
    
    <p>Les choix de périmètre, ainsi que les éventuelles exclusions, ont été définis dans un souci de transparence et de cohérence méthodologique. Ils visent à assurer une lecture claire des résultats et à permettre une évolution progressive du périmètre lors de futurs exercices de bilan carbone.</p>
  </div>

  <div class="perimeter-details">
    <h3>Sites inclus dans le périmètre</h3>
    <div class="sites-table">
      <table>
        <thead>
          <tr>
            <th>Nom du site</th>
            <th>Type</th>
            <th>Localisation</th>
            <th>Scopes analysés</th>
          </tr>
        </thead>
        <tbody>
          {{#each sitesInScope}}
          <tr>
            <td><strong>{{name}}</strong></td>
            <td>{{site_type}}</td>
            <td>{{city}}, {{country}}</td>
            <td>
              <span class="scope-badge">{{#if scope1_enabled}}S1{{/if}}</span>
              <span class="scope-badge">{{#if scope2_enabled}}S2{{/if}}</span>
              <span class="scope-badge">{{#if scope3_enabled}}S3{{/if}}</span>
            </td>
          </tr>
          {{/each}}
        </tbody>
      </table>
    </div>
  </div>

  <div class="consolidation-info">
    <div class="info-box">
      <h4>Méthode de consolidation</h4>
      <p><strong>{{consolidationMethod}}</strong></p>
      <p class="info-desc">Cette méthode définit les critères d''inclusion des entités et sites dans le périmètre du bilan carbone.</p>
    </div>
    
    <div class="info-box">
      <h4>Périmètre opérationnel</h4>
      <p><strong>{{#if hasScope3}}Scopes 1, 2 et 3{{else}}Scopes 1 et 2{{/if}}</strong></p>
      <p class="info-desc">Catégories d''émissions prises en compte dans l''analyse.</p>
    </div>
  </div>
</div>', false);
