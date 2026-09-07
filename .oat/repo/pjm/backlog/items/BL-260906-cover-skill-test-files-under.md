---
id: BL-260906-cover-skill-test-files-under
title: Cover skill test files under .agents/skills in pnpm check and lint-staged
status: open
priority: low
scope: task
scope_estimate: XS
labels:
  - tooling
assignee: null
created: 2026-09-06T08:30:42.541Z
updated: 2026-09-06T08:30:42.541Z
associated_issues: []
external_plans: []
---

## Description

Hit by the p02 and p03 lanes in wave 2: pnpm format checks .agents/skills/\*_/_.mjs but pnpm check (CI-gated) does not, and .lintstagedrc.mjs has no \*.mjs task, so a skill test edit passes check, fails format, and is not auto-formatted at commit. Add the glob to lint-staged and fold the skill-test format check into pnpm check.

## Acceptance Criteria

- [ ] `.lintstagedrc.mjs` formats `.agents/skills/**/*.mjs` at commit
- [ ] `pnpm check` fails on a mis-formatted skill test file (same coverage `pnpm format` has today)
- [ ] AGENTS.md's note that only `pnpm lint`/`pnpm format` cover `.agents/skills` is updated
