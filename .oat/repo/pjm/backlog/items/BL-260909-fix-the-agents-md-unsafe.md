---
id: BL-260909-fix-the-agents-md-unsafe
title: Fix the agents-md unsafe-directory test race under parallel turbo
status: open
priority: low
scope: task
scope_estimate: XS
labels:
  - testing
  - flake
  - wave-7-followup
assignee: null
created: 2026-09-09T08:35:42.059Z
updated: 2026-09-09T11:56:51.000Z
associated_issues: []
external_plans: []
---

## Description

Wave-7 p12 hit a pre-existing flake: the `it.each` unsafe-directory variants in `packages/cli/src/.../agents-md.test.ts` share one `outside.md` fixture, so under parallel `turbo run test` two variants race on the same path. Give each variant its own `mktemp`-style directory (or serialize the block) and prove the fix by running the file under `--repeat` with the shared-path form red and the isolated form green.

## Acceptance Criteria

- Each `it.each` variant writes only under its own temporary directory.
- A repeated run (`vitest --repeat 20` or equivalent) is green.
- No other test in the file references the shared `outside.md` path.

## Notes

- 2026-09-09 (wave-7 final review): the same class — `packages/cli/src/e2e/workflow.test.ts:476` (`keeps 'aggregate' 'direct' guidance manual-only in json=false mode across reruns`) flaked once under full-suite concurrency (`secondPatch` held a real patch where `firstPatch` was `missing-*`), passes in isolation, did not recur; and `tools/smoke/cursor-broker.test.mjs` ENOENT under full-suite concurrency (p11 review). Treat all three as one shared-fixture race sweep.
- 2026-09-09 (Phase 21, lane p21b): `.agents/skills/oat-project-implement/tests/capture-dirty-tree.test.mjs:694` (`refuses to capture while a writer is still touching the worktree`) failed once with `Missing expected rejection` under `pnpm test:skills`, passed on two other runs — timing-dependent; same sweep.
