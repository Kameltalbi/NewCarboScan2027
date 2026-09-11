# Migration ADEME Base Carbone v23.9 — Rollback

Migration : `db/migrations/016_migrate_ademe_base_carbone_v239.sql`

## Identifiants stables créés

| Entité | UUID fixe | Clé naturelle |
|--------|-----------|---------------|
| `factor_sources` | `a2000000-0000-4000-8000-000000000001` | name = `ADEME Base Carbone` |
| `emission_factor_versions` | `a2000000-0000-4000-8000-000000000002` | `(source_id, version_label)` = (`…0001`, `23.9`) — **status = `draft`** (non exposée via `GET /v1/factors` tant que non activée) |

## Marquage des lignes migrées

Chaque facteur inséré porte :

```json
metadata.migration_id = "016_ademe_bc_v239"
metadata.legacy_table = "emission_factors_legacy"
metadata.legacy_row_id = "<uuid legacy>"
```

## Rollback complet (sans toucher au legacy)

Exécuter dans une transaction :

```sql
BEGIN;

-- 1. Supprimer uniquement les FE migrés par 016 (pas le seed TN ni le ledger)
DELETE FROM emission_factors
WHERE metadata->>'migration_id' = '016_ademe_bc_v239';

-- 2. Supprimer la version 23.9 si plus aucun FE ne la référence
DELETE FROM emission_factor_versions
WHERE id = 'a2000000-0000-4000-8000-000000000002'
  AND NOT EXISTS (
    SELECT 1 FROM emission_factors f
    WHERE f.version_id = 'a2000000-0000-4000-8000-000000000002'
  );

-- 3. Optionnel : supprimer la source ADEME si orpheline
DELETE FROM factor_sources
WHERE id = 'a2000000-0000-4000-8000-000000000001'
  AND NOT EXISTS (
    SELECT 1 FROM emission_factor_versions v WHERE v.source_id = factor_sources.id
  );

-- 4. Vérifier que legacy intact
SELECT COUNT(*) FROM emission_factors_legacy
WHERE source = 'ADEME Base Carbone v23.9';

COMMIT;
```

## Rollback partiel (re-run migration)

La migration est idempotente (`ON CONFLICT (stable_factor_id, version_number)`).
Un second run ne double pas les lignes.

## Prérequis avant rollback en production

1. Vérifier qu'aucun `activity_data.factor_id` ne pointe vers un FE `016_ademe_bc_v239`
   (attendu : 0 à cette étape).
2. Vérifier qu'aucune ligne `calculation_ledger` ne référence ces facteurs
   (attendu : 0 à cette étape).
3. Dump Postgres si environnement partagé.

## Fonctions SQL laissées en place

- `ef_migrate_normalize_unit(text)` — normalisation unités
- `ef_migrate_extract_geography(text, text, text)` — géographie explicite uniquement
- `ef_migrate_extract_factor_year(text)` — année métier depuis libellé
- `ef_migrate_factor_checksum(...)` — checksum documenté dans 016

Peuvent être supprimées après validation :

```sql
DROP FUNCTION IF EXISTS ef_migrate_normalize_unit(text);
DROP FUNCTION IF EXISTS ef_migrate_extract_geography(text, text, text);
DROP FUNCTION IF EXISTS ef_migrate_extract_factor_year(text);
DROP FUNCTION IF EXISTS ef_migrate_factor_checksum(text, text, numeric, text, text, text, text);
```
