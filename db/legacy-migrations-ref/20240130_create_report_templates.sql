-- Migration pour créer la table des templates de rapport
-- Cette table stocke les sections de texte qui s'adaptent au contexte de l'entreprise

CREATE TABLE IF NOT EXISTS report_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_key TEXT NOT NULL UNIQUE, -- Clé unique pour identifier la section (ex: "introduction_contexte")
  title TEXT NOT NULL, -- Titre de la section
  content_template TEXT NOT NULL, -- Template de texte avec variables {{variable}}
  page_number INTEGER NOT NULL, -- Numéro de page où apparaît la section
  order_in_page INTEGER DEFAULT 1, -- Ordre dans la page si plusieurs sections
  
  -- Conditions d'affichage
  requires_scope3 BOOLEAN DEFAULT false, -- Afficher seulement si Scope 3 collecté
  min_employees INTEGER, -- Nombre minimum d'employés
  max_employees INTEGER, -- Nombre maximum d'employés
  sectors TEXT[], -- Secteurs d'activité concernés (NULL = tous)
  
  -- Métadonnées
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true
);

-- Index pour améliorer les performances
CREATE INDEX idx_report_templates_section_key ON report_templates(section_key);
CREATE INDEX idx_report_templates_page_number ON report_templates(page_number);
CREATE INDEX idx_report_templates_active ON report_templates(is_active);

-- Fonction pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_report_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_report_templates_updated_at
  BEFORE UPDATE ON report_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_report_templates_updated_at();

-- Insertion des templates par défaut pour les 12 pages

-- PAGE 1: Couverture (générée dynamiquement, pas de template texte)

