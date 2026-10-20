---
description: Review the current branch against the base engineering rules (architecture, frontend/backend separation, security, tests)
argument-hint: "[base-ref]"
allowed-tools: Read, Grep, Glob, Bash(git diff:*), Bash(git log:*), Bash(git show:*), Bash(git merge-base:*), Bash(git status:*)
---

Use the `architecture-review` skill (`.claude/skills/architecture-review/SKILL.md`
and its `references/review-checklist.md`) to review this repository's
current branch.

Base ref: $ARGUMENTS
If no base ref was given, use `origin/main`, or `main` if there is no
remote.

This is a read-only review: do not modify, create, or delete any files.
Output only the report, in the skill's report format.
