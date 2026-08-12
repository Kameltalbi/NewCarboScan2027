/**
 * Templates pour le rapport 25 pages Bilan Carbone — Structure v2.
 * Contexte tunisien, sobre et professionnel, audit-proof.
 * Max 1 graphique par page, couleurs sobres (bleu foncé, gris, 1 accent).
 */

import { reportPageClose, reportPageOpen } from './reportPageChrome';

const P = 'font-size: 14px; line-height: 1.8; color: #334155; margin-bottom: 16px; text-align: justify;';
const H3 = 'font-size: 16px; font-weight: 600; color: #1e293b; margin: 24px 0 12px 0;';
const BOX = 'background: #f8fafc; border-left: 4px solid #64748b; padding: 16px 20px; margin: 16px 0; border-radius: 0 8px 8px 0; font-size: 13px; line-height: 1.7; color: #334155;';
const LI = 'font-size: 14px; line-height: 1.7; color: #334155; margin-bottom: 8px; padding-left: 16px;';

/* ═══════════════════════════════════════════════════════════════
   PAGE 4 — Contexte et enjeux climatiques
   ═══════════════════════════════════════════════════════════════ */
export function getClimateContextTemplate(): string {
  return `
    ${reportPageOpen("Contexte et enjeux climatiques")}
<p style="${P}">Les organisations sont confrontées à des enjeux climatiques majeurs liés aux émissions de gaz à effet de serre sur l'ensemble de leur chaîne de valeur. Les attentes des parties prenantes, notamment financières et institutionnelles, évoluent rapidement vers une meilleure transparence et une intégration accrue des enjeux climatiques dans la stratégie.</p>

      <p style="${P}">En Tunisie, la Contribution Déterminée au niveau National (CDN) engage le pays à réduire son intensité carbone de 45 % d'ici 2030 par rapport à 2010. Les entreprises du secteur privé sont de plus en plus sollicitées pour contribuer à cet effort national, que ce soit par la maîtrise de leurs consommations énergétiques, l'optimisation de leurs flux logistiques ou l'intégration de critères environnementaux dans leurs décisions d'investissement.</p>

      <h3 style="${H3}">Pressions réglementaires et financières</h3>

      <p style="${P}">Les institutions financières intègrent progressivement les critères ESG (Environnement, Social, Gouvernance) dans leurs décisions de financement. Les entreprises disposant d'un bilan carbone structuré bénéficient d'un avantage dans l'accès aux financements verts et aux lignes de crédit à conditions préférentielles proposées par les bailleurs de fonds internationaux (BEI, BERD, AFD, KfW).</p>

      <div style="${BOX}">
        <strong>Pourquoi un bilan carbone ?</strong> La réalisation d'un bilan carbone constitue un outil d'aide à la décision et un prérequis pour toute démarche de réduction structurée. Il permet de quantifier, hiérarchiser et piloter les émissions de gaz à effet de serre dans le temps.
      </div>
    ${reportPageClose()}
  `;
}

/* ═══════════════════════════════════════════════════════════════
   PAGE 5 — Objectifs de la démarche
   ═══════════════════════════════════════════════════════════════ */
export function getObjectivesTemplate(): string {
  return `
    ${reportPageOpen("Objectifs de la démarche")}
<p style="${P}">La réalisation du bilan carbone de <strong>{{companyName}}</strong> pour l'année <strong>{{year}}</strong> poursuit plusieurs objectifs complémentaires, articulés autour de trois dimensions : interne, externe et stratégique.</p>

      <h3 style="${H3}">Objectifs internes</h3>

      <p style="${LI}">• Quantifier les émissions de gaz à effet de serre associées à l'ensemble des activités de l'entreprise.</p>
      <p style="${LI}">• Identifier les postes les plus émetteurs et les leviers de réduction prioritaires.</p>
      <p style="${LI}">• Structurer une base de référence fiable pour le suivi des émissions dans le temps.</p>

      <h3 style="${H3}">Objectifs externes</h3>

      <p style="${LI}">• Répondre aux attentes croissantes des parties prenantes en matière de transparence climatique.</p>
      <p style="${LI}">• Fournir des éléments d'analyse utiles à la prise de décision stratégique.</p>
      <p style="${LI}">• Préparer l'organisation aux évolutions réglementaires en matière de reporting extra-financier.</p>

      <h3 style="${H3}">Vision long terme</h3>

      <p style="${P}">À terme, cette démarche vise à inscrire <strong>{{companyName}}</strong> dans une trajectoire de réduction progressive de ses émissions, compatible avec les engagements climatiques nationaux et internationaux. Le présent bilan constitue la première étape de ce processus.</p>
    ${reportPageClose()}
  `;
}

