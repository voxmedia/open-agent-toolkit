---
oat_status: in_progress
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-07-28
oat_current_task_id: p02-t01
oat_generated: false
---

# Implementation: surface-implementer-dispatches

**Started:** 2026-07-28
**Last Updated:** 2026-07-29

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

| Phase   | Status    | Tasks | Completed |
| ------- | --------- | ----- | --------- |
| Phase 1 | completed | 2     | 2/2       |
| Phase 2 | pending   | 2     | 0/2       |
| Phase 3 | pending   | 2     | 0/2       |

**Total:** 2/6 tasks completed

### Review Received: design

**Date:** 2026-07-29
**Review artifact:**
`reviews/archived/artifact-design-review-2026-07-28T235619Z.md`

**Findings:**

- Critical: 0
- Important: 1
- Medium: 3
- Minor: 3

**Disposition:**

- I1: `resolve_in_artifact` — exclude legacy `--preferred` selection from the
  skipped-selection notice predicate.
- M1: `resolve_in_artifact` — serialize nullable
  `selection.preferredValue` for auditability.
- M2: `resolve_in_artifact` — distinguish the static choices recommendation
  from effective adoption/runtime disclosure.
- M3: `resolve_in_artifact` — use `--task-effort` for classification and retain
  legacy `--preferred` for selection.
- m1: `resolve_in_artifact` — name invalid reviewer classification flags
  explicitly.
- m2: `resolve_in_artifact` — validate task effort against Codex effort values
  and use null for non-Codex providers.
- m3: `resolve_in_artifact` — define Frontier/Fable terminology and cite the
  bundled recommendation.

**New tasks added:** None — artifact reviews update lifecycle artifacts directly.

**Next:** Re-review the design artifact or continue quick-start plan review.

### Review Received: plan exit gate

**Date:** 2026-07-29
**Review artifact:**
`reviews/archived/artifact-plan-review-2026-07-29T034646Z.md`

**Findings:**

- Critical: 0
- Important: 0
- Medium: 1
- Minor: 1

**Disposition:**

- M1: `resolve_in_artifact` — finalize `plan.md` with
  `oat_template: false` and `oat_template_name: plan`.
- m1: `resolve_in_artifact` — annotate the artifact-less structured
  quick-start review row with its provenance.

**New tasks added:** None — artifact reviews update lifecycle artifacts directly.

**Gate outcome:** Passed at the `important` threshold with corroborated handoff.

**Next:** Start implementation at `p01-t01`.

---

## Phase 1: Enforce Selection Provenance

**Status:** completed
**Started:** 2026-07-28

### Phase Summary (fill when phase is complete)

**Outcome (what changed):**

- Dispatch Report V1 records task classification, legacy preferred selection,
  and ordered structured notices with backward-compatible defaults.
- Managed named-cap implementation/fix resolution warns when exact candidate
  selection is skipped or an exact candidate lacks task-class provenance.
- Classification flags remain independent from candidate flags and legacy
  `--preferred`; warning routes preserve resolved status and exit code 0.

**Key files touched:**

- `packages/cli/src/providers/identity/dispatch-report.ts` - additive report
  schema, serialization, and human formatting.
- `packages/cli/src/commands/project/dispatch-ceiling/index.ts` -
  classification validation, notice derivation, and CLI flags.
- Focused report, resolver, integration, gate, and help tests - contract and
  regression coverage.

**Verification:**

- Run: Phase 1 focused Vitest suite and CLI type-check.
- Result: pass (214 focused tests; type-check clean).

**Notes / Decisions:**

- Classification is report provenance only and never participates in candidate
  normalization or target selection.
- Notices are derived after resolution and suppressed for preflight, review,
  inherit, uncapped, unresolved, and legacy-preferred paths.

### Task p01-t01: Extend Dispatch Report V1 with classification and notices

**Status:** completed
**Commit:** `fdd075bec64d8dadd79c99f9ba158a0d9331af18`

**Outcome (required when completed):**

- Dispatch Report V1 now records caller classification, legacy preferred
  selection, and ordered structured notices while defaulting legacy producers
  safely.

**Files changed:**

- `packages/cli/src/providers/identity/dispatch-report.ts` - extended the
  additive report contract, serializer, and human formatter.
- `packages/cli/src/providers/identity/dispatch-report.test.ts` - covered
  defaults, ordering, formatting, and compatibility-stamp stability.

