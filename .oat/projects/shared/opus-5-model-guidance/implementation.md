---
oat_status: complete
oat_ready_for: review
oat_blockers: []
oat_last_updated: 2026-07-26
oat_current_task_id: p07-t03
oat_generated: false
---

# Implementation: opus-5-model-guidance

## Progress Overview

| Phase | Status   | Tasks | Completed |
| ----- | -------- | ----- | --------- |
| p04   | complete | 5     | 5/5       |
| p05   | complete | 3     | 3/3       |
| p06   | complete | 3     | 3/3       |
| p07   | complete | 3     | 3/3       |

**Total:** 14/14 tasks completed

## Phase 4: Integrate the Accepted Selection Policy

**Status:** complete

### Task p04-t01: Expand durable selection principles

**Status:** completed
**Commit:** `e594ab12`

### Task p04-t02: Refresh Claude routing

**Status:** completed
**Commit:** `0e651d0f`, `bdf3c6c5`

### Task p04-t03: Refresh Codex economics

**Status:** completed
**Commit:** `7801e136`, `f62d01dd`

### Task p04-t04: Refresh Cursor guidance without speculative pins

**Status:** completed
**Commit:** `609f0833`

### Task p04-t05: Expand evidence and refresh protocol

**Status:** completed
**Commit:** `33cc3b8b`, `a68b1c28`

## Phase 5: Package and Validate

**Status:** complete

### Task p05-t01: Bump the canonical skill and public packages

**Status:** completed
**Commit:** `30066393`

### Task p05-t02: Refresh generated views

**Status:** completed
**Commit:** `dfefbc2c`

### Task p05-t03: Run repository validation

**Status:** completed
**Commit:** validation only, no source change

## Phase 6: Record Reverification and Deferral

**Status:** completed

### Task p06-t01: Write the reverification record

**Status:** completed
**Commit:** `54588a59`, `bdf3c6c5`

### Task p06-t02: Audit policy coherence

**Status:** completed
**Commit:** audit only, no source change

### Task p06-t03: Final review and bookkeeping

**Status:** completed
**Commit:** `803c3ea2`, `8c1ddf08`

## Phase 7: Admit Probe-Verified Cursor Pins

**Status:** completed

### Task p07-t01: Run the G01 probe with controls

**Status:** completed
**Commit:** `58d23c11`

### Task p07-t02: Add the verified pins

**Status:** completed
**Commit:** `f19445f5`

### Task p07-t03: Record findings and reconcile artifacts

**Status:** completed

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
- `p06-t03`: four final gate reviews across two rounds. The first three ran on
  `cursor-gpt-5-6-sol-max`; the fourth fell back to `cursor-gpt-5-6-sol-xhigh`
  after that exec target was removed from user-scope config mid-cycle.

### 2026-07-25 — Phase 7 scope expansion

Phases 4 through 6 deferred all Cursor pin work on the standing rule that no
selector ships without live probe evidence. That blocker was cleared by
evidence rather than waived, so the pins were admitted in a new phase instead
of being folded silently into a completed one.

- `p07-t01`: the first probe run produced no usable evidence. It executed under
  the `cursor-agent` CLI runtime, which emits no agent lifecycle hooks, so
  every subject reported `not-reported`. Reran from Cursor desktop Agent Chat
  with temporary project hooks capturing `subagentStart.subagent_model`.
- All six subjects resolved to their intended thinking variants: five
  `claude-opus-5` rungs plus `claude-opus-4-8[effort=xhigh]`.
- Negative controls proved the channel reports resolution rather than echoing
  the request, and exposed a failure mode: Cursor substitutes a default for any
  selector component it cannot resolve, silently. An unknown family resolved to
  `cursor-grok-4.5-high-fast`; an unknown effort resolved to the family default
  rung.
- The `high` subject row is individually confounded, since `high` is the Opus 5
  default. It is rescued by its neighbors — `low`, `medium`, `xhigh`, and `max`
  each resolved to non-default rungs, proving the effort parameter is honored.
- A pre-probe assumption was disproved: Fable resolved normally despite its
  `NO ZDR` catalog tag, so it is not entitlement-blocked for this account.
