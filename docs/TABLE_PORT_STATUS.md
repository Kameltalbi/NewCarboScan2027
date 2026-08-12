# Portage des tables — statut

Date : 12 août 2026

## Couverture

Inventaire CarboScan : **154 tables** (`db/TABLE_INVENTORY.txt`).

Migrations Newcarboscan-2027 :

| Migration | Contenu |
|---|---|
| `001_trust_core.sql` | Auth, org, evidence, factors, ledger, reports cœur |
| `002_domain_stubs.sql` | Profiles, modules, collect_sessions, cbam_installations |
| `003_public_surface.sql` | contact_requests, blog enrichi |
| `004_import_framework.sql` | batches / staging / id_map / catalogue |
| `005_client_domain_importable.sql` | Coquilles importables (activity, bilans, PCF/ACV/CBAM shells…) |
| `006_port_collect_activity_bilan.sql` | Collect complet + activity + bilans + companies |
| `007_port_cbam_pcf_acv.sql` | CBAM + PCF (toutes phases) + ACV |
| `008_port_climate_suppliers_reports_academy_wattbim.sql` | Climate, suppliers, reports, academy, WattBIM, sim, divers |
| `009_expand_import_catalog.sql` | Catalogue import élargi |
| `010_questionnaires_translations.sql` | Questionnaires enrichis + translations |

## Couverture inventaire

- Inventaire CarboScan : **154** tables
- Tables créées dans nos migrations : **168+** (trust + métier + import)
- Manquantes volontaires : **`test_collect_table`** (table de test legacy, non portée)
- Alias nommés différemment : `inventory` → `acv_inventory`, `results` → `acv_results`, `emission_factors` → `emission_factors_legacy`

## Domaines portés

- Identité / multi-tenant : organizations, users, profiles, members, years, modules, roles  
- Collecte : sessions, responses, files, sites, documents, notifications, comments, estimations, AI, périodique, checklist  
- Activité / bilan : activity_data (+ history, energy, link), bilans, detail, postes, assessments, emissions_totals  
- Facteurs : emission_factors_legacy, org factors, FE CO2, unit_conversions  
- CBAM : installations → products → production → exports → energy/elec → allocation → summary → shipments  
- PCF : studies → versions/results + materials/manufacturing/transport/packaging/usage/wastes/eol/scenarios/subcontracting/allocations  
- ACV : projects, inventory, results, materials, processes, components, modules, scenarios, flows…  
- Climate : roadmaps, levers, actions, milestones, KPIs, scenarios (+ levers/assumptions/targets/results/contributions), net-zero  
- Suppliers : suppliers + contacts, purchases, questionnaires, invitations, scores, action plans  
- Reports : generated, templates, paragraphs, charts, quota, generations  
- Academy : courses → lessons → quizzes → progress  
- WattBIM : buildings → meters → readings → alerts → savings → api keys  
- Divers : sim_*, promo, invoices, sector_presets, scope3 activations, site allocation…

## Convention d’import (toutes tables client)

Chaque table métier client expose (ou peut exposer) :

- `legacy_source` / `legacy_id`
- `import_batch_id` / `imported_at`
- `raw_legacy JSONB` (zéro perte de colonnes source)

## Appliquer

```bash
for f in db/migrations/00{6,7,8,9}_*.sql db/migrations/010_*.sql; do
  docker compose exec -T postgres psql -U newcarboscan -d newcarboscan < "$f"
done
```

## Vérifier

```sql
SELECT COUNT(*) FROM v_schema_table_counts; -- tables public
SELECT entity_type, sort_order FROM import_entity_catalog ORDER BY sort_order;
SELECT * FROM v_import_org_coverage;
```

## Suite possible

1. Générer dump JSON d’un client réel Supabase  
2. Lancer `scripts/import-client-dump.mjs`  
3. Affiner colonnes NOT NULL / index perf selon volumes  
4. Brancher les écrans `/app/*` sur ces tables via l’API  