/* ═══════════════════════════════════════════════════════════════
   PAGE 7 — Périmètre organisationnel
   ═══════════════════════════════════════════════════════════════ */
export function getOrgPerimeterTemplate(): string {
  return `
    ${reportPageOpen("Périmètre organisationnel")}
<p style="${P}">Le périmètre organisationnel inclut l'ensemble des activités contrôlées opérationnellement par <strong>{{companyName}}</strong> sur l'année <strong>{{year}}</strong>. La méthode de consolidation retenue est le <strong>{{consolidationMethod}}</strong>, conformément aux recommandations du GHG Protocol.</p>

      <h3 style="${H3}">Sites inclus</h3>

      <p style="${P}">Le périmètre couvre <strong>{{sites}} site(s)</strong> opérationnels situés en <strong>{{country}}</strong>, représentant une surface totale de <strong>{{surface}} m²</strong> et un effectif de <strong>{{employees}} collaborateurs</strong>. L'ensemble des fonctions opérationnelles et supports exercées sur ces sites a été pris en compte.</p>

      {{#each sitesInScope}}
      <p style="${LI}">• <strong>{{name}}</strong> — {{city}}, {{country}}</p>
      {{/each}}

      <h3 style="${H3}">Frontière organisationnelle</h3>

      <p style="${P}">Les activités externalisées (sous-traitance, prestataires logistiques, services externalisés) ont été traitées conformément aux règles applicables aux émissions indirectes du Scope 3. Les entités juridiquement distinctes non contrôlées opérationnellement par <strong>{{companyName}}</strong> sont exclues du périmètre.</p>

      <div style="${BOX}">
        <strong>Note méthodologique :</strong> Les actifs loués auprès de prestataires tiers (véhicules, locaux, équipements) sont comptabilisés dans le Scope 3 (catégorie 8 — actifs loués amont) et non dans le Scope 1, conformément au GHG Protocol.
      </div>
    ${reportPageClose()}
  `;
}

/* ═══════════════════════════════════════════════════════════════
   PAGE 8 — Périmètre opérationnel & scopes
   ═══════════════════════════════════════════════════════════════ */
export function getOpPerimeterTemplate(): string {
  return `
    ${reportPageOpen("Périmètre opérationnel et scopes")}
<p style="${P}">Les émissions ont été classées selon les trois scopes définis par le GHG Protocol. Cette classification permet une lecture structurée et cohérente des résultats.</p>

      <h3 style="${H3}">Scope 1 — Émissions directes</h3>

      <p style="${P}">Le Scope 1 regroupe les émissions provenant de sources détenues ou contrôlées directement par l'organisation : combustion de carburants (véhicules détenus, le cas échéant), combustion stationnaire (chaudières, groupes électrogènes) et fuites de fluides frigorigènes des systèmes de climatisation.</p>

      <h3 style="${H3}">Scope 2 — Émissions indirectes liées à l'énergie</h3>

      <p style="${P}">Le Scope 2 couvre les émissions associées à la production de l'énergie achetée et consommée par l'organisation, principalement l'électricité. Le facteur d'émission dépend du mix énergétique du pays de production.</p>

      {{#if hasScope3}}
      <h3 style="${H3}">Scope 3 — Autres émissions indirectes</h3>

      <p style="${P}">Le Scope 3 englobe les émissions indirectes de la chaîne de valeur : achats de biens et services, transport de marchandises, déplacements professionnels, trajets domicile-travail et déchets, ainsi que, le cas échéant, l'utilisation et la fin de vie des produits vendus. Il représente généralement la part la plus importante du bilan carbone.</p>
      {{/if}}

      <div style="margin: 24px 0; display: flex; justify-content: center;">
        {{chartScopesDoughnut}}
      </div>
    ${reportPageClose()}
  `;
}

