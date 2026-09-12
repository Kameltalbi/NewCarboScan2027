# Déploiement VPS — Newcarboscan-2027

Stack Docker : `postgres` → `migrate` (001–015) → `api` → `web` (nginx conteneur :80).
TLS et HTTP→HTTPS : nginx **hôte** (`000-ktoptima`) → `127.0.0.1:9087`.

**Ne pas déployer sans validation explicite.** Dump PostgreSQL **avant** tout `rsync` / `docker compose up`.
**Ne jamais restaurer la base automatiquement.**

## Production actuelle

| Élément | Valeur |
|---|---|
| Domaines publics | `https://www.ktoptima.com` et `https://ktoptima.com` |
| VPS | `ciblix-vps` (`213.130.144.183`) |
| Chemin | `/opt/newcarboscan-2027` |
| Proxy hôte | nginx `000-ktoptima` → `127.0.0.1:9087` |
| Santé | `https://www.ktoptima.com/health` |
| Volume Postgres | Docker `ncs_pg_data` (conservé par `docker compose down`) |

Le marketing / sitemap peut encore citer `carboscan.io`. L’origine de production réelle est **ktoptima.com**.

Ancien site Ciblix CRM : config nginx sauvegardée dans `/etc/nginx/sites-backup/`.

## Prérequis

- VPS Linux (2 Go RAM mini recommandé)
- Docker + Compose v2
- Domaine pointé vers le VPS (TLS via certbot / nginx hôte)
- `.env` serveur chmod 600, **pas** une copie brute de `.env.example`

Variables `.env` (serveur) :

| Variable | Production attendue |
|---|---|
| `POSTGRES_PASSWORD` | secret fort (≥16), pas `change-me-strong-db-password` |
| `JWT_SECRET` | secret fort (≥32), pas un placeholder `change-me-*` |
| `CORS_ORIGINS` | `https://www.ktoptima.com,https://ktoptima.com` uniquement |
| `VITE_API_URL` | **vide** (same-origin via nginx conteneur) |
| `HTTP_PORT` | `127.0.0.1:9087` |
| `IMPORT_ADMIN_TOKEN` | vide (import désactivé) **ou** secret fort, jamais `change-me-import-token` |
| `DATABASE_URL` | injecté par Compose ; ne pas coller un mot de passe dans le dépôt |

`OPENAI_*` / `SUPABASE_*` : **non utilisés** par l’API Fastify actuelle. Ne pas les mettre dans le frontend (`VITE_*`).

Le nginx **hôte** doit envoyer `X-Forwarded-Proto: https` (le nginx conteneur le relaie).

---

## 0. Avant le déploiement (obligatoire)

1. Dump Postgres vérifié + copie hors VPS — `docs/RUNBOOK_RESTORE.md` (§1–2).
2. Snapshot **code** actuel sur le VPS (rollback applicatif, sans toucher la base) :

```bash
ssh ciblix-vps 'cp -a /opt/newcarboscan-2027 /opt/newcarboscan-2027.bak-$(date +%Y%m%d-%H%M)'
```

3. Confirmer que `/opt/newcarboscan-2027/.env` n’est **pas** écrasé par `rsync` (`--exclude .env`).

---

## 1. Déployer / mettre à jour (après validation)

```bash
rsync -az --delete --exclude node_modules --exclude .git --exclude .env --exclude '**/dist' \
  --exclude dumps \
  ./ ciblix-vps:/opt/newcarboscan-2027/
ssh ciblix-vps 'cd /opt/newcarboscan-2027 && docker compose up -d --build'
curl -fsS https://www.ktoptima.com/health
```

`docker compose up` relance `migrate` (001–015, idempotent via `schema_migrations`).

---

## 2. Migrations de cette version

Automatiques au démarrage du service `migrate`.

| Fichier | Effet | Rétrocompatibilité |
|---|---|---|
| `014_organization_status.sql` | Colonnes `status` / `suspended_*` + CHECK ; FK audit/logs `ON DELETE SET NULL` | Additive. L’ancienne appli peut tourner. |
| `015_sync_bilan_dual_columns.sql` | `UPDATE` : copie `total_kgco2e` → `total_emission` (si null) et `year` → `date_bilan` | Remplit des trous. Pas de DROP. Difficile à annuler sans dump. |

Aucune migration **destructive** (pas de DROP TABLE / DELETE de lignes métier). **Sauvegarde obligatoire** avant exécution. Relancer à la main :

```bash
docker compose -f /opt/newcarboscan-2027/docker-compose.yml run --rm migrate
```

---

## 3. Rollback (sans restauration auto de la base)

