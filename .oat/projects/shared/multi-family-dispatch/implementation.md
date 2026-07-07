---
oat_status: in_progress
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-07-07
oat_current_task_id: p01-t02
oat_generated: false
---

# Implementation: multi-family-dispatch

**Started:** 2026-07-06
**Last Updated:** 2026-07-07

> This document is used to resume interrupted implementation sessions.
>
> Conventions:
>
> - `oat_current_task_id` always points at the **next plan task to do** (not the last completed task).
> - When all plan tasks are complete, set `oat_current_task_id: null`.
> - Reviews are **not** plan tasks. Track review status in `plan.md` under `## Reviews` (e.g., `| final | code | passed | ... |`).
> - Keep phase/task statuses consistent with the Progress Overview table so restarts resume correctly.
> - Before running the `oat-project-pr-final` skill, ensure `## Final Summary (for PR/docs)` is filled with what was actually implemented.

## Progress Overview

| Phase   | Status      | Tasks | Completed |
| ------- | ----------- | ----- | --------- |
| Phase 1 | in_progress | 3     | 1/3       |
| Phase 2 | pending     | 4     | 0/4       |

**Total:** 1/25 tasks completed

---

## Phase 1: Kickoff Revalidation and Blocking Experiments

**Status:** in_progress
**Started:** 2026-07-06

### Phase Summary (fill when phase is complete)

**Outcome (what changed):** Pending p01-t02 and p01-t03.

**Key files touched:** Pending.

**Verification:** Pending.

**Notes / Decisions:** Pending.

### Task p01-t01: Re-confirm shipped dispatch surfaces against merged main

**Status:** completed
**Commit:** pending

**Outcome (required when completed):**

- Reconfirmed the shipped dispatch-policy surfaces in the merged worktree before
  running any Cursor behavior experiments.
- No design drift was found that contradicts the phase plan. The design remains
  grounded in shipped reality: policy state is still `dispatchPolicy { mode,
policy }` plus legacy `dispatchCeiling.providers.{codex,claude}`, gate
  avoidance is still `same-runtime | none`, and no producer-identity stamp is
  present in shipped source.

**Files changed:**

- `.oat/projects/shared/multi-family-dispatch/implementation.md` - recorded the
  kickoff revalidation results.

**Verification:**

- Run: `pnpm --filter @open-agent-toolkit/cli type-check`
- Result: pass (tsc completed with exit code 0)

**Notes / Decisions:**

- `packages/cli/src/config/oat-config.ts` still defines
  `WorkflowDispatchPolicy` as `mode: managed|inherit` with
  `policy: economy|balanced|high|frontier|uncapped`; the legacy ceiling provider
  shape still accepts only `codex` and `claude`.
- `GateAvoid` and the gate command's local `CrossProviderAvoid` still accept
  only `same-runtime | none`; `parseCrossProviderAvoid` still defaults to
  `same-runtime`.
- `BUILTIN_EXEC_TARGETS` still includes `cursor-default` as
  `['cursor-agent', '-p']` with no pinned `--model`, matching the design's
  inherited-Cursor gate concern.
- `packages/cli/src/providers/ceiling/registry.ts` still registers only Codex
  and Claude adapters. Unknown providers, including Cursor, fall back to
  `supportsCeiling: false` / `mechanism: none`.
- `packages/cli/src/commands/project/dispatch-ceiling/index.ts` still emits the
  additive resolver shape with `providers.<provider>.dispatchArgs`,
  `verifyOnDispatch`, and `selection`; unsupported providers remain advisory or
  unsupported rather than enforced.
- A source search for producer/stamp terminology found no shipped producer
  stamp implementation. Existing "Dispatch:" lines are skill/log convention
  only and do not carry resolved identity.

**Issues Encountered:**

- None.

---

### Task p01-t02: {Task Name}

**Status:** pending
**Commit:** -

**Notes:**

- {Notes will be added during implementation}

---

## Phase 2: {Phase Name}

**Status:** pending
**Started:** -

### Task p02-t01: {Task Name}

**Status:** pending
**Commit:** -

---

## Orchestration Runs

_Each run from `oat-project-implement` appends an entry below with:_
_- Run header (number, timestamp, branch, tier, policy, phase counts)_
_- Phase Outcomes table_
_- Parallel Groups list_
_- Outstanding Items_

<!-- orchestration-runs-start -->

_Orchestration runs from `oat-project-implement` are appended here, most-recent-first within the file but append-only at the bottom of the log._

<!-- orchestration-runs-end -->

---

## Implementation Log

Chronological log of implementation progress.

### 2026-07-07

**Session Start:** p01 implementation

- [x] p01-t01: Re-confirm shipped dispatch surfaces against merged main - commit pending
- [ ] p01-t02: Characterize Cursor invalid-model behavior - pending
- [ ] p01-t03: Decide stamp record format and declaration path - pending

**What changed (high level):**

- Revalidated the shipped dispatch-policy, ceiling adapter, resolver, and gate
  avoidance surfaces against the merged worktree.

**Decisions:**

- No design update was needed for p01-t01; shipped reality matches the design's
  grounding closely enough to continue to the blocking Cursor experiment.

**Follow-ups / TODO:**

- Run the live `cursor-agent` invalid-model experiment before resolving stamp
  confidence and declaration-path rules.

**Blockers:**

- None.

**Session End:** pending

---

### 2026-07-06

**Session Start:** {time}

{Continue log...}

---

## Deviations from Plan / Design

Document any intentional deviations from the original plan, spec, or design. Include accepted review findings where the shipped implementation is source of truth and a lifecycle artifact needs alignment.

| Task / Review | Source Artifact | Planned / Documented | Actual / Accepted | Reason | Source of Truth | Follow-up |
| ------------- | --------------- | -------------------- | ----------------- | ------ | --------------- | --------- |
| -             | -               | -                    | -                 | -      | -               | -         |

## Test Results

Track test execution during implementation.

| Phase | Tests Run | Passed | Failed | Coverage |
| ----- | --------- | ------ | ------ | -------- |
| 1     | -         | -      | -      | -        |
| 2     | -         | -      | -      | -        |

## Final Summary (for PR/docs)

**What shipped:**

- {capability 1}
- {capability 2}

**Behavioral changes (user-facing):**

- {bullet}

**Key files / modules:**

- `{path}` - {purpose}

**Verification performed:**

- {tests/lint/typecheck/build/manual steps}

**Design deltas (if any):**

- {what changed vs design.md and why}

## References

- Plan: `plan.md`
- Design: `design.md`
- Spec: `spec.md`
