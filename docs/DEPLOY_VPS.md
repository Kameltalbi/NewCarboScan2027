# Déploiement VPS — Newcarboscan-2027

Stack Docker : `postgres` → `migrate` (001–012) → `api` → `web` (nginx).

## Prérequis

- VPS Linux (2 Go RAM mini recommandé)
- Docker + Docker Compose plugin
- Domaine pointé vers le VPS (TLS via Caddy/Traefik/nginx host, optionnel)

## 1. Préparer le serveur

```bash
git clone <repo> /opt/newcarboscan
cd /opt/newcarboscan
cp .env.example .env
nano .env
```

Renseigner au minimum :

| Variable | Exemple |
|---|---|
| `POSTGRES_PASSWORD` | secret fort |
| `JWT_SECRET` | secret fort (≥32 chars) |
| `CORS_ORIGINS` | `https://ton-domaine.tld` |
| `VITE_API_URL` | **vide** (nginx same-origin) |
| `HTTP_PORT` | `80` |
| `IMPORT_ADMIN_TOKEN` | token admin import |

## 2. Lancer

```bash
docker compose up -d --build
docker compose ps
curl -fsS http://127.0.0.1/health
```

Attendu : `{"ok":true,"db":true,...}`

## 3. TLS (recommandé)

Terminer TLS sur l’hôte (Caddy / Traefik / certbot) et proxy vers `HTTP_PORT`.

Exemple Caddy :

```caddy
ton-domaine.tld {
  reverse_proxy 127.0.0.1:80
}
```

Puis `CORS_ORIGINS=https://ton-domaine.tld`.

## 4. Migrations

Appliquées automatiquement au démarrage (`migrate` service + `scripts/migrate.sh`).  
Ré-exécution idempotente via table `schema_migrations`.

Manuellement :

```bash
docker compose run --rm migrate
```

## 5. Dev local

```bash
cp .env.example .env
npm run db:up          # postgres + port 5432
npm run db:migrate
npm run build:engine
npm run dev:api        # :8080
npm run dev:web        # :5173
```

## 6. Ce qui est prêt / pas prêt

**Prêt :** pages publiques (auth, blog, leads, bilan gratuit), API trust, noyau `/app/bilan-carbone/preuve`, health DB.

**Pas encore certifiable en prod :** écrans `/app/*` encore branchés sur le Proxy Supabase (hors noyau preuve) — voir `docs/MIGRATION_UI_SUPABASE_PURGE.md`.

## 7. Rollback

```bash
docker compose down
# volume DB conservé : ncs_pg_data
docker compose up -d --build
```

Sauvegardes : snapshot volume `ncs_pg_data` avant mise à jour.
