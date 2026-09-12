# AUDIT CarboScan — Facteurs d'émission & calculs carbone

**Repo :** `/Volumes/Projets/NewCarboScan2027`  
**Date :** 11 sept. 2026  
**Mode :** lecture seule — aucune migration, aucun commit, aucune modification de code

---

## Synthèse exécutive

CarboScan est en **transition Supabase → PostgreSQL certifiable**. Il existe **deux modèles de facteurs incompatibles** :

1. **Registre versionné** (`factor_sources` → `emission_factor_versions` → `emission_factors`) — moteur certifiable `carbon-engine`, ledger immuable.
2. **Table plate legacy** (`emission_factors` Supabase : `slug`, `emission_factor`, `factor_name`) — encore consommée par une grande partie du frontend.

Le calcul « officiel » passe par `POST /v1/calculate` + `packages/carbon-engine`. Le dashboard/bilan org utilise encore **`BilanCarboneCalculator.ts`** (React) avec ~100+ facteurs hardcodés.

| Risque | Niveau | Description |
|--------|--------|-------------|
| Double schéma `emission_factors` vs `emission_factors_legacy` | **CRITIQUE** | UI/query legacy vs registre versionné ; import ADEME non branché sur le nouveau modèle |
| Calcul réglementaire côté React (`BilanCarboneCalculator`) | **CRITIQUE** | ~100+ FE hardcodés, formule locale, pas de ledger |
| `carbon-engine` sans conversion d'unités | **IMPORTANT** | Formule `qty × FE` assume unités compatibles |
| Recherche FE : full-table client-side / fuzzy local | **IMPORTANT** | Pas de FTS PostgreSQL sur `/v1/factors` |
| Import ADEME stub 501 en prod | **IMPORTANT** | Référence legacy uniquement |
| `ActivityDataService.calculateEmissions` → `return 0` | **CRITIQUE** | Lien direct FE→activité non fonctionnel |

---

## 1. ARCHITECTURE POSTGRESQL

### 1.1 Migrations actives (schéma cible)

| Fichier | Rôle |
|---------|------|
| `db/migrations/001_trust_core.sql` | Noyau : sources, versions, facteurs, runs, ledger, activity_data, bilans |
| `db/migrations/004_import_framework.sql` | Import batches ; mappe `emission_factors` → `emission_factors_legacy` |
| `db/migrations/005_client_domain_importable.sql` | `emission_factors_legacy`, `organization_emission_factors`, `bilans_carbone_detail`, `postes_emission` |
| `db/migrations/006_port_collect_activity_bilan.sql` | `unit_conversions`, `emission_factors_co2`, `recalculation_queue`, enrichissement `activity_data` |
| `db/migrations/007_port_cbam_pcf_acv.sql` | `impact_factors`, tables PCF/CBAM |
| `db/migrations/008_port_climate_suppliers_reports_academy_wattbim.sql` | `supplier_monetary_factors`, `invoice_emission_factors`, `scope3_category_activations`, `parametres_emission` |
| `db/migrations/011_proof_model_alignment.sql` | Versioning FE, triggers immutabilité, colonnes snapshot ledger |
| `db/migrations/012_seed_core_factor_pack.sql` | Seed **8 facteurs TN** internes |
| `db/migrations/013_published_snapshot.sql` | `calculation_runs.published_snapshot JSONB` |
| `db/migrations/015_sync_bilan_dual_columns.sql` | Sync `scope*_emission` ↔ `scope*_kgco2e` |

**Legacy (241+ fichiers) :** `db/legacy-migrations-ref/`  
**Inventaire :** `db/TABLE_INVENTORY.txt` (~151 tables)

### 1.2 Tables cœur — registre versionné

#### `factor_sources` (`001_trust_core.sql`)

| Colonne | Type | Contraintes |
|---------|------|-------------|
| `id` | UUID | **PK** |
| `name` | TEXT NOT NULL | ex. ADEME Base Carbone |
| `license` | TEXT | |
| `homepage` | TEXT | |
| `created_at` | TIMESTAMPTZ | |