/* ═══════════════════════════════════════════════════════════════
   PAGE 9 — Collecte des données
   ═══════════════════════════════════════════════════════════════ */
export function getDataCollectionTemplate(): string {
  return `
    ${reportPageOpen("Collecte des données")}
<p style="${P}">La collecte des données s'est appuyée sur les services internes de <strong>{{companyName}}</strong> (finance, ressources humaines, logistique, HSE). Les données utilisées couvrent les consommations énergétiques, les flux de transport, les achats, les déchets et les déplacements.</p>

      <h3 style="${H3}">Sources de données</h3>

      <p style="${LI}">• <strong>Direction financière</strong> : factures d'énergie, montants d'achats, données de facturation fournisseurs.</p>
      <p style="${LI}">• <strong>Ressources humaines</strong> : effectifs par site, données de déplacements domicile-travail.</p>
      <p style="${LI}">• <strong>Logistique</strong> : flux de transport, tonnages, distances parcourues.</p>
      <p style="${LI}">• <strong>HSE</strong> : consommations de fluides frigorigènes, quantités de déchets collectés.</p>

      <h3 style="${H3}">Hiérarchie des données</h3>

      <p style="${P}">Les données ont été classées selon leur niveau de fiabilité : données réelles mesurées (niveau 1), données estimées à partir de données internes (niveau 2), données estimées à partir de ratios sectoriels (niveau 3). Une attention particulière a été portée à la traçabilité et à la cohérence des données collectées.</p>

      <div style="${BOX}">
        <strong>Outil utilisé :</strong> La collecte et le traitement des données ont été réalisés via la plateforme <strong>CarboScan</strong>, qui assure la traçabilité des données saisies, l'application automatique des facteurs d'émission et la génération des résultats par scope et par poste.
      </div>
    ${reportPageClose()}
  `;
}

/* ═══════════════════════════════════════════════════════════════
   PAGE 10 — Traitement des données & hypothèses
   ═══════════════════════════════════════════════════════════════ */
export function getDataHypothesesTemplate(): string {
  return `
    ${reportPageOpen("Traitement des données et hypothèses")}
<p style="${P}">Lorsque des données réelles étaient disponibles, elles ont été utilisées en priorité. En l'absence de données complètes, des estimations documentées ont été mises en œuvre sur la base d'hypothèses prudentes.</p>

      <h3 style="${H3}">Facteurs d'émission</h3>

      <p style="${P}">Les facteurs d'émission utilisés proviennent principalement de la <strong>Base Carbone® de l'ADEME</strong>, complétés par les facteurs spécifiques de l'organisation lorsque ceux-ci étaient disponibles et documentés. Pour l'électricité, le facteur d'émission retenu correspond au mix énergétique tunisien.</p>

      <h3 style="${H3}">Données manquantes</h3>

      <p style="${P}">Pour les postes où les données primaires n'étaient pas disponibles, des approches d'estimation ont été appliquées : ratios monétaires pour les achats, distances moyennes pour les déplacements, hypothèses sectorielles pour certains postes du Scope 3. Chaque estimation est documentée et identifiée dans les résultats.</p>

      <h3 style="${H3}">Approche prudente</h3>

      <p style="${P}">Conformément au principe de prudence, aucune émission évitée n'a été prise en compte en l'absence de données vérifiables. Les hypothèses retenues privilégient systématiquement les estimations conservatrices afin de ne pas sous-estimer l'empreinte carbone réelle de l'organisation.</p>
    ${reportPageClose()}
  `;
}

/* ═══════════════════════════════════════════════════════════════
   PAGE 11 — Méthode de répartition par site
   ═══════════════════════════════════════════════════════════════ */
