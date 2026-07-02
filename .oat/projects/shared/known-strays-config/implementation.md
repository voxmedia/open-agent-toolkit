---
oat_status: complete
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-07-02
oat_current_task_id: null
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
| Phase 2 | complete    | 2     | 2/2       |
| Phase 3 | complete    | 1     | 1/1       |

**Total:** 5/5 tasks completed

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

**Status:** complete
**Started:** 2026-07-02

### Task p02-t01: Suppress known strays in `oat status`

**Status:** completed
**Commit:** 7d12797a

**Outcome:**

- `oat status` now suppresses configured project/user known strays before
  summaries, JSON payloads, hook output, remediation, and adoption prompts.

**Verification:**

- Run:
  `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/status/index.test.ts src/drift/known-strays.test.ts`
- Result: Passed.

---

### Task p02-t02: Suppress known strays in `oat init`

**Status:** completed
**Commit:** 5646d890

**Outcome:**

- `oat init` now filters known stray adoption candidates before warnings, JSON
  counts, prompts, and adoption loops.

**Verification:**

- Run:
  `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/init/index.test.ts src/commands/status/index.test.ts src/drift/known-strays.test.ts`
- Run: `pnpm --filter @open-agent-toolkit/cli exec tsc --noEmit`
- Result: Passed.

---

## Phase 3: Documentation, Versions, and Validation

**Status:** complete
**Started:** 2026-07-02

### Phase Summary

**Outcome (what changed):**

- Provider-sync docs now document project-level and user-level `knownStrays`
  examples, exact provider-path matching, and the representative Cursor-only
  skill use case.
- Drift docs explain that `oat status` and `oat init` suppress configured
  known strays while leaving unconfigured strays reportable and adoptable.
- All five lockstep public packages were bumped to `0.1.22`, and the bundled
  public-package version metadata was regenerated.
- The p03 review found one minor docs consistency issue; `af1c254c` fixed the
  command-consumer list to include `oat status`.

**Key files touched:**

- `apps/oat-docs/docs/provider-sync/config.md` - `knownStrays` schema,
  examples, and command-consumer docs.
- `apps/oat-docs/docs/provider-sync/manifest-and-drift.md` - known-stray drift
  and adoption behavior.
- `packages/*/package.json` - lockstep public package version bumps.
- `packages/cli/assets/public-package-versions.json` - regenerated CLI
  release metadata.

**Verification:**

- Run: `pnpm release:validate`
- Run:
  `pnpm --filter @open-agent-toolkit/cli exec vitest run src/config/sync-config.test.ts src/drift/known-strays.test.ts src/commands/status/index.test.ts src/commands/init/index.test.ts`
- Run: `pnpm --filter @open-agent-toolkit/cli exec tsc --noEmit`
- Run: `pnpm build:docs`
- Result: Passed during p03 implementation, p03 review, and the p03 review-fix
  check.

### Task p03-t01: Document known strays and bump shipped package versions

**Status:** completed
**Commit:** bd2b17a2; review fix af1c254c

**Outcome:**

- Documented `knownStrays` for project and user config.
- Bumped the lockstep public package set to `0.1.22`.
- Regenerated public package version metadata.
- Fixed the p03 review's minor docs consumer-list finding.

**Verification:**

- Run: `pnpm release:validate`
- Run:
  `pnpm --filter @open-agent-toolkit/cli exec vitest run src/config/sync-config.test.ts src/drift/known-strays.test.ts src/commands/status/index.test.ts src/commands/init/index.test.ts`
- Run: `pnpm --filter @open-agent-toolkit/cli exec tsc --noEmit`
- Run: `pnpm build:docs`
- Result: Passed.

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
**Phases:** 3 executed, 3 passed, 0 failed, 0 stopped

#### Phase Outcomes

| Phase | Implementer | Review | Fix Iterations | Disposition |
| ----- | ----------- | ------ | -------------- | ----------- |
| p01   | DONE        | pass   | 0/2            | passed      |
| p02   | DONE        | pass   | 0/2            | passed      |
| p03   | DONE        | pass   | 1/2            | passed      |

#### Parallel Groups

- p01: sequential
- p02: sequential
- p03: sequential

#### Dispatch Notes

- Dispatch: p01 implementation used Codex `effort_axis=selected:xhigh`
  under project-state maximum ceiling.
- Dispatch: p01 review used Codex `effort_axis=selected:xhigh`; review passed
  with 0 Critical, 0 Important, 0 Minor findings.
- Dispatch: p02 implementation used Codex `effort_axis=selected:xhigh`
  under project-state maximum ceiling.
- Dispatch: p02 review used Codex `effort_axis=selected:xhigh`; review passed
  with 0 Critical, 0 Important, 0 Minor findings.
