# 0003. Hosting and environments

- **Status:** Accepted
- **Date:** 2026-10-23

## Context

FitScape will be used by the developer, family, and friends, who connect remotely over a Tailscale VPN. The database must run continuously and support multiple users, and the developer wants to query data directly with a SQL client. Code is written on a Windows PC, while the always-on hardware is a Proxmox homelab server.

## Decision

- **Code is written on the PC** and pushed to GitHub. Pull requests and CI run on GitHub.
- **PostgreSQL runs on the homelab** in a dedicated Debian container (Proxmox CT 104, `fitscape`) using Docker Compose, always on and restarted automatically.
- **Three separate databases**, each with its own login role:
  - `fitscape_dev`: the developer's sandbox; safe to wipe and reseed
  - `fitscape_test`: used by the automated test suite locally; wiped by tests
  - `fitscape_prod`: real users' data; never used for experiments
- The application itself will be deployed to the same container in milestone M3.
- **Remote access** is via Tailscale only. Nothing is exposed to the public internet. Guest users will be restricted (via Tailscale ACLs) to the app's port, not the database.
- **Backups:** the container is covered by the existing nightly Proxmox backup job to the NAS. A logical `pg_dump` backup is a planned follow-up.
- **SQL access** for the developer is through DBeaver.

## Alternatives considered

- **Docker Desktop on the PC:** good dev/prod parity, but the PC isn't always on and can't host shared data. It may be added later as an optional offline dev setup.
- **SQLite locally + Postgres in prod:** simpler, but the two databases differ in behavior and can hide bugs.

## Consequences

- Local development needs the homelab reachable (LAN or Tailscale).
- CI uses its own throwaway Postgres service container, so GitHub never touches homelab data.
- Real secrets (database passwords, PIN pepper) live only in `.env` files on the machines that need them.