export function getSiteAllocationTemplate(): string {
  return `
    ${reportPageOpen("Méthode de répartition par site")}
<p style="${P}">Les émissions des Scopes 1 et 2 ont été calculées directement par site, sur la base des consommations réelles de chaque implantation. Pour le Scope 3, une approche consolidée a été retenue au niveau de l'organisation, suivie d'une répartition par site.</p>

      <h3 style="${H3}">Pourquoi une approche consolidée pour le Scope 3 ?</h3>

      <p style="${P}">Les émissions du Scope 3 (achats, transport, déchets) sont généralement gérées de manière centralisée et ne peuvent pas être attribuées directement à un site spécifique. La consolidation au niveau de l'organisation, suivie d'une répartition par clé d'activité, constitue l'approche la plus robuste et la plus couramment utilisée dans les bilans carbone.</p>

      <h3 style="${H3}">Clé de répartition</h3>

      <p style="${P}">La répartition des émissions du Scope 3 entre les sites a été réalisée à l'aide d'une clé fondée sur des indicateurs d'activité représentatifs (chiffre d'affaires et effectifs). Une clé arrondie a été appliquée afin d'éviter toute fausse précision.</p>

      <div style="margin: 24px 0; display: flex; justify-content: center;">
        {{chartSiteComparison}}
      </div>

      {{#each siteBreakdowns}}
      <p style="font-size: 13px; line-height: 1.6; color: #334155; margin-bottom: 10px; padding-left: 16px; border-left: 3px solid #475569;">
        <strong>{{name}}</strong> : {{total}} tCO₂e — Scope 1 : {{scope1}} tCO₂e ({{scope1Pct}} %), Scope 2 : {{scope2}} tCO₂e ({{scope2Pct}} %), Scope 3 : {{scope3}} tCO₂e ({{scope3Pct}} %).
      </p>
      {{/each}}
    ${reportPageClose()}
  `;
}

/* ═══════════════════════════════════════════════════════════════
   PAGE 15 — Résultats Scope 3 (vue globale)
   ═══════════════════════════════════════════════════════════════ */
export function getScope3OverviewTemplate(): string {
  return `
    ${reportPageOpen("Résultats Scope 3 — Vue d'ensemble")}
<p style="${P}">Le Scope 3 regroupe l'ensemble des autres émissions indirectes significatives de <strong>{{companyName}}</strong>. Il s'élève à <strong>{{scope3}} tCO₂e</strong> pour l'année {{year}}, représentant <strong>{{scope3Percent}} %</strong> du bilan total. Il inclut notamment les achats de biens et services, les transports amont, les déchets et les déplacements.</p>

      <h3 style="${H3}">Répartition par catégorie</h3>

      <p style="${P}">L'analyse met en évidence une concentration des émissions sur un nombre limité de catégories. La catégorie <strong>{{scope3TopCategory1}}</strong> constitue le premier poste, suivie de <strong>{{scope3TopCategory2}}</strong> et de <strong>{{scope3TopCategory3}}</strong>.</p>

      <div style="margin: 24px 0;">
        {{chartScope3Bars}}
      </div>

      <p style="${P}">Les sections suivantes détaillent chaque catégorie significative du Scope 3 et les hypothèses de calcul associées.</p>
    ${reportPageClose()}
  `;
}

/* ═══════════════════════════════════════════════════════════════
   PAGE 16 — Focus : Achats & biens
   ═══════════════════════════════════════════════════════════════ */
export function getFocusAchatsTemplate(): string {
  return `
    ${reportPageOpen("Focus : Achats et biens")}
<p style="${P}">Les achats de biens et services constituent un poste important du Scope 3 de <strong>{{companyName}}</strong>, avec <strong>{{scope3PurchasesEmissions}} tCO₂e</strong> soit <strong>{{scope3PurchasesPercent}} %</strong> des émissions indirectes. Ce poste couvre l'ensemble des matières premières, pièces détachées, consommables, prestations de services et biens acquis par l'organisation au cours de l'année {{year}}.</p>

      <h3 style="${H3}">Méthode de calcul</h3>

      <p style="${P}">Les émissions associées ont été estimées à partir des données financières (montants d'achats par catégorie) et de facteurs d'émission monétaires issus de la Base Carbone® de l'ADEME. Lorsque des données physiques étaient disponibles (quantités, poids), elles ont été utilisées en priorité pour améliorer la précision du calcul.</p>

      <h3 style="${H3}">Leviers de réduction</h3>

      <p style="${P}">La réduction de ce poste repose sur l'intégration de critères environnementaux dans la politique d'achats, l'engagement des fournisseurs dans une démarche de décarbonation, et la sobriété dans les volumes d'achats (allongement de la durée de vie des équipements, réemploi, reconditionnement).</p>
    ${reportPageClose()}
  `;
}

/* ═══════════════════════════════════════════════════════════════
   PAGE 17 — Focus : Transport et logistique amont
   ═══════════════════════════════════════════════════════════════ */
