---
oat_status: in_progress
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-07-10
oat_current_task_id: p00-t02
oat_generated: false
---

# Implementation: gate-review-provenance-target-safety

**Started:** 2026-07-10
**Last Updated:** 2026-07-10

> `oat_current_task_id` points to the next task to execute. Review status is tracked in `plan.md`.

## Progress Overview

| Phase | Status      | Tasks | Completed |
| ----- | ----------- | ----- | --------- |
| p00   | in_progress | 3     | 1/3       |
| p01   | pending     | 4     | 0/4       |
| p02   | pending     | 3     | 0/3       |
| p03   | pending     | 1     | 0/1       |
| p04   | pending     | 3     | 0/3       |

**Total:** 1/14 tasks completed

## Phase 0: Managed Dispatch Readiness Prerequisite

**Status:** in_progress

### Task p00-t01: Fail closed and retain the selected Codex target

**Status:** completed
**Commit:** `0129dd3d`

### Task p00-t02: Generate the supported catalogue and scoped custom roles

**Status:** in_progress
**Commit:** -

### Task p00-t03: Use deterministic pinned dispatch across workflow reviews

**Status:** pending
**Commit:** -

## Phase 1: Configured Invocation Provenance

**Status:** pending

### Task p01-t01: Add minimal exec-target invocation metadata

**Status:** pending
**Commit:** -

### Task p01-t02: Add target mutation and inspection APIs

**Status:** pending
**Commit:** -

### Task p01-t03: Assemble and emit gate invocation provenance

**Status:** pending
**Commit:** -

### Task p01-t04: Stamp, parse, and validate invocation metadata

**Status:** pending
**Commit:** -

## Phase 2: Declared Review Target Safety

**Status:** pending

### Task p02-t01: Expose review-project resolution provenance

**Status:** pending
**Commit:** -

### Task p02-t02: Correlate artifacts and reject project mismatches

**Status:** pending
**Commit:** -

### Task p02-t03: Declare lifecycle review subjects in guidance

**Status:** pending
**Commit:** -

## Phase 3: Aggregated Producer Provenance

**Status:** pending

### Task p03-t01: Make final and range aggregation explicit

**Status:** pending
**Commit:** -

## Phase 4: Opt-In Phase Review Setup

**Status:** pending

### Task p04-t01: Define the shared phase-review setup contract

**Status:** pending
**Commit:** -

### Task p04-t02: Wire phase-review setup into every plan path

**Status:** pending
**Commit:** -

### Task p04-t03: Sync, package, and validate the shipped surface

**Status:** pending
**Commit:** -

## Orchestration Runs

<!-- orchestration-runs-start -->

### Run 8bde04de-a5a4-4d4f-91a1-b068a6f5777c

- Started: 2026-07-10T04:51:49Z
- Scope: p00
- Execution: fresh pinned Codex child process
- Resolved role: `oat-phase-implementer-gpt-5-6-sol-high`
- Dispatch: scope=p00 action=implementation role=implementer producer=gpt-5.6-sol provenance=declared model_axis=selected:gpt-5.6-sol effort_axis=selected:high dispatch_policy=high dispatch_ceiling=high target=oat-phase-implementer-gpt-5-6-sol-high

<!-- orchestration-runs-end -->

## Implementation Log

### 2026-07-10

- Quick-start discovery and lightweight design completed.
- The original four-phase, eleven-task sequential plan passed structured artifact review before the prerequisite was discovered.
- Configured cross-runtime plan gate passed with 0 Critical, 0 Important, 1 Medium, and 2 Minor findings.
- Review received from `reviews/archived/artifact-plan-review-2026-07-10T014435Z.md`:
  - `M1` resolved in `plan.md` by assigning invocation frontmatter and gate JSON documentation to p01-t04.
  - `m1` rejected: the canonical Reviews table preserves the quick-mode `spec` row, and `n/a` is not a valid review status; quick implementation readiness does not require a spec review pass.
  - `m2` resolved in `plan.md` with an explicit p02 phase-review note for the intentional PR-scoped version-bump deferral.
- Live `~/.oat/config.json` inspection supplied concrete Codex, Claude, and Cursor invocation fixtures and confirmed all four lifecycle gates still use ambient project wording that p02-t03 must migrate.
- The Codex session in `codex-family-subagents` confirmed this project should precede implementation of workflows that expand configured gate usage, while planning those projects remains safe.
- Implementation preflight exposed an incomplete managed Codex configuration: policy `high` resolved without a model-plus-effort target, concrete variant, or materialized role. The user authorized a prerequisite `p00` repair before gate-provenance implementation.
- Session-observer evidence confirmed Cursor targets were persisted, Claude intentionally relies on the valid built-in ladder, and Codex gate exec configuration was mistaken for subagent dispatch configuration.
- Revised five-phase, fourteen-task plan passed the configured target-neutral artifact gate with 0 Critical, 0 Important, 0 Medium, and 4 Minor findings.
- Review received from `reviews/archived/artifact-plan-review-2026-07-10T024822Z.md`:
  - `m1` resolved in `plan.md` by naming the exact catalog-validated Codex tier-to-model/effort ladder. A later user correction aligned it to the previously locked values, including explicit Codex Frontier `sol/max` rather than the agent-inferred `sol/xhigh` boundary.
  - `m2` resolved in `plan.md` with an explicit Cursor/model-argument preservation case for provider-generic resolver tightening.
  - `m3` resolved in `plan.md` by making the final PR-scoped version bumps explicitly cover p00-t03 edits.
  - `m4` rejected: quick-mode plans retain the canonical `spec` review row, `n/a` is not a valid review status, and implementation readiness does not depend on a spec review.