- `p07-t02`: six mappings added, recommendation rebalanced to `2026-07-25.1`,
  twelve role files generated, `claude-sonnet-5-high` dropped from the economy
  tier as strictly dominated while remaining catalogued.
- `p07-t03`: findings recorded, silent-fallback risk filed as
  `BL-260726-validate-cursor-pin-effort`, and artifacts reconciled so nothing
  still claims pin work is deferred.

## Deviations from Pre-Synthesis Plan

| Previous plan                        | Accepted plan                                                                     |
| ------------------------------------ | --------------------------------------------------------------------------------- |
| Opus xhigh as default                | Opus medium/high by work shape; xhigh selective                                   |
| Consequential implies xhigh/max      | Consequential adds independent review and root authority                          |
| Opus 4.8 universal cyber primary     | Opus 5 general route with documented fallback handling                            |
| Five speculative Cursor pins         | Six pins shipped in Phase 7, each probe-verified rather than inferred             |
| Fable generic exceptional escalation | Reviewer principle durable; Fable instantiation provisional and eligibility-gated |

## Test Results

| Phase | Tests Run                                                                                          | Result |
| ----- | -------------------------------------------------------------------------------------------------- | ------ |
| p04   | Focused skill tests (113), format, terminology, scope, policy coherence; independently rerun       | pass   |
| p05   | format, lint, type-check (10/10), root suite (129), focused skill tests (113), `release:validate`  | pass   |
| p06   | 16-key schema check, three-provider check, coherence audit A1-A8, generated-view parity            | pass   |
| p07   | G01 probe (6 subjects, 4 controls), full suite, `release:validate`, type-check, lint, format, sync | pass   |

## Final Summary

Claude Opus 5 is now the hard-reasoning and consequential incumbent in the
canonical `subagent-orchestration` guidance, and Opus 4.8 is repositioned as
the cyber-sensitive route on the strength of its predictable refusal behavior.
The task-class ladder and the Opus-first policy are unchanged; only the
incumbent and its supporting metadata moved.

Six Cursor pin mappings shipped: five `claude-opus-5` effort rungs plus
`claude-opus-4-8[effort=xhigh]`, the last catalogued but deliberately withheld
from the bundled recommendation. Recommendation `2026-07-25.1` places Opus 5
across the Cursor `balanced`, `high`, and `frontier` tiers and drops
`claude-sonnet-5-high` from `economy`, where CursorBench showed Opus 5 low
strictly dominating it on score, cost, tokens, and steps.

The pins were the hard part, and they were not in the original plan. Phases 4
through 6 deferred all Cursor pin work because no selector had been verified
and the project's own decision record forbids shipping a mapping on structural
validation or agent self-report. Phase 7 was added after a live probe supplied
the missing evidence, read from Cursor's `subagentStart` lifecycle hooks. The
first probe attempt failed and is worth recording: it ran through the headless
`cursor-agent` runtime, which emits no agent hooks at all, so every row came
back not-reported.

Two findings came out of the probe that outlast this project. Cursor does not
reject a malformed pin — it silently substitutes a default for any selector
component it cannot resolve, and the default rung is family-specific rather
than always `high`, so a typo ships a working-but-wrong model that tracks a
vendor-controlled default. And a probe whose requested rung happens to equal
the family default cannot distinguish an honored effort parameter from an
ignored one, which means the `high` row here is sound only by inference across
its non-default neighbors. Both are now documented, the first is tracked as
`BL-260726-validate-cursor-pin-effort`, and mappings can carry a probe record
that fails its own test if the selector is edited without re-probing.

The final review passed with zero findings after four rounds. Every blocking
finding across those rounds was in the guidance and provenance layer rather
than the implementation; the mappings and generated roles reviewed clean from
the first round. The recurring defect was a stale cross-reference — changing
one file and leaving a now-false statement in another — which is worth
watching for in any future refresh that spans this many artifacts.

## References

- Plan: `plan.md`
- Discovery: `discovery.md`
- Historical plan: `references/pre-synthesis-plan.md`