export function getFocusTransportTemplate(): string {
  return `
    ${reportPageOpen("Focus : Transport et logistique amont")}
<p style="${P}">Les émissions liées au transport et à la logistique amont de <strong>{{companyName}}</strong> représentent <strong>{{scope3TransportEmissions}} tCO₂e</strong>, soit <strong>{{scope3TransportPercent}} %</strong> des émissions indirectes.</p>

      <h3 style="${H3}">Méthode de calcul</h3>

      <p style="${P}">Les émissions ont été calculées en tonnes-kilomètres (t.km), en croisant les masses transportées, les distances parcourues et les facteurs d'émission ADEME propres à chaque mode de transport effectivement utilisé (routier, maritime, aérien ou ferroviaire).</p>

      <h3 style="${H3}">Facteurs d'émission utilisés</h3>

      <div style="${BOX}">
        <strong>Facteurs de fret :</strong> Les facteurs retenus proviennent de la Base Carbone® ADEME, exprimés en kgCO₂e par tonne-kilomètre pour chaque mode de transport concerné. Ils intègrent les émissions directes de combustion des carburants ainsi que les émissions amont liées à leur production et à leur acheminement.
      </div>

      <p style="${P}">L'optimisation de ce poste passe par la consolidation des flux logistiques, la réduction des distances parcourues, le report modal vers des modes moins émetteurs et le suivi des performances environnementales des transporteurs.</p>
    ${reportPageClose()}
  `;
}

/* ═══════════════════════════════════════════════════════════════
   PAGE 18 — Focus : Déplacements & mobilité
   ═══════════════════════════════════════════════════════════════ */
export function getFocusMobiliteTemplate(): string {
  return `
    ${reportPageOpen("Focus : Déplacements et mobilité")}
<p style="${P}">Ce poste regroupe les déplacements domicile-travail des <strong>{{employees}} collaborateurs</strong> et les déplacements professionnels de <strong>{{companyName}}</strong>. Les émissions associées ont été estimées à partir de données RH et d'hypothèses moyennes documentées.</p>

      <h3 style="${H3}">Trajets domicile-travail</h3>

      <p style="${P}">Les émissions liées aux trajets quotidiens des collaborateurs dépendent du mode de transport utilisé, de la distance moyenne domicile-travail et du nombre de jours travaillés. En l'absence d'enquête détaillée, des hypothèses moyennes ont été retenues sur la base des pratiques observées dans le secteur.</p>

      <h3 style="${H3}">Déplacements professionnels</h3>

      <p style="${P}">Les déplacements professionnels incluent les missions réalisées en voiture, en avion ou en train. Les émissions ont été calculées sur la base des distances parcourues et des facteurs d'émission correspondants.</p>

      <h3 style="${H3}">Leviers de réduction</h3>

      <p style="${P}">La réduction de ce poste repose sur le développement du covoiturage, la promotion des transports en commun, l'aménagement des horaires de travail et le recours à la visioconférence pour les réunions ne nécessitant pas de présence physique.</p>
    ${reportPageClose()}
  `;
}

/* ═══════════════════════════════════════════════════════════════
   PAGE 19 — Focus : Déchets
   ═══════════════════════════════════════════════════════════════ */
export function getFocusDechetsTemplate(): string {
  return `
    ${reportPageOpen("Focus : Déchets")}
<p style="${P}">Les émissions liées aux déchets de <strong>{{companyName}}</strong> incluent plusieurs catégories de déchets générés par l'activité de l'organisation. Les calculs ont été réalisés sur la base des quantités collectées et de facteurs d'émission adaptés à chaque type de déchet.</p>

      <h3 style="${H3}">Types de déchets pris en compte</h3>

      <p style="${LI}">• <strong>Déchets recyclables</strong> : papier, carton, plastique et métaux orientés vers des filières de valorisation matière.</p>
      <p style="${LI}">• <strong>Déchets organiques</strong> : biodéchets issus de la restauration et des espaces verts.</p>
      <p style="${LI}">• <strong>Déchets spécifiques</strong> : DEEE, cartouches, piles et autres déchets dangereux collectés par des prestataires agréés.</p>
      <p style="${LI}">• <strong>Déchets non triés</strong> : déchets résiduels non valorisés, orientés vers l'enfouissement.</p>

      <h3 style="${H3}">Leviers de réduction</h3>

      <p style="${P}">La réduction des émissions liées aux déchets repose sur le tri à la source, la valorisation matière (recyclage, réemploi), la réduction des volumes à la source et le choix de filières de traitement à moindre impact carbone. La mise en place d'un suivi quantitatif par type de déchet constitue un prérequis pour piloter efficacement ce poste.</p>
    ${reportPageClose()}
  `;
}

