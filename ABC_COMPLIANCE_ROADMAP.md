# Feuille de route conformité ABC — CarboScan

Date d'analyse : 29 septembre 2026.
Cible : évaluation de conformité ABC envisagée vers mars 2027.
Périmètre de cette version : constat sur le code existant. Aucune fonctionnalité n'est implémentée par ce document.

Légende de l'état actuel :

| Valeur | Sens |
|---|---|
| EXISTANT | Présent et utilisable pour l'usage décrit |
| PARTIEL | Une base existe, l'exigence ABC n'est pas couverte |
| ABSENT | Rien d'exploitable pour l'exigence |
| À VÉRIFIER | Indice dans le code, comportement réel non confirmé de bout en bout |

Statuts de mise en œuvre : `TODO` · `ANALYSIS` · `IN PROGRESS` · `BLOCKED` · `DONE`.
Aucun chantier n'est `DONE`. Le passage en `DONE` exige une vérification de l'implémentation réelle, pas seulement la rédaction de ce fichier.

---

## WORKFLOW

1. Une seule tâche fonctionnelle importante est traitée à la fois.
2. Avant de coder, analyser l'implémentation existante.
3. Mettre le chantier concerné en `IN PROGRESS` dans ce fichier.
4. Ne modifier que les fichiers nécessaires.
5. Préserver les fonctionnalités existantes listées dans chaque chantier.
6. Ajouter ou mettre à jour les tests.
7. Tester les migrations éventuelles.
8. Vérifier les calculs.
9. Vérifier l'interface.
10. Mettre à jour `ABC_COMPLIANCE_ROADMAP.md`.
11. Ne passer le chantier en `DONE` que lorsque les critères d'acceptation sont vérifiés.
12. Documenter les décisions techniques prises dans la section du chantier (`Décisions`).
13. Si une exigence est ambiguë, la marquer `BLOCKED` ou `À VALIDER ABC` plutôt que d'inventer une règle méthodologique.

Décisions transverses déjà retenues pour la suite (non codées) :

- Ne pas reconstruire la collecte, le moteur `packages/carbon-engine`, le registre de facteurs, les sites, la trajectoire Net Zero, la feuille de route climatique, le module fournisseurs, ni l'académie.
- Ne pas soustraire automatiquement les émissions évitées ni la séquestration des émissions induites.
- Ne pas reclasser automatiquement Scope 1 / Scope 3 quand un arbitrage méthodologique est nécessaire.
- Ne pas considérer les ratios monétaires français / ADEME comme validés pour la Tunisie.
- Le module PCAF reste séparé de la comptabilité carbone corporate.

---

## Tableau de synthèse

| ID | Chantier | État actuel | Priorité | Statut | Dépendances |
|----|----------|-------------|----------|--------|-------------|
| ABC-01 | Exhaustivité Scope 1 | PARTIEL | P0 | IN PROGRESS | ABC-05, ABC-10 |
| ABC-02 | Périmètre organisationnel opéré / non opéré | PARTIEL | P0 | IN PROGRESS | ABC-11 |
| ABC-03 | Incertitude et qualité des données | PARTIEL | P0 | IN PROGRESS | ABC-04, ABC-16 |
| ABC-04 | Données physiques versus ratios monétaires | PARTIEL | P0 | IN PROGRESS | ABC-03, ABC-06 — `À VALIDER ABC` sur la méthode tunisienne |
| ABC-05 | Facteurs d'émission et traçabilité | PARTIEL | P0 | IN PROGRESS | ABC-06 |
| ABC-06 | Sources de facteurs d'émission | PARTIEL | P1 | IN PROGRESS | — |
| ABC-07 | Trajectoire de réduction | PARTIEL | P1 | IN PROGRESS | ABC-08, bilan clôturé (ABC-05) |
| ABC-08 | Plan d'action / plan de transition | PARTIEL | P1 | IN PROGRESS | ABC-07 |
| ABC-09 | Documentation méthodologique | PARTIEL | P1 | IN PROGRESS | ABC-06, ABC-20 |
| ABC-10 | Intégrité des calculs | PARTIEL | P0 | IN PROGRESS | ABC-05 |
| ABC-11 | Agrégation multi-sites et doubles comptes | PARTIEL | P1 | IN PROGRESS | ABC-02 |
| ABC-12 | Intensités carbone | PARTIEL | P2 | IN PROGRESS | ABC-11 |
| ABC-13 | Risques climatiques | PARTIEL | P2 | IN PROGRESS | ABC-08 |
| ABC-14 | Mobilisation des parties prenantes | PARTIEL | P1 | IN PROGRESS | ABC-16 |
| ABC-15 | Formation à l'utilisation de la plateforme | PARTIEL | P1 | IN PROGRESS | ABC-14, ABC-16 — `À VALIDER ABC` marque |
| ABC-16 | Documents et preuves | PARTIEL | P1 | TODO | — |
| ABC-17 | Export complet des données | PARTIEL | P0 | IN PROGRESS | ABC-04, ABC-05 |
| ABC-18 | Dossier d'évaluation | PARTIEL | P1 | IN PROGRESS | ABC-16, ABC-17, ABC-08, ABC-14 |
| ABC-19 | Gestion des bugs et support | PARTIEL | P2 | IN PROGRESS | — |
| ABC-20 | Communication carbone | PARTIEL | P1 | TODO | ABC-09 — `À VALIDER ABC` |
| ABC-21 | PCAF | PARTIEL | P1 | HORS PARCOURS | Hors Scope 1/2/3 — ne pas traiter dans ce cycle |

Comptage : **7 P0**, **11 P1**, **3 P2**.

Lecture de minimalisme du 29 septembre 2026, pour ABC-15 à ABC-21. Détail dans chaque section. **Bilan consolidé** : section « Bilan de campagne — résumé » ci-dessous.

| ID | Sujet | Mode | Dev nécessaire ? |
|----|--------|------|------------------|
| ABC-15 | Formation à l'utilisation de la plateforme | DOCUMENTATION | NON |
| ABC-16 | Documents et preuves | MIXTE | OUI, seulement pour le fichier, et seulement si ABC l'exige dans l'outil |
| ABC-17 | Export complet | FONCTIONNALITÉ | OUI, en étendant l'export déjà là |
| ABC-18 | Dossier d'évaluation | DOCUMENTATION | NON |
| ABC-19 | Bugs et support | DOCUMENTATION | NON |
| ABC-20 | Communication carbone | MIXTE | OUI, limité au libellé « Évitées » des scénarios |
| ABC-21 | PCAF | DOCUMENTATION | NON — hors parcours |

Comptage de cette lecture : **4 DOCUMENTATION**, **1 FONCTIONNALITÉ**, **2 MIXTE**.

---

## Bilan de campagne — résumé (29 septembre 2026)

Ce résumé consolide le travail fait sur CarboScan pour la conformité ABC, ce qui reste ouvert, et les questions à poser à ABC. Aucun chantier n'est `DONE` : le passage en `DONE` exige une vérification d'acceptation réelle. **ABC-21 (PCAF) est hors parcours** pour ce cycle.

### Principes retenus

- Ne pas inventer de règle méthodologique : `À VALIDER ABC` ou `BLOCKED`.
- Ne pas soustraire évitées, séquestration ou potentiels d'actions du total du bilan.
- Réutiliser l'existant ; documenter avant de créer un module.
- Ne pas déployer, committer ou pousser sauf demande explicite.

### Travail réalisé — par chantier

| ID | Livrable principal | Mode | Statut |
|----|-------------------|------|--------|
| ABC-01 | Fiche Scope 1 « procédé / autre émission directe » (donnée × facteur ou émission connue) ; quatre familles conservées | Fonctionnalité | IN PROGRESS |
| ABC-02 | Consolidation `operational_control` / `financial_control` ; sites `operated` / `not_operated` ; suggestion Scope 3 affichage seul | Mixte | IN PROGRESS |
| ABC-03 | Qualité `real` / `estimated` / `default` ; `source_type` et `uncertainty_pct` optionnels ; panneau incertitude (RSS limité) | Mixte | IN PROGRESS |
| ABC-04 | `data_method` sur la ligne ; part physique / monétaire ; ratios TND label « non validé ABC » (valeurs inchangées) | Fonctionnalité | IN PROGRESS — ratios TN `BLOCKED` |
| ABC-05 | Clôture : snapshot facteurs + ledger immuable ; bilans clos ne recalculent pas | Fonctionnalité | IN PROGRESS — vérif UI à finir |
| ABC-06 | Inventaire des bases (`GET /v1/factors/sources`) ; Agribalyse ABSENT ; PCAF exclu du bilan | Mixte | IN PROGRESS |
| ABC-07 | Trajectoire sur la feuille de route (référence linéaire / jalons) ; actions non soustraites | Fonctionnalité | IN PROGRESS |
| ABC-08 | Formulaire plan → `climate_actions` ; `estimation_method` ; potentiel hors total ; fake 75 % retiré | Fonctionnalité | IN PROGRESS |
| ABC-09 | Centre `/app/methode` (20 notes) ; liens depuis formulaires ; marque hors notes | Documentation | IN PROGRESS |
| ABC-10 | Cas de référence 003–009 figés ; comparaison écran / moteur ; `auditStatus` non opposable | Fonctionnalité | IN PROGRESS |
| ABC-11 | Rollup sites : chaque ligne une fois ; alerte répartition qui recouvre ; pas de transfert interne | Mixte | IN PROGRESS |
| ABC-12 | Intensités seulement si dénominateur > 0 ; colonnes org persistées ; pas de repli inventé | Fonctionnalité | IN PROGRESS |
| ABC-13 | Registre `climate_risks` (risque → catégorie → proba → impact → niveau saisi → mesure) | Fonctionnalité (aurait pu être surtout doc) | IN PROGRESS |
| ABC-14 | Registre `stakeholder_mobilizations` ; module fournisseurs non recopié | Fonctionnalité (aurait pu être surtout doc) | IN PROGRESS |
| ABC-15 | Audit Académie ; procédure session = Mobilisation ; pas de module Formation | Documentation | IN PROGRESS |
| ABC-16 | Analyse : data room UI sans stockage objet ; `source_document` texte | Mixte — **non démarré** | TODO |
| ABC-17 | Export Excel/CSV portable ; clos = snapshot ; brouillon = calcul affiché ; pas de relecture catalogue | Fonctionnalité | IN PROGRESS |
| ABC-18 | Checklist consultant `docs/ABC_EVALUATION_CHECKLIST.md` ; pas d'écran ni zip | Documentation | IN PROGRESS |
| ABC-19 | Procédure support `docs/ABC_SUPPORT_PROCEDURE.md` ; canal `/contact` ; pas de tickets | Documentation | IN PROGRESS |
| ABC-20 | Notes méthode déjà en place ; colonne scénario « Évitées » encore trompeuse | Mixte — **non démarré** | TODO — formulations `BLOCKED` |
| ABC-21 | Séparation totaux déjà documentée | Documentation | **HORS PARCOURS** |

### Documents produits (hors code métier)

| Fichier | Rôle |
|---------|------|
| `ABC_COMPLIANCE_ROADMAP.md` | Feuille de route (ce fichier) |
| `docs/ABC_EVALUATION_CHECKLIST.md` | Checklist évaluation (ABC-18) |
| `docs/ABC_SUPPORT_PROCEDURE.md` | Procédure bugs / support (ABC-19) |
| `apps/web/src/modules/academy/README.md` | Audit Académie + procédure session (ABC-15) |

### Ce qui reste à faire

#### Priorité produit / acceptation (chantiers déjà ouverts)

1. **ABC-05** — Vérifier le bouton « Clôturer » et le snapshot à l'écran (parcours navigateur) ; ne pas passer DONE sans ça.
2. **ABC-17** — Vérifier un export réel sur org avec module bilan ; confirmer colonnes et cas 2,04 figé.
3. **ABC-01 → ABC-14, ABC-09, ABC-10** — Critères d'acceptation et passages DONE un par un après vérif (aucun n'est DONE).
4. **ABC-15** — Alimenter le catalogue Académie (contenu) ; tenir les sessions en Mobilisation.
5. **ABC-06** — Agribalyse reste absente tant qu'elle n'est pas intégrée (hors invention).

#### Chantiers non démarrés (hors PCAF)

6. **ABC-20** — Renommer la colonne scénario « Évitées » → écart baseline / cible ; valider formulations de communication avec ABC avant publication.
7. **ABC-16** — Seulement après réponse ABC : fichier dans l'outil (réutiliser `evidence_records` / data room) **ou** preuve hors outil + `source_document`.

#### Bloqués / hors cycle

8. **Ratios monétaires Tunisie** — `BLOCKED` jusqu'à justification écrite.
9. **ABC-21 PCAF** — hors parcours (décision produit).
10. **Marque Bilan Carbone®** — inventaire éditorial rapports / marketing, sans réécriture massive non relue.

### Questions à poser à ABC

Liste consolidée. Ne pas inventer de règle en attendant la réponse.

