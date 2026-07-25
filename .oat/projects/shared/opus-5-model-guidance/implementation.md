---
oat_status: in_progress
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-07-25
oat_current_task_id: p06-t03
oat_generated: false
---

# Implementation: opus-5-model-guidance

## Progress Overview

| Phase | Status      | Tasks | Completed |
| ----- | ----------- | ----- | --------- |
| p04   | complete    | 5     | 5/5       |
| p05   | complete    | 3     | 3/3       |
| p06   | in_progress | 3     | 2/3       |

**Total:** 10/11 tasks completed

## Phase 4: Integrate the Accepted Selection Policy

**Status:** complete

| Task    | Status | Commit                 |
| ------- | ------ | ---------------------- |
| p04-t01 | done   | `e594ab12`             |
| p04-t02 | done   | `0e651d0f`             |
| p04-t03 | done   | `7801e136`, `f62d01dd` |
| p04-t04 | done   | `609f0833`             |
| p04-t05 | done   | `33cc3b8b`             |

## Phase 5: Package and Validate

**Status:** complete

| Task    | Status | Commit                            |
| ------- | ------ | --------------------------------- |
| p05-t01 | done   | `30066393`                        |
| p05-t02 | done   | `dfefbc2c`                        |
| p05-t03 | done   | validation only, no source change |

## Phase 6: Record Reverification and Deferral

**Status:** in_progress

| Task    | Status      | Commit                |
| ------- | ----------- | --------------------- |
| p06-t01 | done        | `54588a59`            |
| p06-t02 | done        | audit only, no change |
| p06-t03 | in_progress | -                     |

## Orchestration Runs

<!-- orchestration-runs-start -->
<!-- orchestration-runs-end -->

## Implementation Log

### 2026-07-25

- Reconciled the active quick project with the accepted post-release research.
- Retired unimplemented task IDs `p01-*` through `p03-*`.
- Explicitly deferred speculative Cursor pins until live alias and control
  probes exist.
- `p04-t01`: separated task class, effort, consequence, reviewer role, and
  eligibility; added failure-mode review and multi-measure speed contracts.
- `p04-t02`: made Opus 5 medium/high the substantive Claude route, retained
  Sonnet and Fable as measured or eligibility-gated cases, and documented cyber
  fallback handling.
- `p04-t03`: retained the Codex task-class ladder while adding Sol's >272K
  pricing step, trajectory economics, and consequence-versus-effort guidance.
  Follow-up review aligned the consequential default to Sol high plus
  independent review, reserving xhigh and max for depth-driven escalation.
- `p04-t04`: retained current Cursor catalog examples, made Opus 5 explicitly
  probe-gated, and expanded service-tier latency measurement without adding
  pins.
- `p04-t05`: added comparable-rung, speed, claim-provenance, independent-review,
  live-catalog, and downstream parity gates to the refresh protocol.
- `p05-t01`: bumped the canonical skill once to `1.0.1` and all five public
  packages in lockstep to `0.2.18`.

### 2026-07-25 — session takeover

Ownership returned to the originating session after a separate Codex session
crossed into this worktree. The takeover reviewed rather than assumed the
inherited work.

- **Verified independently:** the 113 focused skill tests pass; `p04` satisfies
  all nine content gates and the deferral gate from the accepted vault packet;
  no Cursor pin, catalog, generated role, or recommendation entry changed.
- **Resolved the interrupted generation run:** `.oat/sync/manifest.json` and
  `packages/cli/assets/public-package-versions.json` were confirmed to
  regenerate byte-identically from `bundle-assets.sh`, and project-scoped sync
  reported no further changes. Committed as `p05-t02` rather than discarded.
- **Corrected four evidence gaps** in `evidence-and-refresh.md`: Frontier-Bench
  now carries its vendor-operated, single-self-reported-row qualification
  instead of being weighted equally with the Coding Agent Index; absolute
  values were added for the monotonic and non-monotonic top-end results; the
  Coding Agent Index measure gained its definition and exclusions; and the
  dated evidence packet is now named as the locator the file's own
  claim-provenance rule requires.
- **Resolved a date contradiction:** the package-wide review date now
  acknowledges that `provider-cursor.md` carries an earlier 2026-09-04 date
  because its catalog was deliberately not re-verified.
- **Corrected false review provenance** in `plan.md`, which recorded two
  blocking gate reviews of the retired pre-synthesis plan as passing approvals
  of the current scope.
- **Scoped sync deliberately:** `oat sync` defaults to `--scope all`, which
  would mutate user-scope installs. Only `--scope project` was run.
- `p05-t03`: format, lint, type-check, 129 root tests, 113 focused skill tests,
  `release:validate` across five packages, and `git diff --check` all pass.
- `p06-t01`: reverification record written with all 16 schema keys and three
  provider entries; downstream parity recorded as OPEN, not satisfied.
- `p06-t02`: policy coherence audit passed. Canonical, bundled, and `.claude`
  views are byte-identical; the only differing copies are an immutable
  prior-project archive snapshot.

## Deviations from Pre-Synthesis Plan

| Previous plan                        | Accepted plan                                                                     |
| ------------------------------------ | --------------------------------------------------------------------------------- |
| Opus xhigh as default                | Opus medium/high by work shape; xhigh selective                                   |
| Consequential implies xhigh/max      | Consequential adds independent review and root authority                          |
| Opus 4.8 universal cyber primary     | Opus 5 general route with documented fallback handling                            |
| Five speculative Cursor pins         | No pin/catalog change before live probe                                           |
| Fable generic exceptional escalation | Reviewer principle durable; Fable instantiation provisional and eligibility-gated |

## Test Results

| Phase | Tests Run                                                                                         | Result |
| ----- | ------------------------------------------------------------------------------------------------- | ------ |
| p04   | Focused skill tests (113), format, terminology, scope, policy coherence; independently rerun      | pass   |
| p05   | format, lint, type-check (10/10), root suite (129), focused skill tests (113), `release:validate` | pass   |
| p06   | 16-key schema check, three-provider check, coherence audit A1-A8, generated-view parity           | pass   |

## Final Summary

To be completed after implementation and validation.

## References

- Plan: `plan.md`
- Discovery: `discovery.md`
- Historical plan: `references/pre-synthesis-plan.md`