#### `emission_factor_versions` (`001` + enrichi `011`)

| Colonne | Type | Contraintes |
|---------|------|-------------|
| `id` | UUID | **PK** |
| `source_id` | UUID | **FK → factor_sources** |
| `version_label` | TEXT NOT NULL | UNIQUE `(source_id, version_label)` |
| `published_year` | INT | |
| `valid_from` / `valid_to` | DATE | |
| `gwp_set` | TEXT | IPCC AR5/AR6 |
| `notes` | TEXT | |
| **011 ajoute** | `stable_factor_family`, `source_dataset`, `source_url`, `checksum`, `status` CHECK (draft\|approved\|deprecated), `approved_by`, `approved_at` | |

#### `emission_factors` — registre certifiable (`001` + `011` + seed `012`)

| Colonne | Type | Contraintes |
|---------|------|-------------|
| `id` | UUID | **PK** |
| `version_id` | UUID NOT NULL | **FK → emission_factor_versions** |
| `external_code` | TEXT | |
| `name` | TEXT NOT NULL | |
| `category` | TEXT | |
| `geography` | TEXT | |
| `technology` | TEXT | |
| `unit_numerator` | TEXT DEFAULT `'kgCO2e'` | |
| `unit_denominator` | TEXT NOT NULL | |
| `value` | NUMERIC(24,12) NOT NULL | |
| `uncertainty_pct` | NUMERIC(8,4) | |
| `selection_rule` | TEXT | |
| `metadata` | **JSONB** DEFAULT `'{}'` | |
| **011 ajoute** | `stable_factor_id`, `version_number`, `status`, `checksum`, `approved_by/at`, `valid_from/until` | |
| **Index** | `idx_factors_version`, `idx_factors_code` | |
| **Contrainte** | `uq_emission_factors_stable_version (stable_factor_id, version_number)` | |
| **Trigger** | `trg_factor_no_update_if_used` — interdit UPDATE/DELETE si référencé dans `calculation_ledger` | |

#### `calculation_runs` (`001` + `011` + `013`)

| Colonne | Type | Notes |
|---------|------|-------|
| `id` | UUID PK | |
| `organization_id` | UUID FK → organizations | |
| `engine_version` | TEXT | ex. `1.1.0-proof` |
| `method` | TEXT | ghg_protocol \| bilan_carbone \| cbam \| pcf |
| `period_start/end` | DATE | |
| `input_hash`, `result_hash` | TEXT | reproductibilité |
| **011** | `methodology_version`, `factor_pack_checksum`, `publish_status`, `published_at/by`, `supersedes_run_id`, `scope_notes`, `exclusions JSONB`, `assumptions JSONB` | |
| **013** | `published_snapshot JSONB` | |

#### `calculation_ledger` — immuable (`001` + `011`)

| Colonne | Type | Notes |
|---------|------|-------|
| `id` | UUID PK | |
| `run_id` | UUID FK → calculation_runs | |
| `organization_id` | UUID FK | |
| `line_key` | TEXT | UNIQUE `(run_id, line_key)` |
| `scope` | INT CHECK (1,2,3) | |
| `evidence_id` | UUID FK → evidence_records | |
| `factor_id` | UUID FK → emission_factors | |
| `formula` | TEXT | |
| `activity_quantity`, `activity_unit` | NUMERIC, TEXT | |
| `factor_value`, `factor_unit` | NUMERIC, TEXT | **snapshot** |
| `allocation_factor` | NUMERIC DEFAULT 1 | |
| `result_kgco2e` | NUMERIC | |
| `uncertainty_pct` | NUMERIC | |
| `engine_version` | TEXT | |
| `provenance` | **JSONB** | |
| **011** | `factor_version_id`, `factor_checksum`, `methodology_version`, `unit_conversion JSONB`, `data_quality JSONB` | |
| **Trigger** | `prevent_ledger_mutation()` — pas de UPDATE/DELETE | |

#### `activity_data` (`001` + `005`/`006`)