- Dispatch: p03 implementation used Codex `effort_axis=selected:xhigh`
  under project-state maximum ceiling.
- Dispatch: p03 review used Codex `effort_axis=selected:xhigh`; review passed
  with 0 Critical and 0 Important findings. One Minor docs consistency finding
  was fixed in `af1c254c`.

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
- [x] p02-t01: Suppress known strays in `oat status` - 7d12797a
- [x] p02-t02: Suppress known strays in `oat init` - 5646d890
- [x] p03-t01: Document known strays and bump shipped package versions - bd2b17a2
- [x] p03 review fix: Add `oat status` to the sync config consumer list - af1c254c

**What changed (high level):**

- Added config support for project and user known strays.
- Added shared exact-match filtering helper for reports and adoption
  candidates.
- Wired the helper into `oat status` and `oat init` while preserving unknown
  stray reporting/adoption.
- Documented known-stray configuration and behavior in provider-sync docs.
- Bumped and validated the lockstep public package set.

**Decisions:**

- Keep known-stray matching exact for now to avoid hiding unrelated unmanaged
  provider files.

**Follow-ups / TODO:**

- Final project-wide verification and final code review.

**Blockers:**

- None

**Session End:** 19:41 UTC

---

### Review Received: final

**Date:** 2026-07-02
**Review artifact:** `reviews/archived/final-review-2026-07-02.md`

**Findings:**

- Critical: 0
- Important: 0
- Medium: 0
- Minor: 0

**New tasks added:** None

**Design drift / artifact alignment notes:**

- None. The final review found the implementation aligned with the quick
  discovery and plan artifacts.

**Next:** Final review passed; proceed to the configured post-implementation
sequence.

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
| 2     | `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/init/index.test.ts src/commands/status/index.test.ts src/drift/known-strays.test.ts`; `pnpm --filter @open-agent-toolkit/cli exec tsc --noEmit`; `git diff --check e73b9e41..5646d890` | yes    | 0      | Focused status/init/helper tests, CLI type-check, whitespace check |
| 3     | `pnpm release:validate`; `pnpm --filter @open-agent-toolkit/cli exec vitest run src/config/sync-config.test.ts src/drift/known-strays.test.ts src/commands/status/index.test.ts src/commands/init/index.test.ts`; `pnpm --filter @open-agent-toolkit/cli exec tsc --noEmit`; `pnpm build:docs` | yes    | 0      | Release guardrail, focused CLI regression tests, CLI type-check, docs build |
| final | `pnpm test`; `pnpm lint`; `pnpm type-check`; `pnpm build`; `pnpm release:validate` | yes    | 0      | Full workspace test/lint/type-check/build gate plus release validation |

## Final Summary (for PR/docs)

**What shipped:**

- Project sync config supports `knownStrays` in `.oat/sync/config.json`.
- User config supports `knownStrays` in `~/.oat/config.json`.
- Shared drift filtering suppresses exact known provider strays while preserving
  unconfigured sibling strays.
- `oat status` and `oat init` apply the same known-stray suppression before
  reports, remediation, JSON output, and adoption prompts.
- Provider-sync docs and lockstep public package versions were updated.

**Behavioral changes (user-facing):**

- Intentional provider-local files, such as a Cursor-only skill, can be listed
  once and no longer appear as strays or adoption candidates.
- Unknown strays in the same provider tree still report normally.

**Key files / modules:**

- `packages/cli/src/config/sync-config.ts` - project sync config schema and
  normalization.
- `packages/cli/src/config/oat-config.ts` - user config normalization.
- `packages/cli/src/drift/known-strays.ts` - shared exact-match filtering.
- `packages/cli/src/commands/status/index.ts` - status report suppression.
- `packages/cli/src/commands/init/index.ts` - init adoption suppression.
- `apps/oat-docs/docs/provider-sync/config.md` - config reference docs.
- `apps/oat-docs/docs/provider-sync/manifest-and-drift.md` - drift behavior
  docs.

**Verification performed:**

- Focused CLI tests for config, known-stray filtering, status, and init passed.
- CLI TypeScript check passed.
- `pnpm test` passed.
- `pnpm lint` passed.
- `pnpm type-check` passed.
- `pnpm build` passed.
- `pnpm release:validate` passed.
- `pnpm build:docs` passed.
- Final code review passed with 0 Critical, 0 Important, 0 Medium, and 0 Minor
  findings.

**Design deltas (if any):**

- None. This quick workflow has no design artifact; implementation followed the
  approved plan.

## References

- Plan: `plan.md`
- Design: `design.md`
- Spec: `spec.md`