-- PAGE 2: Introduction - Contexte de l'entreprise
INSERT INTO report_templates (section_key, title, content_template, page_number, order_in_page) VALUES
('introduction_contexte', 'Introduction – Contexte de l''entreprise', 
'<p>L''entreprise <strong>{{companyName}}</strong> exerce son activité dans le secteur <strong>{{sector}}</strong>, avec un effectif d''environ <strong>{{employees}} collaborateurs</strong>{{#if sites}} répartis sur <strong>{{sites}} sites</strong>{{/if}}. L''entreprise occupe une surface totale de <strong>{{surface}} m²</strong>{{#if revenue}} et réalise un chiffre d''affaires annuel de <strong>{{revenue}} €</strong>{{/if}}.</p>

<p>Ses activités génèrent des impacts environnementaux principalement liés à la consommation d''énergie{{#if hasScope1}}, aux émissions directes de combustion{{/if}}{{#if hasScope3}}, aux achats de biens et services, et aux déplacements{{/if}}.</p>

<p>Dans un contexte de transition énergétique et de lutte contre le changement climatique, <strong>{{companyName}}</strong> s''engage dans une démarche volontaire de quantification et de réduction de ses émissions de gaz à effet de serre (GES). Cette initiative s''inscrit dans une stratégie RSE globale visant à réduire l''empreinte carbone de l''organisation et à contribuer aux objectifs de l''Accord de Paris.</p>',
2, 1);

-- PAGE 2: Objectifs de la démarche
INSERT INTO report_templates (section_key, title, content_template, page_number, order_in_page) VALUES
('introduction_objectifs', 'Objectifs de la démarche', 
'<p>Le présent Bilan Carbone® a pour objectif de quantifier les émissions de gaz à effet de serre (GES) de l''organisation sur le périmètre des Scopes 1, 2{{#if hasScope3}} et 3{{/if}}. La démarche est réalisée à titre volontaire et vise plusieurs objectifs stratégiques :</p>

<ul>
  <li><strong>Quantifier</strong> : Établir un état des lieux précis des émissions de GES de l''entreprise</li>
  <li><strong>Identifier</strong> : Repérer les principaux postes d''émissions et les leviers de réduction prioritaires</li>
  <li><strong>Planifier</strong> : Définir une trajectoire de décarbonation cohérente avec les enjeux climatiques</li>
  <li><strong>Sensibiliser</strong> : Mobiliser l''ensemble des collaborateurs autour des enjeux climatiques</li>
  <li><strong>Anticiper</strong> : Se préparer aux évolutions réglementaires (CSRD, taxonomie verte, etc.)</li>
  {{#if hasScope3}}<li><strong>Engager</strong> : Impliquer la chaîne de valeur dans la démarche de réduction</li>{{/if}}
</ul>

<p>Ce bilan constitue la première étape d''une démarche d''amélioration continue qui sera suivie d''un plan d''actions de réduction et d''un suivi régulier des indicateurs de performance.</p>',
2, 2);

-- PAGE 3: Méthodologie - Périmètre et Scopes
INSERT INTO report_templates (section_key, title, content_template, page_number, order_in_page) VALUES
('methodologie_perimetre', 'Méthodologie – Périmètre et Scopes', 
'<p>Le Bilan Carbone® est réalisé selon la méthodologie du <strong>GHG Protocol</strong> (Greenhouse Gas Protocol) et la norme <strong>ISO 14064-1</strong>. Cette approche internationalement reconnue permet de quantifier les émissions de gaz à effet de serre selon trois périmètres distincts :</p>

<h3>Périmètre organisationnel</h3>
<ul>
  <li><strong>Année de référence</strong> : {{year}}</li>
  <li><strong>Périmètre géographique</strong> : {{country}}</li>
  <li><strong>Nombre de sites</strong> : {{sites}}</li>
  <li><strong>Effectif</strong> : {{employees}} collaborateurs</li>
  <li><strong>Surface totale</strong> : {{surface}} m²</li>
</ul>

<h3>Périmètre opérationnel</h3>
<p>Le bilan couvre les Scopes 1 et 2{{#if hasScope3}}, ainsi qu''une partie significative du Scope 3{{/if}} conformément aux exigences réglementaires et aux bonnes pratiques sectorielles.</p>',
3, 1);

-- PAGE 4: Collecte et traitement des données
INSERT INTO report_templates (section_key, title, content_template, page_number, order_in_page) VALUES
('collecte_donnees', 'Collecte et traitement des données', 
'<p>Les données utilisées pour ce bilan proviennent de sources primaires et secondaires, garantissant la fiabilité et la traçabilité des résultats :</p>

<h3>Sources de données</h3>
<ul>
  <li><strong>Factures d''énergie</strong> : Électricité, gaz naturel, fioul</li>
  {{#if hasScope1}}<li><strong>Relevés de consommation</strong> : Carburants de la flotte de véhicules</li>{{/if}}
  {{#if hasScope1}}<li><strong>Registres de maintenance</strong> : Fluides frigorigènes (fuites et recharges)</li>{{/if}}
  {{#if hasScope3}}<li><strong>Données achats</strong> : Fournisseurs et prestataires</li>{{/if}}
  {{#if hasScope3}}<li><strong>Données RH</strong> : Déplacements professionnels et trajets domicile-travail</li>{{/if}}
</ul>

<h3>Facteurs d''émission</h3>
<p>Les facteurs d''émission utilisés proviennent de la <strong>Base Carbone® de l''ADEME</strong> (version 2024), complétés par des facteurs personnalisés pour certains postes spécifiques à l''activité de l''entreprise.</p>

<h3>Qualité des données</h3>
<p>Un système de classement et de conservation des données a été mis en place pour assurer la traçabilité et permettre les comparaisons inter-annuelles. Les incertitudes liées aux données et aux facteurs d''émission sont estimées à environ ±15%.</p>',
4, 1);

-- PAGE 5: Résultats globaux (générés dynamiquement avec graphiques)

-- PAGE 6: Analyse détaillée par scope
INSERT INTO report_templates (section_key, title, content_template, page_number, order_in_page) VALUES
('analyse_scope1', 'Analyse détaillée – Scope 1', 
'<p>Les émissions du Scope 1 s''élèvent à <strong>{{scope1}} tCO₂e</strong>, soit <strong>{{scope1Percent}}%</strong> du total. Ces émissions directes proviennent des sources contrôlées par l''entreprise :</p>

<h3>Principaux postes émetteurs</h3>
{{#each scope1Posts}}
<div class="emission-post">
  <strong>{{name}}</strong> : {{value}} tCO₂e ({{percent}}%)
  <p class="description">{{description}}</p>
</div>
{{/each}}

<h3>Leviers de réduction prioritaires</h3>
<ul>
  <li><strong>Court terme</strong> : Optimisation de la gestion de la flotte, éco-conduite, maintenance préventive</li>
  <li><strong>Moyen terme</strong> : Électrification progressive des véhicules, amélioration de l''efficacité énergétique</li>
  <li><strong>Long terme</strong> : Transition vers des énergies renouvelables, remplacement des équipements</li>
</ul>',
6, 1);

INSERT INTO report_templates (section_key, title, content_template, page_number, order_in_page, requires_scope3) VALUES
('analyse_scope3', 'Analyse détaillée – Scope 3', 
'<p>Les émissions du Scope 3 s''élèvent à <strong>{{scope3}} tCO₂e</strong>, soit <strong>{{scope3Percent}}%</strong> du total. Ces émissions indirectes de la chaîne de valeur représentent souvent la part la plus importante du bilan carbone.</p>

<h3>Catégories analysées</h3>
{{#each scope3Categories}}
<div class="emission-post">
  <strong>{{name}}</strong> : {{value}} tCO₂e ({{percent}}%)
  <p class="description">{{description}}</p>
</div>
{{/each}}

<h3>Leviers de réduction prioritaires</h3>
<ul>
  <li><strong>Achats</strong> : Privilégier les fournisseurs locaux et engagés dans une démarche bas-carbone</li>
  <li><strong>Déplacements</strong> : Encourager le télétravail, les visioconférences et les modes de transport doux</li>
  <li><strong>Mobilité</strong> : Mettre en place un plan de mobilité durable (covoiturage, transports en commun)</li>
  <li><strong>Déchets</strong> : Optimiser le tri, le recyclage et réduire les déchets à la source</li>
</ul>',
6, 2, true);

-- PAGE 7: Indicateurs de performance
INSERT INTO report_templates (section_key, title, content_template, page_number, order_in_page) VALUES
('indicateurs_performance', 'Indicateurs de performance et benchmarking', 
'<h3>Intensité carbone</h3>
<p>L''analyse des indicateurs d''intensité carbone permet de comparer les performances de l''entreprise et de suivre l''évolution dans le temps :</p>

<ul>
  <li><strong>Intensité par employé</strong> : {{intensityPerEmployee}} tCO₂e/employé</li>
  <li><strong>Intensité par m²</strong> : {{intensityPerM2}} kgCO₂e/m²</li>
  {{#if sites}}<li><strong>Intensité par site</strong> : {{intensityPerSite}} tCO₂e/site</li>{{/if}}
  {{#if revenue}}<li><strong>Intensité économique</strong> : {{intensityPerRevenue}} kgCO₂e/k€</li>{{/if}}
</ul>

<h3>Benchmarking sectoriel</h3>
<p>Comparé aux moyennes du secteur <strong>{{sector}}</strong> :</p>
<ul>
  <li>Intensité carbone par employé : {{benchmarkStatus}}</li>
  <li>Marge de progression : {{improvementPotential}}</li>
</ul>

<h3>Objectifs de réduction</h3>
<p>Pour s''aligner sur une trajectoire compatible avec l''Accord de Paris (limitation du réchauffement à 1,5°C), l''entreprise devrait viser une réduction de <strong>{{reductionTarget}}%</strong> de ses émissions d''ici 2030, soit environ <strong>{{annualReduction}}% par an</strong>.</p>',
7, 1);

-- PAGE 8: Analyse économique
INSERT INTO report_templates (section_key, title, content_template, page_number, order_in_page) VALUES
('analyse_economique', 'Analyse économique prospective', 
'<p>L''analyse économique prospective constitue un élément clé du Bilan Carbone®, permettant d''évaluer l''impact financier de la consommation énergétique et de la dépendance aux énergies fossiles.</p>

<h3>Coûts énergétiques actuels</h3>
<ul>
  <li><strong>Coût annuel estimé</strong> : {{energyCostMin}} - {{energyCostMax}} €</li>
  <li><strong>Part dans les charges</strong> : {{energyCostPercent}}%</li>
</ul>

<h3>Scénarios d''évolution</h3>
<p>Selon les projections de l''Agence Internationale de l''Énergie (AIE), le prix des énergies fossiles pourrait augmenter significativement dans les années à venir :</p>

<ul>
  <li><strong>Scénario conservateur</strong> (+3% par an) : Coût additionnel de {{scenarioConservative}} € d''ici 2030</li>
  <li><strong>Scénario médian</strong> (+5% par an) : Coût additionnel de {{scenarioMedian}} € d''ici 2030</li>
  <li><strong>Scénario pessimiste</strong> (+8% par an) : Coût additionnel de {{scenarioPessimistic}} € d''ici 2030</li>
</ul>

<h3>Opportunités d''économies</h3>
<p>Les actions de réduction des émissions peuvent générer des économies substantielles :</p>
<ul>
  <li>Efficacité énergétique : Économies estimées à {{savingsEfficiency}} €/an</li>
  <li>Énergies renouvelables : ROI de {{roiRenewables}} ans</li>
  <li>Mobilité durable : Économies de {{savingsMobility}} €/an</li>
</ul>',
8, 1);

-- PAGE 9: Plan d'actions - Scope 1
INSERT INTO report_templates (section_key, title, content_template, page_number, order_in_page) VALUES
('plan_actions_scope1', 'Plan d''actions – Scope 1', 
'<p>Au regard des résultats obtenus, les émissions directes du Scope 1 s''élèvent à <strong>{{scope1}} tCO₂e</strong>. Plusieurs leviers d''actions peuvent être activés pour réduire ces émissions :</p>

<h3>Actions prioritaires</h3>

<div class="action-card">
  <h4>🚗 Optimisation de la flotte de véhicules</h4>
  <ul>
    <li><strong>Objectif</strong> : Réduire de 20% les émissions liées aux déplacements</li>
    <li><strong>Actions</strong> : Formation éco-conduite, optimisation des tournées, covoiturage</li>
    <li><strong>Investissement</strong> : {{investmentFleet}} €</li>
    <li><strong>Économies annuelles</strong> : {{savingsFleet}} €</li>
    <li><strong>Réduction CO₂</strong> : {{reductionFleet}} tCO₂e/an</li>
  </ul>
</div>

<div class="action-card">
  <h4>⚡ Électrification progressive</h4>
  <ul>
    <li><strong>Objectif</strong> : Remplacer 30% de la flotte par des véhicules électriques d''ici 2027</li>
    <li><strong>Actions</strong> : Installation de bornes de recharge, achat/location de VE</li>
    <li><strong>Investissement</strong> : {{investmentElectric}} €</li>
    <li><strong>Réduction CO₂</strong> : {{reductionElectric}} tCO₂e/an</li>
  </ul>
</div>

<div class="action-card">
  <h4>🏢 Efficacité énergétique des bâtiments</h4>
  <ul>
    <li><strong>Objectif</strong> : Réduire de 15% la consommation de chauffage</li>
    <li><strong>Actions</strong> : Isolation, régulation, maintenance préventive</li>
    <li><strong>Investissement</strong> : {{investmentBuilding}} €</li>
    <li><strong>Économies annuelles</strong> : {{savingsBuilding}} €</li>
    <li><strong>Réduction CO₂</strong> : {{reductionBuilding}} tCO₂e/an</li>
  </ul>
</div>',
9, 1);

-- PAGE 10: Plan d'actions - Scope 2
INSERT INTO report_templates (section_key, title, content_template, page_number, order_in_page) VALUES
('plan_actions_scope2', 'Plan d''actions – Scope 2', 
'<p>Les émissions indirectes liées à l''énergie (Scope 2) s''élèvent à <strong>{{scope2}} tCO₂e</strong>. Les leviers de réduction sont nombreux et souvent rentables :</p>

<h3>Actions prioritaires</h3>

<div class="action-card">
  <h4>☀️ Électricité verte</h4>
  <ul>
    <li><strong>Objectif</strong> : Souscrire à un contrat d''électricité 100% renouvelable</li>
    <li><strong>Actions</strong> : Changement de fournisseur, garanties d''origine</li>
    <li><strong>Surcoût</strong> : {{costGreenElectricity}} €/an ({{costGreenPercent}}%)</li>
    <li><strong>Réduction CO₂</strong> : {{reductionGreenElectricity}} tCO₂e/an</li>
  </ul>
</div>

<div class="action-card">
  <h4>☀️ Autoconsommation photovoltaïque</h4>
  <ul>
    <li><strong>Objectif</strong> : Installer {{solarCapacity}} kWc de panneaux solaires</li>
    <li><strong>Actions</strong> : Étude de faisabilité, installation sur toiture</li>
    <li><strong>Investissement</strong> : {{investmentSolar}} €</li>
    <li><strong>Production annuelle</strong> : {{solarProduction}} kWh</li>
    <li><strong>ROI</strong> : {{roiSolar}} ans</li>
    <li><strong>Réduction CO₂</strong> : {{reductionSolar}} tCO₂e/an</li>
  </ul>
</div>

<div class="action-card">
  <h4>💡 Sobriété énergétique</h4>
  <ul>
    <li><strong>Objectif</strong> : Réduire de 10% la consommation électrique</li>
    <li><strong>Actions</strong> : LED, extinction automatique, sensibilisation</li>
    <li><strong>Investissement</strong> : {{investmentSobriety}} €</li>
    <li><strong>Économies annuelles</strong> : {{savingsSobriety}} €</li>
    <li><strong>Réduction CO₂</strong> : {{reductionSobriety}} tCO₂e/an</li>
  </ul>
</div>',
10, 1);

-- PAGE 11: Plan d'actions - Scope 3 (si applicable)
INSERT INTO report_templates (section_key, title, content_template, page_number, order_in_page, requires_scope3) VALUES
('plan_actions_scope3', 'Plan d''actions – Scope 3', 
'<p>Les émissions indirectes de la chaîne de valeur (Scope 3) s''élèvent à <strong>{{scope3}} tCO₂e</strong>. Bien que plus difficiles à maîtriser, ces émissions offrent un potentiel de réduction significatif :</p>

<h3>Actions prioritaires</h3>

<div class="action-card">
  <h4>🛒 Achats responsables</h4>
  <ul>
    <li><strong>Objectif</strong> : Intégrer des critères carbone dans 50% des achats</li>
    <li><strong>Actions</strong> : Questionnaire fournisseurs, clauses contractuelles</li>
    <li><strong>Réduction CO₂</strong> : {{reductionPurchasing}} tCO₂e/an</li>
  </ul>
</div>

<div class="action-card">
  <h4>🚆 Mobilité durable</h4>
  <ul>
    <li><strong>Objectif</strong> : Réduire de 30% les déplacements professionnels</li>
    <li><strong>Actions</strong> : Visioconférence, train vs avion, covoiturage</li>
    <li><strong>Économies annuelles</strong> : {{savingsTravel}} €</li>
    <li><strong>Réduction CO₂</strong> : {{reductionTravel}} tCO₂e/an</li>
  </ul>
</div>

<div class="action-card">
  <h4>🚴 Plan de mobilité</h4>
  <ul>
    <li><strong>Objectif</strong> : 40% des trajets domicile-travail en mode doux</li>
    <li><strong>Actions</strong> : Vélos de fonction, aide transports en commun</li>
    <li><strong>Investissement</strong> : {{investmentMobility}} €</li>
    <li><strong>Réduction CO₂</strong> : {{reductionCommuting}} tCO₂e/an</li>
  </ul>
</div>

<div class="action-card">
  <h4>♻️ Économie circulaire</h4>
  <ul>
    <li><strong>Objectif</strong> : Taux de recyclage de 80%</li>
    <li><strong>Actions</strong> : Tri sélectif, compostage, réemploi</li>
    <li><strong>Réduction CO₂</strong> : {{reductionWaste}} tCO₂e/an</li>
  </ul>
</div>',
11, 1, true);

-- PAGE 12: Conclusion et méthodologie
INSERT INTO report_templates (section_key, title, content_template, page_number, order_in_page) VALUES
('conclusion', 'Conclusion et prochaines étapes', 
'<p>Ce Bilan Carbone® constitue une première étape essentielle dans la démarche de décarbonation de <strong>{{companyName}}</strong>. Les résultats obtenus permettent d''identifier les leviers d''actions prioritaires et de définir une trajectoire de réduction cohérente avec les objectifs de l''Accord de Paris.</p>

<h3>Synthèse des résultats</h3>
<ul>
  <li><strong>Émissions totales</strong> : {{totalEmissions}} tCO₂e</li>
  <li><strong>Intensité carbone</strong> : {{intensityPerEmployee}} tCO₂e/employé</li>
  <li><strong>Postes prioritaires</strong> : {{topPosts}}</li>
</ul>

<h3>Prochaines étapes</h3>
<ol>
  <li><strong>Validation</strong> : Présentation des résultats à la direction</li>
  <li><strong>Planification</strong> : Élaboration d''un plan d''actions détaillé avec budget et échéancier</li>
  <li><strong>Mise en œuvre</strong> : Déploiement des actions prioritaires</li>
  <li><strong>Suivi</strong> : Mise en place d''indicateurs de performance et tableau de bord</li>
  <li><strong>Communication</strong> : Sensibilisation des collaborateurs et parties prenantes</li>
  <li><strong>Actualisation</strong> : Réalisation d''un nouveau bilan dans 12 mois</li>
</ol>

<h3>Accompagnement</h3>
<p>CarboScan reste à votre disposition pour vous accompagner dans la mise en œuvre de votre stratégie de décarbonation : formation des équipes, simulation de scénarios, suivi des indicateurs, reporting extra-financier.</p>',
12, 1);

INSERT INTO report_templates (section_key, title, content_template, page_number, order_in_page) VALUES
('methodologie_references', 'Méthodologie et références', 
'<h3>Facteurs d''émission</h3>
<p>Les facteurs d''émission utilisés proviennent de la <strong>Base Carbone® de l''ADEME</strong> (version 2024). Des facteurs personnalisés ont été appliqués pour certains postes spécifiques.</p>

<h3>Périmètre détaillé</h3>
<ul>
  <li><strong>Scope 1</strong> : Combustion de combustibles fossiles, flotte de véhicules, fuites de fluides frigorigènes</li>
  <li><strong>Scope 2</strong> : Électricité, réseaux de chaleur et de froid</li>
  {{#if hasScope3}}<li><strong>Scope 3</strong> : Achats de biens et services, déplacements professionnels, trajets domicile-travail, déchets</li>{{/if}}
</ul>

<h3>Normes et référentiels</h3>
<ul>
  <li>GHG Protocol – Corporate Accounting and Reporting Standard</li>
  <li>ISO 14064-1:2018 – Quantification et déclaration des émissions de GES</li>
  <li>Méthode Bilan Carbone® – Association Bilan Carbone (ABC)</li>
</ul>

<h3>Incertitudes</h3>
<p>Les incertitudes liées aux données et aux facteurs d''émission sont estimées à ±15% pour l''ensemble du bilan. Cette marge d''incertitude est conforme aux standards internationaux et n''affecte pas la validité des conclusions.</p>

<h3>Contact</h3>
<p>Pour toute question concernant ce rapport, contactez l''équipe CarboScan à <strong>contact@carboscan.fr</strong></p>',
12, 2);

-- Commentaire sur la table
COMMENT ON TABLE report_templates IS 'Stocke les templates de texte pour la génération automatique des rapports de bilan carbone, avec adaptation au contexte de chaque entreprise';
