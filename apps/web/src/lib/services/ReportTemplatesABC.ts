/**
 * Sections additionnelles imposées par le Guide méthodologique Bilan Carbone® v8
 * de l'Association Bilan Carbone (ABC), §5.1.1 « Contenu type du rapport Bilan Carbone® ».
 *
 * Correspondances (lettres du guide) :
 *  b. Présentation du pilote de la démarche
 *  c. Cartographie des flux
 *  d/i/j. Périmètre temporel, exercice de référence et justification des modifications
 *  k. Documentation des facteurs d'émission et des PRG
 *  l. Incertitudes associées au profil GES
 *  n. Risques et opportunités de transition
 *  p/s. Indicateurs de suivi des actions et des données d'activité
 *  r. Vision de transition bas carbone
 *  t. Avis de vérification par une tierce partie
 *  §5.1.3 Rapport d'amélioration de la démarche
 */

import { reportPageClose, reportPageOpen } from './reportPageChrome';

const P = 'font-size: 14px; line-height: 1.8; color: #334155; margin-bottom: 16px; text-align: justify;';
const H3 = 'font-size: 16px; font-weight: 600; color: #1e293b; margin: 24px 0 12px 0;';
const BOX = 'background: #f8fafc; border-left: 4px solid #64748b; padding: 16px 20px; margin: 16px 0; border-radius: 0 8px 8px 0; font-size: 13px; line-height: 1.7; color: #334155;';
const LI = 'font-size: 14px; line-height: 1.7; color: #334155; margin-bottom: 8px; padding-left: 16px;';
const TH = 'padding: 10px 12px; background: #f1f5f9; font-size: 12px; font-weight: 600; color: #1e293b; text-align: left; border-bottom: 1px solid #e2e8f0;';
const TD = 'padding: 10px 12px; font-size: 13px; color: #334155; border-bottom: 1px solid #f1f5f9;';


/* b — Gouvernance et pilote de la démarche */
export function getGovernanceTemplate(): string {
  return `
    ${reportPageOpen("Gouvernance et pilote de la démarche")}
<p style="${P}">Conformément au Guide méthodologique Bilan Carbone® v8 de l'Association Bilan Carbone (§1.1), la démarche est portée par un <strong>pilote</strong> identifié au sein de <strong>{{companyFullName}}</strong>, responsable de la coordination des parties prenantes internes, de la collecte des données d'activité et de la rédaction du présent rapport.</p>

      <p style="${P}">Le pilote désigné pour cette démarche est <strong>{{pilotName}}</strong>.</p>

      <h3 style="${H3}">Rôles et responsabilités</h3>
      <table style="width: 100%; border-collapse: collapse; margin: 12px 0 20px 0;">
        <tr><th style="${TH}">Rôle</th><th style="${TH}">Responsabilité principale</th></tr>
        <tr><td style="${TD}">Direction générale</td><td style="${TD}">Validation du périmètre, arbitrage et engagement sur le plan d'actions</td></tr>
        <tr><td style="${TD}">Pilote Bilan Carbone®</td><td style="${TD}">Coordination de la démarche, collecte, calculs, rédaction du rapport ({{pilotName}})</td></tr>
        <tr><td style="${TD}">Référents métiers</td><td style="${TD}">Fourniture et fiabilisation des données d'activité de leur périmètre</td></tr>
        <tr><td style="${TD}">Prestataire méthodologique</td><td style="${TD}">Cadrage méthodologique, contrôle qualité et revue critique des résultats</td></tr>
      </table>

      <h3 style="${H3}">Sensibilisation</h3>
      <p style="${P}">La démarche a été accompagnée d'actions de sensibilisation auprès des référents et de la direction, condition d'appropriation des résultats et de mise en œuvre effective du plan d'actions (§1.3 du guide ABC).</p>

      <div style="${BOX}">
        <strong>Principes Bilan Carbone®</strong> — pertinence, exhaustivité, cohérence, transparence et exactitude. Le présent rapport a été construit pour respecter ces cinq principes.
      </div>
    ${reportPageClose()}
  `;
}

