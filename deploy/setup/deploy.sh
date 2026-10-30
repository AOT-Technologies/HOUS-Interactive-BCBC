#!/usr/bin/env bash
# Rebuild the app image from the configured GitHub branch and restart the container.
# No local checkout: docker compose builds straight from the GitHub repo, pinned
# to the commit SHA resolved below (see docker-compose.yml next to this script).
#
# Installed by setup-host.sh as /usr/local/bin/bcbc-deploy and invoked by the
# webhook service with: <github-event> <github-delivery-id>
# Manual run (rebuilds even when the commit is already deployed):
#   sudo bcbc-deploy --force
#
# Settings come from /etc/bcbc/deploy.env (written by setup-host.sh).
set -Eeuo pipefail

CONFIG_FILE="${BCBC_CONFIG:-/etc/bcbc/deploy.env}"
# shellcheck source=/dev/null
source "$CONFIG_FILE"

: "${BRANCH:?BRANCH missing in $CONFIG_FILE}"
: "${REPO_URL:?REPO_URL missing in $CONFIG_FILE}"
COMPOSE_FILE="${COMPOSE_FILE:-/opt/bcbc/docker-compose.yml}"
DEPLOY_USER="${DEPLOY_USER:-bcbc}"
COMPOSE_PROJECT_NAME="${COMPOSE_PROJECT_NAME:-bcbc}"
SERVICE="${SERVICE:-interactive-bcbc-app}"
HEALTH_URL="${HEALTH_URL:-http://127.0.0.1:9090/health}"
LOG_FILE="${LOG_FILE:-/var/log/bcbc/deploy.log}"
STATE_DIR="${STATE_DIR:-/var/lib/bcbc}"

# Leave the caller's directory: the deploy user may not be able to read it
# (e.g. sudo from /home/ubuntu), and git fails when it cannot stat the cwd.
cd /

# Always run as the deploy user (member of the docker group).
if [[ $EUID -eq 0 && "$DEPLOY_USER" != "root" ]]; then
  exec runuser -u "$DEPLOY_USER" -- "$0" "$@"
fi

FORCE=0
ARGS=()
for arg in "$@"; do
  if [[ "$arg" == "--force" ]]; then FORCE=1; else ARGS+=("$arg"); fi
done
EVENT="${ARGS[0]:-manual}"
DELIVERY="${ARGS[1]:--}"

exec > >(tee -a "$LOG_FILE") 2>&1

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"; }
trap 'log "ERROR: deploy failed at line $LINENO (exit $?)"' ERR

# Serialize deploys: a webhook that arrives mid-build waits, then deploys
# whatever is newest on the branch (or skips if that is already live).
exec 9>"$STATE_DIR/deploy.lock"
log "Webhook event=$EVENT delivery=$DELIVERY - waiting for deploy lock"
flock -w 3600 9

TARGET_SHA="$(git ls-remote "$REPO_URL" "refs/heads/$BRANCH" | awk '{print $1}')"
if [[ -z "$TARGET_SHA" ]]; then
  log "Branch '$BRANCH' not found in $REPO_URL"
  exit 1
fi
DEPLOYED_SHA="$(cat "$STATE_DIR/deployed-sha" 2>/dev/null || true)"

if [[ $FORCE -eq 0 && "$TARGET_SHA" == "$DEPLOYED_SHA" ]]; then
  log "$BRANCH ($TARGET_SHA) is already deployed - nothing to do"
  exit 0
fi

log "Deploying $BRANCH $TARGET_SHA from $REPO_URL (previous: ${DEPLOYED_SHA:-none})"
export BCBC_REPO_URL="$REPO_URL" BCBC_GIT_REF="$TARGET_SHA"
compose=(docker compose -p "$COMPOSE_PROJECT_NAME" -f "$COMPOSE_FILE")
IMAGE="${COMPOSE_PROJECT_NAME}-${SERVICE}"

# Keep the currently running image so a failed deploy can roll back.
if docker image inspect "$IMAGE:latest" >/dev/null 2>&1; then
  docker tag "$IMAGE:latest" "$IMAGE:previous"
fi

log "Building image from GitHub (this takes several minutes)"
"${compose[@]}" build --pull "$SERVICE"

log "Restarting container"
"${compose[@]}" up -d --no-deps --remove-orphans "$SERVICE"

healthy() {
  for _ in $(seq 1 24); do
    curl -fsS -o /dev/null "$HEALTH_URL" && return 0
    sleep 5
  done
  return 1
}

if ! healthy; then
  log "Health check failed at $HEALTH_URL"
  if docker image inspect "$IMAGE:previous" >/dev/null 2>&1; then
    log "Rolling back to previous image"
    docker tag "$IMAGE:previous" "$IMAGE:latest"
    "${compose[@]}" up -d --no-deps --no-build --force-recreate "$SERVICE"
  fi
  exit 1
fi

echo "$TARGET_SHA" > "$STATE_DIR/deployed-sha"

docker image prune -f >/dev/null
docker builder prune -f --filter until=168h >/dev/null || true

log "Deploy of $TARGET_SHA completed successfully"
