#!/bin/bash
# Builds the production backend image on your WORKSTATION and pushes it to the
# registry. The droplet never compiles anything — scripts/deploy.sh just pulls
# the tag this script produced.
#
# Usage (from the project root, on your Mac/PC):
#   docker login                 # once, for Docker Hub
#   ./scripts/build_and_push.sh
#
# Then on the droplet:
#   ./scripts/deploy.sh
#
# The image is built for linux/amd64 regardless of your machine's architecture.
# This matters: Apple Silicon builds arm64 by default, and an arm64 image dies
# on a DigitalOcean droplet with "exec format error".

set -euo pipefail
cd "$(dirname "$0")/.."

if [ -f .env ]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

BACKEND_IMAGE="${BACKEND_IMAGE:-}"
PLATFORM="linux/amd64"

if [ -z "$BACKEND_IMAGE" ]; then
  echo "ERROR: BACKEND_IMAGE is not set. Add it to .env, e.g." >&2
  echo "       BACKEND_IMAGE=docker.io/<your-dockerhub-user>/ems-backend" >&2
  exit 1
fi

# Strip any tag the user put in .env — this script owns the tagging.
IMAGE_REPO="${BACKEND_IMAGE%:*}"

# Tag with the commit being deployed so a running container is always
# traceable back to source, and move :latest to match.
GIT_SHA="$(git rev-parse --short HEAD 2>/dev/null || echo unknown)"
TAG="${1:-$GIT_SHA}"

if ! git diff --quiet HEAD 2>/dev/null; then
  echo "WARNING: working tree has uncommitted changes — image ${IMAGE_REPO}:${TAG}"
  echo "         will NOT match commit ${GIT_SHA} in the repository."
  read -rp "Continue anyway? (y/N) " reply
  [[ "$reply" =~ ^[Yy]$ ]] || exit 1
fi

echo "### Building ${IMAGE_REPO}:${TAG} for ${PLATFORM} ..."
echo "### (cross-compiling under emulation — expect this to be slower than a native build)"

# --provenance=false keeps the pushed manifest a plain single-platform image
# instead of an index with an extra attestation entry, which some registry UIs
# and older Docker versions display as a bogus "unknown/unknown" platform.
docker buildx build \
  --platform "$PLATFORM" \
  --provenance=false \
  -f backend/Dockerfile.prod \
  -t "${IMAGE_REPO}:${TAG}" \
  -t "${IMAGE_REPO}:latest" \
  --push \
  ./backend

echo
echo "### Verifying the pushed image really is ${PLATFORM} ..."
PUSHED_PLATFORM="$(docker buildx imagetools inspect "${IMAGE_REPO}:${TAG}" \
  --format '{{range .Manifest.Manifests}}{{.Platform.OS}}/{{.Platform.Architecture}} {{end}}' 2>/dev/null \
  || docker buildx imagetools inspect "${IMAGE_REPO}:${TAG}" | grep -i -m1 'Platform:' | awk '{print $2}')"
echo "    manifest platform(s): ${PUSHED_PLATFORM:-unknown}"

case "$PUSHED_PLATFORM" in
  *linux/amd64*) echo "    OK — the droplet can run this." ;;
  *) echo "    WARNING: expected linux/amd64. Do not deploy this image until resolved." >&2 ;;
esac

echo
echo "### Pushed:"
echo "      ${IMAGE_REPO}:${TAG}"
echo "      ${IMAGE_REPO}:latest"
echo
echo "### Next, on the droplet:"
echo "      # pin the exact build in .env (recommended over :latest)"
echo "      BACKEND_IMAGE=${IMAGE_REPO}:${TAG}"
echo "      sudo ./scripts/deploy.sh"
