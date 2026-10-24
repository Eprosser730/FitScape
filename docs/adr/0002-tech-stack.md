# 0002. Tech stack

- **Status:** Accepted
- **Date:** 2026-10-23

## Context

FitScape is a full-stack learning project: a web app with accounts, historical activity data, and XP/level calculations, self-hosted on a homelab. The stack should be mainstream (good docs, transferable skills), readable for a developer still building confidence, and testable.

## Decision

- **Backend:** Python 3.13, **FastAPI**, **Pydantic v2** (validation), **SQLAlchemy 2** (ORM), **Alembic** (migrations), **psycopg 3** (driver)
- **Database:** **PostgreSQL 17**
- **Frontend:** **React** + **TypeScript**, built with **Vite**, routed with **React Router**
- **Tooling:** `uv` (Python env/deps), `ruff` (lint + format), `pytest`; ESLint + Vitest + React Testing Library; Playwright for end-to-end tests
- **Packaging/runtime:** Docker Compose

## Alternatives considered

- **TypeScript backend (Express/Fastify):** one language end to end, but Python reads closer to plain English and pairs naturally with SQL work.
- **C# / ASP.NET Core:** close to the developer's day job, but more ceremony for a first full-stack project.
- **SQLite:** zero setup, but we need an always-on, multi-user database that matches production behavior.

## Consequences

- Two languages (Python + TypeScript) to learn, with a clear boundary: the HTTP/JSON API.
- FastAPI generates interactive API docs (`/docs`) for free, which helps with learning and debugging.
- Alembic migrations make every schema change reviewable in a PR.