/* c — Cartographie des flux */
export function getFlowMappingTemplate(): string {
  return `
    ${reportPageOpen("Cartographie des flux")}
<p style="${P}">La cartographie des flux (§2.1 du guide ABC v8) recense l'ensemble des flux d'énergie, de matière, de personnes et de services entrant et sortant du périmètre de <strong>{{companyName}}</strong>. Elle constitue le socle de la définition du périmètre opérationnel et garantit l'exhaustivité de la collecte.</p>

      <table style="width: 100%; border-collapse: collapse; margin: 12px 0 20px 0;">
        <tr><th style="${TH}">Nature du flux</th><th style="${TH}">Amont</th><th style="${TH}">Interne</th><th style="${TH}">Aval</th></tr>
        <tr><td style="${TD}">Énergie</td><td style="${TD}">Production et distribution des combustibles et de l'électricité</td><td style="${TD}">Consommations des sites et des équipements</td><td style="${TD}">—</td></tr>
        <tr><td style="${TD}">Matière et services</td><td style="${TD}">Achats de biens et de services, immobilisations</td><td style="${TD}">Utilisation et stockage</td><td style="${TD}">Déchets, fin de vie le cas échéant</td></tr>
        <tr><td style="${TD}">Personnes</td><td style="${TD}">Déplacements domicile-travail</td><td style="${TD}">Déplacements professionnels</td><td style="${TD}">Visiteurs et participants</td></tr>
        <tr><td style="${TD}">Transport</td><td style="${TD}">Fret amont</td><td style="${TD}">Logistique interne</td><td style="${TD}">Fret aval le cas échéant</td></tr>
      </table>

      <p style="${P}">Les flux identifiés ci-dessus sont systématiquement rattachés à un poste d'émission des Scopes 1, 2 ou 3. Les flux jugés non applicables au regard de l'activité de l'organisation sont explicitement écartés et justifiés dans la section relative au périmètre opérationnel.</p>
    ${reportPageClose()}
  `;
}

/* d, i, j — Périmètre temporel, exercice de référence */
export function getTemporalScopeTemplate(): string {
  return `
    ${reportPageOpen("Périmètre temporel et exercice de référence")}
<p style="${P}">Le périmètre temporel retenu est l'année civile <strong>{{year}}</strong>. L'ensemble des données d'activité collectées couvre cette période, du 1<sup>er</sup> janvier au 31 décembre, en cohérence avec l'exercice comptable de l'organisation (§2.4 du guide ABC v8).</p>

      <h3 style="${H3}">Exercice de référence</h3>
      <p style="${P}">L'exercice de référence est l'année à laquelle sont comparés les bilans ultérieurs afin de mesurer la performance de la démarche de réduction. Le profil GES de cet exercice, présenté dans les résultats du présent rapport, sert de base au suivi pluriannuel et à la définition des objectifs de réduction.</p>

      <h3 style="${H3}">Recalcul et modification de la référence</h3>
      <p style="${LI}">• Modification significative du périmètre organisationnel (acquisition, cession, fusion).</p>
      <p style="${LI}">• Changement de méthode de quantification ou de facteurs d'émission structurants.</p>
      <p style="${LI}">• Correction d'erreurs matérielles identifiées a posteriori.</p>
      <p style="${P}">Toute modification de l'exercice de référence fait l'objet d'une justification documentée et d'un recalcul rétroactif, afin de préserver la comparabilité des exercices successifs.</p>

      <div style="${BOX}">
        <strong>Fréquence</strong> — le renouvellement du Bilan Carbone® est recommandé sur une base annuelle, avec une actualisation complète a minima tous les trois ans.
      </div>
    ${reportPageClose()}
  `;
}

