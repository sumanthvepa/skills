---
name: api-contracts
description: Design and change HTTP APIs contract-first with OpenAPI, separate DTOs from domain models, and use consistent errors, pagination, idempotency, and versioning. Use when adding, changing, or removing an endpoint, request or response field, or error; when connecting a frontend to a backend; when generating an API client; or when another service will call this one.
---

# API Contracts

The API is the boundary between frontend and backend, and between this
service and every other client. A written, versioned contract keeps
both sides honest: the frontend cannot quietly rely on fields that
should not exist, and the backend cannot break clients by accident.

## Rules

- **API-01** The contract is an OpenAPI 3.1 document committed at
  `api/openapi.yaml` (or generated from code annotations and committed,
  if the stack does that well). It is updated in the same change as the
  code. The frontend's API client and types are **generated** from it.
- **API-02** Request and response DTOs are separate types from domain
  objects and persistence models. Mapping happens in the `api` layer.
  Never serialize ORM entities or domain objects directly.
- **API-03** Errors use RFC 9457 problem details
  (`application/problem+json`) with a stable machine-readable `type`
  and human-readable `title`/`detail`. No stack traces, SQL, internal
  hostnames, or exception class names in responses.
- **API-04** Use HTTP semantics correctly:
  - `GET` is safe (no side effects); `PUT` and `DELETE` are idempotent.
  - Operations with side effects that clients may retry (payments,
    order creation) accept an `Idempotency-Key` header.
  - Status codes: 200/201/204 success; 400 malformed; 401
    unauthenticated; 403 forbidden; 404 not found (also for objects the
    caller may not know exist); 409 conflict / invalid state transition;
    422 validation failure; 429 rate limited; 5xx server faults only.
  - Business actions that are not CRUD are explicit sub-resources
    (`POST /orders/{id}/approve`), not a client-set `status` field.
- **API-05** Collection endpoints are paginated (cursor-based preferred)
  with a server-enforced maximum page size. Filtering, sorting, and
  search are query parameters handled by the server.
- **API-06** Breaking changes (removing or renaming fields, changing
  types or meaning, tightening validation, new required inputs) require
  a new version or a deprecation period. CI runs a contract diff (e.g.
  `oasdiff breaking`) against the main branch.
- **API-07** Responses contain only fields the caller is authorized to
  see. Never send sensitive fields for the client to hide (SEP-08).

## Conventions

- Resource paths are plural nouns: `/orders`, `/orders/{orderId}/lines`.
- JSON property names in `camelCase`.
- Money as a decimal string plus currency (`"total": "94.50"`,
  `"currency": "USD"`) or integer minor units; never a binary float.
- Timestamps in RFC 3339 UTC (`2026-10-20T14:03:00Z`).
- IDs are opaque strings; do not expose sequential database IDs if
  enumeration is a risk.
- Each response that drives UI actions can include server-computed
  `allowedActions` or `permissions` (see `frontend-backend-separation`).

## Error example

```json
HTTP/1.1 409 Conflict
Content-Type: application/problem+json

{
  "type": "https://errors.example.com/order/invalid-transition",
  "title": "Order cannot be approved",
  "status": 409,
  "detail": "Order 123 is SHIPPED; only PENDING_APPROVAL orders can be approved.",
  "instance": "/orders/123/approve"
}
```

Validation errors (422) add an `errors` array of
`{ "field": "items[0].quantity", "message": "must be ≥ 1" }`.

## Workflow for an API change

1. Edit `api/openapi.yaml` first; describe the change.
2. Check it for breaking changes; if breaking, version it or get
   approval.
3. Implement the backend: DTOs, controller/router, service.
4. Add API tests that validate responses against the contract and cover
   authorization failures (TST-07).
5. Regenerate the frontend client; update the UI.

## Client generation (frontend)

Defaults: `openapi-typescript` (types) with `openapi-fetch`, or
`orval` (client plus TanStack Query hooks). Generated code is not
hand-edited. See `typescript-frontend`.
