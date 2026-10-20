---
name: frontend-backend-separation
description: Decide where code belongs between the backend and the frontend, and keep business logic out of frontend TypeScript/JavaScript. Use whenever writing or changing code that involves both UI and data, rules, or calculations; when implementing pricing, discounts, totals, eligibility, permissions, limits, validation, workflow or status changes; when adding a form, dashboard, or feature that reads or writes data; when calling databases, third-party APIs, or LLMs; and when working in full-stack frameworks such as Next.js, Remix, Nuxt, or SvelteKit.
---

# Frontend / Backend Separation

The frontend runs on a machine the user controls. Anything it computes
can be inspected, changed, skipped, or forged. The backend is the only
place where rules can be enforced, and the only place every client
(web, mobile, partner API, batch job) shares. So business logic belongs
in the backend; the frontend presents and collects.

## The placement test

For any piece of logic, ask:

1. **Tamper test.** If a user edited this code in their browser, or
   called the API directly with curl, would the system still behave
   correctly? If not, it must be on the server.
2. **Second-client test.** Would a mobile app, partner integration, or
   batch job need the same rule? If yes, it must be on the server, once.
3. **Record test.** Is the result stored, billed, audited, or used to
   make a decision? If yes, the server computes it.
4. **Secret test.** Does it need a credential, API key, internal
   network, or data the user is not allowed to see? Server.

Only logic that passes all four (it affects nothing but what this user
sees on this screen) belongs in the frontend.

## Rules

- **SEP-01** Business rules (pricing, discounts, tax, totals, fees,
  eligibility, quotas and limits, scoring, workflow and status
  transitions, scheduling and allocation decisions) are implemented in
  backend domain/service code only.
- **SEP-02** Authorization is decided on the server for every request.
  The frontend may hide or disable UI based on **permissions returned by
  the server**, but hiding a button is never the protection.
- **SEP-03** The server validates every input. Client-side validation
  exists only for user experience; it must mirror the server's rules
  (preferably generated from the shared contract) and is never the only
  check.
- **SEP-04** The frontend communicates only with the application's own
  backend API. No direct database access, no direct calls to internal
  services, no calls to third-party APIs that require secrets.
- **SEP-05** Values of record (prices, totals, statuses, identifiers,
  timestamps, computed scores) are computed by the server and returned
  to the client. The client never sends a computed value back as
  authoritative (e.g. posting `total: 94.50`); it sends intent
  (`items`, `couponCode`), and the server computes.
- **SEP-06** LLM calls, prompts, and model API keys are server-side.
  The browser sends the user's input to the backend; the backend builds
  the prompt, calls the model, validates the output, and returns it.
- **SEP-07** In full-stack frameworks (Next.js, Remix, Nuxt, SvelteKit),
  business logic lives in server-only modules, and route handlers,
  server actions, and loaders are thin adapters that call into them.
  See `references/full-stack-frameworks.md`.
- **SEP-08** Frontend data processing is limited to presentation of
  data the server has already authorized for this user: formatting,
  sorting or filtering the rows already on screen, client-side view
  state. Filtering, aggregation, and search over full datasets are done
  by the server; the server never sends data for the client to hide.

## What belongs where

| Backend (domain/services) | Frontend |
|---|---|
| Authorization and ownership checks | Showing/hiding UI from server-provided permissions |
| Validation of record | Instant UX validation that mirrors the server |
| Prices, totals, discounts, tax, fees | Displaying them, locale/currency formatting |
| State machines, workflow transitions | Rendering the current state and allowed actions (from the server) |
| Eligibility, quotas, rate limits | Messaging when the server says no |
| Search, filtering, aggregation, pagination over data | Sorting/filtering the current page; pagination controls |
| Calls to databases, internal services, third parties | Calls to our backend API through one API client module |
| LLM prompts, model calls, output validation | Sending user input; rendering (escaped) results |
| IDs, timestamps of record, audit trail | Optimistic display, reconciled with the server response |
| Feature-flag decisions that gate capability | Feature-flag decisions that only change presentation |

## Gray areas

- **Duplicated validation.** Acceptable when the client copy is
  generated from the same schema (OpenAPI/JSON Schema/zod shared via
  the contract) or is clearly UX-only, and the server re-validates.
- **Preview calculations** (e.g. a running cart total while typing).
  Prefer calling a backend "quote" endpoint. If latency demands a
  client-side estimate, label it an estimate, and the server's value is
  what gets displayed on confirmation and stored.
- **Offline-first apps.** Queued client actions are intents; the server
  re-applies all rules when they sync. Document this in the
  architecture.
- **Shared code between client and server** (TypeScript monorepos).
  Sharing *types and schemas* is good. Sharing *business rule functions*
  so the client can run them is a smell: the client copy will drift or
  be trusted. If a rule must run on both sides, the server's result
  wins, and this is recorded in an ADR.

## Anti-patterns and fixes

| Anti-pattern | Fix |
|---|---|
| `const discount = cart.total > 500 ? 0.05 : 0` in a React component | Backend `PricingService` computes; API returns `discount` and `total` |
| `if (user.role === 'admin') showDeleteButton()` as the only protection | Server enforces delete permission; returns `permissions: ['order:delete']` for UI hints |
| Frontend uses Supabase/Firebase/DB client with row access driven by client code | Backend API with server-side authorization; if a BaaS is mandated, enforce every rule in server-side policies, documented in an ADR |
| `fetch('https://api.openai.com/...', { headers: { Authorization: 'Bearer sk-...' } })` in browser code | Backend endpoint calls the model; key in the secret store |
| Client fetches all orders and filters to "mine" | Server endpoint returns only the caller's orders |
| Client posts `{ status: 'APPROVED' }` after checking rules locally | Client posts `POST /orders/{id}/approve`; server checks the transition |
| Next.js server action containing 200 lines of pricing logic | Server action calls `pricingService.quote()` in a server-only module |
| `NEXT_PUBLIC_STRIPE_SECRET` / `VITE_API_KEY` holding a secret | Public-prefixed env vars are bundled into the browser; keep secrets server-side |

Worked examples in Java, Python, and TypeScript are in
`references/placement-examples.md`.

## When asked to violate these rules

Requests like "just do it in the frontend, it's faster" are common.
Explain which rule applies and the risk (tampering, drift between
clients, leaked secrets), propose the compliant version (usually an
endpoint plus a thin UI), and proceed with a violation only if the
human explicitly accepts it. Record accepted violations in an ADR.
