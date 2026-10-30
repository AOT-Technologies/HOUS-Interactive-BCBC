# Docker Compose deployment on EC2 (webhook redeploys)

Runs the app with Docker Compose on an Ubuntu EC2 host. The host keeps **no
checkout** of the repo: `docker-compose.yml` in this folder uses the GitHub repo as
its build context, so Docker clones
`https://github.com/AOT-Technologies/HOUS-Interactive-BCBC.git` (branch `main` by
default) and builds the repo's `Dockerfile` directly. GitHub calls a webhook whenever
the environment's branch changes; the host rebuilds the image and restarts the container.

```
GitHub ──https──► nginx :443 ──/hooks/──► webhook :9000 (systemd: bcbc-webhook)
                       │                        │ runs /usr/local/bin/bcbc-deploy
                       └──── / ────► app :9090 ◄┘  git ls-remote → compose build <repo>#<sha> → up -d
```

Each environment has one domain. nginx sends `/hooks/` to the webhook (port 9000) and
everything else to the app (port 9090).

| Env  | Branch    | App URL (→ :9090)                              | Webhook URL (→ :9000)                                             |
|------|-----------|------------------------------------------------|-------------------------------------------------------------------|
| prod | `main`    | `https://buildingcode.aot-technologies.com`    | `https://buildingcode.aot-technologies.com/hooks/redeploy-app`    |
| qa   | `develop` | `https://qa.buildingcode.aot-technologies.com` | `https://qa.buildingcode.aot-technologies.com/hooks/redeploy-app` |

A deploy runs on a **push to the branch** or a **merged PR into the branch**.
Opening or updating an unmerged PR does not deploy (that code is not reviewed yet).
Override the branch with `BRANCH=...` when running `setup-host.sh`.

## Files

| File | Purpose |
|------|---------|
| `docker-compose.yml` | Builds from `<REPO_URL>#<BCBC_GIT_REF>` (default `main`); installed as `/opt/bcbc/docker-compose.yml` |
| `setup-host.sh`    | Installs git, Docker, compose/buildx plugins; creates user `bcbc`; installs the compose file; writes `/etc/bcbc/deploy.env`; first deploy |
| `setup-webhook.sh` | Installs `adnanh/webhook`, writes `/etc/webhook/hooks.json`, enables `bcbc-webhook.service` |
| `setup-nginx.sh`   | Installs nginx with the `/hooks/` proxy and the app proxy, gets Let's Encrypt certs |
| `deploy.sh`        | The redeploy (installed as `/usr/local/bin/bcbc-deploy`) |

## Prerequisites

- Ubuntu 24.04 LTS (Debian and Amazon Linux also work), x86_64 or arm64. Docker is installed
  from Docker's official apt repository (engine plus compose and buildx plugins).
- Instance with **≥ 4 GB RAM** recommended (t3.medium). The build runs on the host;
  `setup-host.sh` adds a 4 GB swap file on smaller instances.
- ~20 GB disk for images and build cache.
- A DNS A record for the environment's domain (table above) pointing at the instance.
- Security group: inbound **80 and 443** open. Do **not** open 9090 or 9000.
  (`ufw` is inactive on Ubuntu EC2 images by default; if you enable it, allow `Nginx Full` and SSH.)

## Setup (once per server)

Copy this folder to the server (or clone the repo) and run, using `qa` or `prod`:

```bash
cd deploy/setup
sudo ./setup-host.sh qa
sudo WEBHOOK_SECRET='<secret>' ./setup-webhook.sh
sudo CERTBOT_EMAIL='you@aot-technologies.com' ./setup-nginx.sh qa
```

Notes:
- **Repo:** the repo must be public (the build fetches it over https without credentials).
  Build from a fork with `REPO_URL=https://github.com/<org>/<repo>.git`. The branch must exist
  there, or setup and deploys stop with `Branch '<name>' not found`.
- **Domain:** `setup-nginx.sh` serves the app and `/hooks/` on
  `[qa.]buildingcode.aot-technologies.com`. Override with `DOMAIN=...`.
- **TLS at an AWS ALB instead:** run `setup-nginx.sh` with `ENABLE_TLS=0`.
- **Secret:** never commit it. It lives only in `/etc/webhook/hooks.json` (mode 0640).
  Generate a new one with `openssl rand -hex 32`, update it in GitHub, and re-run `setup-webhook.sh`.

The server block that `setup-nginx.sh` writes to `/etc/nginx/conf.d/bcbc.conf` (qa shown;
certbot then adds the `listen 443 ssl` lines and an http→https redirect):

```nginx
server {
    listen 80;
    server_name qa.buildingcode.aot-technologies.com;

    location /hooks/ {
        proxy_pass http://127.0.0.1:9000/hooks/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        client_max_body_size 25m;
    }

    location / {
        proxy_pass http://127.0.0.1:9090;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## GitHub webhook settings

Repo → Settings → Webhooks → edit each webhook:

- **Payload URL:** the URL from the table above
- **Content type:** `application/json` (required — `form-urlencoded` will not match)
- **Secret:** same value given to `setup-webhook.sh`
- **Events:** "Just the push event" is enough (a merged PR produces a push).
  Selecting "Pull requests" too is fine; duplicate triggers are skipped.

GitHub's ping after saving shows `Hook rules were not satisfied.` with HTTP 200 — expected.
A delivery answered with **HTTP 500** `Error occurred while evaluating hook rules.` means the
secret in GitHub and on the server differ.

## Verify

Check GitHub → Webhooks → Recent Deliveries after the next merge, or run a deploy
manually with `sudo bcbc-deploy --force`.

## Operations

```bash
tail -f /var/log/bcbc/deploy.log            # deploy output
journalctl -u bcbc-webhook -f               # webhook requests
sudo bcbc-deploy --force                    # manual redeploy of the branch head
cat /var/lib/bcbc/deployed-sha              # commit currently live
sudo systemctl restart bcbc-webhook         # restart listener
sudo -u bcbc docker compose -p bcbc -f /opt/bcbc/docker-compose.yml ps
```

How a deploy behaves:
- Deploys are queued (one at a time); each deploys the newest commit, and skips if it is already live.
- The new image is built while the old container keeps serving; downtime is only the container swap.
- Each deploy resolves the branch head with `git ls-remote` and builds that exact commit
  (`<repo>#<sha>`), so a push that lands mid-build cannot slip into the image.
- The app port is bound to `127.0.0.1:9090`; it is reachable only through nginx.
- If `http://127.0.0.1:9090/health` does not respond within 2 minutes, it rolls back to the
  previous image (`bcbc-interactive-bcbc-app:previous`) and exits with an error.
- Changes to `deploy.sh` or `docker-compose.yml` in this folder take effect after re-running `sudo ./setup-host.sh <env>`
  (add `SKIP_FIRST_DEPLOY=1` to skip the rebuild).
