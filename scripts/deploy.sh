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

  # Passwords are generated alphanumeric-only: they get interpolated raw into
  # the DATABASE_URL, where '@ : / ? # %' would corrupt the connection string.
  GENERATED_SECRET=$(openssl rand -hex 32)
  GENERATED_DB_PASSWORD=$(LC_ALL=C tr -dc 'A-Za-z0-9' </dev/urandom | head -c 32)
  GENERATED_ADMIN_PASSWORD=$(LC_ALL=C tr -dc 'A-Za-z0-9' </dev/urandom | head -c 20)

  sed -i "s#^SECRET_KEY=.*#SECRET_KEY=${GENERATED_SECRET}#" .env
  sed -i "s#^POSTGRES_PASSWORD=.*#POSTGRES_PASSWORD=${GENERATED_DB_PASSWORD}#" .env
  sed -i "s#^SEED_ADMIN_PASSWORD=.*#SEED_ADMIN_PASSWORD=${GENERATED_ADMIN_PASSWORD}#" .env
  chmod 600 .env

  echo
  echo ">>> .env created with a generated SECRET_KEY, POSTGRES_PASSWORD and"
  echo ">>> SEED_ADMIN_PASSWORD."
  echo ">>> Edit .env now to set DOMAIN, CERTBOT_EMAIL and BACKEND_IMAGE"
  echo ">>> (the tag printed by scripts/build_and_push.sh on your workstation),"
  echo ">>> then re-run this script."
  exit 0
fi

# shellcheck disable=SC1091
set -a; source .env; set +a

if [ -z "${DOMAIN:-}" ]; then
  echo "ERROR: DOMAIN is not set in .env. Set it to your droplet's domain name and re-run." >&2
  exit 1
fi

if [ -z "${SECRET_KEY:-}" ] || [ "${SECRET_KEY}" = "your_super_secret_key_here" ]; then
  echo "ERROR: SECRET_KEY in .env is unset or still the example value." >&2
  echo "       Generate one with: openssl rand -hex 32" >&2
  exit 1
fi

if [ -z "${SEED_ADMIN_PASSWORD:-}" ]; then
  echo "ERROR: SEED_ADMIN_PASSWORD is not set in .env. The backend refuses to" >&2
  echo "       create the initial admin account without it in production." >&2
  exit 1
fi

# The DB password is interpolated raw into DATABASE_URL, so it must be URL-safe.
case "${POSTGRES_PASSWORD:-}" in
  ""|postgres)
    echo "ERROR: POSTGRES_PASSWORD in .env is unset or still the example value." >&2
    exit 1
    ;;
  *[@:/?\#\[\]%\ ]*)
    echo "ERROR: POSTGRES_PASSWORD contains a character that breaks the database" >&2
    echo "       connection URL. Use letters and digits only." >&2
    exit 1
    ;;
esac

# --- 4. Backend image: pull, never build --------------------------------------
# The backend is built on a workstation (scripts/build_and_push.sh) and only
# pulled here, so the droplet needs no compiler and no build memory.
if [ -z "${BACKEND_IMAGE:-}" ]; then
  echo "ERROR: BACKEND_IMAGE is not set in .env." >&2
  echo "       Build and push it from your workstation first:" >&2
  echo "         ./scripts/build_and_push.sh" >&2
  echo "       then set the tag it printed, e.g." >&2
  echo "         BACKEND_IMAGE=docker.io/<user>/ems-backend:<sha>" >&2
  exit 1
fi

if [ -n "${DOCKERHUB_USER:-}" ] && [ -n "${DOCKERHUB_TOKEN:-}" ]; then
  echo "### Logging in to Docker Hub as ${DOCKERHUB_USER} ..."
  echo "$DOCKERHUB_TOKEN" | docker login -u "$DOCKERHUB_USER" --password-stdin
fi

echo "### Pulling backend image ${BACKEND_IMAGE} ..."
if ! docker compose -f "$COMPOSE_FILE" pull backend; then
  echo "ERROR: could not pull ${BACKEND_IMAGE}." >&2
  echo "       If the repository is private, set DOCKERHUB_USER and" >&2
  echo "       DOCKERHUB_TOKEN in .env (token from hub.docker.com ->" >&2
  echo "       Account Settings -> Personal access tokens), or run" >&2
  echo "       'docker login' on this server." >&2
  exit 1
fi

# An arm64 image built on Apple Silicon dies here with a confusing
# "exec format error", so fail early with an explanation instead.
IMAGE_ARCH="$(docker image inspect --format '{{.Architecture}}' "$BACKEND_IMAGE" 2>/dev/null || echo unknown)"
HOST_ARCH="$(docker info --format '{{.Architecture}}' 2>/dev/null || echo unknown)"
case "$HOST_ARCH" in x86_64) HOST_ARCH=amd64 ;; aarch64) HOST_ARCH=arm64 ;; esac
if [ "$IMAGE_ARCH" != "unknown" ] && [ "$IMAGE_ARCH" != "$HOST_ARCH" ]; then
  echo "ERROR: ${BACKEND_IMAGE} is ${IMAGE_ARCH}, but this server is ${HOST_ARCH}." >&2
  echo "       Rebuild it with scripts/build_and_push.sh, which targets" >&2
  echo "       linux/amd64 explicitly." >&2
  exit 1
fi
echo "### Backend image architecture: ${IMAGE_ARCH} (matches this server)"

# --- 5. Frontend image: still built here --------------------------------------
echo "### Building frontend image ..."
docker compose -f "$COMPOSE_FILE" build frontend

echo "### Starting database, backend, frontend ..."
docker compose -f "$COMPOSE_FILE" up -d db backend frontend

# --- 6. Nginx + Certbot -------------------------------------------------------
if [ ! -d "./nginx/certs/live/${DOMAIN}" ]; then
  echo "### No certificate found for ${DOMAIN}, running first-time Let's Encrypt setup ..."
  ./nginx/init-letsencrypt.sh
else
  echo "### Certificate for ${DOMAIN} already exists, starting nginx ..."
  docker compose -f "$COMPOSE_FILE" up -d nginx
fi

# --- 7. Cron: certificate renewal ---------------------------------------------
CRON_LINE="0 3,15 * * * $(pwd)/scripts/renew_cert.sh >> /var/log/ems_cert_renew.log 2>&1"
if ! crontab -l 2>/dev/null | grep -qF "renew_cert.sh"; then
  echo "### Scheduling twice-daily certificate renewal check via cron ..."
  (crontab -l 2>/dev/null; echo "$CRON_LINE") | crontab -
fi

echo
echo "### Deploy complete. App should be live at https://${DOMAIN}"
echo "### Sign in with: ${SEED_ADMIN_USERNAME:-admin} / ${SEED_ADMIN_PASSWORD}"
echo "### Change this password after the first login."
echo "### View logs with: docker compose -f $COMPOSE_FILE logs -f"
