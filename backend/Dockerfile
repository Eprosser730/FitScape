# FitScape API image. Built and run by infra/docker-compose.yml.
FROM python:3.13.17-slim-trixie

COPY --from=ghcr.io/astral-sh/uv:0.13.5 /uv /usr/local/bin/uv
ENV UV_COMPILE_BYTECODE=1 UV_LINK_MODE=copy UV_PROJECT_ENVIRONMENT=/app/.venv \
    PATH="/app/.venv/bin:$PATH" PYTHONUNBUFFERED=1

WORKDIR /app
# Dependencies first, so code-only changes reuse this cached layer.
COPY pyproject.toml uv.lock .python-version ./
RUN uv sync --locked --no-dev
COPY alembic.ini ./
COPY alembic ./alembic
COPY app ./app

RUN useradd --system --uid 10001 fitscape
USER fitscape
EXPOSE 8000
HEALTHCHECK --interval=15s --timeout=5s --retries=5 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/api/health')"
# Apply any new migrations, then serve. --proxy-headers trusts X-Forwarded-* from nginx.
CMD ["sh", "-c", "alembic upgrade head && exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --proxy-headers"]
