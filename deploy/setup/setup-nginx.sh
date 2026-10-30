#!/usr/bin/env bash
# Install nginx as the public entry point for one domain per environment:
#   https://<domain>/hooks/  -> GitHub webhook service on :9000
#   https://<domain>/        -> app container published on :9090
# and optionally obtain a Let's Encrypt certificate.
# Ubuntu only (written for 24.04 LTS); nginx and certbot come from Ubuntu's apt repo.
#   prod: buildingcode.aot-technologies.com
#   qa:   qa.buildingcode.aot-technologies.com
#
#   sudo CERTBOT_EMAIL=you@example.com ./setup-nginx.sh <prod|qa>
#
# Optional overrides (environment variables):
#   DOMAIN         domain serving the app and /hooks/
#                  (default: [qa.]buildingcode.aot-technologies.com)
#   ENABLE_TLS=0   skip certbot (e.g. TLS terminated at an AWS load balancer)
#   CERTBOT_EMAIL  required when ENABLE_TLS=1 (Let's Encrypt expiry notices)
#   WEBHOOK_PORT   webhook listen port (default: 9000)
#   APP_PORT       host port the app container is published on (default: 9090)
set -Eeuo pipefail

ENV_NAME="${1:-}"
case "$ENV_NAME" in
  prod) PREFIX="" ;;
  qa) PREFIX="qa." ;;
  *) echo "Usage: sudo CERTBOT_EMAIL=you@example.com $0 <prod|qa>" >&2; exit 1 ;;
esac

[[ $EUID -eq 0 ]] || { echo "Run as root (sudo)." >&2; exit 1; }
if [[ "$(. /etc/os-release 2>/dev/null && echo "$ID")" != "ubuntu" ]]; then
  echo "This script supports Ubuntu only (written for 24.04 LTS)." >&2; exit 1
fi

DOMAIN="${DOMAIN:-${PREFIX}buildingcode.aot-technologies.com}"
ENABLE_TLS="${ENABLE_TLS:-1}"
WEBHOOK_PORT="${WEBHOOK_PORT:-9000}"
APP_PORT="${APP_PORT:-9090}"
CONF_FILE=/etc/nginx/conf.d/bcbc.conf

log() { echo -e "\n==> $*"; }

if [[ "$ENABLE_TLS" == "1" && -z "${CERTBOT_EMAIL:-}" ]]; then
  echo "Set CERTBOT_EMAIL (or ENABLE_TLS=0 if TLS is terminated elsewhere)." >&2
  exit 1
fi

log "Installing nginx"
export DEBIAN_FRONTEND=noninteractive NEEDRESTART_MODE=a
apt-get update && apt-get install -y nginx
rm -f /etc/nginx/sites-enabled/default

log "Writing $CONF_FILE"
cat > "$CONF_FILE" <<EOF
# Managed by deploy/setup/setup-nginx.sh - re-run the script instead of editing.

server {
    listen 80;
    server_name $DOMAIN;

    # GitHub webhook -> adnanh/webhook service
    location /hooks/ {
        proxy_pass http://127.0.0.1:$WEBHOOK_PORT/hooks/;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        client_max_body_size 25m;
    }

    # Application -> docker compose service interactive-bcbc-app
    location / {
        proxy_pass http://127.0.0.1:$APP_PORT;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

nginx -t
systemctl enable nginx
systemctl restart nginx

if [[ "$ENABLE_TLS" == "1" ]]; then
  log "Obtaining Let's Encrypt certificate (DNS must already point here, port 80 open)"
  apt-get install -y certbot python3-certbot-nginx

  certbot --nginx --non-interactive --agree-tos --redirect -m "$CERTBOT_EMAIL" -d "$DOMAIN"

  # Ubuntu's certbot package ships certbot.timer (twice-daily renewal).
  systemctl enable --now certbot.timer
fi

log "nginx ready"
SCHEME=http; [[ "$ENABLE_TLS" == "1" ]] && SCHEME=https
echo "App:     $SCHEME://$DOMAIN"
echo "Webhook: $SCHEME://$DOMAIN/hooks/redeploy-app"