**Verification:**

- Run: focused dispatch-report/gate Vitest suite and CLI type-check.
- Result: pass (138 tests; type-check clean).

**Notes / Decisions:**

- `formatDispatchStamp()` remains unchanged; the report-to-stamp projection
  ignores the additive report fields.

**Issues Encountered:**

- New contract assertions failed before implementation, then passed after the
  additive fields and defaults were implemented.

---

### Task p01-t02: Add classification inputs and managed-cap warnings

**Status:** completed
**Commit:** `d3ce4975068e10640858fc831822607e3e09f9cd`

**Outcome (required when completed):**

- Added provider-neutral `--task-class` and Codex-only `--task-effort`
  provenance inputs plus deterministic managed-cap warnings in human and JSON
  reports.

**Files changed:**

- `packages/cli/src/commands/project/dispatch-ceiling/index.ts` - parsed and
  validated classification, threaded report metadata, and derived notices.
- `packages/cli/src/commands/project/dispatch-ceiling/index.test.ts` - covered
  classification, warning, suppression, and exit behavior.
- `packages/cli/src/commands/commands.integration.test.ts` - verified
  end-to-end report classification.
- `packages/cli/src/commands/help-snapshots.test.ts` - verified the new help
  surface.

**Verification:**

- Run: focused resolver/integration/help/report Vitest suite and CLI
  type-check.
- Result: pass (214 tests; type-check clean).

**Notes / Decisions:**

- Legacy `--preferred` remains a selection control and is serialized separately
  as `selection.preferredValue`.

**Issues Encountered:**

- New command tests initially failed on unknown flags and missing notices, then
  passed after implementation.

---

## Phase 2: Expose Terminal Reviewer Constraints

**Status:** pending
**Started:** -

### Task p02-t01: Add shared terminal-reviewer disclosures

**Status:** pending
**Commit:** -

---

### Task p02-t02: Update implementation guidance and documentation

**Status:** pending
**Commit:** -

---

## Phase 3: Release and Backlog Closeout

**Status:** pending
**Started:** -

### Task p03-t01: Bump lockstep public package versions

**Status:** pending
**Commit:** -

---

### Task p03-t02: Archive the completed backlog item and run final verification

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

### Run 1 — 2026-07-29

<a id="run-1"></a>

**Branch:** `surface-implementer-dispatches`
**Provider / tier:** Cursor / Tier 1
**Dispatch policy:** managed High
**Schedule:** sequential (`p01` → `p02` → `p03`)

#### Dispatch Acceptance — p01 implementer

- **Request:** `impl-p01-20260729T042426Z`
- **Accepted target:** `oat-phase-implementer-gpt-5-6-sol-medium`
- **Task classification:** `default-implementation` (caller-owned bootstrap
  provenance)
- **Selection reason:** first sufficient High-tier candidate under the managed
  High ceiling
- **Candidates:** `gpt-5.6-sol-medium`, `gpt-5.6-sol-high`
- **Base / result:** `46fdec97d385f1b72525ceabdfb0be4b94f995a5` →
  `c18933689be4c19da60f7f7f44edd260e63f4786`
- **Outcome:** accepted once; `DONE`; report and four-commit task/bookkeeping
  sequence validated; no optional children

**Dispatch stamp:**

```text
Dispatch: scope=p01 action=implementation role=implementer producer=gpt-5.6-sol-medium provenance=declared model_axis=selected:gpt-5.6-sol-medium effort_axis=not-applicable dispatch_policy=high dispatch_ceiling=gpt-5.6-sol-high target=oat-phase-implementer-gpt-5-6-sol-medium
```

<!-- orchestration-runs-end -->

---

## Implementation Log

Chronological log of implementation progress.

### 2026-07-28

**Session Start:** {time}

- [x] p01-t01: {Task name} - {commit sha}
- [ ] p01-t02: {Task name} - in progress

**What changed (high level):**

- {short bullets suitable for PR/docs}

**Decisions:**

- {Decision made and rationale}

**Follow-ups / TODO:**

- {anything discovered during implementation that should be captured for later}

**Blockers:**

- {Blocker description} - {status: resolved/pending}

**Session End:** {time}

---

### 2026-07-28

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
| 1     | 214       | 214    | 0      | Focused  |
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
