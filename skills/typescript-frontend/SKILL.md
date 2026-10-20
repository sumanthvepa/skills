---
name: typescript-frontend
description: Build thin, contract-driven TypeScript/JavaScript frontends (default React with Vite, or Next.js with server-only boundaries) that contain presentation logic only. Use when creating or modifying UI components, pages, forms, hooks, client state, data fetching, frontend API clients, or frontend tests, and in any React, Next.js, Vue, Angular, or Svelte code.
---

# TypeScript Frontend

The frontend's job is to present server data, collect user intent, and
send it to the backend. It contains **no business rules**
(`frontend-backend-separation`). This skill shows how to structure a
frontend so that stays true.

## Defaults

| Concern | Default |
|---|---|
| Language | TypeScript, `"strict": true`; no `any` |
| Framework | React + Vite (SPA), or Next.js App Router with `server-only` boundaries |
| API client | Generated from `api/openapi.yaml` (openapi-typescript + openapi-fetch, or orval) |
| Server state | TanStack Query |
| Local UI state | Component state; a small store (e.g. Zustand) only for cross-cutting UI state |
| Forms | react-hook-form with zod schemas derived from the contract |
| Styling / a11y | Team design system; semantic HTML; WCAG 2.2 AA |
| Testing | Vitest, Testing Library, MSW, Playwright for e2e |
| Quality | ESLint (typescript-eslint, react-hooks, jsx-a11y, boundary rules), Prettier |

## Layout (React + Vite)

```
src/
  api/
    generated/            generated from the OpenAPI contract; never hand-edited
    client.ts             configured client (base URL, credentials, error handling)
    queries/              TanStack Query hooks wrapping the client
  features/
    checkout/
      CheckoutPage.tsx
      CheckoutSummary.tsx
      useCheckout.ts      UI state and calls to api/queries
  components/             shared presentational components
  lib/
    format.ts             display formatting (money, dates); no rules
  routes.tsx
  main.tsx
```

For Next.js, see `frontend-backend-separation/references/full-stack-frameworks.md`.

## Rules for frontend code

1. **Only `src/api/` makes network calls.** Components and hooks call
   query hooks or the API client, never `fetch`/`axios` directly
   (enforced by ESLint in `quality-gates/assets/boundaries/frontend/`).
2. **Only our backend.** The API client's base URL is our backend (or
   BFF). No database clients, cloud SDKs with credentials, or
   third-party/LLM APIs requiring keys (SEP-04, SEP-06).
3. **Render server values.** Totals, prices, statuses, permissions, and
   allowed actions come from API responses. Formatting for display
   (`Intl.NumberFormat`, dates) is fine; computing them is not (SEP-01,
   SEP-05).
4. **Send intent, not conclusions.** Requests carry what the user chose
   (`items`, `couponCode`, `action: approve`), not computed results
   (`total`, `status: 'APPROVED'`, `isEligible: true`).
5. **Permissions drive visibility, not security.** Use server-provided
   `allowedActions`/`permissions` to show or hide UI; never infer
   permissions from role names on the client (SEP-02).
6. **Validation is UX.** Use schemas generated from (or kept identical
   to) the contract for instant feedback; always handle the server's
   422 problem response and show its field errors (SEP-03).
7. **Handle every state.** Loading, empty, error (render the problem
   `title`/`detail`), and success. Handle 401 by redirecting to sign-in,
   403 with a clear message, 409 by refreshing data.
8. **No secrets in the bundle.** Only public, non-secret values in
   `VITE_*`/`NEXT_PUBLIC_*` variables (SEC-05). Tokens are in `HttpOnly`
   cookies, not `localStorage` (SEC-06).
9. **Safe rendering.** No `dangerouslySetInnerHTML` with untrusted
   content; if required, sanitize with DOMPurify (SEC-04). Render LLM
   output as text or sanitized Markdown.
10. **User-facing strings** in i18n resource files when localization is
    in scope (CFG-07).

## Example: thin component with server-provided actions

```tsx
export function OrderActions({ orderId }: { orderId: string }) {
  const { data: order } = useOrder(orderId);   // GET /orders/{id}
  const approve = useApproveOrder();            // POST /orders/{id}/approve

  if (!order) return null;
  return (
    <>
      <StatusBadge status={order.status} />
      {order.allowedActions.includes('approve') && (
        <button
          disabled={approve.isPending}
          onClick={() => approve.mutate({ orderId })}
        >
          Approve
        </button>
      )}
      {approve.error && <ProblemMessage problem={approve.error} />}
    </>
  );
}
```

## Testing (TST-08)

- Component tests with Testing Library: what the user sees and can do.
- Mock the network with MSW using responses shaped by the contract,
  including error responses (401/403/409/422).
- No tests of business calculations in the frontend; if you feel the
  need to write one, the logic is in the wrong place.
- A few Playwright end-to-end tests for critical journeys against a
  running backend.

## Commands

```bash
npm ci
npm run generate:api      # regenerate client from api/openapi.yaml
npm run lint && npm run typecheck
npm test
npm run build
```
