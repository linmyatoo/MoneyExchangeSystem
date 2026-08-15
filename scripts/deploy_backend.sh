#!/bin/bash
# Pulls the latest repository changes and deploys the production backend API.
# The backend image is built and pushed from a workstation; this server only
# pulls the image and recreates the backend container.
#
# Usage from the repository root on the production server:
#   sudo ./scripts/deploy_backend.sh            # deploy :latest
#   sudo ./scripts/deploy_backend.sh <sha>      # deploy an explicit tag

set -euo pipefail
cd "$(dirname "$0")/.."

COMPOSE_FILE="docker-compose.prod.yml"
HEALTH_TIMEOUT_SECONDS="180"

for required_command in docker git; do
  if ! command -v "$required_command" &>/dev/null; then
    echo "ERROR: ${required_command} is required to deploy the backend." >&2
    exit 1
  fi
done

if [ ! -f .env ]; then
  echo "ERROR: .env is missing. Run scripts/deploy.sh once to bootstrap the server." >&2
  exit 1
fi

# shellcheck disable=SC1091
set -a
source .env
set +a

if [ -z "${BACKEND_IMAGE:-}" ]; then
  echo "ERROR: BACKEND_IMAGE is not set in .env." >&2
  exit 1
fi

if [ -n "${DOCKERHUB_USER:-}" ] && [ -n "${DOCKERHUB_TOKEN:-}" ]; then
  echo "### Logging in to Docker Hub as ${DOCKERHUB_USER} ..."
  echo "$DOCKERHUB_TOKEN" | docker login -u "$DOCKERHUB_USER" --password-stdin
fi

echo "### Pulling the latest repository changes ..."
git pull --ff-only

# BACKEND_IMAGE may already contain a tag. Replace it with the requested tag so
# the default command always deploys the image published as :latest.
IMAGE_REPO="${BACKEND_IMAGE%:*}"
IMAGE_TAG="${1:-latest}"
case "$IMAGE_TAG" in
  ""|*[!a-zA-Z0-9._-]*)
    echo "ERROR: image tag must contain only letters, digits, '.', '_' or '-'." >&2
    exit 1
    ;;
esac
export BACKEND_IMAGE="${IMAGE_REPO}:${IMAGE_TAG}"

echo "### Pulling backend image ${BACKEND_IMAGE} ..."
docker compose -f "$COMPOSE_FILE" pull backend

echo "### Starting backend API (database remains running) ..."
docker compose -f "$COMPOSE_FILE" up -d backend

echo "### Waiting for backend health check ..."
backend_container="$(docker compose -f "$COMPOSE_FILE" ps -q backend)"
if [ -z "$backend_container" ]; then
  echo "ERROR: could not determine the backend container ID." >&2
  exit 1
fi
deadline=$((SECONDS + HEALTH_TIMEOUT_SECONDS))
while [ "$SECONDS" -lt "$deadline" ]; do
  health_status="$(docker inspect --format '{{.State.Health.Status}}' "$backend_container" 2>/dev/null || true)"
  case "$health_status" in
    healthy)
      echo "### Backend deployment complete: ${BACKEND_IMAGE}"
      docker compose -f "$COMPOSE_FILE" ps backend
      exit 0
      ;;
    unhealthy)
      echo "ERROR: backend health check failed." >&2
      docker compose -f "$COMPOSE_FILE" logs --tail=100 backend >&2
      exit 1
      ;;
  esac
  sleep 5
done

echo "ERROR: backend did not become healthy within ${HEALTH_TIMEOUT_SECONDS} seconds." >&2
docker compose -f "$COMPOSE_FILE" ps backend >&2
docker compose -f "$COMPOSE_FILE" logs --tail=100 backend >&2
exit 1