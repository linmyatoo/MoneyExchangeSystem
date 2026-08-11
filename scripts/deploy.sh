#!/bin/bash
# Bootstraps a fresh Ubuntu DigitalOcean Droplet to run this app in production:
# installs Docker, opens the firewall, prepares .env, builds the images, brings
# up the app + database, then issues the Let's Encrypt certificate for nginx.
#
# Run as root (or via sudo) from the project root on the droplet, after the
# repo has been cloned there, e.g.:
#   git clone <your-repo-url> /opt/ems && cd /opt/ems
#   sudo ./scripts/deploy.sh
#
# Safe to re-run: it skips steps that are already done and just rebuilds/
# restarts the stack with the latest code.

set -euo pipefail
cd "$(dirname "$0")/.."

COMPOSE_FILE="docker-compose.prod.yml"

if [ "$(id -u)" -ne 0 ]; then
  echo "ERROR: run this script as root (sudo ./scripts/deploy.sh)." >&2
  exit 1
fi

# --- 1. Install Docker + Compose plugin -------------------------------------
if ! command -v docker &>/dev/null; then
  echo "### Installing Docker ..."
  apt-get update -y
  apt-get install -y ca-certificates curl gnupg
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
  chmod a+r /etc/apt/keyrings/docker.asc
  echo \
    "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \
    $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
    > /etc/apt/sources.list.d/docker.list
  apt-get update -y
  apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
  systemctl enable --now docker
else
  echo "### Docker already installed, skipping."
fi

# --- 2. Firewall --------------------------------------------------------------
if command -v ufw &>/dev/null; then
  echo "### Configuring firewall (OpenSSH, 80, 443) ..."
  ufw allow OpenSSH
  ufw allow 80/tcp
  ufw allow 443/tcp
  ufw --force enable
else
  echo "### ufw not found, skipping firewall setup."
fi

# --- 3. Environment file ------------------------------------------------------
if [ ! -f .env ]; then
  echo "### Creating .env from .env.example ..."
  cp .env.example .env
  GENERATED_SECRET=$(openssl rand -hex 32)
  sed -i "s#^SECRET_KEY=.*#SECRET_KEY=${GENERATED_SECRET}#" .env
  echo
  echo ">>> .env created with a generated SECRET_KEY."
  echo ">>> Edit .env now to set POSTGRES_PASSWORD, DOMAIN, and CERTBOT_EMAIL,"
  echo ">>> then re-run this script."
  exit 0
fi

# shellcheck disable=SC1091
set -a; source .env; set +a

if [ -z "${DOMAIN:-}" ]; then
  echo "ERROR: DOMAIN is not set in .env. Set it to your droplet's domain name and re-run." >&2
  exit 1
fi

# --- 4. Build and start the app + database -----------------------------------
echo "### Building images ..."
docker compose -f "$COMPOSE_FILE" build backend frontend

echo "### Starting database, backend, frontend ..."
docker compose -f "$COMPOSE_FILE" up -d db backend frontend

# --- 5. Nginx + Certbot -------------------------------------------------------
if [ ! -d "./nginx/certs/live/${DOMAIN}" ]; then
  echo "### No certificate found for ${DOMAIN}, running first-time Let's Encrypt setup ..."
  ./nginx/init-letsencrypt.sh
else
  echo "### Certificate for ${DOMAIN} already exists, starting nginx ..."
  docker compose -f "$COMPOSE_FILE" up -d nginx
fi

# --- 6. Cron: certificate renewal ---------------------------------------------
CRON_LINE="0 3,15 * * * $(pwd)/scripts/renew_cert.sh >> /var/log/ems_cert_renew.log 2>&1"
if ! crontab -l 2>/dev/null | grep -qF "renew_cert.sh"; then
  echo "### Scheduling twice-daily certificate renewal check via cron ..."
  (crontab -l 2>/dev/null; echo "$CRON_LINE") | crontab -
fi

echo
echo "### Deploy complete. App should be live at https://${DOMAIN}"
echo "### View logs with: docker compose -f $COMPOSE_FILE logs -f"
