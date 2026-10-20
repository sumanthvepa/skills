---
name: backend-layering
description: Structure backend service code into api, services, domain, and infrastructure layers with a strictly enforced dependency direction. Use when creating a backend service or module, adding endpoints, business logic, repositories, database access, or external service clients, or when deciding which package, module, or folder new backend code goes in. Applies to Java, Python, and Node/TypeScript backends.
---

# Backend Layering

Business rules are only safe in the backend if they are also
*findable, testable, and isolated* there. A controller that queries the
database, applies a discount, and formats JSON in one function is
backend code, but it is as hard to verify as frontend code. This skill
defines the layers and the direction dependencies may point.

## Layers

```
          ┌────────────────────────────┐
request → │ api            (adapters)  │  HTTP, DTOs, auth context, error mapping
          └─────────────┬──────────────┘
                        ▼
          ┌────────────────────────────┐
          │ services       (use cases) │  orchestration, transactions, authorization
          └─────────────┬──────────────┘
                        ▼
          ┌────────────────────────────┐
          │ domain         (rules)     │  entities, value objects, rules, ports
          └─────────────▲──────────────┘
                        │ implements ports
          ┌─────────────┴──────────────┐
          │ infrastructure (adapters)  │  DB, external APIs, LLM clients, queues
          └────────────────────────────┘

  composition root (main / app factory / DI config) wires everything
```

| Layer | Contains | May depend on |
|---|---|---|
| `api` | Controllers/routers/handlers, request/response DTOs, mapping, exception-to-HTTP mapping | `services`, `domain` (types only) |
| `services` | Use cases (one public method per operation), transaction boundaries, authorization checks, orchestration across ports | `domain` |
| `domain` | Entities, value objects, business rules and policies, domain exceptions, **ports** (interfaces for repositories, gateways, clock, ID generator) | nothing outside `domain` (standard library and small pure utilities only) |
| `infrastructure` | Repository implementations, ORM/persistence models, HTTP clients, LLM clients, message producers, file storage | `domain` |
| composition root | Wiring, framework bootstrap, configuration loading | everything |

## Rules

- **LAY-01** Backend code is organized into `api`, `services`,
  `domain`, and `infrastructure` (per module or feature, if the service
  is large: `orders/api`, `orders/services`, ...).
- **LAY-02** `domain` has no dependencies on web frameworks, HTTP,
  ORMs or database drivers, configuration/environment access, logging
  frameworks, or IO. It is plain code that can be unit tested
  instantly. Time, randomness, and IDs come in through ports or
  parameters.
- **LAY-03** `services` depend on `domain` (including its ports), never
  on `api` or `infrastructure` directly. Concrete implementations are
  injected.
- **LAY-04** `api` is thin: authenticate, parse and validate input into
  DTOs, call **one** service method, map the result or error to a
  response. No business decisions, no repository or database access, no
  calls to external services.
- **LAY-05** `infrastructure` implements domain ports and depends only
  on `domain`. Persistence models (JPA entities, SQLAlchemy models,
  Prisma types) are mapped to domain objects at this boundary unless an
  ADR accepts using them as domain objects.
- **LAY-06** Transactions are opened and committed at the service
  layer, around a use case. Not in controllers, not in repositories
  piecemeal.
- **LAY-07** No circular dependencies between modules or layers.

## Where does this code go?

| Code | Layer |
|---|---|
| "Orders over the threshold get a discount" | `domain` (policy), invoked by a `services` use case |
| "Only the order's owner or a manager may cancel it" | `services` (authorization), using domain data |
| "An order can go from PENDING to APPROVED, not from SHIPPED" | `domain` (state machine on the entity) |
| Parse JSON body, return 201 with Location header | `api` |
| SQL query, ORM mapping | `infrastructure` |
| Call payment provider / LLM / email service | `infrastructure` (behind a port defined in `domain`) |
| Read `DATABASE_URL` | composition root / config module |
| Convert `OrderNotFound` to HTTP 404 | `api` (exception handler) |

## Authorization placement

Authentication (who is calling) is resolved in `api` middleware and
passed to services as an explicit principal/actor value. Authorization
(may they do this to this object) is decided in `services`, because it
usually needs domain data (ownership, state) and must apply no matter
which adapter (HTTP, queue consumer, CLI) invoked the use case.

## Smaller services

For a very small service, the layers may be single files
(`api.py`, `services.py`, `domain.py`, `infrastructure.py`), but the
dependency rules still hold and are still checked.

## Enforcement

Layer rules are enforced by executable checks (QG-03):

- Java: ArchUnit test (`quality-gates/assets/boundaries/java/`)
- Python: import-linter (`quality-gates/assets/boundaries/python/`)
- Node/TS: dependency-cruiser (`quality-gates/assets/boundaries/node/`)

Language-specific layouts are in `java-backend`, `python-backend`, and
`node-ts-backend`.
