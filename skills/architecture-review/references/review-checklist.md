# Review Checklist

Each rule's authoritative wording is in the owning skill. This list is
what to look for in a diff. Severity shown is the default; adjust with
judgment and note why.

## ARC: architecture-first

| ID | Look for | Default |
|---|---|---|
| ARC-01 | New service/app or major feature with no `docs/architecture.md` (or not approved) | MAJOR |
| ARC-02 | New framework, language, datastore, or major library not in the default stack and no ADR | MAJOR |
| ARC-03 | New business rule not in the architecture doc's ownership table | MINOR |
| ARC-04 | New component, datastore, external integration, or boundary change without doc/ADR update | MAJOR |

## SEP: frontend-backend-separation

| ID | Look for | Default |
|---|---|---|
| SEP-01 | Frontend code computing prices, discounts, tax, totals, fees, eligibility, limits, scores, or deciding workflow transitions; thresholds/rates as literals in UI code | BLOCKER |
| SEP-02 | `role ===`, `isAdmin`, permission checks in UI with no matching server enforcement; server trusting client-claimed roles | BLOCKER |
| SEP-03 | Validation only on the client; server endpoint missing schema validation for the same input | BLOCKER |
| SEP-04 | Frontend importing DB clients, cloud SDKs, or calling third-party/internal URLs instead of our API | BLOCKER |
| SEP-05 | Requests posting computed values (`total`, `price`, `status`, `isEligible`) that the server stores or trusts | BLOCKER |
| SEP-06 | LLM SDK, model API URL, or model key in frontend code or public env vars | BLOCKER |
| SEP-07 | Business logic inside Next.js/Remix server actions, route handlers, loaders, or page components; `src/server` modules missing `import 'server-only'` | MAJOR |
| SEP-08 | Client fetching full datasets to filter/aggregate; API returning fields for the client to hide | MAJOR |

## LAY: backend-layering

| ID | Look for | Default |
|---|---|---|
| LAY-01 | Backend code outside the api/services/domain/infrastructure structure | MINOR |
| LAY-02 | Domain importing web/ORM/HTTP/logging frameworks, reading env/config, doing IO, calling `now()`/random directly | MAJOR |
| LAY-03 | Services importing api types or concrete infrastructure classes | MAJOR |
| LAY-04 | Controllers/routers with business decisions, multiple service calls orchestrated, repository or DB access, external calls | MAJOR |
| LAY-05 | Infrastructure importing services/api; ORM entities leaking into api responses | MAJOR |
| LAY-06 | Transactions opened in controllers or per-repository-call instead of per use case | MINOR |
| LAY-07 | New circular dependency | MAJOR |

## API: api-contracts

| ID | Look for | Default |
|---|---|---|
| API-01 | Endpoint added/changed without `api/openapi.yaml` change; hand-edited generated client | MAJOR |
| API-02 | Domain or ORM objects serialized directly as responses or bound from requests | MAJOR |
| API-03 | Errors that aren't problem details; stack traces, SQL, or exception names in responses | MAJOR |
| API-04 | Side effects in GET; client-set `status` instead of action endpoints; wrong status codes; retried creates without idempotency | MINOR–MAJOR |
| API-05 | Unpaginated collection endpoints; no max page size | MINOR |
| API-06 | Breaking contract change without versioning/approval | MAJOR |
| API-07 | Response includes fields the caller shouldn't see | BLOCKER |

## SEC: security-baseline

