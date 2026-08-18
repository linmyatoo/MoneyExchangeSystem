#!/bin/bash
# Wipes all business data from the production database so the app can be
# exercised from a clean state, while preserving:
#   - the admin account and its password (SEED_ADMIN_USERNAME, default 'admin')
#   - the baseline seed data the app depends on: roles and wallet_types
#   - alembic_version, so migrations are not re-applied
#
# Everything else is truncated: customers, wallet accounts, wallet transactions,
# currency buy/sell transactions, exchange rates, audit logs, and the legacy
# cash register tables if this database still has them.
#
# THIS IS IRREVERSIBLE. A backup is taken first via scripts/backup_db.sh and the
# script refuses to continue if that backup fails.
#
# Usage from the repository root on the production server:
#   sudo ./scripts/reset_data.sh

set -euo pipefail
cd "$(dirname "$0")/.."

COMPOSE_FILE="docker-compose.prod.yml"

if [ -f .env ]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
else
  echo "ERROR: .env is missing — cannot resolve database credentials." >&2
  exit 1
fi

DB_USER="${POSTGRES_USER:-postgres}"
DB_NAME="${POSTGRES_DB:-ems_db}"
ADMIN_USERNAME="${SEED_ADMIN_USERNAME:-admin}"

CONTAINER_ID="$(docker compose -f "$COMPOSE_FILE" ps -q db)"
if [ -z "$CONTAINER_ID" ]; then
  echo "ERROR: the 'db' service is not running (docker compose -f $COMPOSE_FILE ps)." >&2
  exit 1
fi

psql_do() {
  docker exec -i "$CONTAINER_ID" psql -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 "$@"
}

# --- 1. Confirm the account being kept actually exists ------------------------
# Deleting every other user without this check would lock everyone out.
ADMIN_COUNT="$(psql_do -tAc \
  "SELECT count(*) FROM users WHERE username = '${ADMIN_USERNAME}';")"
if [ "$ADMIN_COUNT" != "1" ]; then
  echo "ERROR: expected exactly one user named '${ADMIN_USERNAME}', found ${ADMIN_COUNT}." >&2
  echo "       Refusing to wipe the database — you would be locked out." >&2
  exit 1
fi

# --- 2. Show what is about to be destroyed ------------------------------------
echo "### Database: ${DB_NAME} (container ${CONTAINER_ID:0:12})"
echo "### Current contents:"
psql_do -c "
SELECT relname AS table, n_live_tup AS rows
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY relname;"

echo
echo "### The account being KEPT (with its current password):"
psql_do -c "
SELECT u.username, u.full_name, r.name AS role
FROM users u LEFT JOIN roles r ON r.id = u.role_id
WHERE u.username = '${ADMIN_USERNAME}';"

echo "### Also kept: roles, wallet_types, alembic_version."
echo "### Everything else — customers, wallets, all transactions, exchange"
echo "### rates, audit logs, and all other user accounts — will be DELETED."
echo

read -rp "Type RESET to continue, anything else to abort: " reply
if [ "$reply" != "RESET" ]; then
  echo "Aborted. Nothing was changed."
  exit 0
fi

# --- 3. Mandatory backup ------------------------------------------------------
echo
echo "### Taking a backup before wiping ..."
if ! ./scripts/backup_db.sh; then
  echo "ERROR: backup failed — refusing to wipe the database." >&2
  exit 1
fi

# --- 4. Wipe ------------------------------------------------------------------
# Driven by a keep-list rather than a table-list so it stays correct as tables
# are added or dropped by migrations (e.g. the cash register tables). CASCADE is
# safe here: it truncates tables REFERENCING the listed ones, and no kept table
# references a wiped one.
echo
echo "### Wiping business data ..."
psql_do <<SQL
BEGIN;

DO \$\$
DECLARE
  keep text[] := ARRAY['roles', 'wallet_types', 'users', 'alembic_version'];
  tbls text;
BEGIN
  SELECT string_agg(format('%I', tablename), ', ')
    INTO tbls
  FROM pg_tables
  WHERE schemaname = 'public' AND NOT (tablename = ANY(keep));

  IF tbls IS NOT NULL THEN
    RAISE NOTICE 'Truncating: %', tbls;
    EXECUTE 'TRUNCATE TABLE ' || tbls || ' RESTART IDENTITY CASCADE';
  END IF;
END
\$\$;

DELETE FROM users WHERE username <> '${ADMIN_USERNAME}';

COMMIT;
SQL

# --- 5. Report ----------------------------------------------------------------
echo
echo "### Reset complete. Remaining contents:"
psql_do -c "
SELECT relname AS table, n_live_tup AS rows
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY relname;"

echo
echo "### Sign in as '${ADMIN_USERNAME}' with the SAME password as before."
echo "### Row counts above are planner estimates and may lag; the wipe itself"
echo "### ran in a single transaction and either fully applied or fully rolled back."