/* ═══════════════════════════════════════════════════════════════
   PAGE 20 — Focus : Fin de vie des produits vendus (Cat. 12)
   Page affichée uniquement si des émissions de fin de vie existent.
   ═══════════════════════════════════════════════════════════════ */
export function getFocusFinDeVieTemplate(): string {
  return `
    ${reportPageOpen("Focus : Fin de vie des produits vendus")}
<p style="${P}">La fin de vie des produits vendus par <strong>{{companyName}}</strong> a été intégrée au Scope 3 (catégorie 12) conformément aux exigences du GHG Protocol. Ce poste représente <strong>{{scope3FinDeVieEmissions}} tCO₂e</strong>.</p>

      <h3 style="${H3}">Méthode de calcul</h3>

      <p style="${P}">Les émissions ont été estimées à partir des quantités de produits vendus au cours de l'année {{year}} et de facteurs d'émission génériques de traitement en fin de vie (démantèlement, tri, recyclage, incinération ou mise en décharge selon la filière).</p>

      <h3 style="${H3}">Approche prudente</h3>

      <div style="${BOX}">
        <strong>Absence de crédits recyclage :</strong> Conformément à une approche prudente et en l'absence de données vérifiables sur les taux de recyclage effectifs, aucun crédit lié au recyclage des matériaux n'a été déduit des émissions de fin de vie. Cette approche est conforme aux recommandations du GHG Protocol pour les cas où les données de recyclage ne sont pas traçables.
      </div>

      <p style="${P}">L'amélioration de ce poste passe par la collecte de données plus précises sur les filières de traitement en fin de vie et par l'écoconception des produits mis sur le marché.</p>
    ${reportPageClose()}
  `;
}


/* ═══════════════════════════════════════════════════════════════
   PAGE 22 — Indicateurs de performance carbone
   ═══════════════════════════════════════════════════════════════ */
export function getKpiPerformanceTemplate(): string {
  return `
    ${reportPageOpen("Indicateurs de performance carbone")}
<p style="${P}">Des indicateurs d'intensité carbone ont été calculés afin de mettre en perspective les émissions de <strong>{{companyName}}</strong> et de permettre un suivi dans le temps, indépendamment des variations de périmètre ou de volume d'activité.</p>

      <h3 style="${H3}">Intensité carbone par collaborateur</h3>

      <p style="${P}">L'intensité carbone par collaborateur s'établit à <strong>{{intensityPerEmployee}} tCO₂e par personne</strong>, rapportée à un effectif de <strong>{{employees}} collaborateurs</strong>. Cet indicateur permet de comparer la performance de l'organisation dans le temps et avec les moyennes sectorielles.</p>

      <h3 style="${H3}">Intensité carbone par surface</h3>

      <p style="${P}">Rapportée à la surface des locaux, l'intensité carbone s'établit à <strong>{{intensityPerM2}} kgCO₂e/m²</strong> pour une surface totale de <strong>{{surface}} m²</strong>. Cet indicateur reflète l'efficacité énergétique des bâtiments et la performance des équipements installés.</p>

      {{#if hasRevenue}}
      <h3 style="${H3}">Intensité carbone par chiffre d'affaires</h3>

      <p style="${P}">L'intensité carbone rapportée au chiffre d'affaires s'établit à <strong>{{intensityPerRevenue}} kgCO₂e/k€</strong>. Cet indicateur permet d'évaluer le découplage entre croissance économique et empreinte carbone.</p>
      {{/if}}

      <div style="${BOX}">
        <strong>Suivi dans le temps :</strong> Ces indicateurs constituent la base de référence pour le suivi annuel de la performance carbone de l'organisation. Leur évolution permettra de mesurer l'efficacité des actions de réduction mises en œuvre.
      </div>
    ${reportPageClose()}
  `;
}

