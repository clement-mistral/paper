#!/usr/bin/env sh
# Nightly backup of the Paper database (run by deploy/paper-backup.timer).
#
# One custom-format pg_dump per day, plus a copy kept for the 1st of each
# month. Daily dumps older than BACKUP_KEEP_DAYS and monthly ones older
# than BACKUP_KEEP_MONTHS are pruned. Restore: deploy/restore.sh.
set -eu

cd "$(dirname "$0")/.."
ENV_FILE="${ENV_FILE:-./.env.production}"
# shellcheck disable=SC1090
. "$ENV_FILE"

BACKUP_DIR="${BACKUP_DIR:-./backups}"
KEEP_DAYS="${BACKUP_KEEP_DAYS:-30}"
KEEP_MONTHS="${BACKUP_KEEP_MONTHS:-12}"
CONTAINER="${PG_CONTAINER:-paper-postgres}"
DAY="$(date +%F)"

mkdir -p "$BACKUP_DIR/daily" "$BACKUP_DIR/monthly"
TARGET="$BACKUP_DIR/daily/paper-$DAY.dump"
PARTIAL="$TARGET.partial"

podman exec "$CONTAINER" pg_dump -U "${DB_USER:-paper}" -d "${DB_DATABASE:-paper}" -Fc >"$PARTIAL"
# A dump that pg_restore cannot read is not a backup: stop before pruning.
podman exec -i "$CONTAINER" pg_restore --list >/dev/null <"$PARTIAL"
mv "$PARTIAL" "$TARGET"

if [ "$(date +%d)" = "01" ]; then
  cp "$TARGET" "$BACKUP_DIR/monthly/paper-$(date +%Y-%m).dump"
fi

# Pruning only touches files named paper-*.dump inside the two folders.
find "$BACKUP_DIR/daily" -maxdepth 1 -type f -name 'paper-*.dump' -mtime "+$KEEP_DAYS" -delete
find "$BACKUP_DIR/monthly" -maxdepth 1 -type f -name 'paper-*.dump' -mtime "+$((KEEP_MONTHS * 31))" -delete

echo "Sauvegarde $TARGET ($(du -h "$TARGET" | cut -f1))"
