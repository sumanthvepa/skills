---
name: architecture-first
description: Establish the architecture of an application before writing implementation code. Use when starting a new application, service, or prototype; when adding a major feature, component, datastore, or external integration; when asked to "build", "create", or "scaffold" an app from a goal; or when the requested change would alter project structure or module boundaries. Produces docs/architecture.md and ADRs and requires human approval before implementation begins.
---

# Architecture First

Coding agents given only a goal tend to produce a single tangle of code:
business logic in UI components, no backend, no layering, secrets
inline. This skill prevents that by making the architecture explicit,
reviewed, and approved **before** any implementation.

## Rules

- **ARC-01** Before implementing a new application, service, or major
  feature, write `docs/architecture.md` using
  `references/architecture-template.md`, present it to the human, and
  wait for explicit approval. Do not write implementation code first.
- **ARC-02** Use the approved default stack (see the language skills).
  Any deviation is recorded in an ADR (`references/adr-template.md`)
  under `docs/adr/NNNN-short-title.md` with the reason.
- **ARC-03** Every business rule identified in the requirements is
  listed in the architecture document with the **backend module that
  owns it**. If a rule has no backend owner, the design is incomplete.
- **ARC-04** A change that alters the architecture (new component,
  datastore, external dependency, module boundary, or trust boundary)
  updates `docs/architecture.md` and adds an ADR in the same change.

## Process

### 1. Understand the problem

Read the request and any existing docs. Identify:

- Users and roles, and what each may do.
- Clients: browser UI, mobile, other services, CLI, partner APIs.
- The **business rules**: every calculation, policy, limit, eligibility
  check, state transition, or decision the system makes. List them
  explicitly; they drive everything else.
- Data: what is stored, who owns it, sensitivity (PII, financial).
- External systems and LLM usage.

Ask the human about anything that changes the architecture. Do not
guess at authorization rules or business rules.

### 2. Draft the architecture

Fill in `references/architecture-template.md`. Key decisions:

- **Components.** At minimum: a frontend (if there is a UI), a backend
  API service that owns business logic, and a datastore. A UI with
  business rules and no backend is not an acceptable architecture,
  even for a prototype.
- **Business rule ownership** (ARC-03): a table mapping each rule to a
  backend module (see `frontend-backend-separation`).
- **Backend layering:** api / services / domain / infrastructure (see
  `backend-layering`).
- **API surface:** the main resources and operations; the contract
  lives in `api/openapi.yaml` (see `api-contracts`).
- **Trust boundaries:** where authentication happens, where
  authorization is enforced, where secrets live (see
  `security-baseline`).
- **Configuration and prompts:** what is configurable, where prompts
  live (see `config-and-prompts`).
- **Testing and quality gates:** test levels and the checks that will
  run in hooks and CI (see `testing-standards`, `quality-gates`).
- **Deployment:** environments, artifact, migrations, observability
  (see `observability-and-operations`).

Keep it short: a few pages. A diagram (Mermaid is fine) helps.

### 3. Get approval

Present the document and the list of open questions. State explicitly:
"I will not start implementation until you approve this architecture."
Record the approval (who, when) in the document's status line.

### 4. Build a walking skeleton first

After approval, before features:

1. Create the project structure matching the approved layers.
2. Install the quality gates (`quality-gates` skill): formatter, linter,
   type checker, boundary checks, secret scanning, CI.
3. Implement one thin end-to-end slice (UI → API → service → domain →
   repository → DB) with tests, so every boundary exists and is checked.

Then implement features one at a time, each with tests.

## Existing projects

- Read `docs/architecture.md` and `docs/adr/` before changing code, and
  follow them.
- If there is no architecture document, write one describing the
  current state (and its violations of these skills) and ask whether to
  fix violations before adding features.
- If a request requires an architectural change, propose an ADR first
  (ARC-04).

## Prototypes

"It's just a prototype" does not exempt business logic from the backend:
prototypes become production systems. A prototype may defer some items
(e.g. full observability, CI), but the architecture document must list
what was deferred, and the separation and security non-negotiables in
`AGENTS.md` still apply.
