# FitScape

A self-hosted goal tracker inspired by Old School RuneScape. Set goals, complete them, earn XP, and level up.

> **Status:** building the framework (milestone M1). Sign-in/sign-up and a placeholder dashboard work end to end. Theming is kept minimal on purpose while the framework is built.

## Run the backend locally

Needs [uv](https://docs.astral.sh/uv/) and the homelab database (see [docs/runbooks/homelab.md](docs/runbooks/homelab.md)).

```bash
cd backend
cp .env.example .env            # then fill in the passwords and a PIN_PEPPER
uv run alembic upgrade head     # create/update tables in fitscape_dev
uv run fastapi dev app/main.py  # API on http://localhost:8000, interactive docs at /docs
uv run pytest                   # tests run against fitscape_test
```

## Run the frontend locally

Needs Node 24. With the backend running on port 8000:

```bash
cd frontend
npm install
npm run dev    # http://localhost:5173 (calls to /api are proxied to the backend)
npm test       # component tests (Vitest + Testing Library)
```

## Planned stack

- **Backend:** Python, FastAPI, PostgreSQL
- **Frontend:** React + TypeScript (Vite)
- **Hosting:** Docker on a Proxmox homelab

## How we work

Every change is traceable: **issue → branch → small commits → pull request → review → squash merge.**
Nothing lands on `main` without a PR. Contribution conventions will live in `CONTRIBUTING.md`.

## License

[MIT](LICENSE)