/* k — Facteurs d'émission et PRG */
export function getEmissionFactorsTemplate(): string {
  return `
    ${reportPageOpen("Facteurs d'émission et pouvoirs de réchauffement global")}
<p style="${P}">Les émissions sont quantifiées selon l'équation de base du Bilan Carbone® : <strong>Émissions (kgCO₂e) = Donnée d'activité × Facteur d'émission</strong>. Chaque facteur d'émission mobilisé est documenté, tracé et rattaché à sa source (§3.1 et annexe 2.3 du guide ABC v8).</p>

      <h3 style="${H3}">Sources des facteurs d'émission</h3>
      <table style="width: 100%; border-collapse: collapse; margin: 12px 0 20px 0;">
        <tr><th style="${TH}">Source</th><th style="${TH}">Usage</th><th style="${TH}">Priorité</th></tr>
        <tr><td style="${TD}">Facteurs propres à l'organisation</td><td style="${TD}">Données mesurées ou fournisseurs</td><td style="${TD}">1 — prioritaire</td></tr>
        <tr><td style="${TD}">Base Empreinte® (ADEME)</td><td style="${TD}">Énergie, transport, matériaux, déchets</td><td style="${TD}">2</td></tr>
        <tr><td style="${TD}">Facteurs nationaux (mix électrique local)</td><td style="${TD}">Électricité et réseaux de chaleur</td><td style="${TD}">2</td></tr>
        <tr><td style="${TD}">Facteurs monétaires (ratios sectoriels)</td><td style="${TD}">Achats de biens et services à défaut de données physiques</td><td style="${TD}">3 — par défaut</td></tr>
      </table>

      <h3 style="${H3}">Pouvoirs de réchauffement global (PRG)</h3>
      <p style="${P}">Les émissions des différents gaz à effet de serre sont converties en équivalent CO₂ à l'aide des PRG à 100 ans publiés par le GIEC dans son cinquième rapport d'évaluation (AR5) : CO₂ = 1 ; CH₄ = 28 ; N₂O = 265 ; gaz fluorés selon les valeurs spécifiques de l'AR5.</p>

      <div style="${BOX}">
        <strong>Traçabilité</strong> — chaque ligne de données d'activité conserve dans la plateforme la quantité saisie, l'unité, le facteur d'émission appliqué, sa source et son millésime, permettant un audit ligne à ligne.
      </div>
    ${reportPageClose()}
  `;
}

/* l — Incertitudes */
export function getUncertaintyTemplate(): string {
  return `
    ${reportPageOpen("Incertitudes associées au profil GES")}
<p style="${P}">Conformément à l'annexe 1.2 du guide ABC v8, l'incertitude du bilan résulte de la combinaison de l'incertitude sur les données d'activité et de celle sur les facteurs d'émission. Elle est estimée poste par poste puis agrégée quadratiquement au niveau global.</p>

      <table style="width: 100%; border-collapse: collapse; margin: 12px 0 20px 0;">
        <tr><th style="${TH}">Type de donnée</th><th style="${TH}">Incertitude indicative</th><th style="${TH}">Commentaire</th></tr>
        <tr><td style="${TD}">Donnée mesurée (facture, compteur)</td><td style="${TD}">± 5 %</td><td style="${TD}">Fiabilité élevée, source documentaire</td></tr>
        <tr><td style="${TD}">Donnée reconstituée (ratio physique)</td><td style="${TD}">± 20 %</td><td style="${TD}">Extrapolation à partir de données partielles</td></tr>
        <tr><td style="${TD}">Donnée monétaire (ratio de dépense)</td><td style="${TD}">± 40 à 60 %</td><td style="${TD}">Approche par défaut, à fiabiliser en priorité</td></tr>
        <tr><td style="${TD}">Facteur d'émission générique</td><td style="${TD}">± 20 à 50 %</td><td style="${TD}">Selon le millésime et la représentativité géographique</td></tr>
      </table>

      <p style="${P}">L'incertitude ne remet pas en cause la hiérarchisation des postes : les écarts entre les principaux contributeurs sont largement supérieurs aux marges d'erreur. Elle oriente en revanche les priorités de fiabilisation pour les exercices suivants, notamment le remplacement progressif des approches monétaires par des données physiques.</p>
    ${reportPageClose()}
  `;
}

/* n — Risques et opportunités de transition */
export function getTransitionRisksTemplate(): string {
  return `
    ${reportPageOpen("Risques et opportunités de transition")}
<p style="${P}">L'analyse des risques et opportunités de transition (§3.6.3 du guide ABC v8, aligné TCFD) complète le profil GES en traduisant l'exposition carbone de <strong>{{companyName}}</strong> en enjeux économiques et stratégiques.</p>

      <table style="width: 100%; border-collapse: collapse; margin: 12px 0 20px 0;">
        <tr><th style="${TH}">Catégorie</th><th style="${TH}">Risque</th><th style="${TH}">Opportunité associée</th></tr>
        <tr><td style="${TD}">Réglementaire</td><td style="${TD}">Renforcement des obligations de reporting et tarification carbone</td><td style="${TD}">Anticipation, conformité et avantage concurrentiel</td></tr>
        <tr><td style="${TD}">Marché</td><td style="${TD}">Exigences carbone des clients et donneurs d'ordre</td><td style="${TD}">Différenciation commerciale, accès à de nouveaux marchés</td></tr>
        <tr><td style="${TD}">Prix de l'énergie</td><td style="${TD}">Volatilité et hausse structurelle des coûts énergétiques</td><td style="${TD}">Gains d'efficacité et réduction durable des charges</td></tr>
        <tr><td style="${TD}">Financier</td><td style="${TD}">Conditions d'accès au crédit conditionnées aux critères ESG</td><td style="${TD}">Éligibilité aux financements verts et lignes concessionnelles</td></tr>
        <tr><td style="${TD}">Réputationnel</td><td style="${TD}">Attentes des parties prenantes et risque de greenwashing</td><td style="${TD}">Crédibilité fondée sur une comptabilité carbone auditable</td></tr>
      </table>

      <p style="${P}">Ces éléments sont à réexaminer à chaque actualisation du bilan afin d'ajuster la stratégie climatique aux évolutions du contexte réglementaire et de marché.</p>
    ${reportPageClose()}
  `;
}

