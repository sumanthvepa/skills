# Security Checklist

Go through this before declaring a feature done or approving a PR.
Every "no" is a finding unless an ADR accepts it.

## Access control
- [ ] Each new endpoint requires authentication, or is on the public allowlist with a reason. (SEC-02)
- [ ] Each endpoint checks authorization in the service layer, including object ownership. (SEC-02, LAY-03)
- [ ] Negative tests exist: unauthenticated → 401; another user's object → 403/404. (TST-07)
- [ ] The UI's permission-dependent elements are driven by server-provided permissions. (SEP-02)

## Input / output
- [ ] All request bodies, query params, path params, and headers used are schema-validated. (SEC-03)
- [ ] No string-built SQL, shell commands, or file paths with user input. (SEC-03)
- [ ] No `innerHTML` / `dangerouslySetInnerHTML` / `v-html` / `eval` with untrusted data. (SEC-04)
- [ ] Responses include only fields the caller may see. (API-07)

## Secrets and config
- [ ] No secrets in code, tests, fixtures, logs, prompts, or public-prefixed env vars. (SEC-05)
- [ ] New config values are documented in `.env.example` with placeholders. (CFG-06)
- [ ] Secret scanning (gitleaks) passes. (QG-01, QG-02)

## Browser
- [ ] Session cookies are `HttpOnly`, `Secure`, `SameSite`; no long-lived tokens in `localStorage`. (SEC-06)
- [ ] CSRF protection for cookie-authenticated state-changing requests. (SEC-06)
- [ ] CORS allowlist is explicit. (SEC-06)
- [ ] CSP and other security headers are set. (SEC-04, SEC-07)

## Dependencies
- [ ] New dependencies verified (exists, intended, maintained, licensed) and locked. (SEC-08)
- [ ] Dependency vulnerability scan passes. (SEC-08)

## Errors and logs
- [ ] Error responses are problem details without internals. (API-03, SEC-09)
- [ ] Logs contain no secrets, tokens, or unnecessary personal data. (SEC-09, OPS-01)

## LLM features
- [ ] Model calls and keys are server-side. (SEP-06)
- [ ] Prompts are external files; user content is delimited, not concatenated into instructions. (CFG-04, CFG-05)
- [ ] Model output is validated/encoded before use; never executed. (SEC-10)
- [ ] Tools given to the model are allowlisted and limited to the user's permissions. (SEC-10)
- [ ] Per-user rate/cost limits exist. (SEC-10)

## Outbound and files
- [ ] User-supplied URLs are SSRF-protected. (SEC-11)
- [ ] Uploads are size-limited, type-checked, and stored safely. (SEC-11)