| Colonne | Type | Notes |
|---------|------|-------|
| `organization_id` | UUID FK | |
| `evidence_id` | UUID FK | |
| `category`, `subcategory` | TEXT | |
| `scope` | INT CHECK (1,2,3) | |
| `quantity`, `unit` | NUMERIC, TEXT | |
| `period_start/end` | DATE | |
| `factor_id` | UUID FK → emission_factors | |
| **006 enrichit** | `site_id`, `activity_type`, `scope_hint`, `scope3_category_id`, `emission_factor_source/year/region`, `data_quality`, `validation_status`, `is_locked`, `raw_legacy JSONB` | |

#### `bilans_carbone` / `bilans_carbone_detail` / `postes_emission`

- **bilans_carbone :** totaux `total_kgco2e`, `scope1/2/3_kgco2e` + colonnes legacy `scope*_emission`, `run_id`, `questionnaire_data JSONB`
- **bilans_carbone_detail :** détail par poste, `factor_value`, `emissions_kg_co2e`, décomposition gaz (`co2_kg`, `ch4_kg_co2e`, etc.)
- **postes_emission :** agrégats par `poste_nom`, `scope`, `emission_valeur`, `facteur_utilise`

### 1.3 Tables legacy / import

#### `emission_factors_legacy` (`005`)

| Colonne | Type |
|---------|------|
| `id` | UUID PK |
| `organization_id` | UUID |
| `name`, `factor_name`, `nom_affiche`, `slug` | TEXT |
| `emission_factor` | NUMERIC |
| `unit`, `category`, `subcategory`, `source`, `year` | TEXT/INT |
| `raw_legacy` | **JSONB** |

#### `emission_factors` (legacy Supabase — **utilisé par le frontend**)

- **Création :** `db/legacy-migrations-ref/20250720163452-*.sql`
- **Colonnes :** `category`, `subcategory`, `factor_name`, `emission_factor DECIMAL(10,6)`, `unit`, `source`, `year`
- **Évolution :** `slug`, `nom_affiche`, `is_active`, `superseded_by/at` (`20260419193006_*.sql`)
- **Index ADEME :** `emission_factors_unique_ademe_v239 ON (factor_name, year) WHERE source = 'ADEME Base Carbone v23.9'`

#### Autres tables liées

| Table | Migration | Rôle |
|-------|-----------|------|
| `organization_emission_factors` | legacy + `005` | Overrides org |
| `unit_conversions` | `006` | Conversions d'unités |
| `emission_factors_co2` | `006` | FE CO2 par type énergie |
| `supplier_monetary_factors` | `008` | FE monétaires fournisseurs |
| `invoice_emission_factors` | `008` | FE factures |
| `parametres_emission` | legacy + `008` | Postes/paramètres |
| `impact_factors` | `007` | ACV (pas FE org) |
| `recalculation_queue` | `006` | Recalcul bilans |
| `evidence_records` / `evidence_history` | `001` | Chaîne de preuve |

**Enums PostgreSQL :** `evidence_origin`, `extraction_method`, `validation_status`, `org_role`, `import_source`, etc. **Pas d'enum pour scopes** — `INT CHECK (scope IN (1,2,3))`.

### 1.4 Schéma simplifié des relations

```
factor_sources
    └── emission_factor_versions
            └── emission_factors ←── activity_data.factor_id
                    ↑
calculation_runs ──→ calculation_ledger (factor_id, factor_value snapshot)
    ↑                      ↑
organizations ─────────────┘
    ├── evidence_records
    ├── bilans_carbone → bilans_carbone_detail / postes_emission
    └── emission_factors_legacy (miroir import Supabase)

[LEGACY PARALLÈLE — non branché sur registre versionné]
public.emission_factors (slug, emission_factor, factor_name, source, year)
    └── organization_emission_factors (overrides org)
```

---

## 2. BASE ADEME ACTUELLE

### 2.1 Stockage

