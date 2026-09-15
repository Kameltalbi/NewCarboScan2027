# Runbook backup / restore — PostgreSQL CarboScan

Stack : Postgres 16 Docker `newcarboscan-postgres`, volume Docker `ncs_pg_data`.
Base par défaut : `newcarboscan` (user `POSTGRES_USER`).

**Ne jamais restaurer un dump sur la production sans validation explicite.**
**Ne jamais écraser un fichier de sauvegarde existant.**

## Où sont stockés les backups

| Lieu | Rôle |
|---|---|
| VPS `/opt/newcarboscan-2027/dumps/` | dumps datés sur le serveur |
| Machine locale `dumps/` (hors Git : `*.dump`, `*.sql`, `*.json`) | copie hors site |
| Copie supplémentaire (disque / autre hôte) | rétention ≥ 7 jours + 1 dump **avant chaque déploiement** |

Nom de fichier **unique** (horodatage à la minute) : `ncs-YYYYMMDD-HHMM.dump`.

---

## 0. Sauvegarde automatique (recommandé)

Script : `scripts/backup-postgres.sh` (dump custom + rétention + `ncs_run_retention()`).

```bash
# Cron quotidien 02:00 — dumps chiffrés AES-256-CBC si BACKUP_ENCRYPT_KEY est défini
0 2 * * * cd /opt/newcarboscan-2027 && BACKUP_ENCRYPT_KEY='…' ./scripts/backup-postgres.sh >> /var/log/ncs-backup.log 2>&1
```

Copier ensuite `${BACKUP_DIR}` hors du VPS. Restauration d’un `.dump.enc` :

```bash
openssl enc -d -aes-256-cbc -pbkdf2 -in dumps/ncs-….dump.enc -out dumps/ncs-….dump -pass env:BACKUP_ENCRYPT_KEY
# puis §3 pg_restore
```

## 1. Créer un dump complet (custom `pg_dump`)

Depuis la machine locale (le dump est écrit **ici**, pas écrasé : `noclobber`) :

```bash
set -o noclobber
STAMP=$(date +%Y%m%d-%H%M)
DEST="dumps/ncs-${STAMP}.dump"

# pg_dump dans le conteneur, avec les variables d'environnement du service postgres
ssh ciblix-vps 'cd /opt/newcarboscan-2027 && docker compose exec -T postgres \
  sh -c "pg_dump -U \"\$POSTGRES_USER\" -d \"\$POSTGRES_DB\" --no-owner --format=custom --verbose"' \
  > "$DEST"
```

Variante tout-sur-le-VPS (fichier créé dans `/opt/newcarboscan-2027/dumps/`) :

```bash
ssh ciblix-vps 'set -o noclobber
cd /opt/newcarboscan-2027
mkdir -p dumps
STAMP=$(date +%Y%m%d-%H%M)
DEST="dumps/ncs-${STAMP}.dump"
docker compose exec -T postgres sh -c \
  "pg_dump -U \"\$POSTGRES_USER\" -d \"\$POSTGRES_DB\" --no-owner --format=custom" \
  > "$DEST"
ls -lh "$DEST"
'
```

Dump SQL texte (debug uniquement, plus lourd) :

```bash
set -o noclobber
ssh ciblix-vps 'cd /opt/newcarboscan-2027 && docker compose exec -T postgres \
  sh -c "pg_dump -U \"\$POSTGRES_USER\" -d \"\$POSTGRES_DB\" --no-owner --format=plain"' \
  > "dumps/ncs-$(date +%Y%m%d-%H%M).sql"
```

`set -o noclobber` (zsh/bash) : si `dumps/ncs-….dump` existe déjà, la redirection **échoue** au lieu d’écraser.

---

## 2. Vérifier que le fichier a bien été créé

```bash
# Taille non nulle + en-tête custom pg_dump (PGDMP)
ls -lh "$DEST"
test -s "$DEST"
# Les dumps custom commencent par PGDMP
head -c 5 "$DEST"; echo

# Inventaire logique (ne restaure rien)
pg_restore --list "$DEST" | head
```

Sur le VPS si le dump y est resté :

```bash
ssh ciblix-vps 'ls -lh /opt/newcarboscan-2027/dumps/ncs-*.dump | tail'
```

Critères d’acceptation :

- fichier présent, taille > 0 (en pratique plusieurs Mo si données clients) ;
- `head -c 5` affiche `PGDMP` pour un dump `--format=custom` ;
- `pg_restore --list` liste des tables (`organizations`, `bilans_carbone`, etc.).

Copier ensuite hors du VPS. Ne pas commiter le dump.

---

## 3. Restaurer complètement (staging d’abord — jamais automatique)

Prérequis : dump custom vérifié, **nouveau** dump de secours de l’état actuel, validation explicite.

```bash
# 1) Dump de secours de l'état actuel (nom unique, noclobber)
set -o noclobber
STAMP=$(date +%Y%m%d-%H%M)
ssh ciblix-vps 'cd /opt/newcarboscan-2027 && docker compose exec -T postgres \
  sh -c "pg_dump -U \"\$POSTGRES_USER\" -d \"\$POSTGRES_DB\" --no-owner --format=custom"' \
  > "dumps/ncs-pre-restore-${STAMP}.dump"

# 2) Stopper API + web (Postgres reste up)
ssh ciblix-vps 'cd /opt/newcarboscan-2027 && docker compose stop api web'

# 3) Restaurer dans la base existante (--clean droppe les objets du dump puis recrée)
#    À lancer UNIQUEMENT après validation.
ssh ciblix-vps 'cd /opt/newcarboscan-2027 && docker compose exec -T postgres \
  sh -c "pg_restore -U \"\$POSTGRES_USER\" -d \"\$POSTGRES_DB\" --clean --if-exists --no-owner --verbose"' \
  < dumps/ncs-YYYYMMDD-HHMM.dump

# 4) Réappliquer les migrations éventuellement plus récentes que le dump
ssh ciblix-vps 'cd /opt/newcarboscan-2027 && docker compose run --rm migrate'

# 5) Redémarrer
ssh ciblix-vps 'cd /opt/newcarboscan-2027 && docker compose start api web'
curl -fsS https://www.ktoptima.com/health
```

Ne pas utiliser `--clean` sur une autre base que celle visée. Ne pas pointer `pg_restore` vers un fichier déjà utilisé comme destination de dump.

---

## 4. Checklist go-live (hors restauration)

- [ ] Dump custom créé **et** vérifié (`PGDMP`, taille, `--list`) **avant** le déploiement
- [ ] Copie hors VPS
- [ ] `POSTGRES_PASSWORD` et `JWT_SECRET` forts, `.env` chmod 600, **pas** les placeholders de `.env.example`
- [ ] `CORS_ORIGINS=https://www.ktoptima.com,https://ktoptima.com` (pas `*`, pas `localhost`)
- [ ] TLS nginx hôte, `HTTP_PORT=127.0.0.1:9087`
- [ ] `VITE_API_URL` vide en Docker (same-origin)
- [ ] Modules gelés (WattBim) non cliquables
- [ ] Smoke-test login → dashboard → collecte (voir `docs/DEPLOY_VPS.md`)
