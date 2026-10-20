---
name: python-backend
description: Build Python backend services (default FastAPI) that follow the base engineering rules for layering, API contracts, configuration, security, and testing. Use when creating or modifying Python web services, FastAPI/Flask/Django code, routers, Pydantic models, SQLAlchemy models, Alembic migrations, pyproject.toml, or Python tests.
---

# Python Backend

Applies `backend-layering`, `api-contracts`, `config-and-prompts`,
`security-baseline`, `testing-standards`, and
`observability-and-operations` to Python. Read those for the rules; this
skill shows how they map to code.

## Defaults

| Concern | Default |
|---|---|
| Language | Python 3.12+, full type hints |
| Framework | FastAPI (Django is acceptable for CRUD-heavy apps via ADR) |
| Packaging | uv with `pyproject.toml` and committed `uv.lock`; `src/` layout |
| Validation / DTOs | Pydantic v2 models in `api/` |
| Settings | pydantic-settings |
| Persistence | SQLAlchemy 2.x (typed ORM or Core); Alembic migrations |
| Testing | pytest, httpx `TestClient`, testcontainers-python |
| Quality | ruff (lint + format), mypy (strict), import-linter, pip-audit |
| Observability | structlog or stdlib logging with JSON formatter; OpenTelemetry |

## Layout

```
pyproject.toml
uv.lock
src/app/
  main.py                    create_app(): composition root, wiring
  config.py                  Settings (pydantic-settings)
  api/
    orders.py                APIRouter, request/response models, mapping
    errors.py                exception handlers → problem+json
    dependencies.py          Depends() providers (read services from app.state), auth principal
  services/
    orders.py                OrderService (use cases, transactions, authorization)
  domain/
    orders.py                Order, OrderStatus, rules (dataclasses)
    pricing.py               PricingPolicy
    ports.py                 OrderRepository, Clock (Protocols)
    errors.py                domain exceptions
  infrastructure/
    db.py                    engine, session factory
    models.py                SQLAlchemy models
    order_repository.py      SqlOrderRepository (implements port)
migrations/                  Alembic
prompts/                     LLM prompt files (if used)
tests/
  unit/  integration/  api/
```

## Mapping the rules

**Domain (LAY-02):** standard library only (`dataclasses`, `enum`,
`decimal`, `typing`). No `fastapi`, `pydantic`, `sqlalchemy`, `os.environ`,
or logging configuration. Ports are `typing.Protocol`s:

```python
class OrderRepository(Protocol):
    def get(self, order_id: OrderId) -> Order | None: ...
    def save(self, order: Order) -> None: ...
```

**Services (LAY-03, LAY-06):** take ports and a unit-of-work/session
factory in `__init__`; one public method per use case; authorization
here; commit at the end of the use case.

```python
class OrderService:
    def __init__(self, uow: UnitOfWork, clock: Clock) -> None:
        self._uow = uow
        self._clock = clock

    def approve(self, order_id: OrderId, actor: Actor) -> Order:
        if Permission.ORDER_APPROVE not in actor.permissions:
            raise AccessDenied("order:approve")
        with self._uow as uow:
            order = uow.orders.get(order_id)
            if order is None:
                raise OrderNotFound(order_id)
            order.approve(actor, self._clock.now())
            uow.orders.save(order)
            uow.commit()
        return order
```

**API (LAY-04, API-02, API-03):** routers parse with Pydantic models,
call one service method, map to a response model. Register exception
handlers that return `application/problem+json`:

```python
@app.exception_handler(OrderNotFound)
async def not_found(request: Request, exc: OrderNotFound) -> JSONResponse:
    return JSONResponse(
        status_code=404,
        media_type="application/problem+json",
        content={"type": "https://errors.example.com/order/not-found",
                 "title": "Order not found", "status": 404},
    )
```

Always set `response_model` so internal fields are never serialized
(API-07). Disable the interactive docs in production, or protect them.

**Configuration (CFG-02):**

```python
class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_nested_delimiter="__")

    database_url: PostgresDsn
    pricing_discount_threshold: Decimal = Field(gt=0)
    pricing_discount_rate: Decimal = Field(ge=0, le=1)
    llm_api_key: SecretStr | None = None
```

Instantiate once in `create_app()` and inject; do not read `os.environ`
elsewhere.

**Security:** use an OIDC/JWT library (e.g. Authlib, PyJWT with JWKS)
in a dependency that produces an `Actor`; require it on every router
by default (`APIRouter(dependencies=[Depends(require_actor)])`). Never
use `pickle`, `yaml.load` (use `safe_load`), `eval`, or
`subprocess(..., shell=True)` with input.

**Money:** `decimal.Decimal`, never `float`.

**Persistence (OPS-05):** Alembic migrations only; never
`Base.metadata.create_all()` outside tests/local dev.

## Testing

- `tests/unit`: domain and services with in-memory fakes; no DB, no app.
- `tests/integration`: repositories against PostgreSQL via
  testcontainers.
- `tests/api`: `TestClient(create_app(test_settings))`; include
  401/403/404/409/422; validate against `api/openapi.yaml`
  (e.g. schemathesis).
- `lint-imports` with the contracts from
  `quality-gates/assets/boundaries/python/`.

## Commands

```bash
uv sync
uv run ruff check . && uv run ruff format --check .
uv run mypy src
uv run lint-imports
uv run pytest
```