| Aspect | Détail |
|--------|--------|
| **Table principale (prod historique)** | `public.emission_factors` (plate, Supabase) |
| **Registre certifiable** | **8 facteurs TN** seedés (`012_seed_core_factor_pack.sql`) — **pas ADEME complet** |
| **Nombre de facteurs ADEME** | **Non déterminable depuis le code seul** (INSERT massifs dans ~13 migrations legacy SQL) |
| **ID ADEME conservé** | **Non trouvé** de champ `ademe_id` dédié ; identifiants = `slug` + `factor_name` + index unique |
| **Structure legacy** | `category`, `subcategory`, `factor_name`, `nom_affiche`, `slug`, `emission_factor`, `unit`, `source`, `year`, `is_active`, `superseded_by/at` |
| **CO2/CH4/N2O séparés** | **Non trouvé** sur table `emission_factors` legacy |
| **Incertitude** | Présente sur registre versionné (`uncertainty_pct`) ; **absente** sur table legacy |
| **Date d'import** | **Non trouvé** de colonne `imported_at` |
| **Version Base Carbone** | Stockée dans `source` (ex. `'ADEME Base Carbone v23.9'`) et `year` |

### 2.2 Import ADEME

| Mécanisme | Fichier | Statut |
|-----------|---------|--------|
| **Edge Function Supabase** | `apps/api/legacy-edge-functions-ref/import-ademe-factors/index.ts` | Upsert par `slug` ; supersede ; superadmin |
| **UI SuperAdmin** | `apps/web/src/components/superadmin/AdemeImporter.tsx` | Upload **JSON** par batches de 500 |
| **Seeds SQL legacy** | `db/legacy-migrations-ref/20250720163053_*.sql`, `20250905223849_*.sql`, etc. | INSERT massifs |
| **API Newcarboscan** | `POST /v1/functions/import-ademe-factors` | **Stub 501** |
| **Pipeline import PG** | `apps/api/src/services/importPipeline.ts` | → **`emission_factors_legacy`**, pas registre versionné |

**Format import ADEME (legacy) :**

```typescript
{ category, subcategory, factor_name, nom_affiche, slug,
  emission_factor, unit, source, year }
```

**Non trouvé :** import ADEME via API officielle, parser CSV/Excel, migration vers `factor_sources` / `emission_factor_versions`.

---

## 3. RECHERCHE ET SÉLECTION D'UN FACTEUR

### 3.1 Parcours par flux

| Flux | Chemin | Recherche |
|------|--------|-----------|
| **A — Legacy direct** | `useEmissionFactors.tsx`, `DynamicEmissionFactorsService.ts`, `EmissionFactorSearch.tsx` → `supabase.from('emission_factors')` | **Full table** ; filtre client `.includes()` |
| **B — API certifiable** | `EmissionFactorSelector.tsx`, `BilanCarboneCalculator.loadEmissionFactorsFromDB()` → `GET /v1/factors` | Liste complète ; **Fuse.js fuzzy** client (threshold 0.4) |
| **C — Edge legacy** | `legacy-edge-functions-ref/emission-factors/index.ts` | **ILIKE** `%q%` ; pagination cursor |
| **D — Public free bilan** | `GET /v1/public/emission-factors` | Pack hardcodé, **pas DB** |

### 3.2 Détail `GET /v1/factors`

- **Fichier :** `apps/api/src/routes/factors.ts`
- **Auth :** `requireOrgMember`
- **SQL :** JOIN `emission_factors` + `emission_factor_versions` + `factor_sources` ; `WHERE f.status = 'approved'`
- **Pas de** paramètres query, ILIKE, pagination, full-text PostgreSQL

### 3.3 Sélection automatique vs manuelle

- **API certifiable :** client **doit fournir `factorId`** dans `POST /v1/calculate`
- **`BilanCarboneCalculator` :** cascade **org FE → DB → ~100 defaults hardcodés**
- **Full-text PostgreSQL :** **non trouvé**

### 3.4 Écart schéma front ↔ API (**CRITIQUE**)

