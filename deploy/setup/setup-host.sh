#!/usr/bin/env bash
# One-time host preparation for running HOUS-Interactive-BCBC with Docker Compose.
#
#   sudo ./setup-host.sh <prod|qa>
#
# Ubuntu only (written for 24.04 LTS). Docker comes from Docker's official apt repo.
#
# Installs git, Docker, the compose and buildx plugins, creates the deploy user,
# installs the compose file and deploy script, and runs the first deploy.
# There is no local checkout: docker compose builds the image straight from GitHub.
# Safe to re-run (e.g. to pick up a newer deploy.sh or change settings).
#
# Optional overrides (environment variables):
#   BRANCH            branch to deploy (default: prod=main, qa=develop)
#   REPO_URL          public https git URL to build from
#                     (default: https://github.com/AOT-Technologies/HOUS-Interactive-BCBC.git)
#   DEPLOY_USER       system user that runs deploys (default: bcbc)
#   BASE_DIR          home of the deploy user (default: /opt/bcbc)
#   SKIP_SWAP=1       do not create a swap file on low-memory hosts
#   SKIP_FIRST_DEPLOY=1  do not build/start the app at the end
set -Eeuo pipefail

ENV_NAME="${1:-}"
case "$ENV_NAME" in
  prod) DEFAULT_BRANCH=main ;;
  qa) DEFAULT_BRANCH=develop ;;
  *) echo "Usage: sudo $0 <prod|qa>" >&2; exit 1 ;;
esac

[[ $EUID -eq 0 ]] || { echo "Run as root (sudo)." >&2; exit 1; }
if [[ "$(. /etc/os-release 2>/dev/null && echo "$ID")" != "ubuntu" ]]; then
  echo "This script supports Ubuntu only (written for 24.04 LTS)." >&2; exit 1
fi

BRANCH="${BRANCH:-$DEFAULT_BRANCH}"
REPO_URL="${REPO_URL:-https://github.com/AOT-Technologies/HOUS-Interactive-BCBC.git}"
DEPLOY_USER="${DEPLOY_USER:-bcbc}"
BASE_DIR="${BASE_DIR:-/opt/bcbc}"
COMPOSE_FILE="$BASE_DIR/docker-compose.yml"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

log() { echo -e "\n==> $*"; }

# git is needed by bcbc-deploy (ls-remote) and by Docker to fetch the git build context.
log "Installing packages (git, docker)"
# No interactive prompts (Ubuntu's needrestart would otherwise stop the script).
export DEBIAN_FRONTEND=noninteractive NEEDRESTART_MODE=a
apt-get update
apt-get install -y ca-certificates curl git
if ! command -v docker >/dev/null; then
  # Docker's official repo: current engine plus the compose and buildx plugins.
  CODENAME="$(. /etc/os-release && echo "$VERSION_CODENAME")"
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
  chmod a+r /etc/apt/keyrings/docker.asc
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $CODENAME stable" \
    > /etc/apt/sources.list.d/docker.list
  apt-get update
  apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
fi
# Docker already installed from Ubuntu's docker.io package: add Ubuntu's plugin packages.
docker compose version >/dev/null 2>&1 || apt-get install -y docker-compose-v2
docker buildx version >/dev/null 2>&1 || apt-get install -y docker-buildx
systemctl enable --now docker
docker compose version
docker buildx version

if [[ "$REPO_URL" != https://* ]]; then
  echo "REPO_URL must be a public https:// URL (got: $REPO_URL)." >&2; exit 1
fi

# The Next.js build + asset generation needs ~3-4 GB RAM; add swap on small instances.
MEM_KB="$(awk '/MemTotal/ {print $2}' /proc/meminfo)"
if [[ "${SKIP_SWAP:-0}" != "1" && "$MEM_KB" -lt 4000000 && -z "$(swapon --show --noheadings)" ]]; then
  log "Low memory ($((MEM_KB / 1024)) MB) and no swap - creating 4 GB /swapfile"
  dd if=/dev/zero of=/swapfile bs=1M count=4096 status=none
  chmod 600 /swapfile
  mkswap /swapfile >/dev/null
  swapon /swapfile
  grep -q '^/swapfile ' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

log "Creating deploy user '$DEPLOY_USER' (home $BASE_DIR)"
if ! id "$DEPLOY_USER" >/dev/null 2>&1; then
  useradd --system --create-home --home-dir "$BASE_DIR" --shell /bin/bash "$DEPLOY_USER"
fi
usermod -aG docker "$DEPLOY_USER"
install -d -o "$DEPLOY_USER" -g "$DEPLOY_USER" -m 0755 "$BASE_DIR" /var/log/bcbc /var/lib/bcbc
install -d -m 0755 /etc/bcbc

log "Writing /etc/bcbc/deploy.env"
cat > /etc/bcbc/deploy.env <<EOF
# Read by /usr/local/bin/bcbc-deploy and setup-webhook.sh. Re-run setup-host.sh to change.
ENV_NAME=$ENV_NAME
BRANCH=$BRANCH
REPO_URL=$REPO_URL
DEPLOY_USER=$DEPLOY_USER
COMPOSE_FILE=$COMPOSE_FILE
COMPOSE_PROJECT_NAME=bcbc
SERVICE=interactive-bcbc-app
HEALTH_URL=http://127.0.0.1:9090/health
LOG_FILE=/var/log/bcbc/deploy.log
STATE_DIR=/var/lib/bcbc
EOF
chmod 0644 /etc/bcbc/deploy.env

log "Checking $REPO_URL has branch '$BRANCH'"
if ! git ls-remote --exit-code --heads "$REPO_URL" "$BRANCH" >/dev/null; then
  echo "Branch '$BRANCH' not found in $REPO_URL (set BRANCH=... or create it)." >&2; exit 1
fi

if [[ -d "$BASE_DIR/app/.git" ]]; then
  log "Removing old checkout $BASE_DIR/app (no longer used)"
  rm -rf "$BASE_DIR/app"
fi

log "Installing compose file to $COMPOSE_FILE"
install -m 0644 "$SCRIPT_DIR/docker-compose.yml" "$COMPOSE_FILE"

log "Installing deploy script to /usr/local/bin/bcbc-deploy"
install -m 0755 "$SCRIPT_DIR/deploy.sh" /usr/local/bin/bcbc-deploy

if [[ "${SKIP_FIRST_DEPLOY:-0}" != "1" ]]; then
  log "Running first deploy (build takes several minutes)"
  /usr/local/bin/bcbc-deploy --force
fi

log "Host setup complete for '$ENV_NAME' (branch $BRANCH)."
echo "App: http://127.0.0.1:9090  |  Next: sudo ./setup-webhook.sh"