/* r — Vision de transition bas carbone */
export function getTransitionVisionTemplate(): string {
  return `
    ${reportPageOpen("Vision de transition bas carbone")}
<p style="${P}">Au-delà du plan d'actions à court terme, le guide ABC v8 (§4.3.2) recommande de construire une <strong>vision de transition bas carbone</strong> : une projection de ce que devient l'organisation dans un monde contraint en carbone, à horizon 2030 puis 2050.</p>

      <h3 style="${H3}">Horizons</h3>
      <p style="${LI}">• <strong>Court terme (1 à 2 ans)</strong> — fiabilisation des données, actions d'efficacité à retour rapide, sensibilisation interne.</p>
      <p style="${LI}">• <strong>Moyen terme (2030)</strong> — trajectoire de réduction alignée sur l'Accord de Paris et sur la contribution nationale, portant sur les postes significatifs.</p>
      <p style="${LI}">• <strong>Long terme (2050)</strong> — transformation du modèle d'activité, décarbonation de la chaîne de valeur et neutralité carbone à l'échelle territoriale.</p>

      <div style="${BOX}">
        <strong>Principe</strong> — la compensation carbone ne se substitue pas à la réduction. Elle n'est envisagée que pour les émissions résiduelles, après mise en œuvre effective des leviers de réduction (§3.4 du guide ABC v8).
      </div>

      <p style="${P}">Cette vision est un cadre d'arbitrage : elle permet d'évaluer en amont les décisions d'investissement au regard de leur compatibilité avec la trajectoire de décarbonation retenue.</p>
    ${reportPageClose()}
  `;
}

/* p, s — Indicateurs de suivi */
export function getMonitoringIndicatorsTemplate(): string {
  return `
    ${reportPageOpen("Indicateurs de suivi")}
<p style="${P}">Le suivi de la démarche repose sur deux familles d'indicateurs distinctes, conformément aux §4.2 et §4.3.3 du guide ABC v8 : les indicateurs de suivi des <strong>actions de réduction</strong> et ceux de suivi des <strong>données d'activité</strong>.</p>

      <h3 style="${H3}">Indicateurs de suivi des actions</h3>
      <table style="width: 100%; border-collapse: collapse; margin: 12px 0 20px 0;">
        <tr><th style="${TH}">Indicateur</th><th style="${TH}">Unité</th><th style="${TH}">Fréquence</th></tr>
        <tr><td style="${TD}">Avancement des actions engagées</td><td style="${TD}">% réalisé</td><td style="${TD}">Trimestrielle</td></tr>
        <tr><td style="${TD}">Émissions évitées par action</td><td style="${TD}">tCO₂e/an</td><td style="${TD}">Annuelle</td></tr>
        <tr><td style="${TD}">Coût de la tonne évitée</td><td style="${TD}">Devise/tCO₂e</td><td style="${TD}">Annuelle</td></tr>
      </table>

      <h3 style="${H3}">Indicateurs de suivi des données d'activité</h3>
      <table style="width: 100%; border-collapse: collapse; margin: 12px 0 20px 0;">
        <tr><th style="${TH}">Indicateur</th><th style="${TH}">Unité</th><th style="${TH}">Fréquence</th></tr>
        <tr><td style="${TD}">Consommations énergétiques</td><td style="${TD}">kWh, litres</td><td style="${TD}">Mensuelle</td></tr>
        <tr><td style="${TD}">Émissions totales</td><td style="${TD}">tCO₂e</td><td style="${TD}">Annuelle</td></tr>
        <tr><td style="${TD}">Intensité carbone</td><td style="${TD}">tCO₂e/collaborateur, tCO₂e/m²</td><td style="${TD}">Annuelle</td></tr>
        <tr><td style="${TD}">Part des données mesurées</td><td style="${TD}">% du total</td><td style="${TD}">Annuelle</td></tr>
      </table>

      <p style="${P}">Ces indicateurs sont collectés dans la plateforme et alimentent directement l'actualisation du bilan, sans ressaisie.</p>
    ${reportPageClose()}
  `;
}

