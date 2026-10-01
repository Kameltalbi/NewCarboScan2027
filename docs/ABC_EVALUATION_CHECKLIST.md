# Checklist d'évaluation ABC — consultant

Date : 29 septembre 2026.  
Mode : **DOCUMENTATION** (ABC-18). Aucun écran « Préparer mon évaluation », aucun zip « dossier conforme ».

Cette checklist aide le consultant à préparer une évaluation. Chaque ligne renvoie à un écran ou une pièce déjà présente dans CarboScan. Une case cochée sans ouvrir la pièce reste une **déclaration**, pas une preuve.

## Comment utiliser

1. Pour chaque pièce, ouvrir l'écran indiqué.
2. Cocher seulement si la pièce est réellement présente et lisible.
3. Noter dans la colonne « Observation » ce qui manque ou ce qui reste `À VALIDER ABC` / `BLOCKED`.
4. Joindre hors outil (ou via ABC-16 quand le dépôt de fichiers sera opérationnel) les preuves de réunion, émargements et supports.

## Checklist

| # | Pièce | Où la lire dans CarboScan | Présent ? | Observation |
|---|--------|---------------------------|-----------|-------------|
| 1 | Périmètre organisationnel (contrôle, sites opérés / non opérés) | `/app/parametres` — organisation ; sites | ☐ | Méthode par défaut `À VALIDER ABC` (ABC-02) |
| 2 | Notes de méthode | `/app/methode` | ☐ | Formulations sensibles `À VALIDER ABC` |
| 3 | Données d'activité (scopes, qualité, méthode) | Collecte / liste d'activités | ☐ | Méthode absente = « Non renseigné » (ABC-04) |
| 4 | Incertitude et type de source | Lignes d'activité ; panneau incertitude du bilan | ☐ | Pas d'incertitude inventée (ABC-03) |
| 5 | Facteurs et sources enregistrées | `/app/emission-factors` ; inventaire sources dans paramètres | ☐ | Agribalyse ABSENT ; PCAF hors bilan (ABC-06) |
| 6 | Bilan calculé / clôturé | `/app/bilan-carbone` | ☐ | Clôture = snapshot ABC-05 |
| 7 | Traçabilité ligne × facteur = résultat | `/app/bilan-carbone/tracabilite` | ☐ | |
| 8 | Export portable des lignes | Export Excel / CSV depuis la collecte (ou traçabilité) | ☐ | Bilan clos → snapshot ; brouillon → calcul affiché (ABC-17) |
| 9 | Intensités (si dénominateurs renseignés) | Bloc intensités sur le bilan | ☐ | Vide si dénominateur absent (ABC-12) |
| 10 | Rollup multi-sites | Bloc sites sur le bilan | ☐ | Pas de double compte ajouté (ABC-11) |
| 11 | Plan d'actions / transition | `/app/net-zero` — Actions | ☐ | Potentiel estimé hors total (ABC-08) |
| 12 | Trajectoire | `/app/net-zero` — Trajectoire | ☐ | SBTi nommé `À VALIDER ABC` (ABC-07) |
| 13 | Risques climatiques | `/app/net-zero` — Risques | ☐ | Niveau saisi, pas de modèle (ABC-13) |
| 14 | Mobilisation / formation session | `/app/net-zero` — Mobilisation ; `/app/academy` | ☐ | Académie = e-learning ; session = mobilisation (ABC-14, ABC-15) |
| 15 | Rapport à l'écran | Rapport bilan | ☐ | Ne pas présenter comme dossier ABC conforme |
| 16 | Justificatifs / preuves | `source_document` sur la ligne ; data room | ☐ | Dépôt fichier : ABC-16 (non opérationnel) |
| 17 | Fournisseurs / questionnaires | `/app/fournisseurs` | ☐ | Si pertinent pour le Scope 3 |
| 18 | Cas de référence calcul | Notes / tests ABC-10 | ☐ | Hors UI client |

## Règles

- **Pas de paquet zip** présenté comme « dossier conforme » tant qu'ABC-16 n'est pas tranché et que les pièces ne sont pas toutes présentes.
- Le **total du bilan** n'est pas modifié par le plan, la trajectoire, les risques ou la mobilisation.
- Une case cochée à la main **sans pièce ouverte** ne compte pas comme preuve pour l'évaluateur.

## Preuve attendue pour audit

Checklist remplie + exports réellement produits + captures ou accès aux écrans listés + pièces hors outil pour les supports de réunion / formation.

## Point ouvert

`À VALIDER ABC` : cette checklist tenue par le consultant suffit-elle, ou un écran unique dans le produit est-il exigé ?
