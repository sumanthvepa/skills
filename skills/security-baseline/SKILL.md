---
name: security-baseline
description: Apply baseline application security to web services and frontends. Use when implementing authentication, sessions, tokens, authorization, or permissions; when handling user input, file uploads, URLs, HTML rendering, or database queries; when touching secrets, API keys, environment variables, CORS, cookies, or headers; when adding a dependency; and when building any LLM or AI-agent feature.
---

# Security Baseline

AI agents optimize for "it works". Security failures usually also
"work". These rules close the gaps agents most often leave open. Use
`references/security-checklist.md` before declaring a feature done.

## Rules

### Identity and access

- **SEC-01** Authentication uses an established identity provider or
  framework library (OIDC/OAuth 2.x, Spring Security, Authlib, a
  framework's auth module). Never implement your own token formats,
  crypto, or password hashing. If passwords are stored locally, use
  Argon2id (or bcrypt) via a vetted library.
- **SEC-02** Every endpoint requires authentication unless it is on an
  explicit public allowlist. Authorization is checked on the server for
  every request, **including object-level checks** (the caller may
  access *this* order, not just orders in general). Default is deny.
  Return 404 rather than 403 where revealing existence is a risk.

### Input and output

- **SEC-03** Validate every input at the boundary against an allowlist
  schema (types, ranges, lengths, formats, enumerations). Use
  parameterized queries or the ORM's binding; never build SQL, shell
  commands, file paths, or LDAP/XPath queries by string concatenation
  with input.
- **SEC-04** Encode output for its context. In the frontend, rely on
  the framework's escaping; do not use `innerHTML`,
  `dangerouslySetInnerHTML`, `v-html`, or `eval` with untrusted data.
  If rich HTML is required, sanitize with a vetted library (e.g.
  DOMPurify). Set a Content-Security-Policy.

### Secrets

- **SEC-05** Secrets (API keys, DB passwords, signing keys, tokens)
  never appear in source code, tests, logs, frontend bundles, prompts,
  or error messages. They are injected at runtime from environment
  variables or a secret manager. Any variable with a public prefix
  (`VITE_`, `NEXT_PUBLIC_`, `REACT_APP_`, `NUXT_PUBLIC_`) is shipped to
  the browser and must never hold a secret. If a secret is committed,
  treat it as leaked: rotate it, don't just delete it.

### Sessions and browser

- **SEC-06** Browser sessions use `HttpOnly`, `Secure`, `SameSite`
  cookies (or a BFF that keeps tokens server-side). Do not store
  long-lived access or refresh tokens in `localStorage`. Cookie-based
  auth needs CSRF protection. CORS uses an explicit origin allowlist;
  never `*` with credentials.
- **SEC-07** TLS everywhere. Security headers: CSP,
  `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`,
  `Referrer-Policy`, frame protections. Rate-limit authentication and
  expensive endpoints.

### Supply chain

- **SEC-08** Commit lockfiles; pin versions. Before adding a
  dependency, verify it exists in the official registry, is the
  intended package (not a typosquat or an AI-hallucinated name), is
  maintained, and has an acceptable license. Prefer the standard
  library or an existing dependency. Vulnerability scanning runs in CI.

### Errors and logging

- **SEC-09** Error responses and logs do not leak secrets, tokens,
  passwords, full card numbers, personal data beyond what's needed, or
  stack traces to clients. Log security events (login failures,
  permission denials) without sensitive payloads.

### LLM and agent features

- **SEC-10** For features that call LLMs:
  - Calls happen server-side; keys stay server-side (SEP-06).
  - Treat model output as untrusted input: validate structured output
    against a schema, encode it before rendering, never pass it to
    `eval`, shell, SQL, or file paths.
  - Keep instructions and untrusted content separate; put user input
    and retrieved documents in clearly delimited sections (CFG-05).
    Assume prompt injection will happen and limit what a successful
    injection can do.
  - Tools exposed to a model run with the **end user's** permissions
    (never broader), are allowlisted, and destructive actions require
    confirmation.
  - Do not put secrets or other users' data in prompts; log prompts and
    outputs with the same PII rules as any other data.
  - Apply per-user rate and cost limits.

### Outbound requests and files

- **SEC-11** When the server fetches a user-supplied URL, protect
  against SSRF: allowlist schemes and hosts, block private and
  link-local address ranges, disable redirects or re-validate them.
  File uploads: enforce size limits, verify content type, generate
  server-side file names, store outside the web root or in object
  storage, and scan if required.

## Agent behavior

- When a security rule conflicts with the request, stop and explain;
  do not silently weaken security to make something work (e.g. turning
  off CSRF, widening CORS to `*`, disabling TLS verification).
- Never disable certificate verification, even in examples or tests
  against shared environments.
- If you discover a vulnerability or a committed secret in existing
  code, report it to the human immediately.
