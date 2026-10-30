#!/usr/bin/env bash
# Install and configure adnanh/webhook as a systemd service that redeploys the
# app when GitHub reports a push / merged PR on the configured branch.
#
#   sudo WEBHOOK_SECRET=<github-webhook-secret> ./setup-webhook.sh
#   sudo ./setup-webhook.sh          # prompts for the secret
#
# Ubuntu only (written for 24.04 LTS); webhook comes from Ubuntu's apt repo.
# Run setup-host.sh first; branch and deploy user are read from /etc/bcbc/deploy.env.
#
# Optional overrides (environment variables):
#   WEBHOOK_BIND      listen address (default: 127.0.0.1 - behind a reverse proxy;
#                     use 0.0.0.0 only if an AWS ALB forwards straight to the port)
#   WEBHOOK_PORT      listen port (default: 9000)
#   HOOK_ID           hook id, i.e. URL path /hooks/<id> (default: redeploy-app)
set -Eeuo pipefail

[[ $EUID -eq 0 ]] || { echo "Run as root (sudo)." >&2; exit 1; }
if [[ "$(. /etc/os-release 2>/dev/null && echo "$ID")" != "ubuntu" ]]; then
  echo "This script supports Ubuntu only (written for 24.04 LTS)." >&2; exit 1
fi
[[ -f /etc/bcbc/deploy.env ]] || { echo "/etc/bcbc/deploy.env not found - run setup-host.sh first." >&2; exit 1; }

# shellcheck source=/dev/null
source /etc/bcbc/deploy.env
: "${BRANCH:?}" "${DEPLOY_USER:?}"

WEBHOOK_BIND="${WEBHOOK_BIND:-127.0.0.1}"
WEBHOOK_PORT="${WEBHOOK_PORT:-9000}"
HOOK_ID="${HOOK_ID:-redeploy-app}"
DEPLOY_CMD=/usr/local/bin/bcbc-deploy
HOOKS_FILE=/etc/webhook/hooks.json
UNIT_FILE=/etc/systemd/system/bcbc-webhook.service

log() { echo -e "\n==> $*"; }

[[ -x "$DEPLOY_CMD" ]] || { echo "$DEPLOY_CMD not found - run setup-host.sh first." >&2; exit 1; }

if [[ -z "${WEBHOOK_SECRET:-}" ]]; then
  read -r -s -p "GitHub webhook secret: " WEBHOOK_SECRET
  echo
fi
# The secret is embedded in JSON; restrict it to characters that need no escaping.
if [[ ! "$WEBHOOK_SECRET" =~ ^[A-Za-z0-9._~-]{16,}$ ]]; then
  echo "Secret must be 16+ chars of [A-Za-z0-9._~-] (e.g. output of: openssl rand -hex 32)." >&2
  exit 1
fi

log "Installing webhook"
if ! command -v webhook >/dev/null; then
  export DEBIAN_FRONTEND=noninteractive NEEDRESTART_MODE=a
  apt-get update && apt-get install -y webhook
fi
# The Ubuntu package ships its own webhook.service; we use bcbc-webhook.service instead.
systemctl disable --now webhook.service 2>/dev/null || true
WEBHOOK_BIN="$(command -v webhook)"
"$WEBHOOK_BIN" -version

log "Writing $HOOKS_FILE (deploys on push / merged PR to '$BRANCH')"
install -d -m 0755 /etc/webhook
umask 027
cat > "$HOOKS_FILE" <<EOF
[
  {
    "id": "$HOOK_ID",
    "execute-command": "$DEPLOY_CMD",
    "command-working-directory": "/var/lib/bcbc",
    "response-message": "Redeploy of $BRANCH triggered",
    "pass-arguments-to-command": [
      { "source": "header", "name": "X-GitHub-Event" },
      { "source": "header", "name": "X-GitHub-Delivery" }
    ],
    "trigger-rule": {
      "and": [
        {
          "match": {
            "type": "payload-hmac-sha256",
            "secret": "$WEBHOOK_SECRET",
            "parameter": { "source": "header", "name": "X-Hub-Signature-256" }
          }
        },
        {
          "or": [
            {
              "and": [
                { "match": { "type": "value", "value": "push", "parameter": { "source": "header", "name": "X-GitHub-Event" } } },
                { "match": { "type": "value", "value": "refs/heads/$BRANCH", "parameter": { "source": "payload", "name": "ref" } } }
              ]
            },
            {
              "and": [
                { "match": { "type": "value", "value": "pull_request", "parameter": { "source": "header", "name": "X-GitHub-Event" } } },
                { "match": { "type": "value", "value": "closed", "parameter": { "source": "payload", "name": "action" } } },
                { "match": { "type": "value", "value": "true", "parameter": { "source": "payload", "name": "pull_request.merged" } } },
                { "match": { "type": "value", "value": "$BRANCH", "parameter": { "source": "payload", "name": "pull_request.base.ref" } } }
              ]
            }
          ]
        }
      ]
    }
  }
]
EOF
umask 022
chown "root:$DEPLOY_USER" "$HOOKS_FILE"
chmod 0640 "$HOOKS_FILE"
if command -v python3 >/dev/null; then python3 -m json.tool "$HOOKS_FILE" >/dev/null; fi

log "Writing $UNIT_FILE"
cat > "$UNIT_FILE" <<EOF
[Unit]
Description=GitHub webhook listener - redeploys HOUS-Interactive-BCBC ($BRANCH)
After=network-online.target docker.service
Wants=network-online.target docker.service

[Service]
Type=simple
User=$DEPLOY_USER
Group=$DEPLOY_USER
ExecStart=$WEBHOOK_BIN -hooks $HOOKS_FILE -ip $WEBHOOK_BIND -port $WEBHOOK_PORT -verbose -nopanic
Restart=on-failure
RestartSec=5s
# Let an in-flight deploy finish if the listener is restarted.
KillMode=process

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable bcbc-webhook.service
systemctl restart bcbc-webhook.service

log "Checking the endpoint"
sleep 2
URL="http://127.0.0.1:$WEBHOOK_PORT/hooks/$HOOK_ID"
[[ "$WEBHOOK_BIND" == "127.0.0.1" || "$WEBHOOK_BIND" == "0.0.0.0" ]] || URL="http://$WEBHOOK_BIND:$WEBHOOK_PORT/hooks/$HOOK_ID"
RESPONSE="$(curl -s -X POST "$URL" || true)"
echo "POST $URL (unsigned) -> ${RESPONSE:-<no response>}"
systemctl --no-pager --lines=5 status bcbc-webhook.service || true

log "Webhook ready. GitHub payload URL must reach $URL via your reverse proxy."
echo "Logs: journalctl -u bcbc-webhook -f   |   tail -f /var/log/bcbc/deploy.log"
