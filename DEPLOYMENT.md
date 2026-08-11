# Deployment Guide

This guide explains how to deploy the Exchange Management System (EMS) to a
production DigitalOcean Droplet (or any Ubuntu server) using Docker Compose,
Nginx, and Certbot for HTTPS.

**This droplet serves the API only.** The frontend is deployed separately (e.g.
Vercel/Netlify or another host) and is not part of `docker-compose.prod.yml`.

**The backend image is built on your workstation and pulled by the droplet.**
The server never compiles anything: you build locally, push to Docker Hub, and
`deploy.sh` pulls exactly that image.

```
  your Mac                    Docker Hub                  droplet
  ────────                    ──────────                  ───────
  build_and_push.sh  ──push──▶  ems-backend:<sha>  ──pull──▶  deploy.sh
                                                          db + backend + nginx

  frontend ──── deployed separately, calls https://<domain>/api/v1 ────▶
```

Because the frontend is on a different origin, its URL **must** be listed in
`CORS_ORIGINS` or the browser blocks every API call. Point the frontend's own
build at `https://<your-domain>/api/v1`.

## Prerequisites

1. **Ubuntu Droplet (22.04 LTS or newer)**
2. **Domain Name**, with its A record pointed at the droplet's public IP address (required for Let's Encrypt to issue a certificate).
3. `git` installed on the droplet (`sudo apt install -y git`). Docker itself is installed automatically by `scripts/deploy.sh` in the next step.
4. A **Docker Hub account** and `docker login` on your workstation.

## 1. Build and Push the Backend Image (on your workstation)

Set the target repository in your local `.env`:
```ini
BACKEND_IMAGE=docker.io/<your-dockerhub-user>/ems-backend
```

Then build and push:
```bash
docker login          # once
./scripts/build_and_push.sh
```

This tags the image with the current commit SHA **and** `:latest`, pushes both,
and prints the exact tag to pin on the server.

> **The build always targets `linux/amd64`.** On Apple Silicon a plain
> `docker build` produces an arm64 image, which fails on a DigitalOcean droplet
> with `exec format error`. `build_and_push.sh` passes `--platform linux/amd64`
> and verifies the pushed manifest afterwards; `deploy.sh` re-checks the
> architecture after pulling and refuses to start on a mismatch.

## 2. Prepare the Server

Clone the repository to your production server:
```bash
git clone <your-repo-url> /opt/ems
cd /opt/ems
```

The repo is still needed on the droplet — it provides the compose file, the
nginx config, and the deploy/backup scripts.

## 3. Run the Deploy Script

`scripts/deploy.sh` bootstraps a fresh droplet end to end: installs Docker,
opens the firewall (ports 22/80/443), creates `.env`, pulls the backend image,
starts the database/backend/nginx, and issues the first Let's Encrypt
certificate.

```bash
sudo ./scripts/deploy.sh
```

The first run creates `.env` from `.env.example` and stops so you can fill it
in. `SECRET_KEY`, `POSTGRES_PASSWORD` and `SEED_ADMIN_PASSWORD` are generated
for you, so the only values you must edit are:
```ini
# Must match your domain's DNS A record
DOMAIN=yourdomain.com
CERTBOT_EMAIL=you@example.com

# The tag printed by build_and_push.sh in step 1. Pin the commit SHA rather
# than :latest so you always know which build is running.
BACKEND_IMAGE=docker.io/<your-dockerhub-user>/ems-backend:<sha>

# Where the separately-hosted frontend is served from, comma-separated.
# Required — without it the browser blocks every request from the frontend.
CORS_ORIGINS=https://app.yourdomain.com
```

If the Docker Hub repository is **private**, also set credentials so the server
can pull (create a read-only token at Docker Hub → Account Settings → Personal
access tokens). Alternatively run `docker login` once on the droplet and leave
these blank:
```ini
DOCKERHUB_USER=your-dockerhub-user
DOCKERHUB_TOKEN=dckr_pat_...
```

Optionally also adjust:
```ini
POSTGRES_USER=ems_admin
POSTGRES_DB=ems_db
ACCESS_TOKEN_EXPIRE_MINUTES=480 # 8 hours for office use
SEED_ADMIN_USERNAME=admin
```

