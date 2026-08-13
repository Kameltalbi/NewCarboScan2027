# Déploiement VPS — Newcarboscan-2027

Stack Docker : `postgres` → `migrate` (001–013) → `api` → `web` (nginx).

## Production actuelle

| Élément | Valeur |
|---|---|
| Domaine | https://www.ktoptima.com (et `ktoptima.com`) |
| VPS | `ciblix-vps` (`213.130.144.183`) |
| Chemin | `/opt/newcarboscan-2027` |
| Proxy hôte | nginx `000-ktoptima` → `127.0.0.1:9087` |
| Santé | https://www.ktoptima.com/health |

Ancien site Ciblix CRM sur ce domaine : config nginx sauvegardée dans `/etc/nginx/sites-backup/`.

## Prérequis

- VPS Linux (2 Go RAM mini recommandé)
- Docker + `docker-compose` v2
- Domaine pointé vers le VPS (TLS via certbot / nginx host)

## 1. Déployer / mettre à jour

```bash
rsync -az --delete --exclude node_modules --exclude .git --exclude .env --exclude '**/dist' \
  ./ ciblix-vps:/opt/newcarboscan-2027/
ssh ciblix-vps 'cd /opt/newcarboscan-2027 && docker-compose up -d --build'
curl -fsS https://www.ktoptima.com/health
```

Variables `.env` (sur le serveur, chmod 600) :

| Variable | Exemple |
|---|---|
| `POSTGRES_PASSWORD` | secret fort |
| `JWT_SECRET` | secret fort (≥32 chars) |
| `CORS_ORIGINS` | `https://www.ktoptima.com,https://ktoptima.com` |
| `VITE_API_URL` | vide (same-origin) |
| `HTTP_PORT` | `127.0.0.1:9087` |

## 2. Migrations

Automatiques au démarrage (`migrate` + `schema_migrations`).

```bash
docker-compose -f /opt/newcarboscan-2027/docker-compose.yml run --rm migrate
```

## 3. Rollback

```bash
cd /opt/newcarboscan-2027 && docker-compose down
# volume DB conservé : ncs_pg_data
# nginx Ciblix : restaurer depuis /etc/nginx/sites-backup/ puis reload
```
