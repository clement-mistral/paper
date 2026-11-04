#!/usr/bin/env sh
# Restores a dump made by deploy/backup.sh into the production database.
#   deploy/restore.sh /srv/paper/backups/daily/paper-2026-11-03.dump
#
# DESTRUCTIVE: the current data is replaced. It asks for confirmation,
# takes a safety dump of the current state first, and stops the app
# during the restore.
set -eu

DUMP="${1:?usage: deploy/restore.sh <file.dump>}"
cd "$(dirname "$0")/.."
ENV_FILE="${ENV_FILE:-./.env.production}"
# shellcheck disable=SC1090
. "$ENV_FILE"
CONTAINER="${PG_CONTAINER:-paper-postgres}"
DB="${DB_DATABASE:-paper}"
USER_NAME="${DB_USER:-paper}"

printf 'Remplacer la base « %s » par %s ? Tapez oui : ' "$DB" "$DUMP"
read -r answer
[ "$answer" = "oui" ] || {
  echo "Annulé."
  exit 1
}

SAFETY="${BACKUP_DIR:-./backups}/before-restore-$(date +%F-%H%M%S).dump"
mkdir -p "$(dirname "$SAFETY")"
podman exec "$CONTAINER" pg_dump -U "$USER_NAME" -d "$DB" -Fc >"$SAFETY"
echo "État actuel sauvegardé dans $SAFETY"

podman compose -f compose.prod.yaml --env-file "$ENV_FILE" stop app
podman exec -i "$CONTAINER" pg_restore -U "$USER_NAME" -d "$DB" --clean --if-exists --no-owner <"$DUMP"
podman compose -f compose.prod.yaml --env-file "$ENV_FILE" start app
echo "Base restaurée depuis $DUMP"