Frontend legacy : `slug`, `factor_name`, `emission_factor`, `nom_affiche`.  
API : `name`, `value`, `unit_numerator/unit_denominator`, `stable_factor_id`.  
Le front **reconstruit un slug synthétique** depuis `category/name`.

---

## 4. MOTEUR DE CALCUL CARBONE

### 4.1 Moteur canonique — `packages/carbon-engine/`

| Fichier | Fonction | Formule |
|---------|----------|---------|
| `calculateEmission.ts` | `calculateEmission()` | **`activity × factor × allocation`** ; `ENGINE_VERSION = "1.1.0-proof"` |
| `calculateCarbonBalance.ts` | `calculateCarbonBalance()` | Somme scopes 1/2/3 ; hashes |
| `uncertainty.ts` | `combineUncertaintyPct()` | RSS : √(a² + f²) |

**Conversion d'unités dans carbon-engine :** **NON TROUVÉ**.

### 4.2 API — `apps/api/src/routes/calculate.ts`

```
POST /v1/calculate
→ valide Zod
→ résout FE approuvé (factor_id)
→ calculateCarbonBalance()
→ INSERT calculation_runs + calculation_ledger (snapshot factor_value, factor_checksum)
```

Note : le client **peut override** `factorValue` / `factorUnit` dans le body.

### 4.3 Moteurs legacy UI

| Fichier | Rôle |
|---------|------|
| `apps/web/src/lib/calculators/BilanCarboneCalculator.ts` | FE org → DB → defaults ; agrégation scopes |
| `apps/web/src/lib/dynamicCarbonCalculations.ts` | `value × emission_factor` |
| `apps/web/src/lib/emissionFactors.ts` | FE Tunisia hardcodés |
| `apps/web/src/lib/activity-data/UnitConversionService.ts` | Conversions inline ; table `unit_conversions` **non lue** |
| `apps/web/src/lib/scope3/category3-calculator.ts` | Cat. 3 upstream |
| `apps/web/src/modules/acv/engine/acvCalculationEngine.ts` | ACV |
| `apps/web/src/lib/empreinteProduitCalculations.ts` | PCF |
| `apps/web/src/lib/cbamCalculations.ts` | CBAM |
| `apps/api/src/services/freeBilan.ts` | Calcul public |

### 4.4 RPC legacy recalcul

- **Fonction :** `calculate_bilan_carbone_from_activity_data(...)` dans `20250131000008_*.sql`
- **Statut Newcarboscan :** **NON PORTÉ**

---

## 5. FACTEURS MONÉTAIRES

| Source | Chemin | Unité |
|--------|--------|-------|
| Presets UI | `MonetaryFactorPresets.tsx` | **kgCO₂e/EUR** (+ FX TND, USD, MAD…) |
| Defaults Bilan | `BilanCarboneCalculator.getDefaultFactor()` | **kgCO₂e/TND** |
| Seed DB | `012_seed_core_factor_pack.sql` | `purchases_dt` : **0.5 kgCO₂e/TND** |
| Table fournisseurs | `supplier_monetary_factors` (008) | `emission_factor` + `unit` |

**Inflation / année monétaire formalisée :** **NON TROUVÉ**.

---

## 6. SCOPES ET CATÉGORIES

| Mécanisme | Où | Règle |
|-----------|-----|-------|
| Saisie explicite | `activity_data.scope`, `scope_hint` | 1/2/3 |
| Inférence catégorie | `BilanCarboneCalculator.inferScopeFromCategory()` | scope1*→1, scope2*→2, scope3*→3, **défaut 3** |
| Ligne calcul API | `POST /v1/calculate` | `scope` obligatoire par line |
| GHG postes | `GHGAggregationService.ts` | Mapping catégorie → poste → scope |
| Scope 3 catégories | `scope3_category_id` | IDs type `cat1_purchased_goods` |

Scope = propriété de la **ligne de calcul** ou de l'**activité**, pas contrainte sur le facteur.

---

## 7. TRAÇABILITÉ

