---
oat_status: in_progress
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-07-02
oat_current_task_id: p02-t01
oat_generated: false
---

# Implementation: known-strays-config

**Started:** 2026-07-02
**Last Updated:** 2026-07-02

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
| Phase 1 | complete    | 2     | 2/2       |
| Phase 2 | in_progress | 2     | 0/2       |
| Phase 3 | pending     | 1     | 0/1       |

**Total:** 2/5 tasks completed

---

## Phase 1: Config Model and Resolution

**Status:** complete
**Started:** 2026-07-02

### Phase Summary

**Outcome (what changed):**

- Sync config now accepts normalized, de-duplicated project-level `knownStrays`.
- User config now accepts normalized, de-duplicated user-level `knownStrays`.
- A shared drift helper can filter known stray reports and adoption candidates
  using exact normalized provider-path matching.

**Key files touched:**

- `packages/cli/src/config/sync-config.ts` - project sync config schema,
  defaults, and normalization.
- `packages/cli/src/config/oat-config.ts` - user config type and
  normalization.
- `packages/cli/src/drift/known-strays.ts` - shared known-stray filter.
- `packages/cli/src/drift/index.ts` - drift barrel export.

**Verification:**

- Run:
  `pnpm --filter @open-agent-toolkit/cli exec vitest run src/config/sync-config.test.ts src/config/resolve.test.ts src/drift/known-strays.test.ts`
- Run: `pnpm --filter @open-agent-toolkit/cli exec tsc --noEmit`
- Result: Passed during p01 implementation and p01 review.

**Notes / Decisions:**

- `knownStrays` matching is exact path matching, not glob matching. This keeps
  suppression conservative and preserves unrelated stray detection.
- TypeScript verification needed the workspace `@open-agent-toolkit/control-plane`
  package built first; generated build output was not committed.

### Task p01-t01: Add known strays config schema

**Status:** completed
**Commit:** b6b0c8da

**Outcome (required when completed):**

- Project sync config and user config can now carry normalized known provider
  stray paths.

**Files changed:**

- `packages/cli/src/config/sync-config.ts` - added schema/default/normalization
  support for project sync `knownStrays`.
- `packages/cli/src/config/oat-config.ts` - added user config support for
  `knownStrays`.
- `packages/cli/src/config/sync-config.test.ts` - added sync config coverage.
- `packages/cli/src/config/resolve.test.ts` - added user config resolution
  coverage.

**Verification:**

- Run:
  `pnpm --filter @open-agent-toolkit/cli exec vitest run src/config/sync-config.test.ts src/config/resolve.test.ts`
- Run: `pnpm --filter @open-agent-toolkit/cli exec tsc --noEmit`
- Result: Passed.

**Notes / Decisions:**

- Sync config rejects invalid `knownStrays` values through the existing Zod
  validation path. User config filters invalid entries, matching the local
  normalizer style for optional arrays.

**Issues Encountered:**

- Initial TypeScript verification needed control-plane build output; resolved by
  building the workspace dependency before rerunning the planned check.

---

### Task p01-t02: Add shared known stray resolution helper

**Status:** completed
**Commit:** 7a4dc223

**Notes:**

- Added `filterKnownStrays` in `packages/cli/src/drift/known-strays.ts` and
  exported it from `packages/cli/src/drift/index.ts`.
- Tests cover project/user source merging, exact-match suppression, sibling path
  preservation, and empty config behavior.

---

## Phase 2: Status and Init Behavior

**Status:** in_progress
**Started:** 2026-07-02

### Task p02-t01: Suppress known strays in `oat status`

**Status:** pending
**Commit:** -

---

### Task p02-t02: Suppress known strays in `oat init`

**Status:** pending
**Commit:** -

---

## Phase 3: Documentation, Versions, and Validation

**Status:** pending
**Started:** -

### Task p03-t01: Document known strays and bump shipped package versions

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

### Run 1 - 2026-07-02 19:16

**Branch:** feat/known-strays-config
**Tier:** 1
**Policy:** merge-strategy=merge, retry-limit=2
**Phases:** 1 executed, 1 passed, 0 failed, 0 stopped

#### Phase Outcomes

| Phase | Implementer | Review | Fix Iterations | Disposition |
| ----- | ----------- | ------ | -------------- | ----------- |
| p01   | DONE        | pass   | 0/2            | passed      |

#### Parallel Groups

- p01: sequential

#### Dispatch Notes

- Dispatch: p01 implementation used Codex `effort_axis=selected:xhigh`
  under project-state maximum ceiling.
- Dispatch: p01 review used Codex `effort_axis=selected:xhigh`; review passed
  with 0 Critical, 0 Important, 0 Minor findings.

#### Outstanding Items

- None

#### Artifact / Design Deltas

| Task / Review | Source Artifact | Planned / Documented | Actual / Accepted | Reason | Source of Truth | Follow-up |
| ------------- | --------------- | -------------------- | ----------------- | ------ | --------------- | --------- |
| None          | -               | -                    | -                 | -      | -               | -         |

<!-- orchestration-runs-end -->

---

## Implementation Log

Chronological log of implementation progress.

### 2026-07-02

**Session Start:** 19:02 UTC

- [x] p01-t01: Add known strays config schema - b6b0c8da
- [x] p01-t02: Add shared known stray resolution helper - 7a4dc223
- [ ] p02-t01: Suppress known strays in `oat status` - next

**What changed (high level):**

- Added config support for project and user known strays.
- Added shared exact-match filtering helper for reports and adoption
  candidates.

**Decisions:**

- Keep known-stray matching exact for now to avoid hiding unrelated unmanaged
  provider files.

**Follow-ups / TODO:**

- Wire the shared helper into `oat status` and `oat init` in Phase 2.

**Blockers:**

- None

**Session End:** 19:16 UTC

---

### 2026-07-02

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
| 1     | `pnpm --filter @open-agent-toolkit/cli exec vitest run src/config/sync-config.test.ts src/config/resolve.test.ts src/drift/known-strays.test.ts`; `pnpm --filter @open-agent-toolkit/cli exec tsc --noEmit` | yes    | 0      | Focused config/helper tests plus CLI type-check |
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
