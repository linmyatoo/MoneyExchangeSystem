#!/bin/bash
# One-time bootstrap for Let's Encrypt certificates via Certbot.
#
# Nginx refuses to start with a `listen 443 ssl` block unless the
# certificate files already exist, so this script:
#   1. Generates a throwaway self-signed cert so Nginx can boot.
#   2. Starts Nginx (serving the ACME challenge path over plain HTTP).
#   3. Deletes the dummy cert and requests a real one from Let's Encrypt.
#   4. Reloads Nginx to pick up the real certificate.
#
# Run this once from the project root, after `.env` has DOMAIN and
# CERTBOT_EMAIL set, and before relying on HTTPS:
#   ./nginx/init-letsencrypt.sh
#
# Safe to re-run; it will offer to replace an existing certificate.

set -euo pipefail
cd "$(dirname "$0")/.."

COMPOSE_FILE="docker-compose.prod.yml"
DATA_PATH="./nginx/certs"
WEBROOT_PATH="./nginx/certbot-www"
RSA_KEY_SIZE=4096

if [ -f .env ]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

DOMAIN="${DOMAIN:-}"
CERTBOT_EMAIL="${CERTBOT_EMAIL:-}"
STAGING="${STAGING:-0}"

if [ -z "$DOMAIN" ]; then
  echo "ERROR: DOMAIN is not set. Add DOMAIN=yourdomain.com to .env and re-run." >&2
  exit 1
fi

if ! command -v docker &>/dev/null; then
  echo "ERROR: docker is not installed or not on PATH." >&2
  exit 1
fi

if [ -d "$DATA_PATH/live/$DOMAIN" ]; then
  read -rp "Existing certificate data found for $DOMAIN. Replace it? (y/N) " decision
  if [[ ! "$decision" =~ ^[Yy]$ ]]; then
    exit 0
  fi
fi

mkdir -p "$DATA_PATH" "$WEBROOT_PATH"

echo "### Creating dummy certificate for $DOMAIN ..."
mkdir -p "$DATA_PATH/live/$DOMAIN"
docker compose -f "$COMPOSE_FILE" run --rm --entrypoint "\
  openssl req -x509 -nodes -newkey rsa:$RSA_KEY_SIZE -days 1 \
    -keyout '/etc/letsencrypt/live/$DOMAIN/privkey.pem' \
    -out '/etc/letsencrypt/live/$DOMAIN/fullchain.pem' \
    -subj '/CN=localhost'" certbot

echo "### Starting nginx ..."
docker compose -f "$COMPOSE_FILE" up -d nginx

echo "### Deleting dummy certificate for $DOMAIN ..."
docker compose -f "$COMPOSE_FILE" run --rm --entrypoint "\
  rm -rf /etc/letsencrypt/live/$DOMAIN && \
  rm -rf /etc/letsencrypt/archive/$DOMAIN && \
  rm -rf /etc/letsencrypt/renewal/$DOMAIN.conf" certbot

echo "### Requesting Let's Encrypt certificate for $DOMAIN ..."
email_arg="--register-unsafely-without-email"
if [ -n "$CERTBOT_EMAIL" ]; then
  email_arg="--email $CERTBOT_EMAIL"
fi

staging_arg=""
if [ "$STAGING" != "0" ]; then
  staging_arg="--staging"
fi

docker compose -f "$COMPOSE_FILE" run --rm --entrypoint "\
  certbot certonly --webroot -w /var/www/certbot \
    $staging_arg \
    $email_arg \
    -d $DOMAIN \
    --rsa-key-size $RSA_KEY_SIZE \
    --agree-tos \
    --no-eff-email \
    --force-renewal" certbot

echo "### Reloading nginx ..."
docker compose -f "$COMPOSE_FILE" exec nginx nginx -s reload

echo "Done. $DOMAIN is now serving a real Let's Encrypt certificate."