/* ═══════════════════════════════════════════════════════════════
   PAGE 23 — Analyse économique prospective
   ═══════════════════════════════════════════════════════════════ */
export function getEconomicAnalysisTemplate(): string {
  return `
    ${reportPageOpen("Analyse économique prospective")}
<p style="${P}">L'analyse économique met en relation les postes d'émissions de <strong>{{companyName}}</strong> avec les postes de coûts associés, permettant d'identifier des leviers de réduction compatibles avec les contraintes économiques de l'entreprise.</p>

      <h3 style="${H3}">Sensibilité aux postes dominants</h3>

      <p style="${P}">Les postes les plus émetteurs — <strong>{{topPoste1}}</strong>, <strong>{{topPoste2}}</strong> et <strong>{{topPoste3}}</strong> — représentent ensemble <strong>{{top3PostesPercent}} %</strong> des émissions totales. La concentration des émissions sur un nombre limité de postes constitue à la fois un risque (forte exposition) et une opportunité (effet de levier important en cas d'action ciblée).</p>

      <h3 style="${H3}">Lecture financière</h3>

      <p style="${P}">La réduction des émissions liées à la consommation d'énergie (Scopes 1 et 2) génère des économies directes sur la facture énergétique. Pour le Scope 3, les gains sont principalement indirects : optimisation des flux logistiques, réduction des volumes d'achats, allongement de la durée de vie des équipements.</p>

      <p style="${P}">À l'échelle internationale, la tendance à la tarification du carbone se renforce. Bien que la Tunisie ne dispose pas encore d'un marché carbone réglementé, les entreprises exportatrices ou travaillant avec des partenaires internationaux sont de plus en plus exposées aux mécanismes de tarification carbone de leurs marchés de destination.</p>

      <div style="${BOX}">
        <strong>Recommandation :</strong> Intégrer le coût carbone comme paramètre dans les décisions d'investissement permet d'anticiper les évolutions réglementaires et de sécuriser la compétitivité à moyen terme.
      </div>
    ${reportPageClose()}
  `;
}

/* ═══════════════════════════════════════════════════════════════
   PAGE 25 — Conclusion & étapes suivantes
   ═══════════════════════════════════════════════════════════════ */
export function getConclusionV2Template(): string {
  return `
    ${reportPageOpen("Conclusion et étapes suivantes")}
<p style="${P}">Ce bilan carbone constitue une première base de référence pour <strong>{{companyName}}</strong>. Il met en évidence les principaux enjeux liés aux émissions de gaz à effet de serre de l'organisation et ouvre la voie à une démarche de pilotage carbone structurée.</p>

      <h3 style="${H3}">Synthèse des résultats</h3>

      <p style="${P}">Les émissions totales s'élèvent à <strong>{{totalEmissions}} tCO₂e</strong> pour l'année {{year}}. Le Scope {{scopeDominant}} représente la part la plus importante du bilan (<strong>{{scopeDominantPercent}} %</strong>). Les postes les plus émetteurs ont été identifiés et des leviers de réduction ont été proposés.</p>

      <h3 style="${H3}">Limites de l'étude</h3>

      <p style="${P}">Certaines catégories d'émissions n'ont pas pu être intégrées en raison de l'absence de données fiables à ce stade. La qualité des résultats est directement liée à la qualité des données d'entrée. L'amélioration progressive de la collecte de données permettra d'affiner les résultats lors des prochains exercices.</p>

      <h3 style="${H3}">Prochaines étapes</h3>

      <p style="${LI}">• Mettre en œuvre les actions prioritaires identifiées dans le plan d'actions.</p>
      <p style="${LI}">• Améliorer la collecte de données pour les postes estimés.</p>
      <p style="${LI}">• Réaliser un suivi annuel des indicateurs de performance carbone.</p>
      <p style="${LI}">• Engager les parties prenantes clés (fournisseurs, collaborateurs) dans la démarche.</p>

      <div style="${BOX}">
        <strong>CarboScan</strong> accompagne <strong>{{companyName}}</strong> dans le suivi et l'amélioration continue de sa performance carbone. La plateforme permet de centraliser les données, d'automatiser les calculs et de générer des rapports de suivi réguliers.
      </div>
    ${reportPageClose()}
  `;
}