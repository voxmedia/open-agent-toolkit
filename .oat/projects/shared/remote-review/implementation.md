---
oat_status: in_progress
oat_ready_for: oat-project-implement
oat_blockers: []
oat_last_updated: 2026-05-29
oat_current_task_id: p02-t01
oat_generated: false
---

# Implementation: remote-review

**Started:** 2026-05-29
**Last Updated:** 2026-05-29

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

| Phase                                         | Status   | Tasks | Completed |
| --------------------------------------------- | -------- | ----- | --------- |
| Phase 1 — Shared infrastructure helpers       | complete | 5     | 5/5       |
| Phase 2 — `oat-review-provide-remote`         | pending  | 3     | 0/3       |
| Phase 3 — `oat-reviewer` extension            | pending  | 1     | 0/1       |
| Phase 4 — `oat-project-review-provide-remote` | pending  | 2     | 0/2       |
| Phase 5 — Receive-skill minor-default flip    | pending  | 4     | 0/4       |
| Phase 6 — Backlog update + release prep       | pending  | 3     | 0/3       |

**Total:** 5/18 tasks completed

---

## Phase 1: Shared infrastructure helpers

**Status:** complete
**Started:** 2026-05-29

### Phase Summary

**Outcome (what changed):**

- Shipped five pure-logic helper modules under `packages/cli/src/review-remote/` that both provide-remote skills (p02/p04) will import. No GitHub or git side effects in this layer.
- `marker-parser`: tolerant single-line scalar parser for the HTML-comment marker block (no YAML dep); invalid 40-char head-SHA → `null`.
- `body-builder` + `mapVerdict`: builds the posted-review body and maps verdict (REQUEST_CHANGES if any critical/important, else COMMENT); round-trips through the parser.
- `line-mapper`: `parsePullFilesPatch` + `parseUnifiedDiff` + `classifyFinding` over a shared `HunkRange` shape (in-diff RIGHT/LEFT vs out-of-diff).
- `narrowing`: `pickNarrowingTarget` discriminated union with stale-SHA existence+ancestry guard via injected `GitInvoker`.
- `project-resolver`: two-level `.oat/projects/*/*/state.md` glob with `--project` override.

**Key files touched:**

- `packages/cli/src/review-remote/marker-parser.{ts,test.ts}`
- `packages/cli/src/review-remote/body-builder.{ts,test.ts}`
- `packages/cli/src/review-remote/line-mapper.{ts,test.ts}`
- `packages/cli/src/review-remote/narrowing.{ts,test.ts}`
- `packages/cli/src/review-remote/project-resolver.{ts,test.ts}`

**Verification:**

- Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/review-remote/` → 59 tests pass (5 files)
- `pnpm lint` → 0 warnings / 0 errors; `pnpm type-check` → clean
- Reviewer (p01 gate): PASS — 0 critical, 0 important, 3 minor (advisory)

**Notes / Decisions:**

- Delegated head-SHA contract: invalid SHA → `parseMarkerBlock` returns `null` (routes to full-scope review) rather than a distinct error type.
- Omitted `oat_review_invocation` defaults to `manual`; unknown marker keys preserved on an `extras` bag (forward-compat).
- `narrowing` result carries `prompted: boolean` so the skill layer knows whether a confirm prompt is still owed; auto-narrow + stale-SHA fallback both set `prompted: false`.
- `project-resolver` `--project` accepts a dir or a `state.md` path with trailing-slash tolerance, validating existence before use.
- Reviewer minors (non-blocking, noted for p02/p04): (1) `parsePullFilesPatch` doesn't surface `previous_filename` rename field — caller threads it in; worth a code comment; (2) LEFT-side classification not directly asserted against `parsePullFilesPatch` (shared-shape test de-risks it).

### Task p01-t01: Add review-marker parser

**Status:** completed
**Commit:** 4f7932c4

### Task p01-t02: Add posted-review-body builder + verdict mapper

**Status:** completed
**Commit:** ba9a268e

### Task p01-t03: Add inline-comment line-mapping validator

**Status:** completed
**Commit:** debad68a

### Task p01-t04: Add re-review narrowing filter + stale-SHA guard

**Status:** completed
**Commit:** 41269f85

### Task p01-t05: Add project resolution helper

**Status:** completed
**Commit:** 6ade5178

---

## Phase 2: `oat-review-provide-remote` (ad-hoc rail)

**Status:** pending
**Started:** -

### Task p02-t01: Probe and capability matrix for `agent-reviews`

**Status:** pending
**Commit:** -

### Task p02-t02: Worktree lifecycle helper

**Status:** pending
**Commit:** -

### Task p02-t03: Author `oat-review-provide-remote` SKILL.md and wire process

**Status:** pending
**Commit:** -

---

## Phase 3: `oat-reviewer` subagent contract extension

**Status:** pending
**Started:** -

### Task p03-t01: Extend `oat-reviewer` with structured-output mode

**Status:** pending
**Commit:** -

---

## Phase 4: `oat-project-review-provide-remote` (project rail)

**Status:** pending
**Started:** -

### Task p04-t01: Tier-1 dispatch wrapper for `oat-reviewer` structured-output mode

**Status:** pending
**Commit:** -

### Task p04-t02: Author `oat-project-review-provide-remote` SKILL.md and wire process

**Status:** pending
**Commit:** -

---

## Phase 5: Receive-skill minor-default flip

**Status:** pending
**Started:** -

### Task p05-t01: Flip minor default in `oat-review-receive`

**Status:** pending
**Commit:** -

### Task p05-t02: Flip minor default in `oat-review-receive-remote`

**Status:** pending
**Commit:** -

### Task p05-t03: Flip minor default in `oat-project-review-receive`

**Status:** pending
**Commit:** -

### Task p05-t04: Flip minor default in `oat-project-review-receive-remote`

**Status:** pending
**Commit:** -

---

## Phase 6: Backlog update + lockstep release prep

**Status:** pending
**Started:** -

### Task p06-t01: Update `bl-9fb8` backlog item

**Status:** pending
**Commit:** -

### Task p06-t02: Lockstep public-package version bump

**Status:** pending
**Commit:** -

### Task p06-t03: Final `release:validate` + handoff

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

### Run 1 — 2026-05-29

**Branch:** feat/remote-review-provide-skills
**Tier:** 1
**Policy:** merge-strategy=merge, retry-limit=2
**Phases:** 1 executed, 1 passed, 0 failed, 0 stopped

#### Phase Outcomes

| Phase | Implementer | Review | Fix Iterations | Disposition                                  |
| ----- | ----------- | ------ | -------------- | -------------------------------------------- |
| p01   | DONE        | pass   | 0/2            | merged (sequential, on orchestration branch) |

#### Parallel Groups

- p01: sequential (runs before the `[p02, p03, p05]` group)

#### Dispatch Notes

- Dispatch: p01 implementation + review via Claude Code Tier 1, model_axis=selected:opus, effort_axis=not-applicable, ceiling=opus (project state). No escalation needed.

#### Outstanding Items

- None.

#### Artifact / Design Deltas

| Task / Review | Source Artifact | Planned / Documented | Actual / Accepted | Reason | Source of Truth | Follow-up |
| ------------- | --------------- | -------------------- | ----------------- | ------ | --------------- | --------- |
| None          | -               | -                    | -                 | -      | -               | -         |

<!-- orchestration-runs-end -->

---

## Implementation Log

Chronological log of implementation progress. Append per session.

---

## Reviews Received

### Review Received: design

**Date:** 2026-05-29
**Review artifact:** `reviews/archived/artifact-design-review-2026-05-29.md`

**Findings:**

- Critical: 0
- Important: 1
- Medium: 1
- Minor: 2

**Disposition:** All 4 findings resolved in artifact (no plan tasks created):

- `I1` worktree creation precision → resolved in `design.md` Data Flow step 2.
- `M1` stale-SHA / force-push guard for re-review narrowing → resolved in `design.md` Component Design (both rails) + new Error Handling subsection.
- `m1` manual-verification wrong-path split → resolved in `design.md` Testing Strategy → Manual Verification.
- `m2` state.md body prose stale → resolved in `state.md` body.

### Review Received: plan

**Date:** 2026-05-29
**Review artifact:** `reviews/archived/artifact-plan-review-2026-05-29.md`

**Findings:**

- Critical: 0
- Important: 2
- Medium: 1
- Minor: 2

**Disposition:** All 5 findings resolved in artifact (no plan tasks created):

- `I1` filtered vitest commands used repo-root paths → resolved in `plan.md` (30 occurrences fixed to package-relative `src/...` paths).
- `I2` implementation tracker was scaffold despite plan being ready for implementation → resolved by populating this file with the actual 6-phase / 18-task structure.
- `M1` p02 write-set proof inaccurate → resolved in `plan.md` Parallelism section (enumerated p02 helper files; restated parallel-group disjointness).
- `m1` `discovery.md` frontmatter still `in_progress` → resolved by flipping to `complete` + `oat_ready_for: oat-project-quick-start`.
- `m2` "Ready for code review and merge" wording → resolved by future-tensing in `plan.md` Implementation Complete.

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
| 3     | -         | -      | -      | -        |
| 4     | -         | -      | -      | -        |
| 5     | -         | -      | -      | -        |
| 6     | -         | -      | -      | -        |

## Final Summary (for PR/docs)

**What shipped:**

- {filled when project is complete}

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
- Discovery: `discovery.md`
