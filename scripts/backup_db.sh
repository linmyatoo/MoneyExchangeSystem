#!/bin/bash
# Dumps the production PostgreSQL database to ./backups.
#
# Intended to run from cron, e.g.:
#   0 0 * * * /opt/ems/scripts/backup_db.sh >> /var/log/ems_backup.log 2>&1
#
# NOTE: these dumps live on the same droplet as the database. Losing the
# droplet loses both. Sync ./backups (and nginx/certs) off-box — e.g. to
# DigitalOcean Spaces or S3 — for this to count as a real backup.

set -euo pipefail
cd "$(dirname "$0")/.."

COMPOSE_FILE="docker-compose.prod.yml"
BACKUP_DIR="./backups"
RETENTION_DAYS=7

# Credentials come from .env so this keeps working when POSTGRES_USER /
# POSTGRES_DB are changed from their defaults.
if [ -f .env ]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

DB_USER="${POSTGRES_USER:-postgres}"
DB_NAME="${POSTGRES_DB:-ems_db}"

# Resolve the container from Compose rather than hardcoding a name — it varies
# with the project directory (/opt/ems -> ems-db-1).
CONTAINER_ID="$(docker compose -f "$COMPOSE_FILE" ps -q db)"
if [ -z "$CONTAINER_ID" ]; then
  echo "ERROR: the 'db' service is not running (docker compose -f $COMPOSE_FILE ps)." >&2
  exit 1
fi

mkdir -p "$BACKUP_DIR"
TIMESTAMP="$(date +"%Y%m%d_%H%M%S")"
BACKUP_FILE="${BACKUP_DIR}/ems_backup_${TIMESTAMP}.dump"
TMP_FILE="${BACKUP_FILE}.partial"

# -F c is pg_dump's custom format; restore with pg_restore, not psql:
#   docker compose -f docker-compose.prod.yml exec -T db \
#     pg_restore -U "$DB_USER" -d "$DB_NAME" --clean < backup.dump
echo "[$(date -Iseconds)] Backing up ${DB_NAME} to ${BACKUP_FILE} ..."
if ! docker exec "$CONTAINER_ID" pg_dump -U "$DB_USER" -d "$DB_NAME" -F c > "$TMP_FILE"; then
  echo "[$(date -Iseconds)] Backup FAILED — discarding partial file." >&2
  rm -f "$TMP_FILE"
  exit 1
fi

# Only publish the timestamped name once the dump succeeded, so a partial file
# can never be mistaken for a good backup.
mv "$TMP_FILE" "$BACKUP_FILE"
chmod 600 "$BACKUP_FILE"
echo "[$(date -Iseconds)] Backup complete ($(du -h "$BACKUP_FILE" | cut -f1))."

find "$BACKUP_DIR" -type f -name "ems_backup_*.dump" -mtime +"$RETENTION_DAYS" -delete
echo "[$(date -Iseconds)] Pruned backups older than ${RETENTION_DAYS} days."
