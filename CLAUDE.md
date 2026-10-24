# FitScape: notes for AI-assisted sessions

FitScape is an Old School RuneScape-inspired goal tracker: users log activities, earn XP, and level up skills.
It's a **learning project**. Explain what you're doing and why, in plain language, as you go.

## Workflow (non-negotiable)

- Follow [CONTRIBUTING.md](CONTRIBUTING.md): issue → branch `type/<issue>-name` → Conventional Commits → PR → squash merge.
- `main` is protected. Never try to push to it directly or bypass the ruleset.
- One concern per PR. Unrelated findings become new issues.
- **Every code change gets the review ritual:** write and run tests, then fill in the PR's Review section (right / wrong or risky / could be better / decision on each). Run the relevant reviewer agents (python/fastapi, react, security for auth or input handling).
- Record significant decisions as ADRs in `docs/adr/`.

## Stack

See [ADR 0002](docs/adr/0002-tech-stack.md) and [ADR 0003](docs/adr/0003-hosting-and-environments.md).

- `backend/`: FastAPI, SQLAlchemy 2, Alembic, Postgres 17 (managed with uv)
- `frontend/`: React + TypeScript + Vite
- `infra/`: Docker Compose for the homelab

## Rules

- **Never commit secrets.** Use `.env` (gitignored) and keep `.env.example` up to date.
- Never run destructive SQL against `fitscape_prod`. Use `fitscape_dev` or `fitscape_test`.
- Auth follows [ADR 0004](docs/adr/0004-username-pin-authentication.md). Changes to it need a new ADR and a security review.
- Commits use the GitHub noreply email (repo-local git config), not a personal address.
- Theme: dark, minimal, one gold accent; tokens live in `frontend/src/index.css`. Reuse them instead of new colors.
