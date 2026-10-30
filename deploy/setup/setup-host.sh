#!/usr/bin/env bash
# One-time host preparation for running HOUS-Interactive-BCBC with Docker Compose.
#
#   sudo ./setup-host.sh <prod|qa>
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
#   COMPOSE_VERSION   docker compose plugin version if not installed (default: v2.32.4)
#   BUILDX_VERSION    docker buildx plugin version if not installed (default: v0.19.3)
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

BRANCH="${BRANCH:-$DEFAULT_BRANCH}"
REPO_URL="${REPO_URL:-https://github.com/AOT-Technologies/HOUS-Interactive-BCBC.git}"
DEPLOY_USER="${DEPLOY_USER:-bcbc}"
BASE_DIR="${BASE_DIR:-/opt/bcbc}"
COMPOSE_FILE="$BASE_DIR/docker-compose.yml"
COMPOSE_VERSION="${COMPOSE_VERSION:-v2.32.4}"
BUILDX_VERSION="${BUILDX_VERSION:-v0.19.3}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PLUGIN_DIR=/usr/local/lib/docker/cli-plugins

log() { echo -e "\n==> $*"; }

case "$(uname -m)" in
  x86_64) COMPOSE_ARCH=x86_64; GO_ARCH=amd64 ;;
  aarch64) COMPOSE_ARCH=aarch64; GO_ARCH=arm64 ;;
  *) echo "Unsupported architecture: $(uname -m)" >&2; exit 1 ;;
esac

# git is needed by bcbc-deploy (ls-remote) and by Docker to fetch the git build context.
log "Installing packages (git, docker)"
if command -v dnf >/dev/null; then
  dnf install -y git docker tar
elif command -v yum >/dev/null; then
  yum install -y git docker tar
elif command -v apt-get >/dev/null; then
  apt-get update
  apt-get install -y git curl tar
  command -v docker >/dev/null || apt-get install -y docker.io
else
  echo "No supported package manager found (dnf/yum/apt-get)." >&2; exit 1
fi
systemctl enable --now docker

mkdir -p "$PLUGIN_DIR"
if ! docker compose version >/dev/null 2>&1; then
  log "Installing docker compose plugin $COMPOSE_VERSION"
  curl -fsSL -o "$PLUGIN_DIR/docker-compose" \
    "https://github.com/docker/compose/releases/download/$COMPOSE_VERSION/docker-compose-linux-$COMPOSE_ARCH"
  chmod 0755 "$PLUGIN_DIR/docker-compose"
fi
if ! docker buildx version >/dev/null 2>&1; then
  log "Installing docker buildx plugin $BUILDX_VERSION"
  curl -fsSL -o "$PLUGIN_DIR/docker-buildx" \
    "https://github.com/docker/buildx/releases/download/$BUILDX_VERSION/buildx-$BUILDX_VERSION.linux-$GO_ARCH"
  chmod 0755 "$PLUGIN_DIR/docker-buildx"
fi
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
