# Newcarboscan 2027

Plateforme carbone reconstruite à partir de CarboScan, **sans Supabase**, sur **PostgreSQL**, en appliquant l’audit du 11 août 2026.

**Maturité cible :** chaîne de confiance démontrable  
`donnée source → facteur versionné → calcul déterministe → résultat explicable → rapport vérifiable`

**Constitution produit :** [Système de preuve carbone](docs/SYSTEME_DE_PREUVE.md) — 4 parcours cœur (Collecte → Bilan → Plan → Rapport), modules adjacents hors noyau.

## Documents d’audit

- [5 actions prioritaires](docs/PRIORITY_5_ACTIONS.md)
- [Inventaire moteurs](docs/ENGINE_INVENTORY.md)
- [Déploiement VPS](docs/DEPLOY_VPS.md)
- [Système de preuve (north star)](docs/SYSTEME_DE_PREUVE.md)
- [Noyau UI preuve](docs/CORE_JOURNEY_STATUS.md)
- [Audit initial](docs/AUDIT_INITIAL_CARBOSCAN_2026-08-11.md)
- [Checklist d’application point par point](docs/AUDIT_CHECKLIST_APPLICATION.md)
- [Portage tables](docs/TABLE_PORT_STATUS.md)
- [Backlog migration UI (anciens appels Supabase)](docs/MIGRATION_UI_SUPABASE_PURGE.md)

## Architecture

```
apps/web          UI (copie CarboScan, sans @supabase/supabase-js)
apps/api          API Fastify + PostgreSQL (remplace Edge Functions)
packages/carbon-engine   Moteur carbone unique, versionné, sans IA
db/migrations     Schéma consolidé + 5 noyaux de confiance
db/legacy-migrations-ref Référence des 241 migrations Supabase (non appliquées telles quelles)
apps/api/legacy-edge-functions-ref  Référence Deno (non déployée)
```

### Cinq noyaux (audit)

1. Registre de données probantes (`evidence_records`)
2. Registre versionné des facteurs (`emission_factors` + versions)
3. Moteur unique (`@newcarboscan/carbon-engine`)
4. Ledger immuable (`calculation_ledger`)
5. Rapports issus du ledger uniquement (`/v1/reports/from-run`)

## Démarrage rapide

```bash
cp .env.example .env
docker compose up -d postgres
# appliquer le schéma
docker compose exec -T postgres psql -U newcarboscan -d newcarboscan < db/migrations/001_trust_core.sql

npm install
npm run dev:api   # :8080
npm run dev:web   # :5173
```

## Décisions P0 déjà appliquées

| Risque audit | Mesure Newcarboscan-2027 |
|---|---|
| Edge Functions `verify_jwt=false` | Toutes les routes `/v1/functions/*` exigent JWT + org |
| Affirmations climat inventées | `buildFactualReportCommentary` — aucun ROI / SBTi / ±15 % inventé |
| CI non bloquante | `.github/workflows/ci.yml` bloque sur typecheck, tests, lint, build |
| Appels Supabase frontend | Remplacés par `integrations/api` ; l’ancien client lève une erreur explicite |
| Qualité « réelle » auto | Evidence import/OCR refusée en `validated` à la création |
| XSS blog | `DOMPurify.sanitize` avant `dangerouslySetInnerHTML` |

## Ce qui n’est PAS porté 1:1

Les ~180 fichiers UI qui faisaient `supabase.from(...)` **ne sont pas corrigés un par un**.  
Ils importent désormais `@/integrations/api/client` ; l’export `supabase` est un Proxy qui **échoue volontairement** jusqu’à réécriture vers `api.*`.

Priorité : brancher d’abord collect → calculate → reports sur le ledger, pas tout le catalogue de pages.

## Licence / identité

- Nom : `newcarboscan-2027`
- Version : `2027.0.0`
- Backend : PostgreSQL 16
- Auth : JWT applicatif (pas Supabase Auth)

## Portage tables

Voir [docs/TABLE_PORT_STATUS.md](docs/TABLE_PORT_STATUS.md).

