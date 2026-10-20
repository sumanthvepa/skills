# Full-Stack Frameworks (Next.js, Remix, Nuxt, SvelteKit)

These frameworks are allowed, but because client and server code share
one codebase, the boundary must be made explicit and enforced
mechanically (SEP-07).

## Structure

Keep a backend inside the app, with the same layering as a standalone
service (`backend-layering`):

```
src/
  app/                    routes, pages, layouts (Next.js App Router)
    orders/
      page.tsx            server or client component: presentation only
      actions.ts          'use server': thin adapters → server/services
    api/
      orders/route.ts     route handler: thin adapter → server/services
  server/                 SERVER ONLY: the backend
    services/             use cases
    domain/               business rules, pure
    infrastructure/       db, external clients, LLM clients
    config.ts             validated settings (secrets live here)
  components/             UI components
  lib/                    client-safe helpers (formatting only)
  contracts/              shared types and zod schemas (no logic)
```

## Rules

1. Every module under `src/server/` starts with `import 'server-only';`
   (the `server-only` npm package makes the build fail if a client
   component imports it). Equivalent mechanisms: Remix `*.server.ts`,
   Nuxt `server/`, SvelteKit `$lib/server`.
2. Server actions, route handlers, and loaders are adapters: parse
   input with the shared schema, check authentication, call one service
   method, map the result. No business decisions inside them.
3. Server actions are public HTTP endpoints. Each one authenticates and
   authorizes independently; never assume it is only reachable from
   your own form.
4. Server components may read data **through services**, never by
   importing the ORM or database client directly into a page.
5. Only `src/contracts/` (types, schemas) is imported by both sides.
   Business rule functions are not shared with client code.
6. Environment variables: only `NEXT_PUBLIC_*` (or the framework's
   equivalent) reach the browser. Never put secrets there. Read server
   configuration only in `src/server/config.ts`.
7. Enforce with ESLint (`no-restricted-imports` forbidding
   `@/server/*` from components and client files) and
   dependency-cruiser. See `quality-gates/assets/boundaries/`.

## When to split out a separate backend

Prefer a separate backend service (Java, Python, or Node) when any of
these hold, and record the decision in an ADR:

- Other clients (mobile, partners, batch jobs) need the same rules.
- The backend team's approved language is not TypeScript.
- Business logic is substantial or regulated (pricing, finance,
  compliance).
- Independent scaling or deployment of the API is needed.

In that case the Next.js app's server side is only a BFF (backend for
frontend): session handling and proxying to the backend API, with no
business rules.
