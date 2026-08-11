#!/bin/bash
# Renews the Let's Encrypt certificate if due, then reloads nginx.
# Intended to run from cron twice a day, e.g.:
#   0 3,15 * * * /opt/ems/scripts/renew_cert.sh >> /var/log/ems_cert_renew.log 2>&1

set -euo pipefail
cd "$(dirname "$0")/.."

COMPOSE_FILE="docker-compose.prod.yml"

echo "[$(date -Iseconds)] Checking certificate renewal..."
docker compose -f "$COMPOSE_FILE" run --rm certbot renew --webroot -w /var/www/certbot

echo "[$(date -Iseconds)] Reloading nginx..."
docker compose -f "$COMPOSE_FILE" exec nginx nginx -s reload

echo "[$(date -Iseconds)] Done."
