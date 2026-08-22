# Threat model (prod interne)

Périmètre : API Fastify + JWT, Postgres, SPA React. Pas de gateway table générique.

## Actifs

- Données tenant (bilans, activity_data, evidence)
- Secrets (`JWT_SECRET`, `POSTGRES_PASSWORD`, `IMPORT_ADMIN_TOKEN`)
- Sessions navigateur (`ncs_token`)

## Menaces retenues

| Menace | Mitigation actuelle | Reste |
|---|---|---|
| Lecture cross-tenant | `requireOrgMember` + `organization_id` dans les SQL | Tests live DB optionnels (`DATABASE_URL`) |
| Gateway PostgREST | Proxy `supabase` qui throw ; routes nommées seulement | Fichiers legacy encore en `supabase.from` — crash, pas de fuite |
| JWT faible / volé | Secret env, HTTPS | Rotation non automatisée |
| CORS ouvert | `CORS_ORIGINS` | Vérifier la valeur VPS à chaque deploy |
| Dump client | Import admin token, pas de delete des 10 orgs | Accès superadmin à durcir (2FA hors scope) |
| Affirmations climat inventées | `lint-invented-claims.sh` en CI | Marketing public encore partiel |

## Hors scope actuel

Chiffrement champ à champ, SLA contractuel, pack ADEME officiel, moteur unique certifiable, OCR/dataroom storage.