| ID | Look for | Default |
|---|---|---|
| SEC-01 | Custom auth, token formats, crypto, or password hashing | BLOCKER |
| SEC-02 | New endpoint without authentication; missing object-level ownership check (IDOR); default-allow | BLOCKER |
| SEC-03 | String-built SQL/shell/paths with input; missing input validation | BLOCKER |
| SEC-04 | `innerHTML`, `dangerouslySetInnerHTML`, `v-html`, `eval` with untrusted data; CSP removed/weakened | BLOCKER |
| SEC-05 | Secrets in code, tests, fixtures, logs, prompts, or public-prefixed env vars | BLOCKER |
| SEC-06 | Tokens in localStorage; CSRF disabled; CORS `*` with credentials | BLOCKER |
| SEC-07 | TLS verification disabled; security headers removed; no rate limit on auth endpoints | MAJOR |
| SEC-08 | New dependency unverified, unpinned, or with known vulnerabilities; lockfile not updated | MAJOR |
| SEC-09 | Sensitive data in logs or error responses | MAJOR |
| SEC-10 | Model output executed or rendered unescaped; user content concatenated into instructions; over-privileged model tools | BLOCKER |
| SEC-11 | Server fetching user-supplied URLs without SSRF protection; unsafe uploads | MAJOR |

## CFG: config-and-prompts

| ID | Look for | Default |
|---|---|---|
| CFG-01 | Hardcoded URLs, hosts, ports, credentials, bucket names, tenant IDs | MAJOR (BLOCKER if secret) |
| CFG-02 | `process.env` / `os.environ` / `System.getenv` scattered in app code; no startup validation | MINOR |
| CFG-03 | Magic numbers in business logic (rates, thresholds, limits) | MAJOR |
| CFG-04 | Prompt text in string literals in application code | MAJOR |
| CFG-05 | Prompt built by concatenating user input into instructions | MAJOR |
| CFG-06 | New config variable missing from `.env.example`; `.env` committed | MINOR (BLOCKER if it holds secrets) |
| CFG-07 | Hardcoded user-facing strings in a localized app | MINOR |
| CFG-08 | Model ID or generation parameters hardcoded | MINOR |

## TST: testing-standards

| ID | Look for | Default |
|---|---|---|
| TST-01 | Business rule added/changed without domain/service tests; boundary cases missing | MAJOR |
| TST-02 | Expected values computed with the same formula as the implementation | MAJOR |
| TST-03 | Tests asserting mocks' configured returns; assertions like `not None` / `toBeDefined()` only; tests that would pass with the implementation removed | MAJOR |
| TST-04 | Tests deleted, skipped, loosened, or expected values changed to match new output, without explanation | BLOCKER |
| TST-05 | Domain or class under test mocked; mocking at non-boundaries | MINOR |
| TST-06 | Repository tests on a different DB engine; integration tests fully mocked | MINOR |
| TST-07 | Endpoint without auth negative tests (401/403/404) or validation tests | MAJOR |
| TST-08 | Business-rule tests in the frontend (signals SEP-01) | MAJOR |
| TST-09 | Real time, randomness, sleeps, or order dependence | MINOR |

## OPS: observability-and-operations

| ID | Look for | Default |
|---|---|---|
| OPS-01 | `print`/`console.log`/`System.out` in service code; unstructured logs; PII in logs | MINOR (MAJOR for PII) |
| OPS-02 | New service without health/readiness endpoints | MINOR |
| OPS-03 | New outbound integration without tracing/metrics | MINOR |
| OPS-04 | Outbound calls without timeouts; retries on non-idempotent operations | MAJOR |
| OPS-05 | Schema changed without migration; ORM auto-DDL enabled outside local; destructive migration without expand/contract | MAJOR |
| OPS-06 | Environment-specific builds | MINOR |
| OPS-07 | Container runs as root, unpinned base image, secrets copied into image | MAJOR |
| OPS-08 | Swallowed exceptions; no global error handler | MINOR |

## QG: quality-gates

| ID | Look for | Default |
|---|---|---|
| QG-01 | Pre-commit config removed or hooks removed | MAJOR |
| QG-02 | CI job removed, made optional, or `continue-on-error` added | BLOCKER |
| QG-03 | Boundary rules loosened or paths excluded | BLOCKER |
| QG-04 | New `eslint-disable`, `@ts-ignore`, `# type: ignore`, `# noqa`, `@SuppressWarnings`, `--no-verify` usage, lowered coverage thresholds without justification | MAJOR (BLOCKER if blanket) |
