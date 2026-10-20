---
name: observability-and-operations
description: Make services observable, deployable, and operable. Use when adding logging, error handling, health checks, metrics, or tracing; when writing Dockerfiles, deployment manifests, or CI release steps; when creating or changing database schemas and migrations; when calling external services (timeouts, retries); and when preparing a service for production.
---

# Observability and Operations

## Rules

- **OPS-01** Logs are structured (JSON in deployed environments), with
  a timestamp, level, logger, message, and a request/correlation ID
  propagated across services. Use levels meaningfully (ERROR needs
  action; WARN is unexpected but handled; INFO is business-relevant
  events; DEBUG is off in production). No secrets, tokens, or
  unnecessary personal data in logs (SEC-09). Log through the logging
  framework, never `print` / `System.out` / `console.log` in service code.
- **OPS-02** Each service exposes a liveness endpoint (process is up)
  and a readiness endpoint (dependencies reachable; ready for traffic),
  separate from business endpoints and not requiring user auth, but
  revealing no internal details.
- **OPS-03** Emit metrics and traces with OpenTelemetry: at least
  request rate, error rate, and latency per endpoint, plus key business
  counters. Outbound calls (DB, HTTP, LLM) are traced. LLM calls record
  model, prompt id/version, token counts, and latency.
- **OPS-04** Every outbound call has a timeout. Retries use exponential
  backoff with jitter and only for idempotent operations (or with an
  idempotency key). Use circuit breakers or bulkheads for unreliable
  dependencies.
- **OPS-05** Schema changes go through versioned, reviewed migrations
  (Flyway or Liquibase; Alembic; Prisma Migrate, Drizzle Kit, or Knex).
  Never use ORM auto-create/auto-update of schema outside local
  development. Migrations are backward compatible with the currently
  running version (expand, migrate, then contract).
- **OPS-06** Build once; promote the same artifact or image through all
  environments. Only configuration differs between environments.
- **OPS-07** Containers: pinned base image versions (or digests),
  multi-stage builds, run as a non-root user, no secrets or `.env`
  files in the image, minimal runtime image, a `.dockerignore`.
- **OPS-08** A global error handler maps unexpected errors to a generic
  500 problem response and logs them with the correlation ID. The
  service shuts down gracefully (stop accepting traffic, finish
  in-flight requests, close pools) on SIGTERM.

## Dockerfile shape (example: Python)

```dockerfile
FROM python:3.12-slim AS build
WORKDIR /app
COPY --from=ghcr.io/astral-sh/uv:0.5 /uv /usr/local/bin/uv
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev --no-install-project
COPY src ./src
RUN uv sync --frozen --no-dev

FROM python:3.12-slim
WORKDIR /app
RUN useradd --system --uid 10001 app
COPY --from=build /app /app
USER app
ENV PATH="/app/.venv/bin:$PATH"
EXPOSE 8000
CMD ["uvicorn", "app.main:create_app", "--factory", "--host", "0.0.0.0", "--port", "8000"]
```

The same shape applies to Java (build with Maven/Gradle in a JDK image,
run in a JRE image) and Node (`npm ci` and build in one stage, copy
`dist` and production `node_modules` to a slim runtime stage).
Update the pinned versions to current ones when you adopt this.

## Production readiness checklist

- [ ] Structured logs with correlation IDs; no sensitive data. (OPS-01)
- [ ] Liveness and readiness endpoints. (OPS-02)
- [ ] Metrics and traces exported; dashboards/alerts for errors and latency. (OPS-03)
- [ ] Timeouts on every outbound call; safe retry policy. (OPS-04)
- [ ] Migrations versioned and backward compatible. (OPS-05)
- [ ] Single artifact promoted across environments. (OPS-06)
- [ ] Container hardened. (OPS-07)
- [ ] Global error handler; graceful shutdown. (OPS-08)
- [ ] Configuration validated at startup. (CFG-02)