/* t + §5.1.3 — Vérification et amélioration continue */
export function getVerificationTemplate(): string {
  return `
    ${reportPageOpen("Vérification et amélioration continue")}
<h3 style="${H3}">Avis de vérification par une tierce partie</h3>
      <p style="${P}">Le présent Bilan Carbone® <strong>n'a pas fait l'objet d'une vérification par une tierce partie indépendante</strong>, sauf mention contraire explicite communiquée par l'organisation. Les données, hypothèses et facteurs d'émission utilisés sont intégralement traçables dans la plateforme et peuvent être soumis à une vérification externe à la demande.</p>

      <h3 style="${H3}">Rapport d'amélioration de la démarche</h3>
      <p style="${P}">Conformément au §5.1.3 du guide ABC v8, la démarche fait l'objet d'une revue critique visant à en assurer la pérennité :</p>
      <p style="${LI}">• Évaluation du respect des cinq principes du Bilan Carbone®.</p>
      <p style="${LI}">• Évaluation de l'atteinte des objectifs fixés en début de démarche.</p>
      <p style="${LI}">• Identification des erreurs, oublis et postes insuffisamment documentés.</p>
      <p style="${LI}">• Prise en compte des retours issus de la sensibilisation interne.</p>
      <p style="${LI}">• Propositions d'amélioration pour l'exercice suivant.</p>

      <div style="${BOX}">
        <strong>Axes d'amélioration prioritaires</strong> — automatiser la collecte des données d'activité, substituer progressivement les facteurs monétaires par des données physiques, et enrichir la base de facteurs d'émission propres à l'organisation.
      </div>
    ${reportPageClose()}
  `;
}

/* Analyse de la qualité des données */
export function getDataQualityTemplate(): string {
  return `
    ${reportPageOpen("Analyse de la qualité des données")}
<p style="${P}">La robustesse d'un Bilan Carbone® dépend directement de la qualité des données d'activité mobilisées. Chaque donnée collectée pour <strong>{{companyName}}</strong> est qualifiée selon son origine, sa précision et sa traçabilité, conformément aux principes d'exactitude et de transparence du guide ABC v8.</p>

      <h3 style="${H3}">Grille de qualification des données</h3>
      <table style="width: 100%; border-collapse: collapse; margin: 12px 0 20px 0;">
        <tr><th style="${TH}">Niveau</th><th style="${TH}">Nature de la donnée</th><th style="${TH}">Fiabilité</th></tr>
        <tr><td style="${TD}">Donnée réelle</td><td style="${TD}">Relevés, factures, comptabilité, compteurs</td><td style="${TD}">Élevée</td></tr>
        <tr><td style="${TD}">Donnée estimée</td><td style="${TD}">Extrapolation à partir de données partielles</td><td style="${TD}">Moyenne</td></tr>
        <tr><td style="${TD}">Donnée par défaut</td><td style="${TD}">Ratio sectoriel ou valeur générique</td><td style="${TD}">Faible</td></tr>
      </table>

      <h3 style="${H3}">Critères d'évaluation retenus</h3>
      <p style="${LI}">• <strong>Représentativité temporelle</strong> : correspondance de la donnée avec l'exercice étudié.</p>
      <p style="${LI}">• <strong>Représentativité géographique</strong> : adéquation du facteur d'émission au pays d'activité.</p>
      <p style="${LI}">• <strong>Représentativité technologique</strong> : adéquation du facteur au procédé ou à l'équipement réel.</p>
      <p style="${LI}">• <strong>Complétude</strong> : couverture des flux identifiés dans la cartographie.</p>
      <p style="${LI}">• <strong>Traçabilité</strong> : possibilité de remonter à la source justificative de chaque donnée.</p>

      <div style="${BOX}">
        <strong>Priorité d'amélioration</strong> — les postes les plus contributeurs reposant encore sur des données estimées ou par défaut constituent la cible prioritaire de fiabilisation pour le prochain exercice.
      </div>
    ${reportPageClose()}
  `;
}

