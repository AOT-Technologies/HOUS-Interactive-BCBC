#!/usr/bin/env bash
# Install nginx as the public entry point for one domain per environment:
#   https://<domain>/hooks/  -> GitHub webhook service on :9000
#   https://<domain>/        -> app container published on :9090
# and optionally obtain a Let's Encrypt certificate.
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
if command -v dnf >/dev/null; then
  dnf install -y nginx
elif command -v yum >/dev/null; then
  yum install -y nginx
else
  export DEBIAN_FRONTEND=noninteractive NEEDRESTART_MODE=a
  apt-get update && apt-get install -y nginx
  rm -f /etc/nginx/sites-enabled/default
fi

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
  if ! command -v certbot >/dev/null; then
    if command -v apt-get >/dev/null; then
      apt-get install -y certbot python3-certbot-nginx
    elif ! dnf install -y certbot python3-certbot-nginx 2>/dev/null; then
      # Not packaged on some Amazon Linux releases: use the EFF-recommended venv install.
      dnf install -y python3 augeas-libs
      python3 -m venv /opt/certbot
      /opt/certbot/bin/pip install --quiet --upgrade pip certbot certbot-nginx
      ln -sf /opt/certbot/bin/certbot /usr/local/bin/certbot
    fi
  fi

  certbot --nginx --non-interactive --agree-tos --redirect -m "$CERTBOT_EMAIL" -d "$DOMAIN"

  if systemctl list-unit-files certbot-renew.timer >/dev/null 2>&1 \
     || systemctl list-unit-files certbot.timer >/dev/null 2>&1; then
    systemctl enable --now certbot-renew.timer 2>/dev/null || systemctl enable --now certbot.timer
  else
    cat > /etc/systemd/system/certbot-renew.service <<'EOF'
[Unit]
Description=Renew Let's Encrypt certificates

[Service]
Type=oneshot
ExecStart=/usr/local/bin/certbot renew --quiet --deploy-hook "systemctl reload nginx"
EOF
    cat > /etc/systemd/system/certbot-renew.timer <<'EOF'
[Unit]
Description=Twice-daily Let's Encrypt renewal check

[Timer]
OnCalendar=*-*-* 00,12:00:00
RandomizedDelaySec=1h
Persistent=true

[Install]
WantedBy=timers.target
EOF
    systemctl daemon-reload
    systemctl enable --now certbot-renew.timer
  fi
fi

log "nginx ready"
SCHEME=http; [[ "$ENABLE_TLS" == "1" ]] && SCHEME=https
echo "App:     $SCHEME://$DOMAIN"
echo "Webhook: $SCHEME://$DOMAIN/hooks/redeploy-app"
