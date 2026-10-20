# Base Engineering Skills

A baseline set of agent skills, always-on rules, and enforcement templates
for building web services with AI coding agents in **Java**,
**Python**, and **JavaScript/TypeScript (Node)**, with
**TypeScript/JavaScript frontends**.

The central concern is a clean separation between **business logic,
which belongs in the backend**, and **frontend UX code**. Around that
core the skills cover architecture-first planning, backend layering, API
contracts, security, externalized configuration and LLM prompts,
testing discipline, operations, quality gates, and agent-driven
architecture review.

## Why skills alone are not enough

Skills guide an agent, but an agent may not recognize that a skill
applies. This repository therefore works in three layers:

| Layer | What it does | Where |
|---|---|---|
| Always-on rules | A short list of non-negotiables loaded into every session; points at the skills | `agent-rules/AGENTS.md` |
| Skills | Detailed, on-demand guidance the agent loads when relevant | `skills/*/SKILL.md` |
| Checks and review | Executable evidence that the result meets the standard: hooks, CI, boundary tests, agent review | `skills/quality-gates/assets/`, `skills/architecture-review/` |

Every rule has a stable ID (e.g. `SEP-01`, `SEC-05`). Skills define
them, the architecture review cites them, and teams can extend them.

## Skills

| Skill | Purpose | Rule IDs |
|---|---|---|
| `architecture-first` | Establish and get approval for the architecture before writing code | ARC |
| `frontend-backend-separation` | Decide where logic lives; keep business rules on the server | SEP |
| `backend-layering` | api / services / domain / infrastructure with enforced dependency direction | LAY |
| `api-contracts` | Contract-first APIs, DTOs, errors, pagination, versioning | API |
| `security-baseline` | AuthN/AuthZ, input/output handling, secrets, dependencies, LLM risks | SEC |
| `config-and-prompts` | Externalized config, business constants, and LLM prompts | CFG |
| `testing-standards` | Tests that prove business rules, and guarding against hollow agent-written tests | TST |
| `observability-and-operations` | Logging, health, metrics, migrations, containers, deployment | OPS |
| `java-backend` | Applying the rules in Java / Spring Boot | — |
| `python-backend` | Applying the rules in Python / FastAPI | — |
| `node-ts-backend` | Applying the rules in Node / TypeScript | — |
| `typescript-frontend` | Thin, contract-driven TypeScript frontends (React, Next.js) | — |
| `quality-gates` | Pre-commit, CI (GitHub Actions and GitLab CI), boundary checks | QG |
| `architecture-review` | Agent review of a branch or PR against all rules | all |

## Approved default stack

The skills are framework-neutral in principle, with these named
defaults. Deviating from a default is allowed but must be recorded in an
ADR (see `architecture-first`).

| Concern | Default |
|---|---|
| Java backend | Current Java LTS, Spring Boot, Maven or Gradle, JUnit 5, AssertJ, Testcontainers, ArchUnit, Flyway |
| Python backend | Python 3.12+, FastAPI, Pydantic v2, pydantic-settings, SQLAlchemy 2, Alembic, uv, pytest, ruff, mypy, import-linter |
| Node backend | Node LTS, TypeScript (strict), Fastify (NestJS for larger teams), zod, Prisma or Drizzle, Vitest, ESLint, dependency-cruiser |
| Frontend | TypeScript (strict), React + Vite, or Next.js with server-only boundaries; TanStack Query; client generated from OpenAPI; Vitest, Testing Library, Playwright |
| API contract | OpenAPI 3.1, RFC 9457 problem details for errors |
| Observability | Structured JSON logs, OpenTelemetry |
| Hooks / CI | pre-commit framework (with gitleaks); GitHub Actions or GitLab CI |

Edit this table, and the matching sections of the language skills, to
encode your organization's approved stack.

## Installing in a project

Copy (or sync) the skills into the location your agent reads. The skill
folders follow the open Agent Skills format (`SKILL.md` with `name` and
`description` front matter, plus optional `references/` and `assets/`),
so the same folders work across agents.

| Agent | Project skills directory | Always-on rules |
|---|---|---|
| Antigravity | `.agent/skills/` | `.agent/rules/` (copy `agent-rules/AGENTS.md` there) |
| Claude Code | `.claude/skills/` | `CLAUDE.md` (add a line `@AGENTS.md`) |
| GitHub Copilot | `.github/skills/` | `AGENTS.md` or `.github/copilot-instructions.md` |
| Others | See the agent's Agent Skills documentation | `AGENTS.md` at the repo root |

Agent tooling evolves quickly; confirm these paths against your agent's
current documentation.

Example for a project using Antigravity and Claude Code side by side:

```bash
BASE=/path/to/skills
mkdir -p .agent/skills .claude/skills .agent/rules
cp -R "$BASE"/skills/* .agent/skills/
cp -R "$BASE"/skills/* .claude/skills/
cp "$BASE"/agent-rules/AGENTS.md AGENTS.md
cp "$BASE"/agent-rules/AGENTS.md .agent/rules/engineering-standards.md
echo '@AGENTS.md' >> CLAUDE.md
```

Then ask the agent to apply the `quality-gates` skill to install hooks,
CI, and boundary checks, and install the `architecture-review` wrappers
(see that skill's `assets/`).

## Customizing

1. **Stack**: edit the default stack table above and the language skills.
2. **Rules**: add rules with new IDs in the owning skill; add a matching
   line to `skills/architecture-review/references/review-checklist.md`.
   Never renumber existing IDs; retire them instead.
3. **Learn from failures**: when an agent gets something wrong that a
   rule should have prevented, either sharpen the rule's wording, move
   it into `AGENTS.md` (if it was missed because the skill wasn't
   loaded), or turn it into an executable check.
4. **Organization requirements**: add organization-specific skills
   alongside these (e.g. `acme-auth`, `acme-deployment`) rather than
   editing the base skills, so upstream updates merge cleanly.

## Layout

```
skills/
  README.md
  COPYING                           GNU General Public License v3
  copyleft-template.txt             copyright header for source files
  agent-rules/
    AGENTS.md                       always-on rules template
  skills/
    architecture-first/
    frontend-backend-separation/
    backend-layering/
    api-contracts/
    security-baseline/
    config-and-prompts/
    testing-standards/
    observability-and-operations/
    java-backend/
    python-backend/
    node-ts-backend/
    typescript-frontend/
    quality-gates/
      assets/                       hooks, CI templates, boundary configs
    architecture-review/
      assets/                       Antigravity / Claude Code / CI wrappers
```

## License

Copyright (C) 2026 Sumanth Vepa.

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or (at
your option) any later version.

This program is distributed in the hope that it will be useful, but
WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU
General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program, in the file `COPYING`. If not, see
<https://www.gnu.org/licenses/>.

This license covers every file in this repository, including the
templates under `agent-rules/` and `skills/*/assets/`.
`copyleft-template.txt` holds the standard copyright header for
source files.
