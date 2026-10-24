# Runbook: FitScape on the homelab

Where things live and how to operate them. Background: [ADR 0003](../adr/0003-hosting-and-environments.md).

## At a glance

| What | Value |
|---|---|
| Proxmox container | CT 104 `fitscape`, Debian 13, unprivileged, Docker CE |
| IP address | `192.168.68.15` (LAN; reachable over Tailscale via the subnet router) |
| Repo checkout | `/opt/fitscape` |
| Secrets | `/opt/fitscape/infra/.env` (root-only, `chmod 600`, never committed) |
| Database | PostgreSQL 17 (pinned version, see `infra/docker-compose.yml`), port `5432` on `192.168.68.15` only, data in Docker volume `fitscape_pgdata` |
| Backups | Proxmox job `nightly-nas` (03:00, all guests) to the Asustor NAS |
| App | <http://192.168.68.15> (nginx `web` container; the `api` container is internal only), uses `fitscape_prod` |

> ⚠️ **Don't invite guests to the tailnet yet.** The Tailscale subnet router currently exposes the whole home LAN, including port 5432, to every tailnet member. Restrict guests with Tailscale ACLs first (tracked for milestone M3).

## Getting a shell

From the PC:

```bash
ssh homelab                # Proxmox host
pct enter 104              # root shell inside the fitscape container
cd /opt/fitscape/infra
```

## Databases and roles

| Database | Login role | Use |
|---|---|---|
| `fitscape_dev` | `fitscape_dev` | Your sandbox while coding. Safe to wipe. |
| `fitscape_test` | `fitscape_test` | Automated tests. Wiped by the test suite. |
| `fitscape_prod` | `fitscape_prod` | Real users' data. The deployed app uses this. |
| `fitscape_prod` | `fitscape_readonly` | Browsing prod safely: `SELECT` only. |

Each role can connect **only** to its own database. App roles can't reach the `postgres` admin database at all.
**Migrations must run as the database's owner role** (e.g. `fitscape_prod`). Otherwise the readonly role won't be able to see the new tables.

### Getting a password without printing it

Passwords live in `.env`. Copy one straight to the PC clipboard instead of showing it on screen (run from Git Bash on the PC):

```bash
ssh homelab "pct exec 104 -- grep ^FITSCAPE_DEV_PASSWORD= /opt/fitscape/infra/.env" | cut -d= -f2 | tr -d '\n' | clip
```

Then paste it into DBeaver and let DBeaver store it (its credentials are saved encrypted).
Never `cat .env` while screen-sharing, and never paste passwords into chats, AI assistants included.

## Everyday commands (inside CT 104, in `/opt/fitscape/infra`)

```bash
docker compose ps                 # is it running / healthy?
docker compose logs -f db         # follow database logs, including every connection (Ctrl+C to stop)
docker compose restart db         # restart Postgres
./db/test-roles.sh                # verify roles and permissions
```

Postgres starts automatically when the container boots (`restart: unless-stopped`, and CT 104 has `onboot=1`).

## Updating Postgres

The image version is pinned in `infra/docker-compose.yml`, so updates are deliberate:

1. Take a backup first: Proxmox UI → CT 104 → Backup → **Backup now** (or confirm last night's backup exists).
2. Bump the tag (e.g. `17.11-trixie` → `17.12-trixie`) in a PR and merge it.
3. On CT 104: `cd /opt/fitscape && git pull && cd infra && docker compose up -d && ./db/test-roles.sh`

Stay on major version 17. Moving to 18 requires a dump/restore or `pg_upgrade`, and gets its own plan.

## Connecting with DBeaver (PC)

New connection → PostgreSQL:

- **Host:** `192.168.68.15` · **Port:** `5432`
- **Database / Username:** `fitscape_dev` (or `fitscape_prod` + `fitscape_readonly` for browsing prod)
- **Password:** see "Getting a password without printing it"
- For the prod connection, also tick **Connection settings → General → Read-only connection**. Belt and braces.

## Updating the checkout

```bash
cd /opt/fitscape && git pull
```

`db/init/` scripts run **only once**, when the data volume is first created. Editing them later changes nothing in the existing database. Schema changes go through Alembic migrations.

## Deploying the app

The `api` (FastAPI) and `web` (nginx + built React app) containers are built from the checkout and run next to `db`.
`api` applies any new Alembic migrations to `fitscape_prod` every time it starts.

```bash
cd /opt/fitscape && git pull
cd infra && docker compose up -d --build   # rebuilds only what changed; db keeps running
docker compose ps                          # all three should be "healthy" / "running"
curl -s http://192.168.68.15/api/health    # {"status":"ok"}
```

- **First time only:** add `PIN_PEPPER` to `infra/.env` (`openssl rand -hex 32`). **Never change or lose it**: every existing PIN would stop working. Keep a copy somewhere safe (e.g. your password manager).
- **Roll back:** `git switch --detach <previous commit>` then `docker compose up -d --build`.
  If the release added a migration, undo it **before** switching, and take a dump first, because `downgrade()` usually drops the new columns or tables and their data:
  `docker compose exec -T db pg_dump -U postgres fitscape_prod > /root/pre-rollback-$(date +%F).sql`, then `docker compose exec api alembic downgrade -1`.
- **Logs:** `docker compose logs -f api web`.
- The site is plain HTTP for now, so `COOKIE_SECURE` is `false`. When HTTPS is added (e.g. `tailscale serve`), set it to `true` in `docker-compose.yml`.

## Danger zone

```bash
docker compose down -v   # DELETES ALL DATABASES (the volume). Only for a deliberate rebuild.
```

Before anything destructive, take a backup now (Proxmox UI → CT 104 → Backup → Backup now) and confirm it appears under Storage `nas-backups`.
The nightly Proxmox snapshot is crash-consistent: fine for recovery, but a `pg_dump` is the gold standard (planned).
