#!/usr/bin/env bash
# backup-uploads.sh — Copia /uploads/ a un destino de backup con timestamp.
# Uso: bash scripts/backup-uploads.sh [DESTINO_BASE]
# Ejemplo cron (diario a las 2am):
#   0 2 * * * /bin/bash /app/scripts/backup-uploads.sh /mnt/backups >> /var/log/backup-uploads.log 2>&1

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
API_DIR="$(dirname "$SCRIPT_DIR")"
UPLOADS_SRC="${API_DIR}/uploads"
BACKUP_BASE="${1:-/tmp/marketplace-backups}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DEST="${BACKUP_BASE}/uploads_${TIMESTAMP}"

if [ ! -d "$UPLOADS_SRC" ]; then
  echo "[backup] ERROR: directorio de uploads no encontrado: $UPLOADS_SRC"
  exit 1
fi

mkdir -p "$BACKUP_BASE"

echo "[backup] Iniciando backup: $UPLOADS_SRC → $BACKUP_DEST"
cp -r "$UPLOADS_SRC" "$BACKUP_DEST"
echo "[backup] Backup completado: $BACKUP_DEST"

# Retener solo los últimos 7 backups
ls -dt "${BACKUP_BASE}"/uploads_* 2>/dev/null | tail -n +8 | xargs -r rm -rf
echo "[backup] Limpieza: se conservan máximo 7 backups recientes"
