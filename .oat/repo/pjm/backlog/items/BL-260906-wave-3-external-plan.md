---
id: BL-260906-wave-3-external-plan
title: Wave 3 external-plan corrections for the program refresh
status: open
priority: low
scope: task
scope_estimate: XS
labels:
  - pjm
  - external-plans
assignee: null
created: 2026-09-06T14:10:09.587Z
updated: 2026-09-06T14:10:09.587Z
associated_issues: []
external_plans: []
---

## Description

Corrections the wave-3 reviews queued for the external plans, to land in the wave-close program-refresh commit: require-repo-wide-call-site-sweeps.md In-scope list gains packages/cli/src/validation/skills.test.ts (steps 4-5 move the agent pins) and records the phase-execution.md:608 alignment landed by the exit-gate fix; every wave-3 plan step that says 'oat sync --scope all' is read as 'pnpm run cli -- sync --scope project' (--scope all rewrites the operator's user-scope provider views and manifest); execution records appended under each plan's Revalidation section.

## Acceptance Criteria

- [ ] `2026-08-30-require-repo-wide-call-site-sweeps.md`: In-scope list names `packages/cli/src/validation/skills.test.ts` and an execution record notes the `phase-execution.md:608` alignment landed by the exit-gate fix
- [ ] Every wave-3 plan whose step says `oat sync --scope all` carries the program rule that lanes run `pnpm run cli -- sync --scope project`
- [ ] Execution records appended under each wave-3 plan's `## Revalidation Before Execution`
- [ ] All corrections land in one program-refresh commit that also updates the execution program's revalidation log
