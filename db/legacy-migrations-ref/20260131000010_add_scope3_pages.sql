-- Migration : Ajout des 6 pages Scope 3 pour rapport 18 pages
-- Architecture : Pages 12-18 pour Scope 3, Page 12 existante devient conditionnelle

-- 1. Mettre à jour la page 12 existante (Plan d'actions) pour qu'elle soit conditionnelle
UPDATE public.report_templates 
SET requires_scope3 = false,
    page_number = 12
WHERE section_key = 'action_plan';

-- 2. Ajouter les 6 nouvelles pages Scope 3

-- PAGE 12 (version Scope 3) - Introduction au Scope 3
INSERT INTO public.report_templates (page_number, section_key, title, content_template, requires_scope3) VALUES
(12, 'scope3_introduction', 'Introduction au Scope 3',
'<div class="scope3-introduction-section">
  <h2 class="section-title">Introduction au Scope 3</h2>
  
  <div class="scope3-intro">
    <p>Le <strong>Scope 3</strong> regroupe l''ensemble des émissions indirectes de gaz à effet de serre générées tout au long de la chaîne de valeur de <strong>{{companyName}}</strong>, en amont et en aval de ses activités. Contrairement aux émissions des Scopes 1 et 2, ces émissions ne sont pas directement produites sur les sites de l''organisation ni liées à sa consommation d''énergie achetée, mais résultent de ses interactions avec des tiers, notamment les fournisseurs, les prestataires, les clients et les partenaires logistiques.</p>
    
    <p>L''inclusion du Scope 3 dans le présent bilan carbone vise à offrir une vision plus complète de l''empreinte carbone globale de <strong>{{companyName}}</strong> pour l''année de référence {{year}}. Dans de nombreux secteurs d''activité, les émissions du Scope 3 représentent une part significative, voire majoritaire, des émissions totales. Leur prise en compte permet ainsi de mieux appréhender les impacts climatiques associés à l''ensemble du modèle économique de l''organisation.</p>
    
    <p>La quantification des émissions du Scope 3 repose sur des méthodes d''estimation adaptées à la disponibilité des données et à la nature des activités analysées. Ces méthodes peuvent s''appuyer sur des données physiques, monétaires ou des facteurs d''émission génériques. En raison de cette approche indirecte, les émissions du Scope 3 présentent généralement un niveau d''incertitude plus élevé que celles des Scopes 1 et 2.</p>
    
    <p>La présente section a pour objectif de cadrer l''analyse du Scope 3, d''en préciser le périmètre et d''expliciter les limites méthodologiques associées. Elle constitue une étape indispensable pour assurer une lecture transparente et cohérente des résultats détaillés présentés dans les pages suivantes.</p>
  </div>

  <div class="scope3-categories-overview">
    <h3>Catégories du Scope 3 analysées</h3>
    
    <div class="categories-grid">
      <div class="category-card upstream">
        <div class="category-header">
          <span class="category-icon">⬅️</span>
          <h4>Émissions amont</h4>
        </div>
        <ul class="category-list">
          <li>Achats de biens et services</li>
          <li>Biens d''équipement</li>
          <li>Transport et distribution amont</li>
          <li>Déchets générés</li>
          <li>Déplacements professionnels</li>
          <li>Trajets domicile-travail</li>
        </ul>
      </div>
      
      <div class="category-card downstream">
        <div class="category-header">
          <span class="category-icon">➡️</span>
          <h4>Émissions aval</h4>
        </div>
        <ul class="category-list">
          <li>Transport et distribution aval</li>
          <li>Utilisation des produits vendus</li>
          <li>Fin de vie des produits vendus</li>
          <li>Franchises (si applicable)</li>
        </ul>
      </div>
    </div>
  </div>

  <div class="scope3-methodology">
    <h3>Approche méthodologique</h3>
    
    <div class="methodology-cards">
      <div class="method-card">
        <div class="method-icon">📊</div>
        <h4>Approche monétaire</h4>
        <p>Utilisation de ratios monétaires (tCO₂e/€) appliqués aux montants d''achats par catégorie. Méthode adaptée lorsque les données physiques ne sont pas disponibles.</p>
      </div>
      
      <div class="method-card">
        <div class="method-icon">📦</div>
        <h4>Approche physique</h4>
        <p>Calcul basé sur des données d''activité physiques (km parcourus, tonnes transportées, kWh consommés) et des facteurs d''émission spécifiques.</p>
      </div>
      
      <div class="method-card">
        <div class="method-icon">🎯</div>
        <h4>Approche hybride</h4>
        <p>Combinaison des deux approches selon la disponibilité et la qualité des données pour chaque catégorie d''émissions.</p>
      </div>
    </div>
  </div>

  <div class="scope3-limitations">
    <h3>Limites et incertitudes</h3>
    <div class="limitations-content">
      <p>Les résultats du Scope 3 présentés dans ce rapport comportent un niveau d''incertitude plus élevé que les Scopes 1 et 2, pour les raisons suivantes :</p>
      <ul class="limitations-list">
        <li>Utilisation de facteurs d''émission moyens ou génériques en l''absence de données primaires</li>
        <li>Estimations basées sur des données monétaires plutôt que physiques pour certaines catégories</li>
        <li>Périmètre de collecte limité par la disponibilité des informations auprès des parties prenantes externes</li>
        <li>Hypothèses simplificatrices nécessaires pour certains postes complexes de la chaîne de valeur</li>
      </ul>
      <p>Ces limites sont documentées de manière transparente et n''empêchent pas une lecture cohérente des ordres de grandeur et de la structure des émissions du Scope 3.</p>
    </div>
  </div>
</div>', true);

-- PAGE 13 - Scope 3 : Vue d'ensemble
INSERT INTO public.report_templates (page_number, section_key, title, content_template, requires_scope3) VALUES
(13, 'scope3_overview', 'Scope 3 : Vue d''ensemble des émissions',
'<div class="scope3-overview-section">
  <h2 class="section-title">Scope 3 : Vue d''ensemble des émissions</h2>
  
  <div class="scope3-summary">
    <p>La présente page propose une vue d''ensemble des émissions de gaz à effet de serre relevant du Scope 3 pour <strong>{{companyName}}</strong> au titre de l''année {{year}}. Ces émissions correspondent aux impacts indirects générés en amont et en aval des activités de l''organisation, au sein de sa chaîne de valeur, et viennent compléter l''analyse des Scopes 1 et 2.</p>
    
    <p>Pour la période étudiée, les émissions du Scope 3 s''élèvent à <strong>{{scope3}} tCO₂e</strong>, représentant <strong>{{scope3Percent}} %</strong> des émissions totales du bilan carbone. Ce poids relatif confirme l''importance des activités indirectes dans l''empreinte carbone globale de l''organisation et souligne l''intérêt d''une analyse spécifique et structurée de ces postes.</p>
    
    <p>La répartition des émissions du Scope 3 par grandes catégories met en évidence une concentration des émissions sur un nombre limité de postes. Les catégories <strong>{{scope3TopCategory1}}</strong> et <strong>{{scope3TopCategory2}}</strong> constituent les principaux contributeurs, suivies par <strong>{{scope3TopCategory3}}</strong>. Cette hiérarchisation permet d''identifier les domaines dans lesquels les émissions indirectes sont les plus significatives.</p>
    
    <p>Les résultats présentés reposent sur des méthodes d''estimation adaptées à la nature des données disponibles et aux caractéristiques des activités analysées. Ils doivent être interprétés comme des ordres de grandeur visant à éclairer la structure globale des émissions du Scope 3. Cette vue d''ensemble constitue une étape essentielle pour orienter l''analyse détaillée des principales catégories d''émissions, développée dans les sections suivantes du rapport.</p>
  </div>

  <div class="scope3-weight">
    <h3>Poids du Scope 3 dans le bilan global</h3>
    
    <div class="weight-comparison">
      <div class="weight-card scope1-weight">
        <div class="weight-label">Scope 1</div>
        <div class="weight-value">{{scope1}} tCO₂e</div>
        <div class="weight-percent">{{scope1Percent}}%</div>
        <div class="weight-bar">
          <div class="weight-fill scope1-fill" style="width: {{scope1Percent}}%"></div>
        </div>
      </div>
      
      <div class="weight-card scope2-weight">
        <div class="weight-label">Scope 2</div>
        <div class="weight-value">{{scope2}} tCO₂e</div>
        <div class="weight-percent">{{scope2Percent}}%</div>
        <div class="weight-bar">
          <div class="weight-fill scope2-fill" style="width: {{scope2Percent}}%"></div>
        </div>
      </div>
      
      <div class="weight-card scope3-weight highlighted">
        <div class="weight-label">Scope 3</div>
        <div class="weight-value">{{scope3}} tCO₂e</div>
        <div class="weight-percent">{{scope3Percent}}%</div>
        <div class="weight-bar">
          <div class="weight-fill scope3-fill" style="width: {{scope3Percent}}%"></div>
        </div>
      </div>
    </div>
  </div>

  <div class="scope3-breakdown">
    <h3>Répartition par catégorie</h3>
    
    <div class="breakdown-chart">
      {{#if scope3Posts}}
      <table class="scope3-table">
        <thead>
          <tr>
            <th>Catégorie</th>
            <th class="text-right">Émissions (tCO₂e)</th>
            <th class="text-right">Part du Scope 3</th>
            <th class="text-right">Part du total</th>
          </tr>
        </thead>
        <tbody>
          {{#each scope3Posts}}
          <tr>
            <td><strong>{{name}}</strong></td>
            <td class="text-right">{{value}}</td>
            <td class="text-right">
              <span class="percent-badge">{{percent}}%</span>
            </td>
            <td class="text-right">{{totalPercent}}%</td>
          </tr>
          {{/each}}
        </tbody>
      </table>
      {{/if}}
    </div>
  </div>

  <div class="scope3-key-findings">
    <h3>Constats principaux</h3>
    <div class="findings-grid">
      <div class="finding-card">
        <div class="finding-icon">📊</div>
        <h4>Poids relatif</h4>
        <p>Le Scope 3 représente <strong>{{scope3Percent}}%</strong> des émissions totales, confirmant l''importance de la chaîne de valeur dans l''empreinte carbone de l''organisation.</p>
      </div>
      
      <div class="finding-card">
        <div class="finding-icon">🎯</div>
        <h4>Concentration</h4>
        <p>Les émissions du Scope 3 sont concentrées sur un nombre limité de catégories, permettant une priorisation claire des leviers d''action.</p>
      </div>
      
      <div class="finding-card">
        <div class="finding-icon">🔍</div>
        <h4>Niveau de détail</h4>
        <p>Les catégories analysées ont été sélectionnées en fonction de leur significativité et de la disponibilité des données.</p>
      </div>
    </div>
  </div>
</div>', true);

-- PAGE 14 - Scope 3 : Achats de biens et services
INSERT INTO public.report_templates (page_number, section_key, title, content_template, requires_scope3) VALUES
(14, 'scope3_purchases', 'Scope 3 : Achats de biens et services',
'<div class="scope3-purchases-section">
  <h2 class="section-title">Scope 3 : Achats de biens et services</h2>
  
  <div class="purchases-intro">
    <p>Les émissions de gaz à effet de serre associées aux achats de biens et services constituent généralement l''un des principaux postes du Scope 3 pour de nombreuses organisations. Elles correspondent aux émissions générées tout au long du cycle de vie des produits et services achetés par <strong>{{companyName}}</strong>, en amont de ses activités directes.</p>
    
    <p>Pour l''année de référence {{year}}, les émissions liées aux achats de biens et services sont estimées à <strong>{{scope3PurchasesEmissions}} tCO₂e</strong>, représentant <strong>{{scope3PurchasesPercent}} %</strong> des émissions totales du Scope 3. Ce niveau d''émissions reflète à la fois la nature des biens et services achetés, les volumes concernés et les méthodes d''estimation retenues dans le cadre de l''étude.</p>
    
    <p>L''évaluation de ce poste repose sur l''utilisation de données d''activité disponibles, pouvant être exprimées en valeurs monétaires ou en quantités physiques selon les catégories d''achats considérées. Ces données ont été combinées à des facteurs d''émission issus de bases de données reconnues, permettant d''obtenir des ordres de grandeur cohérents avec le périmètre analysé. Lorsque des données spécifiques n''étaient pas disponibles, des hypothèses ont été formulées afin de couvrir l''ensemble des achats significatifs.</p>
    
    <p>L''analyse des émissions liées aux achats met en évidence l''importance de la chaîne d''approvisionnement dans l''empreinte carbone globale de l''organisation. Les résultats présentés fournissent une première lecture structurée des impacts associés aux biens et services achetés et constituent une base pour l''approfondissement futur de ce poste, notamment par l''amélioration de la qualité des données fournisseurs et la segmentation plus fine des catégories d''achats.</p>
  </div>

  <div class="purchases-methodology">
    <h3>Méthodologie appliquée</h3>
    <div class="method-explanation">
      <p>Le calcul des émissions liées aux achats repose sur la formule suivante :</p>
      <div class="formula-box">
        <code>Émissions = Montant d''achats (€) × Facteur d''émission sectoriel (kgCO₂e/€)</code>
      </div>
      <p>Les facteurs d''émission utilisés proviennent de bases de données reconnues et sont différenciés par secteur d''activité des fournisseurs.</p>
    </div>
  </div>

  <div class="purchases-categories">
    <h3>Principales catégories d''achats</h3>
    <div class="categories-list">
      <div class="purchase-category">
        <div class="category-icon">💼</div>
        <h4>Services professionnels</h4>
        <p>Prestations intellectuelles, conseil, formation, services juridiques et comptables.</p>
      </div>
      
      <div class="purchase-category">
        <div class="category-icon">🖥️</div>
        <h4>Équipements et fournitures</h4>
        <p>Matériel informatique, mobilier, fournitures de bureau, consommables.</p>
      </div>
      
      <div class="purchase-category">
        <div class="category-icon">🏢</div>
        <h4>Services généraux</h4>
        <p>Maintenance, nettoyage, sécurité, restauration, télécommunications.</p>
      </div>
      
      <div class="purchase-category">
        <div class="category-icon">📦</div>
        <h4>Matières et composants</h4>
        <p>Matières premières, composants, emballages (si applicable au secteur).</p>
      </div>
    </div>
  </div>

  <div class="purchases-note">
    <h3>Limites et incertitudes</h3>
    <p>Les résultats présentés reposent sur une approche monétaire utilisant des ratios moyens par secteur. Cette méthode présente un niveau d''incertitude plus élevé qu''une approche basée sur des données primaires fournisseurs. L''amélioration de la qualité des données pourra être envisagée lors de futurs exercices, notamment par l''engagement progressif des fournisseurs dans la communication de leurs propres empreintes carbone.</p>
  </div>
</div>', true);

-- PAGE 15 - Scope 3 : Transport et déplacements
INSERT INTO public.report_templates (page_number, section_key, title, content_template, requires_scope3) VALUES
(15, 'scope3_transport', 'Scope 3 : Transport et déplacements',
'<div class="scope3-transport-section">
  <h2 class="section-title">Scope 3 : Transport et déplacements</h2>
  
  <div class="transport-intro">
    <p>Le poste « Transport et déplacements » du Scope 3 regroupe les émissions de gaz à effet de serre associées aux flux de transport de marchandises et aux déplacements réalisés dans le cadre des activités de <strong>{{companyName}}</strong>, lorsqu''ils ne relèvent pas des Scopes 1 ou 2. Ces émissions sont générées en amont et en aval des opérations directes de l''organisation et concernent des moyens de transport opérés par des tiers.</p>
    
    <p>Pour l''année de référence {{year}}, les émissions liées au transport et aux déplacements sont estimées à <strong>{{scope3TransportEmissions}} tCO₂e</strong>, représentant <strong>{{scope3TransportPercent}} %</strong> des émissions totales du Scope 3. Ce poste inclut notamment le transport amont des marchandises, le transport aval vers les clients, ainsi que les déplacements professionnels réalisés par les collaborateurs à l''aide de moyens de transport externes.</p>
    
    <p>L''évaluation de ces émissions repose sur des données d''activité telles que les distances parcourues, les volumes transportés ou, lorsque ces informations ne sont pas disponibles, sur des données monétaires associées aux prestations de transport. Ces données ont été combinées à des facteurs d''émission adaptés aux modes de transport concernés, tels que le transport routier, maritime, aérien ou ferroviaire.</p>
    
    <p>L''analyse du poste transport et déplacements met en évidence le rôle significatif de la logistique et de la mobilité dans l''empreinte carbone globale de l''organisation. Les résultats présentés constituent une base de référence permettant de mieux comprendre la contribution de ces activités indirectes et de préparer une analyse plus fine lors de futurs exercices, notamment par l''amélioration de la précision des données collectées.</p>
  </div>

  <div class="transport-categories">
    <h3>Catégories analysées</h3>
    
    <div class="transport-grid">
      <div class="transport-card">
        <div class="transport-icon">✈️</div>
        <h4>Déplacements professionnels</h4>
        <p>Voyages d''affaires des collaborateurs : avion, train, véhicules de location, taxis. Calculés sur la base des distances parcourues et des modes de transport utilisés.</p>
      </div>
      
      <div class="transport-card">
        <div class="transport-icon">🚗</div>
        <h4>Trajets domicile-travail</h4>
        <p>Déplacements quotidiens des collaborateurs entre leur domicile et leur lieu de travail. Estimés sur la base d''enquêtes de mobilité ou de données moyennes.</p>
      </div>
      
      <div class="transport-card">
        <div class="transport-icon">🚚</div>
        <h4>Transport amont</h4>
        <p>Transport des biens et services achetés depuis les fournisseurs jusqu''aux sites de l''organisation. Calculé sur la base des tonnages et distances.</p>
      </div>
      
      <div class="transport-card">
        <div class="transport-icon">📦</div>
        <h4>Transport aval</h4>
        <p>Transport des produits vendus depuis les sites de l''organisation jusqu''aux clients finaux (si applicable au modèle d''activité).</p>
      </div>
    </div>
  </div>

  <div class="transport-methodology">
    <h3>Approche méthodologique</h3>
    <div class="method-cards">
      <div class="method-detail">
        <h4>Déplacements professionnels</h4>
        <p><strong>Données utilisées :</strong> Notes de frais, réservations de billets, données de mobilité</p>
        <p><strong>Calcul :</strong> Distance parcourue × Facteur d''émission par mode de transport</p>
      </div>
      
      <div class="method-detail">
        <h4>Trajets domicile-travail</h4>
        <p><strong>Données utilisées :</strong> Enquête mobilité ou hypothèses moyennes (distance, mode)</p>
        <p><strong>Calcul :</strong> Nombre de collaborateurs × Distance moyenne × Jours travaillés × Facteur d''émission</p>
      </div>
      
      <div class="method-detail">
        <h4>Fret et logistique</h4>
        <p><strong>Données utilisées :</strong> Tonnages transportés, distances, modes de transport</p>
        <p><strong>Calcul :</strong> Tonnes.km × Facteur d''émission par mode de transport</p>
      </div>
    </div>
  </div>

  <div class="transport-levers">
    <h3>Leviers d''action identifiés</h3>
    <div class="levers-list">
      <div class="lever-item">
        <span class="lever-icon">🎯</span>
        <div class="lever-content">
          <h4>Optimisation des déplacements professionnels</h4>
          <p>Privilégier les visioconférences, favoriser le train pour les trajets moyennes distances, optimiser les tournées commerciales.</p>
        </div>
      </div>
      
      <div class="lever-item">
        <span class="lever-icon">🚴</span>
        <div class="lever-content">
          <h4>Mobilité douce domicile-travail</h4>
          <p>Encourager le covoiturage, développer les infrastructures vélo, faciliter le télétravail, améliorer l''accessibilité en transports en commun.</p>
        </div>
      </div>
      
      <div class="lever-item">
        <span class="lever-icon">📦</span>
        <div class="lever-content">
          <h4>Optimisation logistique</h4>
          <p>Massification des flux, optimisation des tournées, choix de modes de transport moins émissifs (ferroviaire, fluvial).</p>
        </div>
      </div>
    </div>
  </div>
</div>', true);

-- PAGE 16 - Scope 3 : Autres postes significatifs
INSERT INTO public.report_templates (page_number, section_key, title, content_template, requires_scope3) VALUES
(16, 'scope3_other', 'Scope 3 : Autres postes significatifs',
'<div class="scope3-other-section">
  <h2 class="section-title">Scope 3 : Autres postes significatifs</h2>
  
  <div class="other-intro">
    <p>Outre les achats de biens et services ainsi que le transport et les déplacements, le Scope 3 peut inclure d''autres postes d''émissions indirectes significatifs en fonction de la nature des activités de <strong>{{companyName}}</strong>. Ces postes complémentaires permettent d''élargir l''analyse de la chaîne de valeur et d''apporter une vision plus exhaustive de l''empreinte carbone globale.</p>
    
    <p>Pour l''année de référence {{year}}, les émissions associées aux autres postes du Scope 3 s''élèvent à <strong>{{scope3OtherEmissions}} tCO₂e</strong>, représentant <strong>{{scope3OtherPercent}} %</strong> des émissions totales du Scope 3. Ces postes peuvent inclure, selon le périmètre retenu et la disponibilité des données, les émissions liées à la gestion des déchets, aux immobilisations, à l''utilisation des produits vendus ou encore à leur fin de vie.</p>
    
    <p>L''évaluation de ces postes repose sur des méthodes d''estimation adaptées à chaque catégorie, tenant compte des données d''activité disponibles et des facteurs d''émission pertinents. En raison de la diversité des sources et des niveaux de maturité variables en matière de données, ces postes présentent généralement un degré d''incertitude plus élevé que les postes principaux du Scope 3.</p>
    
    <p>L''intégration de ces autres postes significatifs permet néanmoins de compléter l''analyse et d''identifier des sources d''émissions parfois moins visibles mais potentiellement structurantes à moyen ou long terme. Les résultats présentés doivent être interprétés comme des ordres de grandeur et constituent une base pour l''amélioration progressive du périmètre et de la qualité des données lors de futurs exercices de bilan carbone.</p>
  </div>

  <div class="other-categories">
    <h3>Catégories complémentaires analysées</h3>
    
    <div class="other-grid">
      <div class="other-card">
        <div class="other-icon">🗑️</div>
        <h4>Déchets générés</h4>
        <p>Émissions liées au traitement et à l''élimination des déchets produits par l''organisation : collecte, transport, traitement (incinération, enfouissement, recyclage).</p>
        <div class="other-method">
          <strong>Méthode :</strong> Tonnes de déchets par type × Facteur d''émission par mode de traitement
        </div>
      </div>
      
      <div class="other-card">
        <div class="other-icon">🏗️</div>
        <h4>Immobilisations</h4>
        <p>Émissions liées à la fabrication et au transport des biens d''équipement (machines, véhicules, mobilier, informatique) amortis sur leur durée de vie.</p>
        <div class="other-method">
          <strong>Méthode :</strong> Montant d''investissement × Ratio monétaire sectoriel / Durée d''amortissement
        </div>
      </div>
      
      <div class="other-card">
        <div class="other-icon">⚡</div>
        <h4>Pertes en ligne (électricité)</h4>
        <p>Émissions liées aux pertes de transport et de distribution de l''électricité entre le point de production et le point de consommation.</p>
        <div class="other-method">
          <strong>Méthode :</strong> Consommation électrique × Taux de perte réseau × Facteur d''émission
        </div>
      </div>
      
      <div class="other-card">
        <div class="other-icon">🔧</div>
        <h4>Utilisation des produits vendus</h4>
        <p>Émissions générées lors de l''utilisation des produits ou services vendus par l''organisation (si applicable au modèle d''activité).</p>
        <div class="other-method">
          <strong>Méthode :</strong> Dépend fortement du type de produit/service et de son usage
        </div>
      </div>
      
      <div class="other-card">
        <div class="other-icon">♻️</div>
        <h4>Fin de vie des produits vendus</h4>
        <p>Émissions associées au traitement en fin de vie des produits vendus : collecte, démantèlement, recyclage, élimination.</p>
        <div class="other-method">
          <strong>Méthode :</strong> Masse des produits × Scénario de fin de vie × Facteurs d''émission
        </div>
      </div>
      
      <div class="other-card">
        <div class="other-icon">🏢</div>
        <h4>Actifs en leasing</h4>
        <p>Émissions liées à l''utilisation d''actifs loués ou en leasing (véhicules, équipements, bâtiments) non comptabilisés dans les Scopes 1 et 2.</p>
        <div class="other-method">
          <strong>Méthode :</strong> Selon la nature de l''actif et les données disponibles
        </div>
      </div>
    </div>
  </div>

  <div class="other-significance">
    <h3>Significativité des postes</h3>
    <p>Les catégories présentées ci-dessus ont été analysées en fonction de leur pertinence pour le modèle d''activité de <strong>{{companyName}}</strong>. Certaines catégories peuvent être non applicables ou non significatives selon le secteur d''activité. L''analyse de significativité permet de concentrer les efforts de collecte et de calcul sur les postes à fort impact.</p>
    
    <div class="significance-note">
      <strong>Note méthodologique :</strong> Conformément au GHG Protocol, une catégorie est considérée comme significative si elle représente plus de 5% des émissions totales du Scope 3, ou si elle présente un potentiel de réduction important, ou si elle fait l''objet d''attentes spécifiques de la part des parties prenantes.
    </div>
  </div>

  <div class="other-data-quality">
    <h3>Qualité des données</h3>
    <p>La qualité des données pour ces catégories complémentaires varie selon la disponibilité des informations et la complexité des chaînes de valeur concernées. Les résultats présentés reposent sur des hypothèses et des estimations cohérentes avec les meilleures pratiques méthodologiques, tout en assumant un niveau d''incertitude inhérent à ces catégories indirectes.</p>
  </div>
</div>', true);

-- PAGE 17 - Analyse consolidée tous scopes
INSERT INTO public.report_templates (page_number, section_key, title, content_template, requires_scope3) VALUES
(17, 'consolidated_analysis', 'Analyse consolidée de l''ensemble des scopes',
'<div class="consolidated-analysis-section">
  <h2 class="section-title">Analyse consolidée de l''ensemble des scopes</h2>
  
  <div class="consolidated-intro">
    <p>La présente analyse consolidée vise à offrir une lecture globale et transversale des émissions de gaz à effet de serre de <strong>{{companyName}}</strong> pour l''année {{year}}, en agrégeant les résultats des Scopes 1, 2 et 3. Cette approche permet de dépasser l''analyse par périmètre pour mieux comprendre la structure globale de l''empreinte carbone et la répartition des émissions entre les différentes sources identifiées.</p>
    
    <p>Les émissions totales s''élèvent à <strong>{{totalEmissions}} tCO₂e</strong> tous scopes confondus. L''analyse met en évidence une concentration des émissions sur un nombre restreint de postes. Les postes <strong>{{topPoste1}}</strong>, <strong>{{topPoste2}}</strong> et <strong>{{topPoste3}}</strong> constituent les principaux contributeurs à l''empreinte carbone globale, représentant à eux seuls <strong>{{top3PostesPercent}} %</strong> des émissions totales. Cette répartition confirme l''existence d''effets de concentration caractéristiques des exercices de comptabilité carbone.</p>
    
    <p>La comparaison des contributions respectives des différents scopes met en lumière le poids relatif des émissions indirectes par rapport aux émissions directes et énergétiques. Cette lecture consolidée permet d''identifier les périmètres sur lesquels les enjeux carbone sont les plus significatifs, indépendamment du niveau de contrôle direct exercé par l''organisation.</p>
    
    <p>Cette analyse globale constitue une étape clé du bilan carbone, en ce qu''elle fournit une vision hiérarchisée et cohérente des sources d''émissions. Elle permet d''éclairer la compréhension des résultats présentés et prépare la structuration des actions futures, en s''appuyant sur une priorisation fondée sur les ordres de grandeur observés et la contribution relative des différents postes.</p>
  </div>

  <div class="consolidated-overview">
    <h3>Vue d''ensemble consolidée</h3>
    
    <div class="overview-stats">
      <div class="stat-card total-stat">
        <div class="stat-icon">🌍</div>
        <div class="stat-label">Émissions totales</div>
        <div class="stat-value">{{totalEmissions}} tCO₂e</div>
      </div>
      
      <div class="stat-card scope-stat">
        <div class="stat-icon">📊</div>
        <div class="stat-label">Scope dominant</div>
        <div class="stat-value">Scope {{scopeDominant}}</div>
        <div class="stat-detail">{{scopeDominantPercent}}% du total</div>
      </div>
      
      <div class="stat-card intensity-stat">
        <div class="stat-icon">👥</div>
        <div class="stat-label">Intensité carbone</div>
        <div class="stat-value">{{intensityPerEmployee}} tCO₂e/pers</div>
      </div>
    </div>
  </div>

  <div class="consolidated-ranking">
    <h3>Top 10 des postes émetteurs (tous scopes)</h3>
    
    <div class="ranking-table">
      <table>
        <thead>
          <tr>
            <th>Rang</th>
            <th>Poste d''émission</th>
            <th>Scope</th>
            <th class="text-right">Émissions (tCO₂e)</th>
            <th class="text-right">% du total</th>
          </tr>
        </thead>
        <tbody>
          {{#each topPostsRanking}}
          <tr class="rank-{{position}}">
            <td><strong>{{position}}</strong></td>
            <td>{{name}}</td>
            <td><span class="scope-badge scope{{scope}}-badge">S{{scope}}</span></td>
            <td class="text-right"><strong>{{value}}</strong></td>
            <td class="text-right">
              <span class="percent-value">{{percent}}%</span>
              <div class="mini-bar">
                <div class="mini-fill scope{{scope}}-fill" style="width: {{barWidth}}%"></div>
              </div>
            </td>
          </tr>
          {{/each}}
        </tbody>
      </table>
    </div>
  </div>

  <div class="consolidated-pareto">
    <h3>Principe de concentration (Pareto)</h3>
    <div class="pareto-analysis">
      <p>L''analyse de la concentration des émissions révèle que les <strong>{{paretoCount}} premiers postes</strong> représentent <strong>{{paretoPercent}}%</strong> des émissions totales. Cette concentration confirme l''intérêt d''une approche priorisée, focalisée sur les postes à fort impact.</p>
      
      <div class="pareto-visual">
        <div class="pareto-bar">
          <div class="pareto-segment high-impact" style="width: {{paretoPercent}}%">
            <span>{{paretoPercent}}% des émissions</span>
          </div>
          <div class="pareto-segment low-impact">
            <span>{{remainingPercent}}%</span>
          </div>
        </div>
        <div class="pareto-labels">
          <span class="label-left">{{paretoCount}} postes prioritaires</span>
          <span class="label-right">Autres postes</span>
        </div>
      </div>
    </div>
  </div>

  <div class="consolidated-strategic">
    <h3>Lecture stratégique</h3>
    
    <div class="strategic-grid">
      <div class="strategic-card direct">
        <h4>🎯 Leviers directs (Scope 1)</h4>
        <p>Émissions maîtrisables directement par l''organisation. Actions à impact immédiat et contrôle total sur la mise en œuvre.</p>
        <div class="strategic-value">{{scope1}} tCO₂e ({{scope1Percent}}%)</div>
      </div>
      
      <div class="strategic-card indirect-energy">
        <h4>⚡ Leviers énergétiques (Scope 2)</h4>
        <p>Émissions liées aux choix énergétiques. Leviers d''action via l''efficacité énergétique et le mix énergétique.</p>
        <div class="strategic-value">{{scope2}} tCO₂e ({{scope2Percent}}%)</div>
      </div>
      
      <div class="strategic-card indirect-value">
        <h4>🔗 Leviers chaîne de valeur (Scope 3)</h4>
        <p>Émissions indirectes nécessitant l''engagement des parties prenantes externes. Leviers d''influence progressive.</p>
        <div class="strategic-value">{{scope3}} tCO₂e ({{scope3Percent}}%)</div>
      </div>
    </div>
  </div>

  <div class="consolidated-comment">
    <h3>Commentaire analytique</h3>
    <div class="comment-box">
      <p>{{analyticalComment}}</p>
    </div>
  </div>
</div>', true);

-- PAGE 18 - Plan d'actions élargi (Scopes 1, 2 et 3)
INSERT INTO public.report_templates (page_number, section_key, title, content_template, requires_scope3) VALUES
(18, 'action_plan_extended', 'Plan d''actions',
'<div class="action-plan-extended-section">
  <h2 class="section-title">Plan d''actions</h2>
  
  <div class="plan-extended-intro">
    <p>À l''issue de l''analyse consolidée des émissions de gaz à effet de serre, un plan d''actions qualitatif peut être défini afin d''identifier des leviers de réduction potentiels adaptés aux activités de <strong>{{companyName}}</strong>. Ce plan d''actions s''appuie sur la hiérarchisation des postes émetteurs et vise à structurer une réflexion progressive sur les modalités de réduction des émissions, sans constituer à ce stade un engagement chiffré ou une trajectoire formalisée.</p>
    
    <p>Les actions envisagées peuvent concerner en priorité les postes les plus contributeurs identifiés dans le cadre du bilan carbone. Pour les Scopes 1 et 2, ces actions peuvent porter sur l''optimisation des consommations énergétiques, l''amélioration de l''efficacité des équipements, l''évolution des pratiques d''exploitation ou la maîtrise des usages liés à la mobilité interne. Ces leviers relèvent principalement du périmètre opérationnel direct de l''organisation.</p>
    
    <p>Pour le Scope 3, les actions potentielles s''inscrivent davantage dans une logique de chaîne de valeur. Elles peuvent inclure, selon le contexte de <strong>{{companyName}}</strong>, une meilleure prise en compte des enjeux carbone dans les achats de biens et services, le dialogue avec les fournisseurs et prestataires, l''optimisation des flux de transport ou l''évolution de certaines pratiques de mobilité professionnelle. Ces actions reposent sur une capacité d''influence plus que de contrôle direct.</p>
    
    <p>Le plan d''actions présenté constitue un cadre de réflexion destiné à accompagner <strong>{{companyName}}</strong> dans la structuration de sa démarche environnementale. Il pourra être enrichi, précisé et priorisé lors de futurs exercices, notamment à travers l''amélioration de la qualité des données, l''évaluation de la faisabilité des actions identifiées et, le cas échéant, la définition d''objectifs de réduction spécifiques dans un cadre méthodologique dédié.</p>
  </div>

  <div class="extended-actions">
    <h3>Leviers d''action par catégorie</h3>
    
    <!-- Actions Scope 3 spécifiques -->
    <div class="action-category scope3-category">
      <div class="category-header">
        <span class="category-icon">🔗</span>
        <h4>Scope 3 : Chaîne de valeur</h4>
      </div>
      
      <div class="action-subcategory">
        <h5>Achats de biens et services</h5>
        <div class="action-timeline">
          <div class="timeline-item">
            <div class="timeline-badge short">Court terme</div>
            <ul class="action-list">
              <li>Sensibilisation des acheteurs aux enjeux carbone</li>
              <li>Amélioration de la collecte de données fournisseurs</li>
              <li>Intégration de critères environnementaux dans les appels d''offres</li>
            </ul>
          </div>
          <div class="timeline-item">
            <div class="timeline-badge medium">Moyen terme</div>
            <ul class="action-list">
              <li>Engagement progressif des fournisseurs stratégiques</li>
              <li>Priorisation des fournisseurs à faible empreinte carbone</li>
              <li>Développement de partenariats durables</li>
            </ul>
          </div>
          <div class="timeline-item">
            <div class="timeline-badge long">Long terme</div>
            <ul class="action-list">
              <li>Intégration systématique de l''empreinte carbone dans la politique d''achats</li>
              <li>Co-construction de plans de décarbonation avec les fournisseurs clés</li>
            </ul>
          </div>
        </div>
      </div>
      
      <div class="action-subcategory">
        <h5>Transport et mobilité</h5>
        <div class="action-timeline">
          <div class="timeline-item">
            <div class="timeline-badge short">Court terme</div>
            <ul class="action-list">
              <li>Politique de déplacements professionnels (privilégier le train, limiter l''avion)</li>
              <li>Développement de la visioconférence</li>
              <li>Sensibilisation à la mobilité douce (domicile-travail)</li>
            </ul>
          </div>
          <div class="timeline-item">
            <div class="timeline-badge medium">Moyen terme</div>
            <ul class="action-list">
              <li>Plan de mobilité entreprise (covoiturage, vélo, transports en commun)</li>
              <li>Optimisation de la logistique (massification, modes moins émissifs)</li>
              <li>Facilitation du télétravail</li>
            </ul>
          </div>
          <div class="timeline-item">
            <div class="timeline-badge long">Long terme</div>
            <ul class="action-list">
              <li>Relocalisation stratégique pour réduire les distances</li>
              <li>Transition vers des modes de transport décarbonés</li>
            </ul>
          </div>
        </div>
      </div>
      
      <div class="action-subcategory">
        <h5>Autres postes Scope 3</h5>
        <div class="action-timeline">
          <div class="timeline-item">
            <div class="timeline-badge short">Court terme</div>
            <ul class="action-list">
              <li>Amélioration du tri et de la valorisation des déchets</li>
              <li>Optimisation de la durée de vie des équipements</li>
            </ul>
          </div>
          <div class="timeline-item">
            <div class="timeline-badge medium">Moyen terme</div>
            <ul class="action-list">
              <li>Économie de la fonctionnalité (location, mutualisation)</li>
              <li>Éco-conception des produits/services (si applicable)</li>
            </ul>
          </div>
          <div class="timeline-item">
            <div class="timeline-badge long">Long terme</div>
            <ul class="action-list">
              <li>Évolution vers un modèle d''économie circulaire</li>
              <li>Engagement de la chaîne de valeur complète</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  </div>

  <div class="extended-approach">
    <h3>Approche de mise en œuvre</h3>
    
    <div class="approach-grid">
      <div class="approach-card">
        <div class="approach-number">1</div>
        <h4>Priorisation</h4>
        <p>Concentrer les efforts sur les postes à fort impact identifiés dans l''analyse consolidée (principe de Pareto).</p>
      </div>
      
      <div class="approach-card">
        <div class="approach-number">2</div>
        <h4>Progressivité</h4>
        <p>Déployer les actions par phases successives, en commençant par les leviers à faible complexité et fort impact.</p>
      </div>
      
      <div class="approach-card">
        <div class="approach-number">3</div>
        <h4>Engagement</h4>
        <p>Impliquer les parties prenantes internes et externes dans la démarche (collaborateurs, fournisseurs, clients).</p>
      </div>
      
      <div class="approach-card">
        <div class="approach-number">4</div>
        <h4>Suivi</h4>
        <p>Mettre en place des indicateurs de suivi et évaluer l''efficacité des actions lors des prochains bilans carbone.</p>
      </div>
    </div>
  </div>

  <div class="extended-next-steps">
    <h3>Perspectives</h3>
    <p>Ce plan d''actions constitue une première étape vers une démarche structurée de réduction des émissions. Il pourra être enrichi et précisé lors de futurs exercices de bilan carbone, ou dans le cadre d''une démarche spécifique de définition d''une trajectoire de décarbonation alignée sur les objectifs de l''Accord de Paris.</p>
    
    <div class="perspectives-note">
      <strong>Note importante :</strong> Ce plan d''actions demeure qualitatif et ne comporte pas d''engagements chiffrés de réduction ni de trajectoire formelle. La définition d''objectifs quantifiés et d''une stratégie climat complète relève d''analyses complémentaires distinctes du présent bilan carbone.
    </div>
  </div>
</div>', true);

-- 3. Ajouter des commentaires pour documentation
COMMENT ON COLUMN public.report_templates.requires_scope3 IS 'True si cette page est uniquement pour les rapports incluant le Scope 3 (rapport 18 pages)';

-- 4. Créer une fonction helper pour obtenir les bonnes pages selon le scope
CREATE OR REPLACE FUNCTION public.get_report_pages(has_scope3 boolean)
RETURNS TABLE (
  page_number integer,
  section_key text,
  title text,
  content_template text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF has_scope3 THEN
    -- Rapport 18 pages : toutes les pages sauf action_plan (remplacé par action_plan_extended)
    RETURN QUERY
    SELECT 
      rt.page_number,
      rt.section_key,
      rt.title,
      rt.content_template
    FROM public.report_templates rt
    WHERE rt.is_active = true
      AND rt.section_key != 'action_plan'
    ORDER BY rt.page_number;
  ELSE
    -- Rapport 12 pages : uniquement les pages sans requires_scope3
    RETURN QUERY
    SELECT 
      rt.page_number,
      rt.section_key,
      rt.title,
      rt.content_template
    FROM public.report_templates rt
    WHERE rt.is_active = true
      AND (rt.requires_scope3 = false OR rt.requires_scope3 IS NULL)
    ORDER BY rt.page_number;
  END IF;
END;
$$;

COMMENT ON FUNCTION public.get_report_pages IS 'Retourne les pages appropriées selon que le Scope 3 est inclus ou non';
