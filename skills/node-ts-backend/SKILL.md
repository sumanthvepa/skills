---
name: node-ts-backend
description: Build Node.js backend services in TypeScript (default Fastify, NestJS for larger teams) that follow the base engineering rules for layering, API contracts, configuration, security, and testing. Use when creating or modifying Node/TypeScript or JavaScript server code, Express/Fastify/NestJS routes, ORM code (Prisma, Drizzle, Kysely), server-side package.json and tsconfig, or backend tests.
---

# Node / TypeScript Backend

Applies `backend-layering`, `api-contracts`, `config-and-prompts`,
`security-baseline`, `testing-standards`, and
`observability-and-operations` to Node. Read those for the rules; this
skill shows how they map to code.

Because the frontend is also TypeScript, it is easy to blur the line
between them. A Node backend is a **separate application** with its own
`package.json`, even in a monorepo; it shares only contract types with
the frontend (`frontend-backend-separation`).

## Defaults

| Concern | Default |
|---|---|
| Runtime | Node.js active LTS; ES modules |
| Language | TypeScript with `"strict": true`, `noUncheckedIndexedAccess`; no `any` in domain or services |
| Framework | Fastify (NestJS for larger teams; Express acceptable) |
| Validation | zod (or TypeBox with Fastify) at the api boundary |
| Persistence | Prisma or Drizzle (Kysely for SQL-first); migrations committed |
| Testing | Vitest, Supertest or Fastify `inject`, Testcontainers |
| Quality | ESLint (typescript-eslint), Prettier, dependency-cruiser, `npm audit` |
| Logging | pino (JSON) |
| Observability | OpenTelemetry Node SDK |

## Layout

```
package.json  package-lock.json  tsconfig.json  .dependency-cruiser.cjs
src/
  main.ts                    composition root: load config, build deps, start server
  config.ts                  zod-validated settings
  api/
    orders.routes.ts         route definitions, schemas, mapping
    error-handler.ts         errors → problem+json
    auth.ts                  authentication hook → Actor
  services/
    order-service.ts
  domain/
    order.ts  pricing.ts  ports.ts  errors.ts
  infrastructure/
    db.ts  order-repository.ts  payment-client.ts
prompts/
test/
  unit/  integration/  api/
```

## Mapping the rules

**Domain (LAY-02):** no imports from `fastify`, `express`, `@nestjs/*`,
ORM packages, `node:fs`, `node:http`, or `process.env`. Ports are
TypeScript interfaces:

```ts
export interface OrderRepository {
  get(id: OrderId): Promise<Order | undefined>;
  save(order: Order): Promise<void>;
}
```

**Services (LAY-03, LAY-06):** classes or factory functions receiving
ports via constructor; authorization and transactions here.

```ts
export class OrderService {
  constructor(private readonly uow: UnitOfWork, private readonly clock: Clock) {}

  async approve(id: OrderId, actor: Actor): Promise<Order> {
    if (!actor.permissions.has('order:approve')) throw new AccessDenied('order:approve');
    return this.uow.run(async ({ orders }) => {
      const order = await orders.get(id);
      if (!order) throw new OrderNotFound(id);
      const approved = approveOrder(order, actor, this.clock.now()); // domain rule
      await orders.save(approved);
      return approved;
    });
  }
}
```

**API (LAY-04, API-02, API-03):** validate input with zod, call one
service method, map to a response DTO. A single error handler maps
domain errors to problem+json and hides internals:

```ts
app.setErrorHandler((err, req, reply) => {
  const problem = toProblem(err); // OrderNotFound → 404, InvalidTransition → 409, ...
  if (problem.status >= 500) req.log.error({ err }, 'unhandled error');
  reply.status(problem.status).type('application/problem+json').send(problem);
});
```

**Configuration (CFG-02):**

```ts
// src/config.ts
import { z } from 'zod';

const Settings = z.object({
  DATABASE_URL: z.string().url(),
  PORT: z.coerce.number().int().default(8080),
  PRICING_DISCOUNT_THRESHOLD_CENTS: z.coerce.number().int().positive(),
  PRICING_DISCOUNT_RATE_BASIS_POINTS: z.coerce.number().int().min(0).max(10_000),
  LLM_API_KEY: z.string().min(1).optional(),
});

export type Settings = z.infer<typeof Settings>;
export const loadSettings = (env = process.env): Settings => Settings.parse(env);
```

`process.env` is read only in `config.ts`.

**Security:** authentication hook on every route by default with an
explicit public list; `@fastify/helmet`, `@fastify/cors` with an origin
allowlist, `@fastify/rate-limit`; use `jose` for JWT verification
against the IdP's JWKS. No `eval`, `new Function`, or
`child_process.exec` with input.

**Money:** integer minor units or a decimal library (e.g. `decimal.js`);
never floating-point arithmetic on currency.

**Async:** no floating promises (enable
`@typescript-eslint/no-floating-promises`); handle
`unhandledRejection` by logging and exiting.

## Testing

- `test/unit`: domain and services with in-memory fakes.
- `test/integration`: repositories against PostgreSQL via
  Testcontainers.
- `test/api`: `app.inject()` / Supertest; include
  401/403/404/409/422; validate responses against the OpenAPI schema.
- `depcruise src` with the config in
  `quality-gates/assets/boundaries/node/`.

## Commands

```bash
npm ci
npm run lint && npm run typecheck
npx depcruise src --config .dependency-cruiser.cjs
npm test
npm audit --audit-level=high
```
