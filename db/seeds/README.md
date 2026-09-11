# Seeds (DATA bootstrap)

## Distinction SCHEMA vs DATA

| Couche | Emplacement | Enregistré dans `schema_migrations` ? |
|--------|-------------|--------------------------------------|
| **SCHEMA bootstrap** | `db/migrations/0*.sql` | Oui (`filename` = basename) |
| **DATA bootstrap** | `db/seeds/*.sql` | **Non** — chargé avant `016` si besoin |

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

## Rôle dans le runner

`scripts/migrate-docker.sh` et `scripts/migrate.sh` :

1. Appliquent les migrations `0*.sql` dans l'ordre lexicographique.
2. **Avant** `016_migrate_ademe_base_carbone_v239.sql`, si `COUNT(*)` ADEME v23.9 en legacy = 0 → appliquent ce seed.
3. Si des lignes ADEME v23.9 existent déjà → skip seed.

Puis `016` migre les 7394 ADEME vers le registre versionné.

## Régénération

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
