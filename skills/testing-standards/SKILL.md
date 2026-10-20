---
name: testing-standards
description: Write tests that actually prove business rules and catch regressions, and avoid the hollow, tautological, or over-mocked tests that AI agents commonly produce. Use when writing, changing, fixing, or reviewing tests; when a test fails; when implementing a business rule or endpoint; and before claiming any feature is complete.
---

# Testing Standards

An agent-written test suite can be green and worthless: tests that
assert what the mock was told to return, expected values computed by
the same buggy formula, assertions loosened until they pass. Tests are
the main evidence that agent-written code is correct, so they need more
scrutiny than the code, not less.

## Rules

- **TST-01** Every business rule (each row in the architecture
  document's business-rule table) has tests at the domain or service
  level that run in-process without network or database. Cover the
  boundaries: just below, at, and just above each threshold; each
  allowed and disallowed state transition.
- **TST-02** Expected values are **literals derived from the
  specification**, worked out by hand, never recomputed with the same
  logic as the code under test.

  ```python
  # Wrong: repeats the implementation; a wrong formula passes.
  assert quote.discount == subtotal * policy.discount_rate

  # Right: from the spec: 600.00 at 5% → 30.00
  assert quote.discount == Decimal("30.00")
  ```
- **TST-03** A test must be able to fail. Write the test before the
  implementation and watch it fail, or, when adding tests to existing
  code, temporarily break the behavior and confirm the test catches it.
  No tautologies (asserting a mock returns what it was configured to
  return; asserting only that "no exception was thrown").
- **TST-04** Never weaken, skip, delete, or rewrite a failing test to
  make it pass, and never change expected values to match the actual
  output, without explicit human approval. If a test and the code
  disagree, determine which matches the specification, and report the
  conflict.
- **TST-05** Mock only at architectural boundaries: ports to databases,
  external services, LLMs, clock, randomness. Do not mock domain
  objects or the class under test. Prefer in-memory fakes of ports over
  mocking frameworks for domain/service tests.
- **TST-06** Integration tests run against real dependencies:
  Testcontainers or an ephemeral database for persistence, the real
  HTTP stack for API tests. Repository tests use the real database
  engine, not a different one (e.g. not H2 for a PostgreSQL system).
- **TST-07** API tests check contract conformance (status codes and
  response shapes match `api/openapi.yaml`) and authorization,
  including negative cases: unauthenticated (401), authenticated but
  not permitted (403/404), invalid input (400/422), invalid state
  (409).
- **TST-08** Frontend tests check user-visible behavior (what renders,
  what the user can do, which API calls are made) with the API mocked
  at the network layer (e.g. MSW). There are no business-rule tests in
  the frontend, because there are no business rules in the frontend.
- **TST-09** Tests are deterministic: inject the clock and random/ID
  sources; no dependence on test order, wall-clock time, timezone, or
  shared mutable state; no `sleep` for synchronization.

## Test levels

| Level | Tests | Speed | Share |
|---|---|---|---|
| Unit (domain, services with fakes) | Business rules, state machines, authorization logic | ms | most |
| Integration (infrastructure) | Repositories, migrations, external client adapters (with stubs such as WireMock) | seconds | some |
| API (api + services + real DB) | Contract, auth, validation, error mapping | seconds | per endpoint |
| End-to-end (browser) | A few critical user journeys | slow | few |
| LLM evaluation | Prompt behavior on saved cases, run on prompt change | varies | per prompt |

## Workflow

1. From the spec, list the cases (including edge and failure cases) as
   test names before writing code.
2. Write the tests; run them; confirm they fail for the right reason.
3. Implement until they pass.
4. Run the whole suite, not just new tests.
5. Report: what is tested, what is not, and any test you could not make
   pass with the reason.

## Signs of a hollow test (fix on sight)

- The test's expected value comes from calling production code.
- Every collaborator is mocked; the test verifies only call order.
- Assertions are `is not None`, `toBeDefined()`, `assertTrue(true)`,
  or a snapshot nobody reviewed.
- `@Disabled`, `skip`, `xit`, `pytest.mark.skip` without an issue link.
- Broad `try/except` or `catch` inside the test that swallows failures.
- The test passes when the implementation body is deleted.

## Coverage and mutation testing

Line coverage is a floor (set a threshold in CI, e.g. 80% for domain
and services), not proof. For core business rules, mutation testing
(PIT for Java, mutmut for Python, Stryker for TypeScript) shows whether
tests actually detect changes in logic. Run it periodically or on the
domain package in CI.