| Artefact | Comportement |
|----------|--------------|
| **`calculation_ledger`** | Snapshot immuable : `factor_value`, `factor_checksum`, `formula` |
| **Trigger FE** | UPDATE/DELETE interdit si référencé dans ledger |
| **Publish run** | `published_snapshot JSONB` |
| **BilanCarboneCalculator** | **FE live** — risque divergence |
| **ActivityDataService.calculateEmissions** | **`return 0`** (stub) |

### Bilan historique change-t-il si ADEME est mis à jour ?

| Chemin | Réponse |
|--------|---------|
| Run publié + ledger | **NON** — valeurs figées |
| BilanCarboneCalculator recalcul | **OUI** — FE live |
| Totaux bilans_carbone stockés | **NON** sans recalcul |

---

## 8. DÉPENDANCES

### Frontend
`useEmissionFactors.tsx`, `BilanCarboneCalculator.ts`, `dynamicCarbonCalculations.ts`, `EmissionFactorSelector.tsx`, exports PDF/PPTX, dashboards, `AdemeImporter.tsx`, moteurs ACV/CBAM/PCF.

### Backend
`factors.ts`, `calculate.ts`, `runs.ts`, `importPipeline.ts`, `carbon-engine/`.

### Ce qui casserait si on change le modèle FE
- Requêtes Supabase `emission_factors` (slug/emission_factor)
- Defaults hardcodés BilanCarboneCalculator
- Import pipeline → `emission_factors_legacy`
- OpenAPI obsolète
- Presets monétaires hardcodés

---

## 9. API FACTEURS D'ÉMISSION

| METHOD | URL | Fichier | Tables |
|--------|-----|---------|--------|
| GET | `/v1/factors` | `factors.ts` | emission_factors, versions, sources |
| POST | `/v1/calculate` | `calculate.ts` | factors, runs, ledger |
| GET | `/v1/runs` | `runs.ts` | calculation_runs |
| GET | `/v1/runs/:runId` | `runs.ts` | runs + ledger |
| POST | `/v1/runs/:runId/publish` | `runs.ts` | runs |
| GET | `/v1/ledger/:lineId/provenance` | `runs.ts` | ledger |
| GET | `/v1/public/emission-factors` | `public.ts` | hardcodé |
| POST | `/v1/public/free-bilan/calculate` | `public.ts` | sans persistance |
| POST | `/v1/functions/import-ademe-factors` | `legacy-functions.ts` | **501 stub** |

OpenAPI `GET /emission-factors` (ILIKE, pagination) : **non implémenté** tel quel.

---

## 10. TESTS

| Fichier | Couverture |
|---------|------------|
| `packages/carbon-engine/src/index.test.ts` | calculateEmission, hashes |
| `packages/carbon-engine/src/reference/case-001-*.test.ts` | Gaz naturel |
| `packages/carbon-engine/src/reference/case-002-*.test.ts` | Électricité |
| `apps/web/src/lib/__tests__/bilanCarboneCalculator.test.ts` | defaults, scopes |
| `apps/web/src/lib/__tests__/dynamicCarbonCalculations.test.ts` | questionnaires |
| `apps/web/src/modules/acv/engine/__tests__/*` | ACV |

**Sans test :** intégration API `/v1/factors` / `/v1/calculate` avec DB, import ADEME, conversions multi-source.

---

## 11. RISQUES MULTI-SOURCES

| ID | Niveau | Problème |
|----|--------|----------|
| R1 | **CRITIQUE** | Deux modèles FE incompatibles |
| R2 | **CRITIQUE** | Dashboard via BilanCarboneCalculator, pas ledger |
| R3 | **CRITIQUE** | Frontend Supabase legacy ; registre = 8 facteurs seed |
| R4 | **CRITIQUE** | ActivityDataService.calculateEmissions → 0 |
| R5 | **IMPORTANT** | Import ADEME legacy seulement ; stub 501 |
| R6 | **IMPORTANT** | Pas conversion unités dans carbon-engine |
| R7 | **IMPORTANT** | Recherche full-table client |
| R8 | **IMPORTANT** | `source` = TEXT libre côté legacy |
| R9 | **MINEUR** | OpenAPI désaligné |