Couvre frontend + API. La base **reste** sur `ncs_pg_data` sauf décision explicite.

```bash
# Stopper la nouvelle stack
ssh ciblix-vps 'cd /opt/newcarboscan-2027 && docker compose down'

# Remettre l’arbre applicatif snapshoté (ajuster le suffixe)
ssh ciblix-vps 'rm -rf /opt/newcarboscan-2027 && mv /opt/newcarboscan-2027.bak-YYYYMMDD-HHMM /opt/newcarboscan-2027'

ssh ciblix-vps 'cd /opt/newcarboscan-2027 && docker compose up -d --build'
curl -fsS https://www.ktoptima.com/health
```

- `docker compose down` **ne** supprime **pas** le volume `ncs_pg_data`.
- Migrations 014/015 déjà appliquées : l’ancienne appli reste en général compatible (colonnes en plus, lignes déjà remplies).
- Restauration Postgres : **uniquement** si les données sont corrompues, et **seulement** après validation — `docs/RUNBOOK_RESTORE.md` §3. Jamais dans un script de rollback automatique.
- Nginx Ciblix (autre site) : restaurer depuis `/etc/nginx/sites-backup/` puis `nginx -s reload` — hors périmètre CarboScan sauf incident proxy.

---

## 4. Backup / restore PostgreSQL

Voir `docs/RUNBOOK_RESTORE.md` et `docs/THREAT_MODEL.md`.

- Dumps : VPS `/opt/newcarboscan-2027/dumps/` **et** copie locale `dumps/` (hors Git).
- Noms uniques `ncs-YYYYMMDD-HHMM.dump` ; `set -o noclobber` (pas d’écrasement).
- Vérifier `PGDMP` + `pg_restore --list` avant de considérer le dump valide.

---

## 5. Smoke-test post-déploiement

Parcours : **Login → Dashboard → Collecte**.
Ne pas écrire sur les organisations clientes réelles. Lecture seule, ou org de test dédiée.

### 5.1 Ouverture

1. Navigateur : `https://www.ktoptima.com/` (cadenas TLS, pas d’avertissement cert).
2. `curl -fsS https://www.ktoptima.com/health` → `{"ok":true,...,"db":true}`.
3. `http://www.ktoptima.com/health` redirige en **301** vers HTTPS.

### 5.2 Connexion

4. Aller sur `https://www.ktoptima.com/auth`.
5. Compte de **test** (pas un client) → `/app/dashboard` (superadmin → `/superadmin/dashboard` puis bascule org de test si besoin).
6. Échec attendu avec un mot de passe faux (pas de 5xx).

### 5.3 Dashboard / organisation

7. Le dashboard charge (pas d’écran blanc, pas de toast auth).
8. Nom d’organisation / année cohérents avec les données existantes (pas de totaux inventés si pas de bilan N-1).

### 5.4 Collecte

9. Menu → Collecte : `https://www.ktoptima.com/app/collecte`.
10. Liste / lecture des données **existantes** de l’org de test.
11. Si org de test : créer **une** ligne jetable (libellé `SMOKE-TEST-…`) puis la supprimer. **Sinon s’arrêter à la lecture.**

### 5.5 API / auth / 5xx

12. DevTools → Network : `POST /auth/login` 200 ; `GET /v1/...` 200/401 attendus, **aucun 5xx**.
13. Pas de déconnexion spontanée, pas d’erreur CORS (origine = `https://www.ktoptima.com`).

### 5.6 Logs backend (rapide)

```bash
ssh ciblix-vps 'cd /opt/newcarboscan-2027 && docker compose logs --tail=80 api'
```

Vérifier : pas de stack 500 répétée, pas de `JWT_SECRET` / `CORS` au démarrage, health OK.

---

## 6. HTTPS / CORS (contrôle, sans modifier le nginx hôte)

- TLS Let’s Encrypt sur le nginx **hôte** (certificat `ktoptima.com`, renouvellement certbot).
- API : Helmet (HSTS, CSP, `X-Frame-Options`, etc.) sur `/health` et `/v1` / `/auth`.
- HTML SPA : le nginx hôte peut ne pas renvoyer HSTS ; le premier appel API l’active pour le domaine.
- CORS prod constaté : `https://www.ktoptima.com` et `https://ktoptima.com` autorisés ; `localhost` / origines inconnues refusées. Pas de `*`.
- Si une correction CORS est nécessaire : **uniquement** la ligne `CORS_ORIGINS` du `.env` VPS, puis `docker compose up -d api` — après accord.

Ne pas modifier `/etc/nginx/` ni certbot sans validation.
