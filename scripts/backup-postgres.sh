#!/usr/bin/env bash
# Sauvegarde Postgres NewCarboScan — dump custom + chiffrement optionnel (AES-256-CBC).
# Usage (cron recommandé quotidien) :
#   0 2 * * * cd /opt/newcarboscan-2027 && ./scripts/backup-postgres.sh >> /var/log/ncs-backup.log 2>&1
#
# Variables :
#   BACKUP_DIR     (défaut: ./dumps)
#   BACKUP_KEEP    (défaut: 14 dumps)
#   BACKUP_ENCRYPT_KEY  si défini → produit .dump.enc (openssl aes-256-cbc)
#   (chargé depuis .env si absent de l'environnement)
set -euo pipefail
cd "$(dirname "$0")/.."

if [[ -z "${BACKUP_ENCRYPT_KEY:-}" && -f .env ]]; then
  # shellcheck disable=SC1091
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

if docker compose version >/dev/null 2>&1; then
  dc() { docker compose "$@"; }
elif command -v docker-compose >/dev/null 2>&1; then
  dc() { docker-compose "$@"; }
else
  echo "docker compose / docker-compose introuvable" >&2
  exit 1
fi

STAMP=$(date +%Y%m%d-%H%M)
DEST_DIR="${BACKUP_DIR:-dumps}"
KEEP="${BACKUP_KEEP:-14}"
mkdir -p "$DEST_DIR"
RAW="${DEST_DIR}/ncs-${STAMP}.dump"

set -o noclobber
dc exec -T postgres \
  sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --no-owner --format=custom' \
  > "$RAW"
set +o noclobber

# Vérifier en-tête PGDMP
head -c 5 "$RAW" | grep -q PGDMP

if [[ -n "${BACKUP_ENCRYPT_KEY:-}" ]]; then
  openssl enc -aes-256-cbc -salt -pbkdf2 \
    -in "$RAW" \
    -out "${RAW}.enc" \
    -pass "env:BACKUP_ENCRYPT_KEY"
  rm -f "$RAW"
  echo "OK encrypted backup ${RAW}.enc"
  ls -lh "${RAW}.enc"
else
  echo "OK backup $RAW (set BACKUP_ENCRYPT_KEY to encrypt)"
  ls -lh "$RAW"
fi

# Rétention locale
mapfile -t OLD < <(ls -1t "$DEST_DIR"/ncs-*.dump "$DEST_DIR"/ncs-*.dump.enc 2>/dev/null | tail -n +"$((KEEP + 1))" || true)
for f in "${OLD[@]:-}"; do
  [[ -n "$f" ]] && rm -f "$f"
done

# Purge retention applicative (login_attempts 1 an, tokens expirés)
dc exec -T postgres \
  sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "SELECT ncs_run_retention();"' \
  >/dev/null || true
