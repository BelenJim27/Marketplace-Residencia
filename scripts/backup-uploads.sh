#!/usr/bin/env bash
# Backup de las imágenes de productos (uploads en local).
#
# Las imágenes se almacenan en local por decisión del negocio (no object storage).
# Este script crea un .tar.gz con fecha de la carpeta de uploads y conserva los
# últimos N respaldos. Pensado para correr en un cron diario del host, p.ej.:
#
#   0 3 * * * /ruta/al/repo/scripts/backup-uploads.sh >> /var/log/uploads-backup.log 2>&1
#
# Variables de entorno (con defaults):
#   UPLOADS_HOST_PATH   Carpeta de uploads a respaldar   (default ./data/uploads)
#   BACKUP_DEST_DIR     Carpeta destino de los backups   (default ./data/backups)
#   BACKUP_KEEP         Cuántos backups conservar         (default 14)
set -euo pipefail

SRC="${UPLOADS_HOST_PATH:-./data/uploads}"
DEST="${BACKUP_DEST_DIR:-./data/backups}"
KEEP="${BACKUP_KEEP:-14}"

if [ ! -d "$SRC" ]; then
  echo "[backup-uploads] ERROR: carpeta de uploads no existe: $SRC" >&2
  exit 1
fi

mkdir -p "$DEST"
STAMP="$(date +%Y%m%d-%H%M%S)"
ARCHIVE="$DEST/uploads-$STAMP.tar.gz"

# -C para guardar rutas relativas dentro del tar (restauración limpia).
tar -czf "$ARCHIVE" -C "$(dirname "$SRC")" "$(basename "$SRC")"
echo "[backup-uploads] Creado: $ARCHIVE ($(du -h "$ARCHIVE" | cut -f1))"

# Retención: borra los más antiguos dejando los últimos $KEEP.
ls -1t "$DEST"/uploads-*.tar.gz 2>/dev/null | tail -n +"$((KEEP + 1))" | while read -r old; do
  rm -f "$old"
  echo "[backup-uploads] Eliminado backup antiguo: $old"
done

echo "[backup-uploads] OK ($(ls -1 "$DEST"/uploads-*.tar.gz 2>/dev/null | wc -l) backups en $DEST)"
