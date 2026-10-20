# Engineering Standards (always on)

These rules apply to every task in this repository. Detailed guidance
lives in the skills listed below; load the relevant skill before acting
on any task it covers. Rule IDs refer to those skills.

## Before writing code

- Do not start implementing a new application, service, or major
  feature until `docs/architecture.md` exists and a human has approved
  it. Use the `architecture-first` skill. (ARC-01)
- Follow the existing architecture. If a change alters it (new
  component, datastore, external dependency, or boundary), propose an
  ADR first. (ARC-04)

## Non-negotiables

1. **Business logic lives in the backend.** Pricing, eligibility,
   limits, workflow/state transitions, calculations of record, and
   authorization are implemented in backend domain/service code, never
   only in frontend code. The frontend renders, collects input, and
   calls the backend API. (SEP-01, SEP-02, SEP-05)
2. **The server validates and authorizes every request.** Client-side
   validation and hidden buttons are UX, not security. (SEP-02, SEP-03,
   SEC-02)
3. **The frontend talks only to our backend API.** No direct database
   access, no calls to third-party APIs that need secrets, no LLM calls
   from the browser. (SEP-04, SEP-06)
4. **Respect backend layers.** api → services → domain; infrastructure
   implements domain ports. Domain code has no framework, database, or
   HTTP dependencies. (LAY-02 – LAY-05)
5. **No hardcoded secrets, environment values, magic business numbers,
   or inline LLM prompts.** Use typed configuration and versioned
   prompt files. (CFG-01 – CFG-05, SEC-05)
6. **Tests prove business rules.** Expected values come from the
   specification, not from the code under test. Never weaken, skip, or
   delete a test to make it pass; report the conflict instead.
   (TST-01 – TST-04)
7. **Never bypass checks.** No `--no-verify`, blanket lint/type
   suppressions, or disabled CI steps without a justification and human
   approval. (QG-04)
8. **Verify dependencies before adding them.** Confirm the package
   exists, is maintained, and is the one intended; pin it in the
   lockfile. (SEC-08)

## Skills

| When the task involves | Load |
|---|---|
| Starting a project, adding a major feature, changing structure | `architecture-first` |
| Any code that touches both UI and data/rules, or deciding where logic goes | `frontend-backend-separation` |
| Backend code organization | `backend-layering` |
| Adding or changing endpoints | `api-contracts` |
| Auth, user input, secrets, dependencies, LLM features | `security-baseline` |
| Configuration, constants, prompts | `config-and-prompts` |
| Writing or changing tests | `testing-standards` |
| Logging, deployment, migrations, containers | `observability-and-operations` |
| Java / Python / Node backend work | `java-backend` / `python-backend` / `node-ts-backend` |
| Frontend work | `typescript-frontend` |
| Setting up hooks, CI, boundary checks | `quality-gates` |
| Reviewing a change or PR | `architecture-review` |

## When rules conflict with a request

If a request would violate these rules (for example, "just compute the
discount in the React component"), say so, explain the rule, and
propose the compliant alternative. Proceed with a violation only if the
human explicitly accepts it, and record it in an ADR or a `TODO` with
the rule ID.