**Verdict :** registre versionné **conçu** pour multi-source, mais **~95 % du produit** dépend encore du modèle legacy ADEME-centric.

---

## 12. RAPPORT FINAL

| Élément | État actuel | Fichier/code | Risque multi-source |
|---------|-------------|--------------|---------------------|
| PostgreSQL | Double schéma legacy + certifiable | `db/migrations/` | CRITIQUE |
| Facteurs ADEME | Table plate legacy ; 8 seed TN | `import-ademe-factors/`, `012` | CRITIQUE |
| Recherche FE | Full-table + Fuse.js | `EmissionFactorSearch.tsx`, `factors.ts` | IMPORTANT |
| Calcul carbone | qty×FE×alloc + legacy React | `carbon-engine/`, `BilanCarboneCalculator.ts` | CRITIQUE |
| Unités | Table existe ; engine ne convertit pas | `006`, `UnitConversionService.ts` | IMPORTANT |
| Facteurs monétaires | kgCO₂e/EUR et TND hardcodés | `MonetaryFactorPresets.tsx` | IMPORTANT |
| Scopes | Saisie + inférence + line API | `activity_data`, `calculate.ts` | MINEUR |
| Traçabilité | Ledger oui ; UI legacy recalc live | `011`, `calculation_ledger` | CRITIQUE |
| API | `/v1/factors`, `/v1/calculate` | `apps/api/src/routes/` | IMPORTANT |
| Frontend | Couplé Supabase + defaults | `useEmissionFactors.tsx` | CRITIQUE |
| Tests | Unit carbon-engine ; pas intégration | `packages/carbon-engine/` | IMPORTANT |

### A. Schéma actuel réel

```
[LEGACY — production UI]
Supabase emission_factors → Frontend → Edge import-ademe-factors (JSON)

[CIBLE — certifiable]
factor_sources → versions → factors (8 seed)
  → GET /v1/factors → POST /v1/calculate → ledger → publish snapshot

[PARALLÈLE]
importPipeline → emission_factors_legacy
```

### B. Workflow calcul certifiable

```
Utilisateur → factorId + activité
→ POST /v1/calculate
→ carbon-engine: activity × factor × allocation
→ calculation_ledger (snapshot factor_value)
→ (optionnel) publish → published_snapshot
```

### B2. Workflow legacy (majoritaire)

```
Questionnaire → BilanCarboneCalculator.calculate()
→ org FE [vide] → DB/API → ~100 defaults hardcodés
→ quantity × emission_factor → scopes 1/2/3
(pas de ledger)
```

### C. 10 fichiers les plus importants

1. `db/migrations/001_trust_core.sql`
2. `db/migrations/011_proof_model_alignment.sql`
3. `packages/carbon-engine/src/calculateEmission.ts`
4. `apps/api/src/routes/calculate.ts`
5. `apps/api/src/routes/factors.ts`
6. `apps/web/src/lib/calculators/BilanCarboneCalculator.ts`
7. `apps/api/legacy-edge-functions-ref/import-ademe-factors/index.ts`
8. `apps/web/src/components/superadmin/AdemeImporter.tsx`
9. `apps/api/src/services/importPipeline.ts`
10. `db/legacy-migrations-ref/20250720163452-*.sql`

### D. Problèmes bloquants multi-source

1. Deux tables `emission_factors` sémantiquement différentes
2. Frontend non migré vers registre versionné
3. Import ADEME n'alimente pas `factor_sources`
4. Calculs produit hors ledger
5. Pas de conversion d'unités dans moteur certifiable
6. Recherche non scalable
7. Defaults hardcodés Tunisia/ADEME
8. Pas de modèle unifié FE monétaires / physiques / ACV

### E. Non déterminable depuis le code seul

- Nombre exact de facteurs ADEME en production
- DB active (Supabase vs PostgreSQL migré)
- Couverture ADEME vs Base Carbone complète
- Performance recherche à l'échelle

---

*Audit read-only — 11 sept. 2026 — NewCarboScan2027*