| # | Sujet | Question |
|---|--------|----------|
| Q1 | ABC-02 | Quelle méthode de consolidation est le défaut acceptable (contrôle opérationnel, choix obligatoire sans défaut) ? Faut-il reclasser les historiques clients ? |
| Q2 | ABC-03 | L'échelle qualité 1–5 (ACV / PCAF) doit-elle fusionner avec `real` / `estimated` / `default` du bilan, ou rester séparée ? |
| Q3 | ABC-04 | Quelle méthode / facteurs pour les ratios monétaires en Tunisie (ou hors ADEME France) ? Tant que non écrit → `BLOCKED`. |
| Q4 | ABC-07 | Une trajectoire nommée SBTi (ou autre référentiel) est-elle exigée, ou la droite de référence locale suffit-elle ? |
| Q5 | ABC-09 / ABC-20 | Quelles formulations autorisées pour **neutralité**, **contribution**, **compensation**, **Net Zero Initiative** ? |
| Q6 | ABC-09 / ABC-20 | Quel libellé pour l'écart baseline − cible d'un scénario (pour ne pas le confondre avec des « émissions évitées ») ? |
| Q7 | ABC-09 | Un **PRG 100 ans unique** (ex. AR5) pour tout le bilan est-il exigé, ou le PRG porté par chaque facteur suffit-il ? |
| Q8 | ABC-10 | Quels cas de référence deviennent **opposables** (propriétaire méthode, jeu figé) ? |
| Q9 | ABC-11 | Une écriture de **transfert interne** qui annulerait un double compte est-elle exigée, ou deux lignes saisies restent-elles deux émissions ? |
| Q10 | ABC-13 | Une **matrice nommée** probabilité × impact est-elle exigée, ou le niveau saisi par l'utilisateur suffit-il ? |
| Q11 | ABC-15 | Une ligne **Mobilisation** + pièce hors outil suffit-elle comme archive de formation de mission ? |
| Q12 | ABC-15 | Les textes produit / rapports qui emploient déjà « Bilan Carbone® » peuvent-ils rester, ou faut-il un inventaire + correction ? Une formation CarboScan ne doit pas être présentée comme formation officielle marque — confirmer. |
| Q13 | ABC-16 | L'évaluateur exige-t-il le **fichier dans CarboScan**, ou un justificatif nommé (`source_document`) + pièce conservée hors outil suffit-il ? |
| Q14 | ABC-17 | Pour un bilan **non clos**, la mention « Facteur du calcul courant, non figé » est-elle acceptée ? |
| Q15 | ABC-18 | Une **checklist consultant** (document) qui renvoie aux écrans suffit-elle, ou un écran unique « Préparer mon évaluation » est-il exigé ? |
| Q16 | ABC-19 | Un **formulaire authentifié** avec statut ouvert / en cours / résolu est-il exigé, ou procédure + page contact suffisent-elles ? |
| Q17 | ABC-08 | Le vocabulaire des méthodes d'estimation (mesure, facture, devis, estimation interne) doit-il être aligné sur une liste ABC nommée ? |
| Q18 | ABC-21 (hors parcours) | Si un jour le sujet revient : l'évaluation demande-t-elle seulement la **séparation** des totaux financés, ou aussi un calcul PCAF conforme au standard ? |

### Prochaines actions recommandées (ordre)

