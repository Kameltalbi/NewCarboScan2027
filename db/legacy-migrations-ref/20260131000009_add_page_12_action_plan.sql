-- Ajout de la Page 12 : Plan d'actions
INSERT INTO public.report_templates (page_number, section_key, title, content_template, requires_scope3) VALUES
(12, 'action_plan', 'Plan d''actions',
'<div class="action-plan-section">
  <h2 class="section-title">Plan d''actions</h2>
  
  <div class="plan-intro">
    <p>À l''issue de l''analyse des résultats du bilan carbone, un plan d''actions qualitatif peut être défini afin d''identifier des leviers de réduction des émissions de gaz à effet de serre adaptés aux activités de <strong>{{companyName}}</strong>. Ce plan d''actions s''appuie sur la hiérarchisation des postes émetteurs et vise à orienter les réflexions futures de l''organisation en matière de performance environnementale.</p>
    
    <p>Les actions proposées sont structurées autour des principaux postes contributeurs identifiés lors de l''analyse. Elles peuvent concerner, selon le périmètre étudié, la maîtrise des consommations énergétiques, l''optimisation des usages liés à la mobilité, l''évolution de certaines pratiques opérationnelles ou encore la prise en compte des émissions indirectes associées à la chaîne de valeur. Ces actions sont formulées à un niveau qualitatif et ne constituent pas, à ce stade, des engagements chiffrés de réduction.</p>
    
    <p>Le plan d''actions présenté a vocation à servir de cadre de réflexion et d''aide à la décision. Il permet à <strong>{{companyName}}</strong> d''identifier des pistes d''amélioration réalistes, cohérentes avec son contexte opérationnel et compatibles avec son niveau de maturité en matière de comptabilité carbone. La mise en œuvre de ces actions pourra faire l''objet d''analyses complémentaires, notamment en termes de faisabilité technique, d''impact organisationnel et de disponibilité des données.</p>
    
    <p>Ce plan d''actions constitue ainsi une première étape vers une démarche structurée de réduction des émissions. Il pourra être enrichi et précisé lors de futurs exercices de bilan carbone, ou dans le cadre d''une démarche spécifique de définition d''une trajectoire de décarbonation.</p>
  </div>

  <div class="action-framework">
    <h3>Cadre méthodologique</h3>
    <div class="framework-info">
      <p>Les actions proposées suivent une approche structurée en trois horizons temporels, permettant de distinguer les leviers selon leur délai de mise en œuvre et leur niveau de complexité. Cette classification facilite la priorisation et l''intégration progressive des actions dans la stratégie de l''organisation.</p>
    </div>
  </div>

  <div class="actions-by-scope">
    <h3>Leviers d''action par périmètre</h3>
    
    <div class="scope-actions-card scope1-actions">
      <div class="scope-actions-header">
        <span class="scope-icon">🏭</span>
        <h4>Scope 1 – Émissions directes</h4>
        <span class="scope-badge scope1-badge">{{scope1}} tCO₂e</span>
      </div>
      
      <div class="actions-timeline">
        <div class="timeline-section">
          <div class="timeline-label">Court terme (0-2 ans)</div>
          <ul class="actions-list">
            <li>Optimisation de la gestion de la flotte de véhicules</li>
            <li>Formation à l''éco-conduite</li>
            <li>Maintenance préventive des équipements de combustion</li>
            <li>Suivi et réparation des fuites de fluides frigorigènes</li>
          </ul>
        </div>
        
        <div class="timeline-section">
          <div class="timeline-label">Moyen terme (2-5 ans)</div>
          <ul class="actions-list">
            <li>Électrification progressive de la flotte</li>
            <li>Remplacement des équipements de chauffage par des solutions plus performantes</li>
            <li>Optimisation des procédés industriels</li>
          </ul>
        </div>
        
        <div class="timeline-section">
          <div class="timeline-label">Long terme (5+ ans)</div>
          <ul class="actions-list">
            <li>Transition complète vers des véhicules à faibles émissions</li>
            <li>Décarbonation des procédés industriels</li>
            <li>Évolution structurelle du modèle opérationnel</li>
          </ul>
        </div>
      </div>
    </div>

    <div class="scope-actions-card scope2-actions">
      <div class="scope-actions-header">
        <span class="scope-icon">⚡</span>
        <h4>Scope 2 – Émissions indirectes énergétiques</h4>
        <span class="scope-badge scope2-badge">{{scope2}} tCO₂e</span>
      </div>
      
      <div class="actions-timeline">
        <div class="timeline-section">
          <div class="timeline-label">Court terme (0-2 ans)</div>
          <ul class="actions-list">
            <li>Sensibilisation aux écogestes (extinction des équipements, gestion du chauffage)</li>
            <li>Optimisation des réglages des systèmes de climatisation et ventilation</li>
            <li>Mise en place d''un suivi régulier des consommations énergétiques</li>
          </ul>
        </div>
        
        <div class="timeline-section">
          <div class="timeline-label">Moyen terme (2-5 ans)</div>
          <ul class="actions-list">
            <li>Remplacement progressif par des équipements performants (LED, pompes à chaleur)</li>
            <li>Amélioration de l''isolation thermique des bâtiments</li>
            <li>Étude de faisabilité pour l''autoconsommation d''énergie renouvelable</li>
          </ul>
        </div>
        
        <div class="timeline-section">
          <div class="timeline-label">Long terme (5+ ans)</div>
          <ul class="actions-list">
            <li>Installation de panneaux photovoltaïques en toiture</li>
            <li>Souscription à un contrat d''électricité d''origine renouvelable</li>
            <li>Rénovation énergétique globale des bâtiments</li>
          </ul>
        </div>
      </div>
    </div>

    {{#if hasScope3}}
    <div class="scope-actions-card scope3-actions">
      <div class="scope-actions-header">
        <span class="scope-icon">🔗</span>
        <h4>Scope 3 – Autres émissions indirectes</h4>
        <span class="scope-badge scope3-badge">{{scope3}} tCO₂e</span>
      </div>
      
      <div class="actions-timeline">
        <div class="timeline-section">
          <div class="timeline-label">Court terme (0-2 ans)</div>
          <ul class="actions-list">
            <li>Amélioration de la collecte des données fournisseurs</li>
            <li>Sensibilisation des collaborateurs aux déplacements professionnels</li>
            <li>Optimisation de la gestion des déchets (tri, valorisation)</li>
          </ul>
        </div>
        
        <div class="timeline-section">
          <div class="timeline-label">Moyen terme (2-5 ans)</div>
          <ul class="actions-list">
            <li>Intégration de critères carbone dans la politique d''achats</li>
            <li>Développement du télétravail et des visioconférences</li>
            <li>Optimisation de la logistique et des transports</li>
          </ul>
        </div>
        
        <div class="timeline-section">
          <div class="timeline-label">Long terme (5+ ans)</div>
          <ul class="actions-list">
            <li>Engagement des fournisseurs dans une démarche de réduction</li>
            <li>Éco-conception des produits et services</li>
            <li>Évolution du modèle d''affaires vers une économie circulaire</li>
          </ul>
        </div>
      </div>
    </div>
    {{/if}}
  </div>

  <div class="prioritization-matrix">
    <h3>Priorisation des actions</h3>
    <div class="matrix-info">
      <p>La priorisation des actions repose sur plusieurs critères : le potentiel de réduction des émissions, la faisabilité technique et organisationnelle, l''acceptabilité par les parties prenantes et la cohérence avec la stratégie globale de l''organisation. Les actions à fort impact et à faible complexité constituent généralement les leviers prioritaires.</p>
    </div>
    
    <div class="priority-categories">
      <div class="priority-card high-priority">
        <div class="priority-icon">🎯</div>
        <h4>Priorité élevée</h4>
        <p>Actions à fort impact, faible complexité, mise en œuvre rapide. Ces leviers constituent les "quick wins" de la démarche.</p>
      </div>
      
      <div class="priority-card medium-priority">
        <div class="priority-icon">⚖️</div>
        <h4>Priorité moyenne</h4>
        <p>Actions à impact significatif nécessitant des investissements ou des changements organisationnels modérés.</p>
      </div>
      
      <div class="priority-card strategic-priority">
        <div class="priority-icon">🔮</div>
        <h4>Priorité stratégique</h4>
        <p>Actions structurantes à fort impact mais nécessitant une transformation profonde du modèle opérationnel.</p>
      </div>
    </div>
  </div>

  <div class="next-steps">
    <h3>Prochaines étapes</h3>
    <div class="steps-grid">
      <div class="step-card">
        <div class="step-number">1</div>
        <h4>Validation</h4>
        <p>Présentation et validation du plan d''actions par la direction et les parties prenantes internes.</p>
      </div>
      
      <div class="step-card">
        <div class="step-number">2</div>
        <h4>Approfondissement</h4>
        <p>Études de faisabilité technique et économique pour les actions prioritaires identifiées.</p>
      </div>
      
      <div class="step-card">
        <div class="step-number">3</div>
        <h4>Mise en œuvre</h4>
        <p>Déploiement progressif des actions selon les priorités et les ressources disponibles.</p>
      </div>
      
      <div class="step-card">
        <div class="step-number">4</div>
        <h4>Suivi</h4>
        <p>Évaluation de l''efficacité des actions lors du prochain exercice de bilan carbone.</p>
      </div>
    </div>
  </div>

  <div class="plan-note">
    <strong>Note importante :</strong> Ce plan d''actions constitue un cadre de réflexion qualitatif. Il ne comporte pas d''engagements chiffrés de réduction ni de trajectoire de décarbonation formelle. Ces éléments pourront être définis ultérieurement dans le cadre d''une démarche spécifique de stratégie climat.
  </div>
</div>', false);
