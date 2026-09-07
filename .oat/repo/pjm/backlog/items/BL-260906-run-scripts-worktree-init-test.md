---
id: BL-260906-run-scripts-worktree-init-test
title: Run scripts/worktree/init.test.mjs under a repository gate
status: open
priority: low
scope: task
scope_estimate: XS
labels:
  - tooling
  - smoke
assignee: null
created: 2026-09-06T13:44:02.387Z
updated: 2026-09-06T13:44:02.387Z
associated_issues: []
external_plans: []
---

## Description

p02 review round 2 m5 (wave 3, pre-existing). scripts/worktree/init.test.mjs is executed by no gate: pnpm test:smoke globs only tools/smoke/\*\* and scripts/ is not a workspace package, so a journal contract change gets no automatic evidence for the direct-registration path init.sh uses. Add it to test:smoke or a test:scripts script wired into pnpm test.

## Acceptance Criteria

- [ ] `scripts/worktree/init.test.mjs` runs under `pnpm test` (via `test:smoke` or a new `test:scripts` script)
- [ ] CI's test step covers it (verified by a deliberate failure in a scratch branch)
- [ ] AGENTS.md's Definition of Done names the script if a new root script is added
