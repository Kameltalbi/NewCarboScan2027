# 5 actions prioritaires — statut Newcarboscan-2027

Date : 12 août 2026

Ces cinq actions corrigent les risques les plus graves et établissent la fondation pour une crédibilité face à Greenly.

| # | Action | Statut | Artefacts |
|---|---|---|---|
| 1 | Fermer failles `verify_jwt=false` | **DONE** | `legacy-functions.ts` — JWT+org, rate-limit, audit `legacy.critical_blocked` ; 6 fonctions critiques listées |
| 2 | Supprimer affirmations inventées | **DONE (cœur)** | `buildFactualReportCommentary` + `assertNoInventedClimateClaims` + `assertFacts` sur `/v1/reports/from-run` ; purge Decarbotech/ACV/empreinte ; gate `scripts/lint-invented-claims.sh` |
| 3 | CI bloquante | **DONE (trust)** | typecheck → lint → invented-claims → tests → npm audit → build api+web |
| 4 | Moteur carbone unique versionné | **PARTIAL** | Canonique : `packages/carbon-engine` ; legacy UI marquée `@deprecated` — inventaire `ENGINE_INVENTORY.md` |
| 5 | Preuve + bilans figés | **DONE (noyau)** | provenance 6Q + `published_snapshot` (migration `013`) à `POST /v1/runs/:id/publish` |

## Action 1 — détail

Fonctions prioritaires verrouillées (plus d’accès anonyme) :

- `generate-carbon-report` → utiliser `POST /v1/reports/from-run`
- `generate-report-chunk` → stub 501 + audit
- `estimate-action-impact` → stub 501 + audit
- `ocr-extract` → stub 501 (evidence draft only quand réimplémenté)
- `invoice-carbon` → stub 501
- `wattbim-ingest` → stub 501

Contrôles : auth JWT, membership org, rate limit (20/min critiques), CORS restrictif, audit_events.

## Action 2 — règle

> Aucun chiffre produit par l’IA ne peut apparaître s’il n’existe pas déjà dans les résultats déterministes et sourcés.

Interdits explicitement : 30–50 %, −40 %, 1,5 °C affirmé, ROI < 24 mois, ±15 % inventé.

## Action 5 — snapshot publié

`calculation_runs.published_snapshot` contient : engine, méthodologie, hashes, exclusions/hypothèses, chaque ligne (formule, FE, preuve, validateur).

## Reste hors scope immédiat

- Rewrite complet des calculateurs React legacy
- Lint 909 erreurs web legacy (volontairement hors gate)
- Modules ACV/CBAM/PCF hors noyau
