# Import des données clients CarboScan → Newcarboscan-2027

## Objectif

Pouvoir **réinjecter toute la data client** (organisations, users, collecte, activity_data, bilans, CBAM, PCF, ACV, fournisseurs, rapports…) sans perdre d’information et en respectant le multi-tenant.

## Architecture (4 couches)

```
Export Supabase (JSON)
        │
        ▼
┌─────────────────────┐
│  import_batches     │  job d'import (statut, stats, manifeste)
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│  import_staging     │  lignes brutes JSON (idempotentes via hash)
└─────────┬───────────┘
          │ process ordonné (catalog)
          ▼
┌─────────────────────┐
│  tables métier      │  UUID préservés + raw_legacy (zéro perte)
│  + import_id_map    │  legacy_id → new_id pour FKs
└─────────────────────┘
```

### Migrations

| Fichier | Rôle |
|---|---|
| `004_import_framework.sql` | batches, staging, id_map, catalogue d’entités |
| `005_client_domain_importable.sql` | tables clients + colonnes `legacy_*` / `raw_legacy` |

### Garanties

1. **Préservation d’UUID** quand possible (`id` source = `id` cible)
2. **`raw_legacy JSONB`** : aucune colonne source n’est perdue même si non normalisée
3. **Idempotence** : `UNIQUE(batch_id, entity_type, payload_hash)`
4. **Ordre de dépendances** : `import_entity_catalog.sort_order`
5. **Traçabilité** : `import_batch_id`, `imported_at`, `legacy_source=carboscan_supabase`
6. **Users** : mots de passe temporaires + `must_reset_password=true`

## Appliquer le schéma

```bash
docker compose exec -T postgres psql -U newcarboscan -d newcarboscan < db/migrations/004_import_framework.sql
docker compose exec -T postgres psql -U newcarboscan -d newcarboscan < db/migrations/005_client_domain_importable.sql
```

## Export depuis Supabase (exemple)

Pour chaque table client, exporter en JSON array :

```sql
-- Exemple activity_data d'une org
copy (
  select row_to_json(t) from (
    select * from activity_data where organization_id = '<ORG_UUID>'
  ) t
) to stdout;
```

Ou via l’API Supabase / `pg_dump --data-only` puis conversion JSON.

Assembler un dump :

```json
{
  "label": "acme-2026-08",
  "entities": {
    "users": [ { "id": "...", "email": "..." } ],
    "organizations": [ { "id": "...", "name": "ACME" } ],
    "organization_members": [ { "organization_id": "...", "user_id": "...", "role": "owner" } ],
    "activity_data": [ { "id": "...", "organization_id": "...", "quantity": 12, "unit": "kWh" } ],
    "bilans_carbone": [ ... ],
    "collect_sessions": [ ... ]
  }
}
```

## Import via API

1. Créer un compte admin / owner et récupérer un JWT (`POST /auth/login`)
2. Optionnel : `IMPORT_ADMIN_TOKEN` dans `.env` pour double contrôle

```bash
# Catalogue
curl -H "Authorization: Bearer $JWT" http://localhost:8080/v1/import/catalog

# Batch
curl -X POST -H "Authorization: Bearer $JWT" -H "Content-Type: application/json" \
  -d '{"label":"acme-2026-08"}' \
  http://localhost:8080/v1/import/batches

# Stage (répéter par entityType, max 5000 rows)
curl -X POST -H "Authorization: Bearer $JWT" -H "Content-Type: application/json" \
  -d '{"entityType":"activity_data","rows":[{"legacyId":"...","payload":{...}}]}' \
  http://localhost:8080/v1/import/batches/<BATCH_ID>/stage

# Process
curl -X POST -H "Authorization: Bearer $JWT" \
  http://localhost:8080/v1/import/batches/<BATCH_ID>/process
```

## Import via CLI

```bash
export IMPORT_ADMIN_TOKEN="change-me-import-token"   # même valeur que .env API
export API_URL=http://localhost:8080
node scripts/import-client-dump.mjs ./dumps/acme.json
```

Le header `X-Import-Token` suffit (pas besoin de JWT) pour les routes `/v1/import/*`.

## Vérification

```sql
SELECT * FROM v_import_org_coverage;
SELECT entity_type, status, COUNT(*) FROM import_staging GROUP BY 1,2;
SELECT * FROM import_id_map LIMIT 50;
```

## Entités prioritaires (clients)

Ordre minimal pour un client opérationnel :

1. `users` → `profiles`
2. `organizations` → `organization_members`
3. `collect_sites` → `collect_sessions` → `collect_responses` / `collect_files`
4. `activity_data` (+ history)
5. `emission_factors` → facteurs org
6. `bilans_carbone` → detail / postes
7. Modules : `cbam_*`, `pcf_*`, `acv_*`, `suppliers`, `climate_*`, `generated_reports`

Les lignes en erreur restent dans `import_staging` (`status=error`) avec `error_message` — rejouables après correction du dump.

## Extension

Pour une nouvelle table legacy :

1. Ajouter la table cible (+ `legacy_*`, `raw_legacy`) dans une migration `006+`
2. Ajouter une ligne dans `import_entity_catalog` (ou migration catalogue)
3. Ajouter un importer dédié ou une entrée `JSON_SHELLS` / `EXTRA_SHELLS` dans `importPipeline.ts`

Couverture schéma : [TABLE_PORT_STATUS.md](./TABLE_PORT_STATUS.md).