1. Finir la **vérification ABC-05** (clôture à l'écran) puis les acceptances des P0 ouverts.
2. **ABC-20** — libellé scénario (petit changement UI) + attendre réponses Q5–Q6 pour les textes.
3. Poser à ABC surtout **Q3** (ratios TN), **Q13** (fichiers), **Q5–Q6** (communication), **Q12** (marque).
4. **ABC-16** seulement après Q13.
5. Ne pas ouvrir **ABC-21**.

### Rappels techniques utiles

- Dev local : API `127.0.0.1:8080`, Postgres host port `5435`, migrations `npm run db:migrate`.
- Compte local souvent **sans modules payants** → `/app/bilan-carbone` et `/app/net-zero` redirigent vers contact ; tests composants + API en substitut.
- Migrations appliquées jusqu'à au moins `045_stakeholder_mobilizations` (puis export sans nouvelle migration).

---

## ABC-01 — Exhaustivité Scope 1

### Objectif
Couvrir les émissions directes sans multiplier les formulaires sectoriels : combustion fixe, combustion mobile, procédés hors énergie, réactions chimiques, émissions fugitives, et une saisie générique « procédé / autre émission directe ».

### Remarque issue de la revue ABC
L'exhaustivité du Scope 1 est un écart attendu. Une fonction générique doit permettre de déclarer un procédé nommé, avec donnée d'activité ou émission déjà connue, facteur, justificatif et incertitude.

### État actuel dans CarboScan
**PARTIEL.** La fiche générique est en place. Le gel du facteur d'un bilan clos reste ABC-05.

### Ce qui existe déjà
- Saisie Scope 1 guidée : `apps/web/src/modules/collect/components/Scope1DataEntry.tsx`.
  - Combustibles fixes (gaz, propane, butane, GPL, fioul, diesel fixe, charbon, cokes, lignite, tourbe).
  - Carburants véhicules (diesel, essence, GPL, GNV, bioéthanol, biodiesel).
  - Biomasse énergétique (bois, pellets, biogaz).
  - Fugitives de fluides frigorigènes (R410A, R134a, R32, R404A, R407C, autre).
  - Procédé / autre émission directe : `ProcessEmissionForm.tsx`, une seule fiche.
- Variantes dans `SimpleDataEntry.tsx` et `EditActivityDialog.tsx` (fuites de gaz, frigorigènes, type `process`).
- Import Excel qui reconnaît combustion, flotte et frigorigènes : `ExcelImportTab.tsx`.
- Questionnaire historique flotte et recharges de fluides : `CarboScanQuestionnaire.tsx`.
- Ligne d'activité `activity_data` (catégorie `scope1`, sous-catégorie `process_other:<nom>`, quantité, unité, site, qualité, notes, `emission_factor_source`, `source_document`).
- CO₂ biogénique exclu des totaux de scopes et conservé en mémo dans `packages/carbon-engine`. La fiche procédé n'ajoute pas de bascule biogénique.

### Écart identifié
- La fiche couvre un procédé nommé, un GES, une donnée × facteur ou une émission déjà connue, la source, un justificatif texte, un commentaire et une incertitude optionnelle.
- Le fichier joint fiable reste ABC-16. `source_document` est un texte de 500 caractères.
- Le gel du facteur à la clôture est le chantier ABC-05, en cours.
- L'énumération de méthodes à cinq valeurs reste ABC-04. Le mode de cette fiche est une charge utile de ligne, pas cette énumération.
- La biomasse énergétique existante n'est pas recalculée ici.

### Modifications nécessaires
Fait pour la fiche et le calcul de la ligne. La clôture écrit le snapshot (ABC-05, en cours de vérification). Reste : dépôt de preuve (ABC-16), libellé de méthode du catalogue (ABC-04).

### Backend
Création d'activité existante `POST /v1/collect/activity-data`. La colonne déjà présente `emission_factor_source` est maintenant écrite. Pas de nouvelle table.

### Base de données
Pas de migration. GES, mode, facteur en kgCO2e, émission directe et incertitude sont dans `notes` (`PROCESS_V1`). Justificatif texte : `source_document`. Source du facteur : `emission_factor_source`.

### Frontend
Cinquième catégorie de `Scope1DataEntry`. Les quatre familles précédentes ouvrent toujours leur formulaire.

### Calculs
`matchProcessEmission` est lu avant la hiérarchie de facteurs de `BilanCarboneCalculator`. Donnée × facteur = quantité × facteur converti en kgCO2e. Émission déjà connue = valeur saisie, convertie en kgCO2e si l'unité est la tonne. Une fiche procédé illisible vaut 0 et ne prend pas le facteur énergie par défaut (2,5). Aucun PRG n'est appliqué : le facteur saisi est déjà en CO2e.

### Documentation
Un procédé déclaré ici est une émission directe (Scope 1). Un achat reste une saisie Scope 3. Le centre méthodologique est ABC-09.

### Tests à réaliser
Vérifiés : `apps/web/src/lib/activity-data/processEmission.test.ts` et `Scope1DataEntry.test.tsx`.
- Gaz fixe 2,04, diesel mobile 2,68, R410A 2088.
- Procédé avec facteur : 10 × 2,5 = 25 kgCO2e ; facteur en tCO2e × 1 000.
- Émission déjà connue : 1 500 kgCO2e, ou 1,5 tCO2e = 1 500 kgCO2e.
- Sans facteur, ou sans émission connue : refus.
- Les quatre familles restent des boutons ; la fiche procédé se ferme quand on revient aux combustibles.

### Critères d'acceptation
Les quatre familles restent disponibles. Un procédé arbitraire s'ajoute sur une seule fiche. Le résultat de la ligne est calculé depuis la charge utile (valeur, unité, source). La clôture du bilan recopie ce facteur (ABC-05, en cours). Aucune famille sectorielle supplémentaire n'est créée.

### Dépendances
ABC-05 pour le snapshot du facteur. ABC-10 pour le cas de référence. ABC-04 pour le libellé de méthode du catalogue, distinct du mode stocké sur la ligne.

### Risques
Un facteur de procédé saisi sans source est refusé. La fiche ne reclasse pas la ligne en Scope 3. Une saisie directe illisible n'est pas remplacée par un facteur générique. Modifier le type d'activité dans l'écran d'édition peut vider la sous-catégorie : le type `process` est proposé pour garder le libellé.

### Statut
IN PROGRESS

### Décisions
- Une sous-catégorie `process_other:<nom>` et `activity_type = process`. Pas de table, pas de formulaire par industrie.
- Le mode `activity_factor` ou `direct_emission` vit dans `notes`, pas dans l'énumération ABC-04.
- Le facteur et l'émission saisie sont déjà en CO2e. CarboScan n'applique pas de PRG.
- L'incertitude (%) est conservée sur la ligne et n'entre pas dans un total d'incertitude (ABC-03).
- Le dépôt de fichier reste ABC-16. Le gel à la clôture reste ABC-05.

---

## ABC-02 — Périmètre organisationnel et opéré / non opéré

### Objectif
Rendre explicites le contrôle opérationnel, le caractère opéré ou non opéré, et l'aide au classement Scope 1 ou Scope 3, sans reclassement automatique quand un arbitrage est nécessaire.

### Remarque issue de la revue ABC
Le périmètre doit être choisi et expliqué. Opéré et non opéré orientent le scope. L'outil ne tranche pas à la place de l'utilisateur dans les cas ambigus.

### État actuel dans CarboScan
**PARTIEL.**

### Ce qui existe déjà
- Texte pédagogique dans `CollecteDonnees.tsx` : contrôle opérationnel ou financier.
- Rapport : méthode de consolidation figée par défaut à « contrôle opérationnel » dans `ReportGeneratorService.ts` (`consolidationMethod`).
- Sites : `collect_sites` (nom, code, pays, adresse, actif).
- Périmètre temporel et scopes inclus dans la trajectoire Net Zero : `NetZeroReference.tsx` (`scopes_included`, année de référence).
- Allocation de sites par pourcentage : `site_allocation_percentages`, utilisée par `BilanCarboneCalculator` quand un site n'a pas de données propres.

### Écart identifié
- Le choix contrôle opérationnel / contrôle financier est enregistré sur l'organisation et repris dans le rapport.
- Le site porte opéré / non opéré. Une proposition Scope 3 s'affiche pour un site non opéré. Le scope de la ligne n'est pas réécrit.
- La quote-part est citée dans l'aide et n'est pas une méthode calculée.
- Le défaut « contrôle opérationnel » reste `À VALIDER ABC`.

### Modifications nécessaires
Choix de méthode de consolidation au niveau organisation, statut opéré / non opéré au niveau site ou activité, textes d'aide et exemples, filet qui bloque le reclassement automatique si le cas est ambigu.

### Backend
Lire / écrire la méthode de consolidation et le statut d'exploitation. Ne pas dériver le scope uniquement du statut.

### Base de données
À ajouter plus tard sur l'organisation et sur `collect_sites` ou `activity_data`. Ne pas réutiliser `site_allocation_percentages` pour porter ce sens : ce sont des clés de répartition, pas un statut d'exploitation.

### Frontend
Aide contextuelle dans la collecte et la fiche site. Exemples (véhicule en propriété, site non opéré, actif loué). L'utilisateur confirme le scope.

### Calculs
Aucun reclassement silencieux. Une activité non opérée proposée en Scope 3 reste une proposition.

### Documentation
Contrôle opérationnel, contrôle financier, quote-part. Lien ABC-09.

### Tests à réaliser
- Changer la méthode de consolidation ne déplace pas les lignes existantes.
- Un site non opéré peut rester en Scope 1 si l'utilisateur le justifie.
- Le rapport affiche la méthode choisie, pas seulement le texte en dur.

### Critères d'acceptation
La méthode n'est plus uniquement une constante « contrôle opérationnel ». Opéré / non opéré est visible. Aucun scope n'est réécrit sans action explicite.

### Dépendances
ABC-11 (consolidation). ABC-09 (textes).

### Risques
`À VALIDER ABC` : quelle méthode est le défaut CarboScan (opérationnel seul, ou choix obligatoire sans défaut). Reclasser les historiques clients.

### Statut
IN PROGRESS

### Décisions
Le défaut enregistré est `operational_control`, la phrase déjà imprimée dans les rapports. Ce défaut n'est pas une validation ABC.
Les méthodes enregistrées sont le contrôle opérationnel et le contrôle financier. La quote-part est expliquée et n'est pas calculée.
Le statut opéré / non opéré est sur le site. Il affiche une proposition Scope 3 pour un site non opéré. Il n'écrit pas le scope. Une ligne Scope 1 sur un site non opéré reste Scope 1.

---

## ABC-03 — Incertitude et qualité des données

### Objectif
Conserver une échelle de qualité simple, y associer source, commentaire et incertitude quand c'est pertinent, puis montrer où l'incertitude pèse.

### Remarque issue de la revue ABC
Garder autant que possible le système 1 à 5. Distinguer mesuré, facture, fournisseur, estimation, extrapolation, ratio monétaire. Dashboard : qualité globale, principales sources d'incertitude, catégories les plus contributives, pistes d'amélioration.

### État actuel dans CarboScan
**PARTIEL — tranche en cours.** `activity_data.source_type` et `uncertainty_pct` existent. La collecte Scope 1, Scope 2 et procédé les propose. Le bilan affiche une synthèse. L'échelle 1 à 5 n'est pas unifiée.

### Ce qui existe déjà
- Collecte bilan : `data_quality` texte `real` | `estimated` | `default` (`Scope1DataEntry`, `ActivityDataList`, export).
- `activity_data.confidence_score` (entier) et `notes`.
- Preuve noyau : `evidence_records.uncertainty_pct`, `temporal_quality`, `geographic_quality`, `technology_representativeness`.
- Moteur : `combineUncertaintyPct` (somme quadratique) testé dans `packages/carbon-engine/src/index.test.ts`.
- Ledger : `calculation_ledger.uncertainty_pct`.
- ACV : `data_quality` entier 1 à 5 (`InventoryTransport.tsx`).
- PCAF fournisseurs : libellés de score 1 à 5 (`useSupplierLabels.ts`), distinct du bilan corporate.
- Achats fournisseurs : `uncertainty_percent`, `source_type`, `data_method` sur `supplier_purchases`.

### Écart identifié
- Le bilan corporate garde trois libellés. L'échelle 1 à 5 de l'ACV et du PCAF reste séparée (`À VALIDER ABC`).
- Le total d'incertitude n'est combiné que pour exactement deux lignes renseignées. Au-delà, ou si une ligne n'a pas de taux, l'affichage reste « non renseigné ».
- L'incertitude du ledger de clôture et celle de la collecte restent deux modèles.

### Modifications nécessaires
Ne pas jeter `real` / `estimated` / `default` tant qu'une correspondance avec 1 à 5 n'est pas validée. Ajouter type de source, commentaire, incertitude optionnelle, puis un écran de synthèse.

### Backend
Agréger qualité et incertitude à partir des lignes d'activité du bilan, sans inventer un pourcentage global non sourcé (le commentaire de rapport du moteur interdit déjà les incertitudes inventées).

### Base de données
Migration `040` : `activity_data.source_type` et `activity_data.uncertainty_pct`, tous deux nullables. `data_quality` n'est pas modifié.

### Frontend
Conserver les sélecteurs actuels. Ajouter les champs manquants. Nouvel écran de synthèse, pas un remplacement du tableau de traçabilité.

### Calculs
Réutiliser `combineUncertaintyPct` seulement si chaque ligne a un taux renseigné. Sinon afficher « non renseigné », ne pas fabriquer ±15 %.

### Documentation
Définir la correspondance 1 à 5 ↔ mesuré / facture / estimation. `À VALIDER ABC` avant de figer l'échelle.

### Tests à réaliser
- Une ligne `real` reste `real` après migration de libellés.
- Agrégation RSS identique au test moteur sur un cas à deux lignes.
- Dashboard vide si aucune incertitude n'est saisie.

### Critères d'acceptation
Le système actuel de la collecte n'est pas cassé. Chaque ligne peut porter qualité, type de source et commentaire. Le dashboard ne publie pas d'incertitude inventée.

### Dépendances
ABC-04 (le ratio monétaire est un type de source). ABC-16 (facture = justificatif).

### Risques
Remplacer 1 à 5 ACV et 1 à 5 PCAF par l'échelle du bilan, ou l'inverse, sans les distinguer. `À VALIDER ABC` sur l'échelle unique.

### Statut
IN PROGRESS

### Décisions
Les trois niveaux `real` / `estimated` / `default` restent ceux de la collecte. L'échelle 1 à 5 de l'ACV et du PCAF n'est pas recopiée ici. L'unification reste `À VALIDER ABC`.
Le type de source et le taux d'incertitude sont optionnels. Le total n'est combiné que pour deux lignes qui ont chacune un taux, avec la somme quadratique du moteur. Sinon le total affiché est « non renseigné ». Aucun ±15 % n'est fabriqué.

---

## ABC-04 — Données physiques versus ratios monétaires

### Objectif
Caractériser chaque ligne : `physical`, `monetary`, `direct_emission`, `supplier_specific`, `other`. Afficher la part physique / monétaire. Expliquer que la donnée physique est préférable. Traiter à part la transposition des ratios ADEME français vers la Tunisie.

### Remarque issue de la revue ABC
Aucune méthode de conversion monétaire actuelle n'est réputée validée par ABC sans justification supplémentaire, en particulier en contexte tunisien.

### État actuel dans CarboScan
**PARTIEL.**

### Ce qui existe déjà
- Le registre distingue `factor_type` `physical` et `monetary` (`eligibility.ts`, tests de recherche).
- Scope 3 : types d'entrée `quantity`, `mass`, `monetary`, `distance` (`ghg-protocol-categories.ts`).
- Sélecteur monétaire Scope 3 : `EmissionFactorSelector.tsx`, `MonetaryFactorPresets.tsx` (ratios € ADEME / Exiobase).
- Fournisseurs : `supplier_monetary_factors`, `data_method`, dépense annuelle, message UI sur un ratio ADEME (`SupplierAddForm.tsx`).
- Le calculateur bilan embarque des ratios kgCO₂e/TND de repli (`BilanCarboneCalculator.ts`, commentaires « ratio monétaire »).

### Écart identifié
- `activity_data.data_method` porte les cinq méthodes. Une ligne vide reste non renseignée.
- Le bilan affiche la part par méthode et rappelle que la donnée physique est préférable.
- Un ratio TND de repli est libellé « non validé ABC ». Sa valeur n'a pas changé.
- La revue des ratios ADEME / TND pour la Tunisie reste bloquée.

### Modifications nécessaires
Champ méthode sur la ligne. Message pédagogique si `monetary`. Compteurs d'émission ou de lignes par méthode. Tâche séparée, bloquée méthodologiquement : revue des ratios ADEME/TND pour la Tunisie. Ne pas « valider » ces ratios dans l'outil.

### Backend
Compter les émissions par `data_method` déjà présent sur `supplier_purchases` ; l'étendre à `activity_data` sans écraser les achats.

### Base de données
`supplier_purchases.data_method` existe. `activity_data` n'a pas cet enum.

### Frontend
Pastille méthode dans la liste d'activités et dans la synthèse du bilan. Encadré si ratio monétaire.

### Calculs
Ne pas changer les facteurs en place dans ce chantier. La révision tunisienne est un chantier de méthode, pas un remplacement silencieux des nombres.

### Documentation
Page « donnée physique vs ratio monétaire ». Mention explicite : non validé ABC pour la Tunisie tant que le dossier n'est pas accepté.

### Tests à réaliser
- Ligne physique et ligne monétaire produisent les bons pourcentages.
- Une ligne sans méthode n'est pas comptée comme physique par défaut.
- Les ratios TND actuels restent identifiables comme non validés.

### Critères d'acceptation
Chaque nouvelle ligne a une méthode parmi les cinq valeurs. L'UI explique la préférence physique. Aucun ratio français ou TND n'est étiqueté « conforme ABC ».

### Dépendances
ABC-03, ABC-06. Sous-tâche méthode tunisienne : `À VALIDER ABC` / `BLOCKED` tant qu'il n'y a pas de justification écrite.

### Risques
Présenter un ratio ADEME € ou TND comme facteur local. Recalculer les bilans historiques avec une nouvelle méthode.

### Statut
IN PROGRESS. Sous-tâche « ratios monétaires Tunisie » : `BLOCKED` (`À VALIDER ABC`).

### Décisions
Les ratios monétaires actuellement codés ne sont pas une validation ABC. Leurs valeurs ne sont pas modifiées.
Une ligne sans `data_method` reste « non renseigné » et n'entre pas dans la part physique.
Les nouvelles saisies Scope 1 et Scope 2 sont `physical`. Une émission de procédé déjà connue est `direct_emission`. Une unité monétaire (€, TND) est `monetary`.
Le libellé d'un facteur TND de repli est « Ratio monétaire non validé ABC ».

---

## ABC-05 — Facteurs d'émission et traçabilité

### Objectif
Chaque calcul conservé à la clôture garde un snapshot du facteur (identifiant, nom, valeur, unité, source, version, année, géographie, date d'usage). Une mise à jour du référentiel ne modifie pas un bilan clôturé. Une fiche facteur est consultable.

### Remarque issue de la revue ABC
La traçabilité du facteur au moment du calcul est exigée. Le passé clôturé est immuable.

### État actuel dans CarboScan
**PARTIEL.**

### Ce qui existe déjà
- Registre versionné : `factor_sources`, `emission_factor_versions` (`version_label`, `published_year`, `gwp_set`), `emission_factors` (nom, géographie, valeur, unités, `uncertainty_pct`).
- Ledger immuable : `calculation_ledger` (facteur, valeur, unité, formule, quantité, résultat, `provenance` JSON). Trigger `prevent_ledger_mutation`.
- Gel à la publication : `calculation_runs.published_snapshot` (migration 013).
- API provenance « 6 questions » : `GET /v1/ledger/:lineId/provenance` et écran `CoreProofWorkspace.tsx`.
- Catalogue consultable côté API (`factorSearch`) et page marketing / catalogue facteurs.
- `activity_data` copie déjà `emission_factor_source`, `emission_factor_year`, `emission_factor_region`.
- Le calculateur utilisateur `BilanCarboneCalculator` lit les activités et peut réafficher un bilan stocké (`bilans_carbone`) si des totaux existent, sans relire forcément le snapshot de chaque facteur.

### Écart identifié
- Le bilan écran clôturé écrit un `calculation_run` publié, des lignes de `calculation_ledger` et `published_snapshot`. L'écran relit ce snapshot.
- Un brouillon est recalculé depuis les données d'activité. Un bilan soumis ou validé ne l'est pas.
- La fiche « un facteur = une page de détail » n'est pas encore ouverte depuis la traçabilité.
- L'année et la géographie restent vides quand le calculateur utilisateur ne les connaît pas. Elles sont présentes sur la ligne, avec une valeur nulle.

### Modifications nécessaires
Au moment du calcul retenu pour le bilan utilisateur, écrire le snapshot. Interdire la réécriture des lignes d'un bilan clôturé. Ouvrir la fiche facteur depuis la ligne.

### Backend
Réutiliser ledger + `published_snapshot`. Ne pas créer un second historique parallèle si le run publié suffit.

### Base de données
Les tables noyau suffisent si le parcours collecte y écrit. `À VÉRIFIER` : est-ce que chaque sauvegarde de bilan crée un `calculation_run` publié.

### Frontend
Lien depuis la traçabilité (`BilanTracabilite.tsx`) vers la fiche facteur du snapshot, pas seulement vers le catalogue vivant.

### Calculs
Recalcul d'un brouillon autorisé. Recalcul d'un clôturé interdit, ou produit un nouveau bilan.

### Documentation
Expliquer brouillon vs clôturé.

### Tests à réaliser
- Publier un run, changer la valeur du facteur en base, relire le snapshot : valeur ancienne.
- Tenter de modifier `calculation_ledger` : refus (déjà spécifié par le trigger).
- Bilan écran clôturé : même résultat après mise à jour catalogue.

### Critères d'acceptation
Un bilan clôturé restitue identifiant, nom, valeur, unité, source, version, année, géographie et date d'usage de chaque facteur utilisé. Le catalogue vivant peut évoluer sans les changer.

### Dépendances
ABC-06 (libellés de source). ABC-10 (le test de non-régression compare au snapshot, pas au catalogue du jour).

### Risques
Geler le mauvais chemin (preuve interne) et laisser le bilan client recalculer. `À VÉRIFIER` avant développement : quel écran les utilisateurs clôturent vraiment.

### Statut
IN PROGRESS

### Décisions
- L'écran qui clôture est `BilanCarboneHome`, bouton « Clôturer le bilan ». Le statut enregistré est `validated`.
- Le gel réutilise `calculation_runs.published_snapshot` et `calculation_ledger`. Pas de second historique.
- Le résultat figé est celui calculé à l'écran au moment du clic. Le serveur ne relance pas un autre moteur.
- Un brouillon continue d'être recalculé. Un bilan déjà soumis ou validé, y compris un import sans snapshot, reste sur ses totaux enregistrés.

---

## ABC-06 — Sources de facteurs d'émission

### Objectif
Documenter dans le produit les bases réellement utilisées, avec version et date de mise à jour. PCAF seulement pour le module financier.

### Remarque issue de la revue ABC
Citer les bases effectives, pas un inventaire marketing.

### État actuel dans CarboScan
**PARTIEL — tranche en cours.** `GET /v1/factors/sources` lit le registre. L'écran Paramètres > Facteurs d'émission affiche version, effectifs et sous-ensemble de calcul. Agribalyse n'est pas listée.

### Ce qui existe déjà
Bases branchées au registre (`factor_sources.source_key`) :

| Clé | Contenu constaté dans les migrations / tests |
|---|---|
| `ademe` | Base Carbone, jeu cité v23.9, calcul activé sur un sous-ensemble sûr |
| `uk_gov_ghg` | Facteurs UK Government, jeu 2026 |
| `epa_ghg_emission_factors_hub` | EPA Hub 2025, sous-ensemble AUTO_US |
| `ipcc_efdb` | EFDB, sous-ensemble combustion stationnaire, CO₂ biogénique séparé |
| `internal` | Noyau local, dont électricité (facteur Tunisie de référence dans les tests) |

Politique GWP : `gwpPolicy.ts` (AR4 / AR5 / AR6 selon la source, pas un PRG unique imposé à toutes les lignes).
Page publique `FacteursEmission.tsx` : ADEME, UK et « CarboScan » en disponible ; EPA et IPCC en « importé » ; Agribalyse retirée. INIES, PEP, HBEFA, Worldsteel, Plastics Europe et ecoinvent restent des mentions hors registre.

### Écart identifié
- Agribalyse : nom marketing uniquement. Pas d'import. **ABSENT** comme base de calcul.
- Facteurs tunisiens : petit noyau `internal`, pas une base nationale documentée dans l'interface.
- L'écran interne lit le registre. Les notes de version stockées peuvent être plus anciennes que le statut de calcul actuel.
- PCAF n'est pas une base de facteurs d'émission corporate (voir ABC-21).

### Modifications nécessaires
Une page interne (pas seulement la landing) qui liste les sources actives, versions, dates, périmètre réellement calculable, et ce qui est hors calcul. Aligner ou retirer les mentions « bientôt » fausses. Ne pas ajouter Agribalyse tant qu'elle n'est pas importée.

### Backend
Lire `factor_sources` et les versions. Ne pas hardcoder la liste marketing.

### Base de données
Déjà porteuse. Pas de nouvelle base à créer dans ce chantier.

### Frontend
Remplacer l'état « bientôt » inexact pour IPCC et EPA, ou séparer clairement « importé » et « utilisable en production ».

### Calculs
Aucun changement de valeur.

### Documentation
Fiche par source : licence, version, date, limites (CO₂ seul IPCC, sous-ensemble EPA, etc.).

### Tests à réaliser
La page n'affiche une source que si `source_key` existe. Agribalyse n'apparaît pas comme base active.

### Critères d'acceptation
L'utilisateur voit ADEME, UK, EPA, IPCC et le noyau interne avec version. Agribalyse n'est pas présentée comme intégrée. PCAF n'est pas listé comme facteur Scope 1/2/3.

### Dépendances
Aucune pour documenter. ABC-21 pour la phrase PCAF.

### Risques
La page marketing et le registre divergent déjà. Documenter la landing comme si elle était la source de vérité serait faux.

### Statut
IN PROGRESS

### Décisions
Agribalyse = ABSENT tant qu'aucun seed n'existe. Elle n'est pas affichée comme base active.
La page interne lit `factor_sources` et le même sous-ensemble de calcul que le résolveur. PCAF n'est pas dans cette liste.
La page publique classe EPA et IPCC en « importé ». Elle n'est pas la source de vérité du registre.

---

## ABC-07 — Trajectoire de réduction

### Objectif
Trajectoire reliée au plan d'action : année et émissions de référence, objectifs, année cible, pourcentage, trajectoire de référence, trajectoire personnalisée, jalons, graphique réel vs cible.

### Remarque issue de la revue ABC
La trajectoire précède ou accompagne le plan d'action. Elle ne doit pas inventer de chiffres.

### État actuel dans CarboScan
**PARTIEL.**

### Ce qui existe déjà
Module Net Zero / trajectoire (`apps/web/src/modules/net-zero/`) :

- Année de référence, scopes inclus, méthode, verrouillage : `NetZeroReference.tsx`.
- Objectifs, pourcentage, année cible : `NetZeroObjectives.tsx`.
- Graphique trajectoire vs réel : `NetZeroTrajectoryChart.tsx`.
- Leviers et scénarios : `NetZeroLevers.tsx`, `NetZeroScenarios.tsx`.
- Tables `net_zero_trajectories`, `climate_scenario_targets`, `climate_scenario_results`.
- Moteur de rapport : n'invente pas de trajectoire (`routes/reports.ts`, test « pas de claim climatique inventé »).

### Écart identifié
- Le module est une offre Decarbotech / Net Zero, pas l'étape standard du bilan avant le plan d'action.
- « Trajectoire de référence » vs « personnalisée » et objectifs intermédiaires : présents en scénarios, pas vérifiés comme parcours unique du bilan corporate.
- Le rapport bilan parle de trajectoire dans des textes statiques (`BilanReportViewer`) sans être branché sur `net_zero_trajectories`.

### Modifications nécessaires
Raccorder le parcours bilan → trajectoire existante → plan d'action. Ne pas recréer un second moteur de courbe. N'afficher une courbe que si référence et cible sont enregistrées.

### Backend
Réutiliser `NetZeroService` / tables scénarios. Vérifier que les émissions de référence viennent du bilan, pas d'une saisie libre non sourcée. `À VÉRIFIER`.

### Base de données
`net_zero_trajectories.baseline_year`, `target_year`, `payload`. Ne pas dupliquer si le payload couvre déjà les jalons. À lire avant toute migration.

### Frontend
Entrée depuis le bilan vers `/app/decarbotech/trajectoire`. Graphique déjà là : le conserver.

### Calculs
Écart réel vs cible à partir des bilans stockés. Pas de pourcentage cible inventé (le viewer a aujourd'hui un `reductionTarget ?? 42` dans un graphique de démonstration : à ne pas prendre pour une trajectoire réelle).

### Documentation
Différence objectif, trajectoire de référence, scénario.

### Tests à réaliser
Sans objectif enregistré, pas de courbe chiffrée. Avec objectif, les points égalent le calculateur Net Zero déjà testé s'il l'est. `À VÉRIFIER` couverture de tests de `NetZeroTrajectoryCalculator`.

### Critères d'acceptation
Référence, cible, pourcentage et graphique réel vs cible s'appuient sur des données enregistrées. Le plan d'action peut s'ouvrir depuis cette trajectoire. Aucun 42 % par défaut n'est présenté comme l'objectif de l'organisation.

### Dépendances
ABC-08, bilan clôturé ABC-05.

### Risques
Deux trajectoires divergentes (Net Zero et texte du rapport). `À VALIDER ABC` : quelle trajectoire de référence (linéaire vers une année, ou seulement la trajectoire saisie par l'organisation).

### Statut
IN PROGRESS

### Décisions
Pas de nouveau module. La trajectoire est enregistrée sur `climate_roadmaps` (année de référence, émissions, année cible, pourcentage, jalons, type).
La trajectoire de référence est la droite déjà calculée entre ces deux années. Une trajectoire nommée SBTi reste `À VALIDER ABC`.
La trajectoire personnalisée passe par les jalons saisis. Sans objectif complet, aucune courbe chiffrée. Le 42 % n'est plus prérempli.
Les émissions réelles viennent des bilans enregistrés. Le potentiel des actions reste dans l'onglet Actions.

---

## ABC-08 — Plan d'action / plan de transition

### Objectif
Un plan qui porte titre, description, poste, site, responsable, dates, priorité, statut, coût, KPI, potentiel, tCO₂e estimées, méthode d'estimation, et des types d'actions (réduction, qualité des données, sensibilisation, fournisseurs, autre). Il appartient à l'offre de conformité.

### Remarque issue de la revue ABC
Auditer l'existant avant d'ajouter des champs. Le plan de transition fait partie du parcours de conformité.

### État actuel dans CarboScan
**PARTIEL.**

### Ce qui existe déjà
- Feuille de route : `climate_roadmaps`, `climate_actions`, `climate_levers` (nom, catégorie, description, scopes, `site_id`, responsable `owner`, statut, coût estimé, potentiel tCO₂e, durée, maturité).
- Jalons : `climate_action_milestones` (titre, échéance, statut, responsable).
- KPI de feuille : `climate_kpis` (référence, cible, réalisé, budget, réductions attendues et réalisées).
- Scores de priorité : `climate_priority_scores`.
- UI : `ClimateRoadmapModule.tsx`, `ActionsSection.tsx`, `CreateActionDialog.tsx`, `ActionsLifecycleTable.tsx`.
- Le dialogue de création actuel est plus pauvre que la table : titre, description, catégorie (Énergie, Mobilité, Achats, Déchets, Bâtiment, Sensibilisation), scope, priorité, impact en pourcentage texte (`5-10%`). Il passe par `api.createRecommendedAction` et un `payload` libre.
- Plans fournisseurs séparés : `supplier_action_plans`.
- Textes de rapport « plan d'actions » statiques, pas la liste des actions enregistrées.

### Écart identifié
- Le formulaire Actions couvre désormais les champs du plan sur `climate_actions`, avec `estimation_method`. Le vocabulaire de méthode reste descriptif, à valider ABC s'il faut une méthode nommée.
- Le dialogue des recommandations écrit toujours `recommended-actions`. Il n'est pas le plan.
- Lien offre commerciale « parcours conformité » non vérifié.
- Le plan n'est pas encore recopié dans le rapport.

### Modifications nécessaires
Compléter le formulaire sur le modèle déjà en base. Ne pas recréer les tables. Typer les actions. Afficher le plan dans le parcours bilan / conformité. Les tCO₂e restent une estimation avec méthode, pas un résultat de bilan.

### Backend
Lire `createRecommendedAction` et les routes climate avant d'ajouter des colonnes.

### Base de données
Privilégier `climate_levers` / `climate_actions` existants. Migration seulement si un champ n'a aucun équivalent (méthode d'estimation, type d'action).

### Frontend
Étendre `CreateActionDialog` et la table de suivi. Garder les catégories déjà proposées.

### Calculs
Ne pas soustraire les tCO₂e estimées du bilan. Les afficher comme potentiel.

### Documentation
Différence potentiel estimé et émission évitée (ABC-20).

### Tests à réaliser
Créer une action de chaque type. Les champs obligatoires du besoin ABC sont relus après enregistrement. Le total du bilan ne change pas.

### Critères d'acceptation
Le plan couvre la liste de champs. Les types d'actions existent. Le bilan induit n'est pas diminué par le plan.

### Dépendances
ABC-07 pour le lien trajectoire. ABC-14 pour le type « fournisseurs » (le module fournisseurs reste la source des plans fournisseurs).

### Risques
Dupliquer `supplier_action_plans` et `climate_actions`. Écraser le `payload` JSON historique.

### Statut
IN PROGRESS

### Décisions
L'écran Actions écrit `climate_actions`. Le dialogue des recommandations reste une boîte à part (`recommended-actions`).
Les types ajoutés sont qualité des données, sensibilisation et fournisseurs, à côté des types déjà présents. Le type fournisseurs ne crée pas de plan dans le module fournisseurs.
`estimation_method` est le seul champ ajouté : le reste existait. Le potentiel estimé ne modifie pas le total du bilan.

---

## ABC-09 — Documentation méthodologique

### Objectif
Un centre intégré : principes, facteurs, PRG 100 ans, GES, périmètres, scopes, procédés, fugitives, données physiques, ratios, incertitude, sources, doubles comptes, émissions évitées, séquestration, Net Zero Initiative, trajectoire, plan de transition, amélioration continue, communication, neutralité et contribution. Liens depuis les formulaires.

### Remarque issue de la revue ABC
La méthode doit être lisible dans l'outil, pas seulement dans un PDF externe.

### État actuel dans CarboScan
**PARTIEL.** Centre statique `/app/methode`, relié aux formulaires déjà en place.

### Ce qui existe déjà
- Fragments : aide collecte (`CollecteDonnees.tsx`), pages marketing, textes de rapport (`ReportGeneratorService`, section méthodologie), politique GWP du resolver, commentaires du moteur.
- Académie : cours / leçons / quiz (`courses`, `lessons`, `AcademyCard.tsx`) — formation, pas un centre de méthode contextuel.
- Blog `blog_posts`.
- Le rapport emploie déjà « Bilan Carbone® » dans `BilanReportViewer.tsx`. Usage de marque à traiter avec ABC-15, pas à multiplier.

### Écart identifié
Pas de sommaire des 20 thèmes demandés, pas de liens depuis les formulaires, pas de page neutralité / contribution / émissions évitées reliée au calcul.

### Modifications nécessaires
Centre de contenu, liens contextuels (Scope 1 → procédés et fugitives, ratio monétaire → ABC-04, etc.). Rédaction validée, pas générée comme règle méthodologique par le modèle.

### Backend
Contenu versionné (fichiers ou table). Pas de chiffres d'organisation dans ces pages.

### Base de données
Option ultérieure. Peut démarrer en contenu statique versionné.

### Frontend
Nouvelle entrée de navigation et ancres depuis les formulaires existants.

### Calculs
Aucun.

### Documentation
C'est le chantier. Les textes sensibles (neutralité, NZI, PRG) sont `À VALIDER ABC` avant publication dans le produit.

### Tests à réaliser
Chaque formulaire prioritaire a un lien qui s'ouvre. Aucun texte ne présente un résultat net émissions − évitées.

### Critères d'acceptation
Les thèmes listés ont une page ou une section. Les formulaires Scope 1, périmètre, qualité et facteurs pointent vers la section utile.

### Dépendances
ABC-06, ABC-20. Textes `À VALIDER ABC`.

### Risques
Réécrire la méthode Bilan Carbone® sans droit sur la marque. Contredire le moteur (biogénique, incertitude non inventée).

### Statut
IN PROGRESS

### Décisions
Les notes décrivent le comportement actuel et les réserves déjà ouvertes. Elles restent dans le code, sans chiffre d'organisation et sans calcul.
Les formulations de neutralité, de contribution, de Net Zero Initiative et de PRG unique restent `À VALIDER ABC`. Les ratios tunisiens restent `BLOCKED`. La marque Bilan Carbone® reste hors de ces notes (ABC-15).

---

## ABC-10 — Intégrité des calculs

### Objectif
Jeux de référence : donnée, facteur, résultat théorique, résultat CarboScan, écart nul à donnée et facteur identiques.

### Remarque issue de la revue ABC
La confiance dans le produit passe par des cas reproductibles, pas seulement par l'UI.

### État actuel dans CarboScan
**PARTIEL.**

### Ce qui existe déjà
`packages/carbon-engine` :

- `calculateEmission` : exemple 12 500 kWh × 0,0569 = 711,25 kgCO₂e.
- Déterminisme et hash de résultat.
- Cas 001 gaz : 1 200 m³ × 2,05 = 2 460 kgCO₂e (`case-001-gaz-naturel.test.ts`), `validatedBy` inclut `pending-methodology-owner`.
- Cas 002 électricité location-based.
- CO₂ biogénique hors totaux de scopes.
- Incertitude RSS.
- Refus des nombres inventés dans le commentaire.

Le calculateur front `BilanCarboneCalculator` est un autre chemin (hiérarchie de facteurs, replis, bilans stockés). Il n'est pas le sujet de ces deux cas.

### Écart identifié
- Les cas 001 et 002 ont encore un propriétaire méthode « pending ».
- Les cas 003 à 009 couvrent la combustion fixe, le carburant mobile, la biomasse au kilogramme, le R410A et le procédé. Ils sont non opposables.
- Le ratio monétaire et le multi-sites ne sont pas dans cette batterie.
- La comparaison écran / moteur porte sur ces cas, avec un catalogue vide. Elle ne rejoue pas toute la hiérarchie de repli.

### Modifications nécessaires
Étendre les cas de référence du moteur. Ajouter, quand le parcours écran écrit le ledger, un test qui compare les deux chemins sur les mêmes entrées. Ne pas élargir les replis silencieux du calculateur front.

### Backend
Cas dans `packages/carbon-engine/src/reference/`.

### Base de données
Aucune pour les cas purs. Un cas d'intégration API seulement si le run est le chemin officiel.

### Frontend
Aucun affichage requis. Un écran d'admin de non-régression est hors sujet tant que les tests automatiques manquent.

### Calculs
Écart autorisé = 0 sur les cas en unités déjà commensurables. Tout écart de conversion d'unité est un cas explicite, pas une tolérance cachée.

### Documentation
Chaque cas documente le calcul manuel dans l'en-tête du test, comme le cas 001.

### Tests à réaliser
Les tests existants restent verts. Nouveaux cas après choix des facteurs figés (pas le catalogue vivant).

### Critères d'acceptation
À facteur et donnée identiques, CarboScan égale le résultat de référence. Le propriétaire méthode n'est plus « pending » sur les cas retenus pour l'audit, ou le cas est marqué non opposable.

### Dépendances
ABC-05 (facteur figé). `À VALIDER ABC` pour les cas qui deviendront opposables.

### Risques
Comparer le moteur au calculateur front alors qu'ils n'appliquent pas la même hiérarchie de repli. Prendre un facteur ADEME du jour comme oracle.

### Statut
IN PROGRESS

### Décisions
Les cas 001 et 002 restent des tests d'ingénierie, pas un dossier d'audit signé.
Les cas 003 à 009 figent des facteurs déjà présents dans le calculateur écran. Ils sont marqués non opposables : aucun propriétaire méthode ABC n'est inventé.
Le cas biomasse est en kilogrammes, unité du facteur. La saisie par défaut du formulaire est en tonnes et n'est pas convertie. Cette conversion n'est pas ajoutée ici.

---

## ABC-11 — Agrégation multi-sites et doubles comptes

### Objectif
Organisation, sites, éventuellement activités ou départements, consolidation, résultat par site, prévention des doubles comptes.

### Remarque issue de la revue ABC
La somme des sites ne doit pas compter deux fois la même émission, ni inventer une répartition non décrite.

### État actuel dans CarboScan
**PARTIEL.**

### Ce qui existe déjà
- `collect_sites` et `activity_data.site_id`.
- `SiteConsolidation.tsx` + `SiteConsolidationService` : filtre sites, période, type, tableau consolidé.
- `site_allocation_percentages` et répartition dans `BilanCarboneCalculator.calculateWithSiteAllocation` si le site n'a pas de données propres.
- Page rapport « répartition par site » omise s'il y a moins de deux sites (`ReportGeneratorService`).
- Entités organisation : routes sites / entités dans le client API (`listSites`, entités).

### Écart identifié
- Pas de niveau département / activité organisationnelle distinct du site. `À VÉRIFIER` : table entités vs sites.
- Pas de contrôle « cette ligne est déjà dans le consolidé ».
- L'allocation par pourcentage peut recouvrir des données partielles par scope (le calculateur commente ce cas). Risque de double compte non testé comme exigence ABC.
- Pas d'écran qui explique la règle de consolidation à l'utilisateur.

### Modifications nécessaires
Documenter et tester la règle actuelle avant d'en ajouter une. Détection des lignes sans site et des lignes allouées en plus de données réelles. Ne pas créer une deuxième consolidation.

### Backend
S'appuyer sur `SiteConsolidationService` et le calculateur. Ajouter un contrôle d'intégrité, pas un nouvel agrégateur.

### Base de données
`collect_sites`, `site_allocation_percentages`, `site_allocation_config`. Lire le payload de config avant migration.

### Frontend
`SiteConsolidation` et la fiche site. Alerte si la somme des pourcentages d'un scope n'est pas cohérente, ou si une donnée de site coexiste avec une allocation du même poste.

### Calculs
Règle à figer par des tests : une activité rattachée à un site n'est pas aussi répartie par le pourcentage du même poste.

### Documentation
Doubles comptes : intra-organisation, entre sites, entre scopes. Lien ABC-09.

### Tests à réaliser
- Deux sites, données propres : total = somme, pas de répartition.
- Site sans donnée et pourcentage 40 % : seulement 40 % du consolidé manquant.
- Même poste en donnée de site et en allocation : le test décrit le comportement actuel puis le comportement cible. Ne pas deviner la règle ici. `À VALIDER ABC` si le code actuel additionne les deux.

### Critères d'acceptation
L'utilisateur voit le résultat par site et le total organisation. Un cas de double compte connu est soit empêché, soit signalé. La règle est écrite.

### Dépendances
ABC-02.

### Risques
« Corriger » l'allocation et changer les bilans clients déjà remis. Tout changement de formule est une décision explicite, pas un effet de bord.

### Statut
IN PROGRESS

### Décisions
Le total d'organisation reste la somme des lignes, une fois chacune. Le résultat par site est cette somme filtrée par `site_id`. Les lignes sans site restent dans le total.
Une clé de répartition qui recouvre un scope déjà saisi sur le site est signalée et n'est pas ajoutée. Une clé sur un scope vide est une vue, hors du total.
Il n'existe pas de transfert interne. Deux saisies restent deux émissions. Une écriture de transfert qui annulerait un double compte reste `À VALIDER ABC`. La formule du bilan n'est pas modifiée.

---

## ABC-12 — Intensités carbone

### Objectif
Intensités configurables : salarié, m², chiffre d'affaires, unité produite, autres KPI sectoriels.

### Remarque issue de la revue ABC
Les intensités sont des indicateurs, pas un substitut au total.

### État actuel dans CarboScan
**PARTIEL.**

### Ce qui existe déjà
- Effectif, surface, chiffre d'affaires sur l'organisation (`useOrganizationData` : `employees`, `total_surface`, `annual_revenue`).
- Intensité / employé et / m² dans le rapport (`ReportGeneratorService.prepareReportData`) et les exports condensés (`bilanExportData.ts`, `IntensityCards.tsx`).
- Scénarios : intensité par million d'euros de chiffre d'affaires (`ScenarioTrajectoriesSection.tsx`).
- Promesse commerciale : ratios par employé, m², M DT (`PricingData.ts`).

### Écart identifié
- Unité produite et KPI sectoriels configurables : non trouvés comme référentiel d'intensités du bilan.
- Les dénominateurs vides tombent à 0 ou « n/a » selon les écrans, sans paramétrage par l'organisation.
- Mélange d'unités monétaires (TND, EUR) selon les modules.

### Modifications nécessaires
Registre d'intensités activables, dénominateur saisi, affichage seulement si le dénominateur est renseigné. Ne pas inventer l'effectif.

### Backend
Lire les dénominateurs organisation / site déjà stockés.

### Base de données
Colonnes organisation existantes. Table d'intensités personnalisées seulement si un KPI libre est requis.

### Frontend
Bloc indicateurs du bilan, à côté des totaux, pas à la place.

### Calculs
tCO₂e / dénominateur à partir du total du bilan clôturé ou du brouillon affiché, en le disant.

### Documentation
Une intensité n'est pas comparable sans le même dénominateur et le même périmètre.

### Tests à réaliser
Effectif 0 → intensité non affichée. Effectif 10 et 100 t → 10 t/salarié. Unité produite absente → pas de faux zéro.

### Critères d'acceptation
Les trois intensités employé, m² et CA sont disponibles quand les dénominateurs existent. L'unité produite peut être ajoutée sans nouveau total d'émissions.

### Dépendances
ABC-11 si l'intensité est aussi par site.

### Risques
Diviser par un effectif de repli (le rapport utilise parfois un effectif par défaut dans d'anciens chemins). `À VÉRIFIER` dans `useBilanReport` (repli 5 ou 20 selon la taille). Ne pas présenter ce repli comme une intensité officielle.

### Statut
IN PROGRESS

### Décisions
L'intensité se calcule sur le total affiché, en tCO₂e par salarié, par m², par million de la devise de l'organisation, et par unité produite si le nom et la quantité sont saisis.
Un dénominateur vide, nul ou négatif n'affiche rien. Aucun effectif de repli (5, 20, 150) n'entre dans cet indicateur.
L'effectif, la surface et le chiffre d'affaires de l'organisation sont enregistrés. À défaut, la somme des sites déjà saisis est utilisée, sans additionner les deux.
Le rapport garde encore ses replis historiques. Ils ne sont pas l'intensité affichée sur le bilan.

---

## ABC-13 — Risques climatiques

### Objectif
Un support simple : risque, exposition, probabilité, impact, priorité, actions éventuelles. Pas un logiciel complet d'analyse de risques.

### Remarque issue de la revue ABC
Rester au minimum utile au référentiel.

### État actuel dans CarboScan
**ABSENT** comme registre de risques.

### Ce qui existe déjà
- Page de rapport « risques et opportunités de transition » : texte de template (`transitionRisksTpl` dans `ReportGeneratorService`), pas une liste saisie.
- Pas de table `climate_risks` repérée dans les migrations.
- Les actions climatiques peuvent ensuite pointer vers un risque, mais le lien n'existe pas.

### Écart identifié
Aucune saisie structurée risque × exposition × probabilité × impact.

### Modifications nécessaires
Une liste courte, reliée éventuellement à une action ABC-08. Pas de modèle climatique, pas de scénarios RCP dans cet objectif.

### Backend
CRUD minimal plus tard.

### Base de données
Nouvelle table seulement à ce moment-là. Ne pas surcharger `climate_levers`.

### Frontend
Écran simple ou section de la feuille de route.

### Calculs
Aucun score automatique obligatoire. Priorité saisie ou produit explicite probabilité × impact, règle à écrire à ce moment-là. `À VALIDER ABC` si un score est exigé.

### Documentation
Risque de transition vs risque physique, en quelques paragraphes (ABC-09).

### Tests à réaliser
Créer un risque, le relier à une action, le bilan ne change pas.

### Critères d'acceptation
Les six champs sont enregistrés. Aucun module de modélisation climatique n'est ajouté.

### Dépendances
ABC-08 pour le lien optionnel vers une action.

### Risques
Glisser vers un outil de risque complet. Générer des risques par IA.

### Statut
IN PROGRESS

### Décisions
Registre `climate_risks` dans l'onglet Risques du plan d'actions : risque, catégorie (physique, transition, autre), probabilité, impact, niveau et mesure. Le niveau est la qualification saisie. Aucune matrice n'est calculée. Une matrice nommée reste `À VALIDER ABC`.
Le lien vers une action du plan est optionnel. Le total du bilan ne change pas. Le texte de rapport sur les risques de transition reste un modèle statique.
Pas de scénario RCP ni de génération de risques.

---

## ABC-14 — Mobilisation des parties prenantes

### Objectif
Supports : collaborateurs, direction, guide de collecte, guide fournisseurs, modèles de communication, sensibilisation, notes d'animation.

### Remarque issue de la revue ABC
S'appuyer sur les modules déjà là, surtout fournisseurs.

### État actuel dans CarboScan
**PARTIEL.**

### Ce qui existe déjà
- Module fournisseurs : contacts, questionnaires, envois, invitations, historique de score, plans d'action (`supplier_*` dans la migration 008, UI `fournisseurs/`).
- Collecte : commentaires (`CollectComments`), statuts de campagne (`CollecteStatusList`), checklist (`CollectionChecklistPage`), notifications.
- Textes de sensibilisation dans les recommandations et le plan d'action (catégorie « Sensibilisation »).
- Académie pour du contenu de formation (ABC-15), distinct d'un kit de mobilisation.

### Écart identifié
- Pas de bibliothèque de supports : guide direction, guide collaborateurs, modèles de mails, notes d'animation.
- Le questionnaire fournisseur existe ; un « guide fournisseurs » documentaire n'a pas été identifié comme livrable du parcours.
- Pas de synthèse de mobilisation rattachée au bilan.

### Modifications nécessaires
Bibliothèque de modèles, pas un nouveau CRM. Réutiliser questionnaires et invitations fournisseurs. Lier les pièces au classeur de preuves (ABC-16).

### Backend
Servir des modèles versionnés. Ne pas réécrire `supplier_questionnaire_sends`.

### Base de données
Pas de nouvelle table obligatoire si les modèles sont des fichiers et que la preuve est un document du data room.

### Frontend
Page « Mobilisation » qui pointe vers fournisseurs, checklist de collecte et modèles.

### Calculs
Aucun.

### Documentation
Les guides sont du contenu ABC-09 ou des pièces jointes, à ne pas confondre avec la méthode de calcul.

### Tests à réaliser
Un envoi de questionnaire fournisseur existant fonctionne encore. Un modèle téléchargé ne modifie pas les émissions.

### Critères d'acceptation
Les sept types de supports ont un emplacement. Le module fournisseurs n'est pas dupliqué.

### Dépendances
ABC-16 pour ranger les preuves de réunion et les supports. ABC-08 pour les actions de sensibilisation et fournisseurs.

### Risques
Promettre un accompagnement humain dans l'outil. Contenu juridique des modèles non relu.

### Statut
IN PROGRESS

### Décisions
Registre `stakeholder_mobilizations` dans l'onglet Mobilisation du plan d'actions : public, parties prenantes, action réalisée, date, responsable, support texte, lien optionnel vers une action du plan.
Le module fournisseurs, ses questionnaires et ses invitations restent la brique d'engagement fournisseurs. Ils ne sont pas recopiés.
Le support est un libellé. Le dépôt de fichier reste ABC-16. Aucun modèle de mail ni guide n'est rédigé dans ce passage. Le total du bilan ne change pas.

---

## ABC-15 — Formation à l'utilisation de la plateforme

### Objectif
Couvrir la formation à l'usage de CarboScan : objectifs, programme, date, intervenant, participants, support, preuve. Distinguer une formation générale à la comptabilité carbone et une formation officielle liée à la marque, sans la confondre.

### Remarque issue de la revue ABC
Attention à « Bilan Carbone® ». Ne pas laisser croire qu'une formation CarboScan est une formation officielle ABC si elle ne l'est pas.

### État actuel dans CarboScan
**PARTIEL.** Contenu et procédure, pas un module « sessions » dédié.

### Ce qui existe déjà
- **Académie** (`/app/academy`) : tables `courses`, `lessons`, `lesson_resources`, `quizzes`, `user_progress` ; UI catalogue, détail, leçons. Parcours en ligne. README module : contenu pédagogique pas encore rempli ; aucun seed de cours en migration.
- **Mobilisation** (ABC-14) : session réalisée dans le plan d'actions (public, parties prenantes, action, date, responsable, support, lien action sensibilisation).
- **Accompagnement** : prestation humaine hors registre produit.
- Rapports / marketing : marque possible ailleurs → inventaire séparé, `À VALIDER ABC`.

### Écart identifié
- Catalogue Académie souvent vide ; contenu à compléter.
- Procédure session écrite dans ce fichier et dans `apps/web/src/modules/academy/README.md`.
- Pas besoin de table `training_sessions` ni de champ « officielle / générale » sur `courses` si l'Académie reste « formation générale plateforme » par défaut.

### Modifications nécessaires (retenues)
**DOCUMENTATION / contenu existant.** Compléter les cours Académie et tenir Mobilisation pour les sessions. Pas de module Formation.

### Backend
Aucun nouveau flux. Import `courses` / `lessons` via pipeline existant si besoin.

### Base de données
Aucune migration ABC-15.

### Frontend
Libellés Académie et lien Mobilisation → Académie. Pas d'écran sessions.

### Calculs
Aucun.

### Documentation
Procédure et audit ci-dessous. Charte marque : `À VALIDER ABC`.

### Tests à réaliser
Revue manuelle : aucun cours ne dit « certifiante ABC » sans autorisation.

### Critères d'acceptation
Session archivable via Mobilisation + pièce (ABC-16). Académie = autoformation plateforme.

### Dépendances
ABC-14, ABC-16. `À VALIDER ABC` marque.

### Risques
Module Formation inutile. Catalogue vide présenté comme preuve de formation déjà faite.

### Mode de traitement
**DOCUMENTATION** — contenu existant (Académie + Mobilisation + accompagnement). Développement : **NON**.

### Audit Académie (29 septembre 2026)

| Élément | Constat |
|--------|---------|
| Routes | `/app/academy`, `:courseId`, `:lessonId` |
| Schéma | Complet (008) ; **aucun INSERT** de cours en migration |
| Chargement | `AcademyCatalogPage` via client Supabase, pas `/v1` dédié |
| Contenu | À compléter (collecte, bilan, export, plan) |
| Session | **Mobilisation**, pas `user_progress` |
| Marque | Nouveaux textes Académie : formation générale outil, pas officielle marque |

### Procédure session

| Besoin | Où |
|--------|-----|
| Programme | Action réalisée + support texte |
| Date / intervenant / participants | Mobilisation |
| Autoformation | `/app/academy`, `user_progress` |
| Pièce | Hors outil ou ABC-16 |

Points à valider avec ABC. `À VALIDER ABC` : Mobilisation + pièce hors outil suffit-elle ? Inventaire marque sur rapports existants ?

### Statut
IN PROGRESS

### Décisions
Pas de module Formation. Académie à compléter en contenu. Mobilisation = registre session. Marque : `BLOCKED` (`À VALIDER ABC`).


---

## ABC-16 — Documents et preuves

### Objectif
Un espace pour : cartographie des flux, réunion de lancement, synthèse de mobilisation, supports de formation, hypothèses, justificatifs, plan de transition, rapport final, autres livrables.

### Remarque issue de la revue ABC
Les preuves doivent être centralisées et reliées au travail, pas dispersées dans des exports.

### État actuel dans CarboScan
**PARTIEL.**

### Ce qui existe déjà
- Noyau `evidence_records` + `evidence_history` (fichier, quantité, unité, origine, qualité, incertitude, statut de validation).
- Data room de collecte : UI `CollectDataRoom.tsx`, types facture, reçu, certificat, rapport, contrat, mesure, autre.
- Service : `CollectDataRoomService.ts` indique que le stockage objet n'est pas porté (liste vide ou erreur explicite). L'écran existe, le dépôt de fichiers ne doit pas être considéré comme opérationnel. **À VÉRIFIER** en parcours réel, le commentaire de code est déjà concluant sur l'absence de stockage.
- Lien possible activité ↔ `evidence_id` sur `activity_data`.
- Rapports générés côté écran (`BilanReportViewer`) sans classement automatique dans un dossier d'audit.

### Écart identifié
- Les types de livrables ABC (lancement, cartographie, mobilisation, plan, rapport final) ne sont pas des catégories du data room.
- Le stockage fichier n'est pas opérationnel.
- Les preuves du ledger et le data room collecte ne sont pas un même classeur pour l'évaluateur.

### Modifications nécessaires
Rétablir un stockage de fichiers sans revenir à l'ancien client Supabase. Étendre les types de documents. Rattacher un document à une activité, une action ou un bilan. Ne pas supprimer `evidence_records`.

### Backend
Upload authentifié, métadonnées en base, fichier hors git.

### Base de données
`evidence_records` est le bon noyau si on l'aligne avec les types de livrables. Le data room historique peut mapper vers cette table. À trancher au chantier, pas maintenant.

### Frontend
`CollectDataRoom` comme point d'entrée, types de pièces complétés.

### Calculs
Aucun. Une pièce ne modifie pas une émission.

### Documentation
Quelle pièce est obligatoire pour l'évaluation (ABC-18).

### Tests à réaliser
Dépôt, téléchargement, suppression, isolation par organisation. Une facture liée à une ligne d'activité est retrouvée depuis la ligne.

### Critères d'acceptation
Les familles de livrables demandées ont un type. Un fichier déposé est retéléchargeable. Les organisations ne voient pas les fichiers des autres.

### Dépendances
Aucune pour le stockage. ABC-18 consomme ce classeur.

### Risques
Réintroduire un stockage public. Perdre le lien avec `evidence_records` et avoir deux preuves divergentes.

### Lecture de minimalisme
Mode de traitement : MIXTE

Exigence. Retrouver les pièces du travail : cartographie, lancement, mobilisation, supports de formation, hypothèses, justificatifs, plan, rapport, autres livrables.

Existant CarboScan. `evidence_records` et `evidence_history` servent déjà la traçabilité de calcul. `activity_data.source_document` nomme un justificatif en texte. `evidence_id` peut relier une ligne. L'écran `CollectDataRoom` existe, et `CollectDataRoomService` refuse le dépôt : le stockage objet n'est pas porté, la liste revient vide. Le plan, la trajectoire, les risques, la mobilisation et le rapport à l'écran sont déjà des enregistrements. Le rapport n'est pas rangé automatiquement dans un classeur.

Documentation existante. `/app/methode` explique la méthode, pas la liste des pièces d'audit. La mobilisation dit que le dépôt de fichier reste ce chantier.

Écart réel. Deux choses distinctes. Le classement des pièces est déjà couvert par les écrans existants et par une procédure. Le fichier lui-même ne peut pas être déposé ni retéléchargé.

Développement nécessaire : OUI, limité au fichier, et seulement si ABC exige le fichier dans l'outil.

**Partie logiciel.** Si la réponse ABC confirme le fichier dans l'outil : réutiliser `evidence_records` ou le data room, avec dépôt, téléchargement et isolation par organisation. Le type « autre » plus un nom suffit. Pas de nouveau module, pas de workflow par famille de livrable.

**Partie documentation/procédure.** Tant que cette réponse n'est pas là : procédure qui mappe chaque famille vers l'écran déjà là (plan, mobilisation, rapport, `source_document`) et vers la pièce conservée par le consultant ou le client. L'écran de data room ne doit pas être présenté comme un dépôt opérationnel.

Modification minimale éventuelle. Le dépôt de fichier, sur le noyau déjà là. Rien d'autre.

Documentation à produire. La table de correspondance pièce ABC → écran ou pièce hors outil.

Preuve attendue pour audit. Soit le fichier retéléchargé dans l'organisation, soit le nom du justificatif plus la pièce conservée hors outil, selon la réponse ABC.

Points à valider avec ABC. `À VALIDER ABC` : l'évaluateur exige-t-il le fichier dans CarboScan, ou un justificatif nommé et conservé hors outil suffit-il ?

### Statut
TODO

### Décisions
Le data room UI n'est pas une preuve que les fichiers sont stockés. Cette lecture n'ouvre pas le chantier.

---

## ABC-17 — Export complet des données

### Objectif
Excel ou CSV : organisation, site, scope, catégorie, sous-catégorie, activité, valeur, unité, méthode, facteur, unité du facteur, source, version, émissions, qualité, incertitude, justificatif, commentaire.

### Remarque issue de la revue ABC
Transparence et portabilité pour l'évaluation et pour le client.

### État actuel dans CarboScan
**PARTIEL.**

### Ce qui existe déjà
- `ActivityDataExportService.ts` : Excel, CSV, JSON, onglet statistiques.
- Colonnes actuelles : identifiant, type, catégorie, sous-catégorie, quantité, unité, périodes, qualité, scope, score de confiance, identifiants site et produit, notes, dates.
- Export de traçabilité Excel dans `BilanTracabilite.tsx`.
- Exports PDF / Excel de rapport, ACV, PCF, CBAM, séparés.
- Pas les colonnes facteur (valeur, unité, source, version), méthode de calcul, incertitude, justificatif, nom d'organisation et nom de site (seulement des identifiants).

### Écart identifié
L'export collecte n'est pas le dossier de calcul portable décrit par ABC.

### Modifications nécessaires
Étendre l'export existant, ou un second classeur « audit » qui n'enlève pas l'export actuel. Nommer le site et l'organisation. N'exporter un facteur que depuis le snapshot (ABC-05), sinon marquer « facteur du calcul courant, non figé ».

### Backend
Génération peut rester côté client si les données sont déjà chargées, à condition de ne pas tronquer les colonnes.

### Base de données
Aucune si les champs existent. Les colonnes manquantes dépendent de ABC-04 et ABC-05.

### Frontend
Bouton à côté de l'export actuel dans la liste d'activités et la traçabilité.

### Calculs
L'export affiche le résultat stocké. Il ne recalcule pas une deuxième valeur silencieuse. Si les deux diffèrent, les deux colonnes sont montrées. `À VÉRIFIER` au moment du chantier.

### Documentation
Dictionnaire des colonnes dans le fichier (ligne d'en-tête stable).

### Tests à réaliser
Une ligne connue produit les colonnes attendues, y compris les vides explicites. L'export d'une autre organisation est impossible.

### Critères d'acceptation
Le fichier contient au minimum la liste de colonnes demandée. L'export historique des activités continue de fonctionner ou est remplacé sans perte de ces colonnes.

### Dépendances
ABC-04 (méthode), ABC-05 (version de facteur), ABC-03 (incertitude), ABC-16 (justificatif).

### Risques
Exporter le catalogue vivant comme s'il était le facteur du bilan clôturé.

### Lecture de minimalisme
Mode de traitement : FONCTIONNALITÉ

Exigence. Un Excel ou un CSV portable : organisation, site, scope, catégorie, sous-catégorie, activité, valeur, unité, méthode, facteur, unité du facteur, source, version, émissions, qualité, incertitude, justificatif, commentaire.

Existant CarboScan. `ActivityDataExportService` exporte déjà Excel, CSV et JSON depuis la liste d'activités, plus un texte « rapport d'audit ». Les colonnes actuelles sont l'identifiant, le type, la catégorie, la sous-catégorie, la quantité, l'unité, les périodes, la qualité, le scope, le score de confiance, les identifiants de site et de produit, les notes et les dates. La traçabilité à l'écran et le rapport montrent une partie du calcul. Le snapshot de clôture (ABC-05) fige le facteur utilisé. `data_method`, `uncertainty_pct` et `source_document` sont déjà stockés sur la ligne.

Documentation existante. `/app/methode` décrit la méthode, les sources, l'incertitude et les facteurs. Elle ne sort pas les chiffres de l'organisation.

Écart réel. L'évaluateur ne peut pas reconstituer la ligne de calcul depuis l'export actuel : il manque le nom d'organisation, le nom de site, la méthode, le facteur et son unité, la source, la version, les émissions, l'incertitude et le justificatif. Une note de méthode ne porte pas ces valeurs.

Développement nécessaire : OUI

Modification minimale éventuelle. Étendre l'export déjà branché sur la liste d'activités, sans second module. Ajouter les colonnes manquantes. Pour un bilan clos, lire le facteur dans le snapshot. Pour un brouillon, écrire que le facteur est celui du calcul courant. Le justificatif exporté est le texte `source_document` déjà saisi. Garder l'export actuel si le nouvel onglet ne le remplace pas.

Documentation à produire. La ligne d'en-tête stable tient lieu de dictionnaire. Pas de nouvelle page.

Preuve attendue pour audit. Le fichier d'une ligne connue, avec les colonnes demandées, y compris les vides explicites.

Points à valider avec ABC. `À VALIDER ABC` : pour un bilan non clos, la mention « facteur du calcul courant, non figé » est-elle acceptée ? L'échelle 1 à 5 ne remplace pas l'incertitude en pourcentage.

### Statut
IN PROGRESS

### Décisions
L'export Excel et CSV existant (`ActivityDataExportService`) écrit les lignes portables. Il ne consulte pas le catalogue et ne relance pas un calcul.

Fichiers : `portableExport.ts`, `portableExport.test.ts`, `ActivityDataExportService.ts`, `ActivityDataList.tsx`, `BilanTracabilite.tsx`.

Colonnes ajoutées sur la feuille Données : organisation, bilan, année, site, identifiant de ligne, date, scope, catégorie, sous-catégorie, type, libellé, quantité, unité, méthode de donnée, identifiant / nom / valeur / unité / source / version / année / géographie du facteur, date du snapshot, origine du facteur, émissions kgCO₂e, émissions tCO₂e, qualité, type de source, incertitude, justificatif, référence de preuve, libellé du justificatif. Les anciennes colonnes ID, périodes, score, site ID, produit ID, notes et dates de saisie restent sur la même feuille. Les feuilles Statistiques et Par type restent.

Origine. Bilan clos : `published_snapshot` (facteur, métadonnées, résultat, date de gel). Bilan ouvert : facteur et résultat déjà associés au calcul affiché, passés à l'export. Une case absente reste vide. La méthode absente est « Non renseigné », comme sur la saisie. Le libellé de méthode reprend les libellés déjà en place : Donnée physique, Ratio monétaire, Émission directe, Donnée fournisseur, Autre.

Tests : `portableExport.test.ts`, 4 tests, tous verts. Le cas 1 000 m³ × 2,04 = 2 040 kgCO₂e reste à 2,04 après un catalogue à 2,10. Le brouillon reprend 2,04 et non 2,10. La somme des kg exportés égale la somme des résultats enregistrés sur ces cas.

Limitations. La version, l'année, la géographie et l'identifiant du facteur ne sont exportés que s'ils sont déjà dans le snapshot. La clôture actuelle ne les envoie pas tous : ces cases restent vides, sans reconstruction. `evidence_id` n'est pas une colonne de `activity_data` : seule `source_document` est remplie quand elle existe. Deux lignes de même scope, unité et quantité ne sont pas appariées au hasard : le résultat figé reste sur la ligne de snapshot, et la somme des émissions exportées reste celle du snapshot. L'écran de traçabilité calcule encore pour l'affichage. Son téléchargement, pour une année close, lit le snapshot.

`À VALIDER ABC` : la mention « Facteur du calcul courant, non figé » pour un brouillon. Les libellés de méthode sont ceux déjà affichés dans la saisie.

---

## ABC-18 — Dossier d'évaluation

### Objectif
Préparer une évaluation : périmètre, données, facteurs, hypothèses, incertitudes, résultats, plan, mobilisation, rapport, justificatifs.

### Remarque issue de la revue ABC
Le paquet vient après que les pièces existent. Ne pas générer un dossier vide présenté comme complet.

### État actuel dans CarboScan
**PARTIEL.** Checklist documentaire en place. Pas d'écran produit ni de zip.

### Ce qui existe déjà
- Les pièces sont dans les écrans : paramètres, collecte, inventaire des sources, `/app/methode`, bilan, traçabilité, export ABC-17, plan d'actions, trajectoire, risques, mobilisation, rapport, fournisseurs, académie.
- Checklist consultant : `docs/ABC_EVALUATION_CHECKLIST.md`.

### Écart identifié
- Pas de route « préparer mon évaluation » (volontairement).
- Le dépôt de fichiers (ABC-16) n'est pas opérationnel.
- Un zip « dossier conforme » n'est pas au programme.

### Modifications nécessaires (retenues)
**DOCUMENTATION.** Checklist qui pointe vers les écrans réels. Pas de nouvel écran, pas de JSON de checklist en base, pas de PDF « conforme ».

### Backend
Aucun.

### Base de données
Aucune.

### Frontend
Aucun écran dédié.

### Calculs
Aucun.

### Documentation
`docs/ABC_EVALUATION_CHECKLIST.md` : 18 pièces, lien d'écran, cases Présent / Observation, règles (pas de zip, case sans pièce = déclaration).

### Tests à réaliser
Revue manuelle : chaque ligne de la checklist pointe vers un écran ou une pièce existante. Aucun test automatisé d'écran (pas d'UI).

### Critères d'acceptation
Le consultant dispose d'une checklist alignée sur ce fichier de route. Le produit n'affirme pas un dossier complet. Le paquet compressé reste hors scope.

### Dépendances
ABC-16 (fichiers), ABC-17 (export), ABC-08, ABC-14, ABC-02, ABC-05 — pièces consommées par la checklist, pas des prérequis de code.

### Risques
Générer un PDF « dossier conforme » avant l'audit. Interdit.

### Mode de traitement
**DOCUMENTATION.** Développement : **NON**.

### Statut
IN PROGRESS

### Décisions
Pas d'écran « Préparer mon évaluation ». Pas de zip. Checklist dans `docs/ABC_EVALUATION_CHECKLIST.md`. Une case cochée sans pièce reste une déclaration. `À VALIDER ABC` : checklist consultant vs écran unique exigé.


---

## ABC-19 — Gestion des bugs et support

### Objectif
Signaler un problème (description, page, capture éventuelle, statut) et disposer d'une procédure de traitement.

### Remarque issue de la revue ABC
Le support fait partie de la capacité à tenir l'outil dans le temps, pas seulement du calcul.

### État actuel dans CarboScan
**PARTIEL.** Canal contact + procédure écrite. Pas de ticket in-app.

### Ce qui existe déjà
- Page `/contact` (formulaire + e-mail / téléphone).
- Toasts d'erreur locaux.
- Journaux techniques `audit_events`, `api_request_logs` (ops, pas ticket utilisateur).
- Cas de référence ABC-10 pour les écarts de calcul.
- Procédure : `docs/ABC_SUPPORT_PROCEDURE.md`.

### Écart identifié
Pas de formulaire authentifié avec statut dans l'application. Couvert volontairement par la procédure hors outil.

### Modifications nécessaires (retenues)
**DOCUMENTATION.** Procédure de qualification et de suivi. Pas de module ITSM, pas de table de tickets.

### Backend
Aucun.

### Base de données
Aucune.

### Frontend
Aucun formulaire bug dédié.

### Calculs
Aucun. Un écart de calcul se vérifie contre ABC-10 ; on n'invente pas de règle dans le support.

### Documentation
`docs/ABC_SUPPORT_PROCEDURE.md` : canal, champs du message, qualification (commercial / usage / calcul / technique), statuts hors outil, délais cibles internes, preuve d'audit.

### Tests à réaliser
Revue manuelle de la procédure. Pas de test automatisé d'écran (pas d'UI nouvelle).

### Critères d'acceptation
Une procédure d'une page existe. Les erreurs de calcul renvoient aux cas de référence quand ils existent. Prospects et bugs ne sont pas mélangés.

### Dépendances
ABC-10 pour les écarts de calcul. PCAF hors parcours (ABC-21).

### Risques
Mélanger prospects et bugs. Créer un outil de tickets uniquement pour cocher l'audit.

### Mode de traitement
**DOCUMENTATION.** Développement : **NON**.

### Statut
IN PROGRESS

### Décisions
Canal = `/contact` + e-mail. Statut tenu hors outil. Pas de module de tickets. `À VALIDER ABC` : formulaire in-app avec statut exigé ou non.


---

## ABC-20 — Communication carbone

### Objectif
Documenter résultats, réduction, contribution, neutralité, émissions évitées, séquestration. Ne jamais soustraire automatiquement évitées ou séquestration pour fabriquer un résultat net.

### Remarque issue de la revue ABC
Le résultat induit reste le résultat. Le reste est une information séparée.

### État actuel dans CarboScan
**PARTIEL.**

### Ce qui existe déjà
- Le moteur exclut le CO₂ biogénique des totaux de scopes et le conserve en mémo (test dédié). L'UI de preuve le signale (`CoreProofWorkspace.tsx`).
- Les commentaires de rapport refusent les claims climatiques inventés (trajectoire, ROI, SBTi).
- Scénarios : colonne « avoided » = écart entre baseline et cible du scénario (`ScenarioComparisonSection.tsx`). C'est un écart de scénario, pas un poste d'émissions évitées soustrait du bilan. À ne pas renommer sans précaution.
- Pas de module séquestration. Pas de page neutralité / contribution / Net Zero Initiative dans le produit (NZI est un thème ABC-09).
- Des textes marketing et de rapport parlent de décarbonation et de plan d'actions sans distinguer contribution et neutralité.

### Écart identifié
- Pas de documentation in-app des règles de communication.
- Pas de garde « ce chiffre n'est pas un solde net ».
- Le mot « avoided » des scénarios peut être lu comme des émissions évitées au sens ABC.

### Modifications nécessaires
Pages ABC-09. Libellé du scénario revue pour ne pas dire « émissions évitées » si c'est un écart de trajectoire. Aucune formule `total - évitées - séquestration`.

### Backend
Si un poste évité ou une séquestration est saisi un jour, le stocker hors `scope1/2/3` et hors `total`.

### Base de données
Pas de colonne de solde net à ajouter.

### Frontend
Encadré sur le résultat du bilan et sur l'écran scénarios.

### Calculs
Interdit : soustraction automatique. Le test biogénique reste le modèle (mémo séparé).

### Documentation
C'est le cœur du chantier, avec ABC-09. Textes `À VALIDER ABC`.

### Tests à réaliser
Un mémo biogénique ou évité n'entre pas dans `totals.total`. Le test existant reste vert. Aucun écran n'affiche un « net » calculé par soustraction.

### Critères d'acceptation
Les six sujets ont un texte validé ou sont marqués `À VALIDER ABC`. Le total induit est inchangé par ces postes. Le libellé scénario n'emploie pas « émissions évitées » à tort.

### Dépendances
ABC-09. `À VALIDER ABC` sur les formulations neutralité, contribution, NZI.

### Risques
Le template de rapport ou un texte marketing affirme déjà la neutralité. Inventaire éditorial à faire au moment du chantier, sans réécriture massive non relue.

### Lecture de minimalisme
Mode de traitement : MIXTE

Exigence. Dire comment communiquer les résultats, la réduction, la contribution, la neutralité, les émissions évitées et la séquestration. Le total affiché reste celui des émissions calculées.

Existant CarboScan. Le moteur laisse le CO₂ biogénique hors des totaux de scopes. Le potentiel d'une action et la trajectoire ne sont pas soustraits du bilan. Le comparatif de scénarios calcule un écart entre baseline et cible. Ce tableau l'intitule « Évitées (tCO₂e) ». Des modèles de rapport parlent de neutralité et emploient la marque. Aucune formule de solde net n'est ajoutée au total.

Documentation existante. `/app/methode` a déjà les notes émissions évitées, séquestration, Net Zero Initiative et communication. Les formulations sensibles y sont `À VALIDER ABC`. Ces notes disent qu'un poste évité ou une séquestration reste hors du total.

Écart réel. La règle de communication est déjà écrite dans les notes. Le libellé « Évitées » du comparatif de scénarios peut être lu comme un poste d'émissions évitées. Les textes de rapport et les pages marketing ne sont pas passés en revue.

Développement nécessaire : OUI, limité à ce libellé.

**Partie logiciel.** Renommer la colonne du comparatif de scénarios pour qu'elle désigne l'écart entre baseline et cible. Aucune nouvelle page, aucun poste de séquestration, aucune soustraction au total.

**Partie documentation/procédure.** Compléter, plus tard et après validation des formulations, la note communication déjà en place. Inventaire éditorial des rapports et des pages publiques. Pas une seconde page de documentation.

Modification minimale éventuelle. Le libellé de colonne. Le reste est rédaction.

Documentation à produire. Les formulations validées, dans la note existante. D'ici là, la note actuelle et la mention `À VALIDER ABC` tiennent lieu de garde.

Preuve attendue pour audit. Les notes de méthode, un total de bilan inchangé lorsqu'une action ou un scénario porte un écart, et le libellé de scénario relu.

Points à valider avec ABC. `À VALIDER ABC` : les phrases de neutralité, de contribution, de compensation et de Net Zero Initiative. `À VALIDER ABC` : le mot juste pour l'écart baseline − cible, afin de ne pas le faire passer pour des émissions évitées.

### Statut
TODO. Formulations : `BLOCKED` (`À VALIDER ABC`). Cette lecture n'ouvre pas le chantier.

### Décisions
Le CO₂ biogénique hors total est le précédent technique à préserver.

---

## ABC-21 — PCAF

### Objectif
Garder PCAF comme module spécialisé, séparé de la comptabilité Scope 1/2/3 corporate. Vérifier son usage pour les émissions financées des institutions financières.

### Remarque issue de la revue ABC
Ne pas mélanger la logique financée et l'inventaire d'organisation.

### État actuel dans CarboScan
**PARTIEL.**

### Ce qui existe déjà
- Vocabulaire finance dans le module fournisseurs : portefeuille, contreparties, score qualité PCAF 1 à 5 (`useSupplierLabels.ts`). Le même module sert aussi les fournisseurs classiques.
- Page marketing et SEO « PCAF & émissions financées » (`seo.ts`, `solutionPages.ts`).
- Le diagnostic 360 peut recommander le module `pcaf` si le secteur est la finance (`diagnostic/catalog.ts`), avec un lien vers la page `bilan-carbone-finance`.
- Checkout : offre « Fournisseurs / Portefeuille » décrite avec un scoring PCAF.
- Le calculateur de bilan ignore `pcaf_breakdown` quand il aplatit un import (`BilanCarboneCalculator`).

### Écart identifié
- Pas de moteur PCAF distinct identifié (attribution par encours, facteur d'émission financée, score de données 1 à 5 calculé selon le standard). Le score est un libellé d'interface.
- Le module n'est pas isolé : il partage les fournisseurs.
- `À VÉRIFIER` : les émissions financées peuvent-elles entrer dans le total Scope 1/2/3 corporate via un import ou un ratio monétaire.

### Modifications nécessaires
Ne pas fusionner PCAF dans le bilan corporate. Documenter la frontière. Un calcul financé, s'il est complété plus tard, a son total propre. Ce chantier d'audit de frontière passe avant tout enrichissement du calcul PCAF.

### Backend
Aucun calcul corporate ne lit un total financé pour l'ajouter aux scopes. Test de non-régression à écrire au moment du chantier.

### Base de données
`supplier_purchases` et scores restent dans le module fournisseurs / portefeuille. Pas de colonne PCAF sur `bilans_carbone` à ajouter pour « compléter » le total.

### Frontend
Libellés déjà conditionnés par `useSupplierLabels`. Les conserver. Ne pas afficher le score PCAF sur un bilan d'entreprise non financière.

### Calculs
Hors moteur corporate. Ne pas réutiliser `calculateEmission` du bilan pour un encours sans méthode PCAF explicite.

### Documentation
Une page : ce que PCAF n'est pas (un Scope 1). Lien depuis la page finance uniquement.

### Tests à réaliser
Un portefeuille financé n'augmente pas `scope1+scope2+scope3` du bilan corporate. Une organisation non finance ne voit pas le vocabulaire PCAF.

### Critères d'acceptation
Les deux totaux restent séparés. La documentation le dit. Aucun développement PCAF nouveau n'est mélangé au chantier Scope 1.

### Dépendances
ABC-06 (ne pas lister PCAF comme base de facteurs corporate). ABC-04 si des ratios monétaires servent de proxy financé : les identifier comme tels.

### Risques
Le module fournisseurs unique rend la séparation fragile. La séparer en deux produits n'est pas demandé ; la séparation des totaux l'est.

### Lecture de minimalisme
Mode de traitement : DOCUMENTATION

Exigence. Garder les émissions financées séparées de l'inventaire Scope 1 / 2 / 3 de l'organisation.

Existant CarboScan. Le module fournisseurs change de vocabulaire pour une organisation financière (portefeuille, contreparties, score affiché 1 à 5) via `useSupplierLabels`. L'inventaire des bases de facteurs écarte PCAF. La note sources le dit. Le calculateur ignore `pcaf_breakdown` lorsqu'il lit un import. Le diagnostic peut recommander la page finance. Il n'y a pas de moteur d'encours dans le bilan corporate.

Documentation existante. `/app/methode` : PCAF hors des bases du bilan d'organisation. L'échelle 1 à 5 de l'ACV et du PCAF est séparée de la qualité réel / estimé / défaut, et reste `À VALIDER ABC`.

Écart réel. La frontière de totaux est déjà dans le produit et dans les notes. Ce qui n'existe pas est un calcul financé selon le standard (encours, facteur financé, score de qualité calculé). Cet audit de frontière ne demande pas ce moteur.

Développement nécessaire : NON

Modification minimale éventuelle. Aucune pour la séparation. Un moteur PCAF serait un produit à part, après une demande explicite, hors de ce passage.

Documentation à produire. Une phrase de procédure pour l'accompagnant : le portefeuille financier se lit dans le module fournisseurs lorsque les libellés finance sont actifs ; son total n'est pas additionné au bilan d'organisation. La note sources suffit comme texte dans l'outil.

Preuve attendue pour audit. Un bilan d'organisation dont le total ne contient pas un portefeuille financé, et la note sources.

Points à valider avec ABC. `À VALIDER ABC` : l'évaluation demande-t-elle seulement cette séparation, ou aussi un calcul financé conforme au standard ? Le score affiché 1 à 5 est un libellé d'écran, pas un score calculé selon le standard.

### Statut
HORS PARCOURS

### Décisions
PCAF n'est pas traité dans ce cycle (décision produit). La séparation des totaux corporate reste la règle déjà en place. Pas de moteur PCAF pour cocher l'audit.

---

## Ordre recommandé

1. ABC-05 — clôture en cours. Le bouton et le snapshot sont en place ; la vérification à l'écran reste à terminer avant DONE.
2. ABC-10 — cas 003 à 009 en place et comparés à l'écran. Reste le ratio monétaire, le multi-sites, et un propriétaire méthode pour les cas qui deviendraient opposables.
3. ABC-04 — méthode de ligne et part physique / monétaire en cours. Les ratios tunisiens restent `BLOCKED`. Le défaut de périmètre ABC-02 reste `À VALIDER ABC`.
4. ABC-03 — qualité, source et incertitude optionnelle en cours. L'échelle 1 à 5 reste `À VALIDER ABC`. Ensuite ABC-17, l'export.
5. ABC-06 — inventaire des bases enregistrées en cours. Agribalyse reste ABSENT. PCAF n'est pas une base du bilan.
6. ABC-07 — trajectoire branchée sur la feuille de route existante. La droite de référence est locale ; une trajectoire SBTi reste `À VALIDER ABC`.
7. ABC-08 — formulaire du plan branché sur `climate_actions`. Le potentiel estimé ne modifie pas le bilan. Le détail fournisseurs reste ABC-14.
8. ABC-09 — notes de méthode dans l'outil. Les réserves ouvertes y sont écrites. Les formulations sensibles restent `À VALIDER ABC`.
9. ABC-11 — total organisation = somme des lignes. Résultat par site, lignes non affectées, alerte si une clé recouvre une donnée de site. Pas de transfert interne.
10. ABC-12 — intensités à côté du total, seulement si le dénominateur est renseigné. Pas de nouvel total d'émissions.
11. ABC-13 — registre de risques dans le plan d'actions. Niveau saisi, pas de modèle climatique. Le bilan ne change pas.
12. ABC-14 — registre de mobilisation dans le plan d'actions. Le module fournisseurs reste en place. Le bilan ne change pas.
13. ABC-18 — checklist (`docs/ABC_EVALUATION_CHECKLIST.md`). ABC-19 — procédure support (`docs/ABC_SUPPORT_PROCEDURE.md`). ABC-21 PCAF hors parcours. ABC-16 attend la question du fichier. ABC-20 : libellé scénario + formulations `À VALIDER ABC`.

ABC-01 est ouvert : la fiche et le calcul de ligne sont en place, le chantier n'est pas DONE tant que le snapshot de clôture (ABC-05) n'est pas vérifié. Les points `À VALIDER ABC` et `BLOCKED` ne sont pas des règles à inventer.

## Revue rapide ABC-01 à ABC-14

Cette revue ne retire rien de ce qui est en place. Elle cherche seulement où le produit a été élargi pour l'audit.

| ID | Lecture | Hors audit |
|----|---------|------------|
| ABC-01 | FONCTIONNALITÉ JUSTIFIÉE | UTILE PRODUIT — À CONSERVER |
| ABC-02 | MIXTE | UTILE PRODUIT — À CONSERVER |
| ABC-03 | MIXTE | UTILE PRODUIT — À CONSERVER |
| ABC-04 | FONCTIONNALITÉ JUSTIFIÉE | UTILE PRODUIT — À CONSERVER |
| ABC-05 | FONCTIONNALITÉ JUSTIFIÉE | UTILE PRODUIT — À CONSERVER |
| ABC-06 | MIXTE | UTILE PRODUIT — À CONSERVER |
| ABC-07 | FONCTIONNALITÉ JUSTIFIÉE | UTILE PRODUIT — À CONSERVER |
| ABC-08 | FONCTIONNALITÉ JUSTIFIÉE | UTILE PRODUIT — À CONSERVER |
| ABC-09 | DOCUMENTATION réalisée | UTILE PRODUIT — À CONSERVER |
| ABC-10 | FONCTIONNALITÉ JUSTIFIÉE | UTILE PRODUIT — À CONSERVER |
| ABC-11 | MIXTE | UTILE PRODUIT — À CONSERVER |
| ABC-12 | FONCTIONNALITÉ JUSTIFIÉE | UTILE PRODUIT — À CONSERVER |
| ABC-13 | AURAIT PU ÊTRE PRINCIPALEMENT DOCUMENTAIRE | UTILE PRODUIT — À CONSERVER |
| ABC-14 | AURAIT PU ÊTRE PRINCIPALEMENT DOCUMENTAIRE | UTILE PRODUIT — À CONSERVER |

ABC-01 à ABC-08, ABC-10 et ABC-12 portent des saisies ou des résultats que le client utilise pendant le bilan. ABC-09 est le centre de notes, pas un module de calcul. ABC-02, ABC-03, ABC-06 et ABC-11 mélangent un petit apport d'écran et une réserve déjà écrite dans les notes. ABC-13 et ABC-14 sont les deux registres qui auraient pu rester une procédure et une feuille du consultant. Ils restent, parce qu'ils tiennent dans le plan d'actions déjà là et qu'ils ne créent pas un module climatique ni un second CRM fournisseurs.