/* Comparaison avec l'exercice de référence */
export function getBaselineComparisonTemplate(): string {
  return `
    ${reportPageOpen("Comparaison avec l'exercice de référence")}
<p style="${P}">L'exercice de référence constitue le point de comparaison permettant de mesurer la trajectoire d'émissions de <strong>{{companyName}}</strong> dans le temps. Lorsque le présent bilan constitue le premier exercice, il est retenu comme <strong>année de référence</strong> et sert de base à tous les suivis ultérieurs.</p>

      <h3 style="${H3}">Principes de comparabilité</h3>
      <p style="${LI}">• Comparaison à périmètre organisationnel et opérationnel constants.</p>
      <p style="${LI}">• Recalcul (restatement) de l'année de référence en cas de changement structurel significatif : acquisition, cession, changement de méthode ou correction d'erreur.</p>
      <p style="${LI}">• Utilisation de facteurs d'émission cohérents entre exercices, tout changement de facteur étant documenté.</p>
      <p style="${LI}">• Analyse en valeur absolue (tCO₂e) et en intensité (tCO₂e/salarié, tCO₂e/m², tCO₂e/unité d'activité).</p>

      <h3 style="${H3}">Lecture de l'évolution</h3>
      <p style="${P}">Une variation des émissions doit être interprétée en distinguant les effets liés au niveau d'activité (effet volume), les effets liés aux actions de réduction mises en œuvre (effet performance) et les effets méthodologiques (changement de facteur ou de périmètre).</p>

      <div style="${BOX}">
        <strong>Règle appliquée</strong> — toute modification de l'année de référence est signalée, justifiée et documentée dans le rapport, conformément au §5.1.1 (points i et j) du guide ABC v8.
      </div>
    ${reportPageClose()}
  `;
}

/* Annexes */
export function getAnnexesTemplate(): string {
  return `
    ${reportPageOpen("Annexes")}
<p style="${P}">Les annexes rassemblent les éléments détaillés permettant la vérification, la reproductibilité et l'auditabilité du présent Bilan Carbone®. Elles sont disponibles dans la plateforme CarboScan et exportables à la demande.</p>

      <table style="width: 100%; border-collapse: collapse; margin: 12px 0 20px 0;">
        <tr><th style="${TH}">Annexe</th><th style="${TH}">Contenu</th></tr>
        <tr><td style="${TD}">A1 — Données d'activité</td><td style="${TD}">Détail ligne à ligne des données collectées (quantité, unité, source, période)</td></tr>
        <tr><td style="${TD}">A2 — Cartographie des flux</td><td style="${TD}">Représentation des flux entrants, internes et sortants du périmètre</td></tr>
        <tr><td style="${TD}">A3 — Tableaux de calcul</td><td style="${TD}">Détail des calculs quantité × facteur d'émission = émissions</td></tr>
        <tr><td style="${TD}">A4 — Facteurs d'émission</td><td style="${TD}">Liste des facteurs utilisés, source, millésime et unité</td></tr>
        <tr><td style="${TD}">A5 — Hypothèses et exclusions</td><td style="${TD}">Hypothèses de calcul, postes exclus et justification</td></tr>
        <tr><td style="${TD}">A6 — Calcul des incertitudes</td><td style="${TD}">Incertitudes par poste et incertitude globale du bilan</td></tr>
        <tr><td style="${TD}">A7 — Fiches actions</td><td style="${TD}">Fiche détaillée par action : objectif, responsable, budget, indicateurs, calendrier</td></tr>
        <tr><td style="${TD}">A8 — Références méthodologiques</td><td style="${TD}">Guide Bilan Carbone® v8 (ABC), GHG Protocol, ISO 14064-1, Base Empreinte ADEME</td></tr>
      </table>

      <div style="${BOX}">
        <strong>Traçabilité</strong> — chaque émission présentée dans ce rapport est reliée à sa donnée d'activité source et à son facteur d'émission dans la plateforme, garantissant une piste d'audit complète.
      </div>
    ${reportPageClose()}
  `;
}