> **Note:** `POSTGRES_PASSWORD` is interpolated raw into the backend's
> `DATABASE_URL`. If you replace the generated one, use letters and digits only
> — `@ : / ? # %` and spaces break the connection string, and `deploy.sh`
> rejects them.

Then re-run `sudo ./scripts/deploy.sh`. It will pull the backend image, start
the database and backend, request the HTTPS certificate via
`nginx/init-letsencrypt.sh`, bring up nginx, and schedule twice-daily
certificate renewal via cron (`scripts/renew_cert.sh`).

On first start the backend applies migrations (`alembic upgrade head`) and then
seeds baseline data — the `admin`/`staff` roles, the wallet types, and the
initial admin account from `SEED_ADMIN_*`. Both steps are idempotent and re-run
harmlessly on every restart. `deploy.sh` prints the admin username and password
when it finishes; **change that password after the first login.**

Re-running `scripts/deploy.sh` later (e.g. after `git pull`) is safe — it
skips steps that are already done and just re-pulls/restarts the stack.

To view logs and confirm everything is running:
```bash
docker compose -f docker-compose.prod.yml logs -f
```

### Shipping a backend change

```bash
# on your workstation
git commit -am "..." && git push
./scripts/build_and_push.sh          # prints the new tag

# on the droplet
git pull                             # only needed for compose/nginx/script changes
sed -i 's|^BACKEND_IMAGE=.*|BACKEND_IMAGE=docker.io/<user>/ems-backend:<new-sha>|' .env
docker compose -f docker-compose.prod.yml pull backend
docker compose -f docker-compose.prod.yml up -d backend
```

Because the backend service has no `build:` key, the droplet **cannot**
accidentally build its own backend image — `docker compose build` reports "no
services to build". The only way a backend change reaches production is through
a pushed tag, which also means the exact artifact you tested is the one that
runs. Migrations run automatically inside the new container on start.

To roll back, point `BACKEND_IMAGE` at the previous SHA tag and repeat the pull
and `up -d`. Note that a rollback does **not** revert database migrations.

### How HTTPS is wired up

- `docker-compose.prod.yml` runs an `nginx` service (templated from
  `nginx/templates/nginx.conf.template`, with `${DOMAIN}` substituted at
  container start) and a `certbot` service.
- `nginx/init-letsencrypt.sh` handles the one-time bootstrap: it creates a
  throwaway self-signed cert so nginx can start, requests the real
  certificate from Let's Encrypt over the ACME HTTP-01 challenge, then
  reloads nginx. `scripts/deploy.sh` calls this automatically on first run.
- `scripts/renew_cert.sh` renews the certificate if due and reloads nginx;
  it's scheduled via cron by `deploy.sh` to run twice a day.
- Certificates live under `nginx/certs/` on the host (gitignored) — back
  this directory up along with the database if you migrate servers.

### Connecting a SQL client (DBeaver, pgAdmin, psql)

**The database is not exposed to the internet, by design.** The `db` service
binds `127.0.0.1:5432` on the droplet only, and `deploy.sh` never opens 5432 in
ufw. Pointing DBeaver straight at `yourdomain.com:5432` will always time out —
that is the firewall and the port binding doing their job, not a fault.

Reach it through an **SSH tunnel** instead. In DBeaver:

*Main* tab — this describes the far end of the tunnel, so it stays `localhost`:

| Field    | Value                                   |
| -------- | --------------------------------------- |
| Host     | `localhost`                             |
| Port     | `5432`                                  |
| Database | `POSTGRES_DB` from the droplet's `.env`   |
| Username | `POSTGRES_USER` from the droplet's `.env` |
| Password | `POSTGRES_PASSWORD` from the droplet's `.env` |

*SSH* tab — tick **Use SSH Tunnel**:

| Field         | Value                                |
| ------------- | ------------------------------------ |
| Host/IP       | the droplet's public IP or `DOMAIN`  |
| Port          | `22`                                 |
| User Name     | `root` (or your sudo user)           |
| Authentication| Public Key + your private key, or Password |

Then **Test Connection**. DBeaver opens the SSH session first and forwards
`localhost:5432` through it, so Postgres sees a connection arriving on loopback.

