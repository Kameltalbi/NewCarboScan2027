#!/usr/bin/env bash
# Sauvegarde PostgreSQL chiffrée AES-256 (openssl).
# Usage : BACKUP_PASSPHRASE=... ./scripts/backup-encrypted.sh
set -euo pipefail
STAMP=$(date +%Y%m%d-%H%M)
DEST_DIR=${DEST_DIR:-dumps}
mkdir -p "$DEST_DIR"
RAW="$DEST_DIR/ncs-${STAMP}.dump"
ENC="$RAW.enc"
: "${BACKUP_PASSPHRASE:?BACKUP_PASSPHRASE required}"

ssh "${BACKUP_SSH_HOST:-ciblix-vps}" 'cd /opt/newcarboscan-2027 && docker compose exec -T postgres \
  sh -c "pg_dump -U \"$POSTGRES_USER\" -d \"$POSTGRES_DB\" --no-owner --format=custom"' \
  > "$RAW"
openssl enc -aes-256-cbc -pbkdf2 -salt -in "$RAW" -out "$ENC" -pass env:BACKUP_PASSPHRASE
rm -f "$RAW"
ls -lh "$ENC"
echo "Encrypted backup written to $ENC"
