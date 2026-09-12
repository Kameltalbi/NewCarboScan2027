# Seeds (DATA bootstrap)

## Distinction SCHEMA vs DATA

| Couche | Emplacement | Enregistré dans `schema_migrations` ? |
|--------|-------------|--------------------------------------|
| **SCHEMA bootstrap** | `db/migrations/0*.sql` | Oui (`filename` = basename) |
| **DATA bootstrap** | `db/seeds/*.sql` | **Non** en soi — chargé par le runner autour d'une migration (016 / 022) |

Les migrations 001–015 créent la table vide `emission_factors_legacy`.  
Les 8135 facteurs legacy **ne sont pas** produits par les migrations SQL : ils viennent de ce seed.

## `emission_factors_legacy.sql`

| Champ | Valeur |
|-------|--------|
| **Lignes totales** | 8135 |
| **ADEME Base Carbone v23.9** | 7394 |
| **SHA-256 (lignes COPY uniquement, séparées par LF)** | `cce9f30811efe11c3fe9c6ddeb1e43a7395fed312afae0ae5e847c170ee4b9b9` |
| **Origine** | Export Supabase CarboScan → `dumps/supabase-export.json` (gitignoré) |
| **Label export** | `carboscan-all-2026-08-22` |
| **exportedAt** | `2026-08-22T11:59:51.791Z` |
| **source export** | `carboscan_supabase` |
| **Contenu** | Uniquement facteurs d'émission legacy (pas users, orgs, tokens, credentials) |
| **Colonnes seed** | `id`, `factor_name`, `nom_affiche`, `slug`, `emission_factor`, `unit`, `category`, `subcategory`, `source`, `year`, `legacy_source`, `legacy_id`, `raw_legacy`, `name` |
| **Idempotence** | `ON CONFLICT (id) DO NOTHING` |

Note : ~25 libellés ADEME contiennent le caractère Unicode U+0085 (NEL) présent dans la source ; ce n'est pas un séparateur de ligne COPY (`\n`).

## `uk_gov_ghg_2026_flat_1_2.sql`

Seed **déterministe** UK Government GHG Conversion Factors 2026 (Flat File v1.2).

| Champ | Valeur |
|-------|--------|
| **Facteurs** | 2622 (`kg CO2e` valués uniquement) |
| **Format** | SQL `COPY` (comme ADEME legacy) — généré, jamais écrit à la main |
| **SHA-256 seed (fichier complet)** | `228c0c2ebbfc4fc189314b8777c074cc8b2c1b0c2227b5718652b7a109b5f52d` |
| **SHA-256 source XLSX officiel** | `a9a455ab396dae226d510c7be6233748416d490c41a5d20f3dc7a0c45feecd5e` |
| **Licence** | OGL-3.0 |
| **Gouvernance bootstrap** | `draft` / `hidden` / `calculation disabled` / `resolver disabled` |
| **source_key** | `uk_gov_ghg` |
| **dataset_version** | `2026-flat-1.2` |
| **UUID source** | `a3000000-0000-4000-8000-000000000001` |
| **UUID version** | `a3000000-0000-4000-8000-000000000002` |
| **UUID facteurs** | UUID v5(namespace=version UUID, name=`stable_factor_id`) |

**Deux checksums distincts (ne pas confondre) :**

1. **Source officielle XLSX** — fichier DESNZ révisé  
2. **Seed canonique** — artefact Git dérivé via l'adapter `apps/api/src/importers/ukGovGhg/`

Le XLSX / PDF methodology **ne sont pas** versionnés dans Git.  
Régénération (machine de génération uniquement) :

```bash
npm run generate:uk-ghg-seed -- /path/to/ghg-conversion-factors-2026-flat-format-revised.xlsx
# écrit db/seeds/uk_gov_ghg_2026_flat_1_2.sql
# SHA-256 XLSX doit être a9a455ab… sinon STOP
```

Fresh DB : le runner charge ce seed **sans** XLSX, sans Desktop, sans réseau.

## Rôle dans le runner

`scripts/migrate-docker.sh` et `scripts/migrate.sh` :

1. Appliquent les migrations `0*.sql` dans l'ordre lexicographique.
2. **Avant** `016_migrate_ademe_base_carbone_v239.sql`, si `COUNT(*)` ADEME v23.9 en legacy = 0 → appliquent `emission_factors_legacy.sql`.
3. **Avant** `022_bootstrap_uk_gov_ghg_2026.sql` :
   - UK absent → apply `uk_gov_ghg_2026_flat_1_2.sql`
   - UK = 2622 + draft/hidden/disabled/disabled → skip
   - partial / mauvaise gouvernance / incohérent → **FAIL**
4. `022_*.sql` exécute les post-checks (journal `schema_migrations`).
5. **Avant** `025_bootstrap_epa_ghg_hub_2025.sql` :
   - EPA absent → apply `epa_ghg_emission_factors_hub_2025.sql`
   - EPA = 1421 + draft/hidden/disabled/disabled → skip
   - partial / mauvaise gouvernance → **FAIL**

## `epa_ghg_emission_factors_hub_2025.sql`

Seed **déterministe** US EPA GHG Emission Factors Hub 2025.

| Champ | Valeur |
|-------|--------|
| **Facteurs** | 1421 |
| **Format** | SQL `COPY` — généré via `apps/api/src/importers/epaHub2025/` |
| **SHA-256 seed (fichier complet)** | `8dace7ec6e486d7f1083802352f4037ebba3d0793342a3144d44f0b1279130ca` |
| **SHA-256 source XLSX officiel** | `43afb91d79b2ae765b3a447549d9e1021a144a407cec5eb804be9fcf69a668a7` |
| **Gouvernance bootstrap** | `draft` / `hidden` / `calculation disabled` / `resolver disabled` |
| **source_key** | `epa_ghg_emission_factors_hub` |
| **dataset_version** | `2025` |
| **UUID source** | `a4000000-0000-4000-8000-000000000001` |
| **UUID version** | `a4000000-0000-4000-8000-000000000002` |

```bash
EPA_XLSX=/path/to/ghg-emission-factors-hub-2025.xlsx npm run generate:epa-hub-2025-seed
```

Rapport : `docs/EPA_2025_IMPORT_REPORT.md`.

## Régénération ADEME legacy

```bash
# Prérequis : dumps/supabase-export.json (hors git), même schéma entities.emission_factors
python3 - <<'PY'
# Rejouer le générateur utilisé pour créer db/seeds/emission_factors_legacy.sql
# (COPY text escapé, INSERT ON CONFLICT DO NOTHING, post-check 8135 / 7394)
# Puis recalculer le SHA-256 des lignes COPY (split sur \\n uniquement, pas splitlines()).
PY
```

Ou ré-exporter depuis Supabase :

```bash
SUPABASE_DB_URL='...' node scripts/export-supabase-dump.mjs --out dumps/supabase-export.json
# puis régénérer le seed SQL à partir de entities.emission_factors uniquement
```

Vérifier après régénération : total=8135, ADEME v23.9=7394, pas de colonnes `organization_id` / secrets.
