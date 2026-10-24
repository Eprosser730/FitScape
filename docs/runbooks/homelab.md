# Runbook: FitScape on the homelab

Where things live and how to operate them. Background: [ADR 0003](../adr/0003-hosting-and-environments.md).

## At a glance

| What | Value |
|---|---|
| Proxmox container | CT 104 `fitscape`, Debian 13, unprivileged, Docker CE |
| IP address | `192.168.68.15` (LAN; reachable over Tailscale via the subnet router) |
| Repo checkout | `/opt/fitscape` |
| Secrets | `/opt/fitscape/infra/.env` (root-only, `chmod 600`, never committed) |
| Database | PostgreSQL 17, port `5432`, data in Docker volume `fitscape_pgdata` |
| Backups | Proxmox job `nightly-nas` (03:00, all guests) to the Asustor NAS |

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

Each role can connect **only** to its own database. Passwords are in `.env`. To read one:

```bash
grep FITSCAPE_DEV_PASSWORD /opt/fitscape/infra/.env
```

## Everyday commands (inside CT 104, in `/opt/fitscape/infra`)

```bash
docker compose ps                 # is it running / healthy?
docker compose logs -f db         # follow database logs (Ctrl+C to stop)
docker compose restart db         # restart Postgres
docker compose pull && docker compose up -d   # update to the latest Postgres 17.x
./db/test-roles.sh                # verify roles and permissions (17 checks)
```

Postgres starts automatically when the container boots (`restart: unless-stopped`, and CT 104 has `onboot=1`).

## Connecting with DBeaver (PC)

New connection → PostgreSQL:

- **Host:** `192.168.68.15` · **Port:** `5432`
- **Database / Username:** `fitscape_dev` (or `fitscape_prod` + `fitscape_readonly` for browsing prod)
- **Password:** from `.env` (see above)
- For the prod connection, also tick **Connection settings → General → Read-only connection**. Belt and braces.

## Updating the checkout

```bash
cd /opt/fitscape && git pull
```

`db/init/` scripts run **only once**, when the data volume is first created. Editing them later changes nothing in the existing database. Schema changes go through Alembic migrations.

## Danger zone

```bash
docker compose down -v   # DELETES ALL DATABASES (the volume). Only for a deliberate rebuild.
```

Before anything destructive, check that last night's backup exists: Proxmox UI → Datacenter → Storage `nas-backups` → Backups → CT 104.
