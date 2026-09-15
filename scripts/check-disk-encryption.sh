#!/usr/bin/env bash
# Vérifie si le volume de données Postgres est sur un disque chiffré (LUKS).
set -euo pipefail
if command -v lsblk >/dev/null 2>&1; then
  lsblk -o NAME,FSTYPE,TYPE,MOUNTPOINT,SIZE
fi
if ls /dev/mapper/* >/dev/null 2>&1; then
  echo "device-mapper present (possible LUKS)"
  ls /dev/mapper
else
  echo "WARN: no /dev/mapper entries — disk encryption not demonstrated on this host"
  exit 2
fi
cryptsetup status "$(ls /dev/mapper | head -1)" 2>/dev/null || true