- Next task is `p00-t01`.
- The first implementation bootstrap incorrectly inferred Codex defaults from the legacy policy effort ladder. Those user-config edits and generated roles were removed before any phase worker launched. Session-observer evidence then recovered the exact locked Codex, Claude, and Cursor matrices, which were persisted by the sibling configuration session and are the source of truth for p00.
- The first p00 worker was interrupted after writing only failing resolver tests when the live configuration session temporarily reduced Codex Frontier to `xhigh`. The user clarified that p00 must implement `max`; the plan now explicitly extends the Codex dispatch enum/order while preserving the worker's TDD changes for continuation.
- Before source implementation resumed, the user replaced runtime-only selected-role materialization with a finite committed catalogue: Luna and Terra at four efforts and Sol at those efforts plus `max`, expanded for both implementer and reviewer roles.
- Custom role ownership now follows configuration provenance. User-config targets materialize under `~/.codex`; project-config targets materialize under the project `.codex` view and are ordinary version-controlled project assets. OAT will not infer that a project setting is personal or attempt to hide its generated output from Git.
- `oat sync` is the earliest best-effort materialization boundary, but workflow correctness cannot require provider restart or hot reload. Managed dispatch must use the exact registered role or a fresh child pinned to the resolved model and effort, including artifact reviews before implementation.
- Implementation was paused at `p00-t01` while this architecture revision received a new plan artifact gate. The three existing failing TDD test-file edits remained preserved and were intentionally excluded from the plan-revision bookkeeping commit.
- The revised plan passed its target-neutral declared-project gate with 0 Critical, 0 Important, 0 Medium, and 3 Minor findings. The review was received from `reviews/archived/artifact-plan-review-2026-07-10T052617Z.md` under the user's standing instruction to continue through all phases:
  - `m1` resolved in `plan.md` by stating that p00-t02 sets, rather than retains, the Claude recommendation ladder and by pinning all Claude/Codex recommendation cells in tests.
  - `m2` resolved in `plan.md` by adding executable live Codex and Cursor implementer/reviewer preflight commands after restoring Frontier Sol/max.
  - `m3` resolved in `plan.md` by keeping exact Cursor compilation coverage in p00-t01 and limiting p00-t03 to workflow dispatch contracts.
- The passing plan gate did not require re-review after these wording-only fixes. Implementation resumed at `p00-t01` with the preserved failing tests.
- `p00-t01` completed in `0129dd3d`: managed preflight now fails closed when the active provider cannot compile concrete controls, Codex `max` is ordered and materializable, lower preferred efforts retain their corresponding model-plus-effort target, and all four configured Cursor model strings round-trip unchanged for implementer and reviewer resolution.
- Focused verification passed 156 tests across resolver, config, and adapter coverage; CLI type-check passed. Live Codex and Cursor implementer/reviewer preflight all resolved enforced controls under the user's managed `high` policy.
- Updated the user-scoped Codex Frontier matrix cell in `~/.oat/config.json` from `gpt-5.6-sol/xhigh` to `gpt-5.6-sol/max`; all other user matrix choices were preserved.

## Deviations from Plan / Design

| Task / Review     | Source Artifact        | Planned / Documented                                                     | Actual / Accepted                                                                                                     | Reason                                                                                           | Source of Truth           | Follow-up                              |
| ----------------- | ---------------------- | ------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | ------------------------- | -------------------------------------- |
| p00 plan revision | `design.md`, `plan.md` | Materialize only the selected Codex role during implementation preflight | Commit the supported catalogue, scope custom roles by config provenance, and use an exact pinned fresh-child fallback | Artifact review occurs before implementation preflight and provider hot reload is not guaranteed | Revised project artifacts | Re-gate plan before resuming `p00-t01` |

## Test Results

| Phase   | Tests Run                                                                         | Passed | Failed | Coverage                                             |
| ------- | --------------------------------------------------------------------------------- | ------ | ------ | ---------------------------------------------------- |
| p00-t01 | 156 focused resolver/config/adapter tests; CLI type-check; 4 live resolver probes | 161    | 0      | Cursor opacity, Codex max/capping, managed preflight |

## Final Summary (for PR/docs)

_Fill after implementation completes._
