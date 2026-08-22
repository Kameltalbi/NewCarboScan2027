# Checklist d’application de l’audit — Newcarboscan-2027

Statuts : `TODO` | `IN_PROGRESS` | `DONE` | `N/A`

Ce fichier est la source de vérité pour appliquer l’audit **point par point**.
Chaque item doit pointer vers un artefact (migration, package, route, test, doc).

---

## P0 — Sécurité & affirmations

| ID | Action | Statut | Artefact |
|---|---|---|---|
| P0-1 | Auth JWT obligatoire sur toutes les routes sensibles | DONE | `apps/api` middleware `requireAuth` |
| P0-2 | Autorisation organisationnelle (multi-tenant) | DONE | `apps/api` `requireOrgMember` + RLS app-level |
| P0-3 | Quotas + rate limiting API | DONE | `apps/api` rate-limit middleware |
| P0-4 | Validation Zod côté serveur | DONE | schémas dans `apps/api/src/schemas` |
| P0-5 | CORS restrictif (pas de `*`) | DONE | config `CORS_ORIGINS` |
| P0-6 | Journal d’audit des opérations sensibles | DONE | table `audit_events` |
| P0-7 | Interdiction des chiffres climat inventés (fallback IA) | DONE | `packages/carbon-engine` + route reports |
| P0-8 | CI bloque lint / tests / typecheck / audit critique | DONE | `.github/workflows/ci.yml` + `lint-invented-claims` |
| P0-10 | 6 fonctions critiques verrouillées | DONE | `legacy-functions.ts` CRITICAL_LEGACY + audit |
| P0-11 | Snapshot immuable à publication | DONE | migration `013` + `published_snapshot` |
| P0-9 | Aucun appel client Supabase dans le frontend | PARTIAL | `api` + `sessionAuth` ; crash Proxy ; modules legacy encore à migrer |

## P1 — Chaîne de confiance & qualité

| ID | Action | Statut | Artefact |
|---|---|---|---|
| P1-1 | Un seul moteur carbone versionné | PARTIAL | `packages/carbon-engine` (`calculateEmission`, décimaux) — UI legacy encore multi-moteurs |
| P1-2 | Registre données probantes | PARTIAL | `evidence_*` + `011` (validation/source) — collect UI non branchée |
| P1-3 | Facteurs d’émission versionnés | PARTIAL | `emission_factor_versions` + immutabilité si used — seed officiel + lookup runtime TODO |
| P1-4 | Ledger immuable des résultats | PARTIAL | `calculation_ledger` + trigger ; publish draft/published dans `011` |
| P1-5 | Séparer origine / validation / qualité données | PARTIAL | colonnes evidence `011` ; workflow validation API à compléter |
| P1-6 | Sanitisation HTML blog + CSP | DONE | `BlogPost.tsx` + Helmet CSP API |
| P1-7 | Schéma PostgreSQL consolidé (pas 241 migrations) | DONE | `db/migrations/001`–`011` |
| P1-8 | Tests isolation multi-tenant négatifs | DONE | contrat string + `tenant-isolation-live.test.ts` (skip si pas de `DATABASE_URL`) |
| P1-9 | Cas de référence scientifiques | IN_PROGRESS | `packages/carbon-engine/src/reference/` (001–002) |
| P1-10 | Panneau UI 6 questions / chiffre | DONE | `ProofPanel` + `GET /v1/ledger/:id/provenance` + `/app/bilan-carbone/preuve` |
| P1-11 | Noyau 4 parcours vs modules adjacents | DONE | `product_module_class` + `docs/SYSTEME_DE_PREUVE.md` |

## P2 — Gouvernance

| ID | Action | Statut | Artefact |
|---|---|---|---|
| P2-1 | Identité produit correcte (name/version) | DONE | root `package.json` |
| P2-2 | README projet réel | DONE | `README.md` |
| P2-3 | Modèle de menace | TODO | `docs/THREAT_MODEL.md` |
| P2-4 | Politique versionnement moteur | DONE | `ENGINE_VERSION` dans carbon-engine |
| P2-5 | Procédure restauration | TODO | `docs/RUNBOOK_RESTORE.md` |

## Roadmap 0–30 / 30–90 / 3–12 mois

Voir `docs/AUDIT_INITIAL_CARBOSCAN_2026-08-11.md` section Priorités.

| Phase | Focus | Statut |
|---|---|---|
| 0–30j | Sécuriser, CI, supprimer affirmations, geler modules | IN_PROGRESS |
| 0–30j bis | **Pages publiques + testeur gratuit sans Supabase** | DONE |
| 30–90j | Chaîne de confiance complète + jeux de référence | IN_PROGRESS — voir SYSTEME_DE_PREUVE.md |
| 3–12m | Certifications, SSO, conformité grand compte | TODO |
| Done | Portage tables métier PostgreSQL (006–010) | DONE — voir docs/TABLE_PORT_STATUS.md |
| Done | Constitution système de preuve + alignement schéma 011 | DONE |
| Done | Noyau UI preuve (evidence → calculate → provenance → report) | DONE — `/app/bilan-carbone/preuve` |
| Done | Préparation déploiement VPS (Docker/nginx/CI/build) | DONE — docs/DEPLOY_VPS.md |
| Next | Brancher Collecte legacy sur evidence (ActivityDataService REST) | PENDING |
| Next | Seed facteurs officiels étendu + panneau sur totaux legacy | PENDING |
| Next | Import dump client réel | IN_PROGRESS | `scripts/export-supabase-dump.mjs` + `scripts/import-client-dump.mjs` — besoin de `SUPABASE_DB_URL` |
| Next | Déployer sur VPS (secrets + TLS + smoke) | PENDING |

---

## Décisions de migration technique

1. **Backend :** PostgreSQL natif (pas Supabase Auth/Storage/Realtime).
2. **Edge Functions :** réécrites en routes HTTP Fastify dans `apps/api` (référence Deno conservée dans `legacy-edge-functions-ref/`, non déployée).
3. **Frontend :** aucun `@supabase/supabase-js`. Accès données via REST `apps/web/src/integrations/api`.
4. **Tables :** inventaire legacy dans `db/TABLE_INVENTORY.txt` ; schéma cible consolidé + noyaux confiance.
5. **Pas de portage 1:1 des appels Supabase** : les anciens `supabase.from(...)` ne sont pas repris pour éviter des centaines de correctifs manuels.
