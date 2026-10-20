---
name: quality-gates
description: Set up and maintain the automated checks that enforce the engineering rules - pre-commit hooks, CI pipelines (GitHub Actions or GitLab CI), architecture boundary checks (ArchUnit, import-linter, dependency-cruiser, ESLint import restrictions), secret scanning, dependency scanning, SAST, and API contract diffing. Use when scaffolding a new project, adding a new service or frontend to a repository, editing CI or hook configuration, or when a check fails and you are tempted to disable it.
---

# Quality Gates

Skills guide the agent; checks provide **evidence**. Every rule that can
be checked mechanically should be, so compliance does not depend on an
agent (or a person) remembering. Local hooks give fast feedback;
required CI checks enforce the rules before merge.

## Rules

- **QG-01** Install the pre-commit framework with formatting, linting,
  and secret scanning (gitleaks) on every repository.
- **QG-02** CI runs on every pull/merge request and on the main branch,
  and these checks are **required** for merge: build, lint, format
  check, type check, tests, boundary checks, dependency vulnerability
  scan, secret scan, SAST, and (if there is an API) contract diff.
- **QG-03** Architecture boundaries are executable: layer rules
  (LAY-02 – LAY-05) and frontend restrictions (SEP-04, SEP-07) are
  enforced by the configurations in `assets/boundaries/`, not just
  described in documents.
- **QG-04** Never bypass or weaken a check (`git commit --no-verify`,
  `eslint-disable`, `@ts-ignore`, `# type: ignore`, `# noqa`,
  `@SuppressWarnings`, `continue-on-error`, lowering thresholds,
  excluding files) without a justification comment next to it, with
  the rule ID, and explicit human approval. Fix the code instead.

## Assets

| Path | Purpose | Copy to |
|---|---|---|
| `assets/pre-commit/pre-commit-config.yaml` | Hooks for all three stacks; delete what you don't use | `.pre-commit-config.yaml` |
| `assets/github/ci-java.yml` | Build, test, ArchUnit, dependency check | `.github/workflows/` |
| `assets/github/ci-python.yml` | ruff, mypy, import-linter, pytest, pip-audit | `.github/workflows/` |
| `assets/github/ci-node.yml` | Backend and frontend: lint, typecheck, depcruise, test, build, audit | `.github/workflows/` |
| `assets/github/security.yml` | gitleaks, CodeQL, dependency review | `.github/workflows/` |
| `assets/github/contract.yml` | OpenAPI breaking-change detection | `.github/workflows/` |
| `assets/gitlab/gitlab-ci.yml` | Root pipeline including the fragments below | `.gitlab-ci.yml` |
| `assets/gitlab/*.gitlab-ci.yml` | Java, Python, Node, security, contract jobs | `ci/` |
| `assets/boundaries/java/ArchitectureTest.java` | ArchUnit layer rules | `src/test/java/<base package>/` |
| `assets/boundaries/python/importlinter.toml` | import-linter contracts | merge into `pyproject.toml` |
| `assets/boundaries/node/dependency-cruiser.cjs` | Node backend layer rules | `.dependency-cruiser.cjs` |
| `assets/boundaries/node/eslint.backend.mjs` | Node backend ESLint rules (env access, console, eval, floating promises) | import into `eslint.config.mjs` |
| `assets/boundaries/frontend/eslint.boundaries.mjs` | Frontend import and network restrictions (React and Next.js) | import into `eslint.config.mjs` |

The architecture review job lives with the `architecture-review` skill.

## Setup procedure

1. **Identify the stacks** in the repository and their directories
   (e.g. `backend/`, `frontend/`). Templates assume a single service at
   the root, or `backend/` and `frontend/`; adjust paths, marked
   `ADJUST` in the templates.
2. **Boundary checks first.** Copy the boundary config for each stack,
   replace the placeholder package names (`com.example.app`, `app`,
   `src/`), and run it. Fix violations or record accepted ones in an
   ADR. A boundary check that has never failed has not been tested:
   add a deliberate violation once, confirm it fails, remove it.
3. **Pre-commit.** Copy the config, delete hooks for stacks not present,
   run `pre-commit install --install-hooks` and
   `pre-commit run --all-files`.
4. **CI.** Copy the workflows for the stacks present. Pin action and
   tool versions to current releases (the templates pin versions that
   were current when written; update them). Make the jobs required in
   branch protection (GitHub) or merge-request settings (GitLab); a
   human with admin rights must do this.
5. **Package scripts (Node).** The Node CI template expects these npm
   scripts: `lint`, `typecheck`, `depcruise` (backend), `test`, `build`.
6. **Verify.** Push a branch and confirm every job runs and passes.
   Report which checks are required and which are advisory.

## Mapping rules to checks

| Rule | Check |
|---|---|
| LAY-02 – LAY-05, LAY-07 | ArchUnit / import-linter / dependency-cruiser |
| SEP-04, SEP-07 | ESLint `no-restricted-imports`, `no-restricted-globals`; `server-only` |
| SEC-03, SEC-04 | CodeQL / GitLab SAST; ESLint security rules |
| SEC-05, CFG-01 | gitleaks (hook and CI) |
| SEC-08 | pip-audit, npm audit, OWASP dependency-check, dependency review |
| API-01, API-06 | oasdiff breaking-change check |
| TST-* | Test jobs and coverage thresholds; agent review for hollow tests |
| Everything else | `architecture-review` agent on each PR |

## When a check fails

Read the failure, fix the cause, re-run. If the check itself appears
wrong (a false positive, or a rule that does not fit this project),
stop and ask the human; propose a narrowly scoped exception with a
comment and an ADR rather than disabling the check (QG-04).