The equivalent from a terminal:
```bash
ssh -L 5432:localhost:5432 root@<droplet-ip>
# leave that running, then in another shell:
psql -h localhost -p 5432 -U <POSTGRES_USER> -d <POSTGRES_DB>
```

If your Mac already runs a local Postgres on 5432, forward to a spare local
port instead (`ssh -L 5433:localhost:5432 ...`) and set DBeaver's port to 5433.

**If you get `Connection to <droplet-ip>:5432 refused`,** the Main tab still has
the droplet's IP in it. With the tunnel enabled DBeaver resolves the Main tab
host *from the droplet*, so it ends up asking the droplet to connect to its own
public IP — where nothing listens, because Postgres is bound to loopback. Set
Main → Host to `localhost`. The IP belongs only in the SSH tab.

The two failure modes are worth telling apart:

| Error | Meaning |
| ----- | ------- |
| `timeout` | No tunnel. ufw is dropping the packet; nothing reached Postgres. |
| `refused` | Tunnel works, wrong Main host. The droplet got an RST from itself. |

Read the credentials off the server rather than guessing:
```bash
ssh root@<droplet-ip> 'grep -E "^POSTGRES_(USER|DB)=" /opt/ems/.env'
```

> **Never** publish the port as `"5432:5432"` or run `ufw allow 5432`. The short
> port form binds `0.0.0.0`, which puts your customer database on the public
> internet behind nothing but a password.

Applying this needs the `db` container recreated once, which is safe — the data
lives in the `postgres_data_prod` named volume, not the container:
```bash
cd /opt/ems && git pull && docker compose -f docker-compose.prod.yml up -d db
```
Confirm it is listening on loopback and nowhere else:
```bash
ss -tlnp | grep 5432     # expect 127.0.0.1:5432, NOT 0.0.0.0:5432
```

## 4. Automated Database Backups

A backup script is provided at `scripts/backup_db.sh`. It reads the database
credentials from `.env`, resolves the running `db` container via Compose, and
writes a timestamped `pg_dump` custom-format archive to `./backups`, keeping
the last 7 days.

1. Ensure the script is executable:
   ```bash
   chmod +x scripts/backup_db.sh
   ```
2. Test the script manually:
   ```bash
   ./scripts/backup_db.sh
   ```
3. Set up a Cron job to run daily at midnight. Open the crontab editor:
   ```bash
   crontab -e
   ```
4. Add the following line:
   ```cron
   0 0 * * * /opt/ems/scripts/backup_db.sh >> /var/log/ems_backup.log 2>&1
   ```

To restore a dump (custom format — use `pg_restore`, not `psql`):
```bash
docker compose -f docker-compose.prod.yml exec -T db \
  pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean < backups/ems_backup_YYYYMMDD_HHMMSS.dump
```

> **These dumps sit on the same droplet as the database.** Losing the droplet
> loses both. Sync `backups/` and `nginx/certs/` to DigitalOcean Spaces, S3, or
> another host for this to count as a real backup.

## 5. Health Checks

- Check the API: `https://yourdomain.com/api/v1/health` → `{"status":"ok",…}`
- Check the root: `https://yourdomain.com/` → a small JSON banner. Nothing is
  served here; the frontend lives on its own host.
- Check CORS from the frontend's origin:
  ```bash
  curl -sI -X OPTIONS https://yourdomain.com/api/v1/auth/login \
    -H "Origin: https://app.yourdomain.com" \
    -H "Access-Control-Request-Method: POST" | grep -i access-control-allow-origin
  ```
  An empty result means the origin is missing from `CORS_ORIGINS` and the
  frontend will not be able to talk to the API.

The interactive API docs (`/docs`, `/redoc`, `/openapi.json`) are **disabled in
production** so the API surface isn't published publicly — they return 404 when
`ENVIRONMENT=production` and are available on the local dev stack instead.

---
*Note for Internal/LAN-only Office Use: `scripts/deploy.sh` requires a domain
name in order to issue an HTTPS certificate. If the server is only reachable
over a LAN or VPN with no public domain, use the plain-HTTP dev stack instead
(`docker compose -f docker-compose.yml up -d --build`), which skips nginx/
certbot entirely.*
