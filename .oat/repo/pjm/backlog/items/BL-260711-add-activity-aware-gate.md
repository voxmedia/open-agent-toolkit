---
id: BL-260711-add-activity-aware-gate
title: 'Add activity-aware gate timeouts'
status: open # open | in_progress | closed | wont_do
priority: high # urgent | high | medium | low | none
scope: feature # idea | task | feature | initiative
scope_estimate: L # XS | S | M | L | XL | XXL
labels: [gates, timeout, reliability, dispatch, liveness]
assignee: null
created: '2026-07-11T16:55:00Z'
updated: '2026-07-30T23:38:00Z'
associated_issues: []
---

## Description

The gate execution wrapper kills genuinely-progressing reviews at a fixed
timeout. Observed live on 2026-07-11: a plan artifact gate on
`codex-5-6-sol-max` was killed at 600 s while its nested managed reviewer
child (`oat-reviewer-gpt-5-6-sol-high`) was actively working — all review
work was lost with no artifact. The identical incident occurred earlier in
`codex-subagent-max-depth` (remediated there by raising the default to 15
minutes — still a fixed number).

Root cause: one fixed timeout is asked to detect two different conditions —
a hung child (should be killed fast) and a long-but-healthy review (should
never be killed). Replace it with activity-aware semantics:

1. **Artifact-anchored liveness (stall detection):** the reviewer writes the
   review artifact template as its first action and updates it at each phase
   boundary; the wrapper polls that run-correlated path. Progress means the
   artifact's content or size advanced, never an `mtime` touch alone, so a
   reviewer that rewrites an unchanged file cannot renew its own deadline.
   This replaces the stdout-anchored idle timer originally specified here —
   see "Design correction (2026-07-30)" for why output streaming is the wrong
   signal.
2. **Incremental artifact writing (prerequisite):** three behaviors are
   required and none are delivered by `review-plan-workflow`, which excludes
   them by design. The reviewer contract must direct per-phase-boundary
   snapshots; the draft must be retained on blocked/timeout rather than
   deleted; and the timeout path must consult draft progress. The path itself
   is already plumbed as `artifact_draft_path` in the descriptor and envelope,
   so the gate already knows where to look.
3. **Bounded extension:** extend only while all hold — the artifact belongs to
   the current gate run ID; its status is still `in_progress`; its content or
   size advanced since the previous probe; the reviewer process is alive; the
   extension count and total extended time remain under configured caps; and
   enough reserve remains to reconcile and publish. Transcript growth alone
   must never extend a deadline.
4. **Hard cap (runaway protection):** one absolute configurable ceiling,
   owned here. Initial sizing and extension must not each define a maximum, or
   a computed floor can exceed the extension cap.
5. **Scope-aware initial sizing:** insert a computed source into the existing
   precedence chain (`--timeout-ms` → `target.timeoutMs` →
   `workflow.gateTimeouts.{code|artifact}` → `OAT_GATE_EXEC_TIMEOUT_MS` →
   scope defaults → global default), where every level currently reads a
   constant. Estimation is parent-side and pre-launch, derived from cheap
   signals: changed file/line counts (`--numstat`, `--stat`) and lifecycle
   artifact byte volume. Lane count is only knowable after the child plans, so
   parent-side estimation is volume-based and sets a better floor while
   extension covers the residual.
6. **Artifact-aware completion:** on any timeout, check for a correlated,
   complete, run-ID-matching review artifact before declaring the work lost
   (carried from codex-subagent-max-depth learnings' potential resolutions).

## Partial Progress (2026-07-16)

The `gate-execution-hardening` project shipped the enabling and diagnostic
layers in CLI `0.1.72`: scope/target-aware configurable hard budgets,
process/stdout/transcript liveness evidence, correlated timeout recovery,
headless completion-safe routing, and deterministic timeout fixtures. This item
remains open for the behavior not yet implemented: artifact-anchored stall
detection, incremental artifact writing, bounded extension, scope-aware initial
sizing, and distinct structured stall-kill versus hard-cap outcomes.

Note that `0.1.72`'s "scope/target-aware configurable hard budgets" delivered the
_config surface and precedence chain_, not computed sizing. Every level of that
chain still resolves a constant, which is why mechanism 5 is an insertion into
existing plumbing rather than new configuration.

## Recurrence (2026-07-30)

Another instance, and the first where the killed reviewer was demonstrably
productive at the boundary. A `plan` artifact gate run
(`21b68483-5f01-498c-bfb7-60fd79a8504c`) was SIGTERMed at the 15-minute
artifact scope default with no artifact written. All review work was lost, and
the project was left holding a `plan`-phase gate blocker that no later review
artifact can retire — the blocker is project-level state, so an inline
replacement review closes the review need without clearing the blocker. The
plan under review was large by design (7 phases, 74 tasks, ~2,000 lines),
which is exactly the shape of artifact review that legitimately exceeds 15
minutes.

This recurrence sharpens the case for the idle timer specifically. The
liveness and post-mortem evidence shipped in `0.1.72` (see
`cli-utilities/workflow-gates.md`, "Liveness and post-mortem evidence") did
its job: after the fact, transcript evidence showed useful work in progress at
the moment of the kill. But evidence that arrives post-mortem only improves
diagnosis. The wrapper still sends SIGTERM at the fixed boundary regardless of
what that evidence says. A fixed timeout cannot distinguish "18 minutes of
steady progress" from "18 minutes hung", and no improvement in telemetry
changes that — only feeding activity back into the kill decision does.

**Interim mitigation is owned elsewhere.** Raising the built-in artifact scope
default from 900,000 to 1,200,000 ms is task `p05-t07` ("Raise the built-in
artifact review timeout") of the `review-plan-workflow` project, not part of
this item. That buys headroom for large-plan reviews without adaptive
machinery. This item stays scoped to the activity-aware behavior, which
remains necessary at any fixed value.

## Design Correction (2026-07-30)

The stdout-anchored idle timer originally specified here — "reset a short
(~2–3 min) timer on any child stdout/stderr output," on the premise that
"chatty, working reviews are never killed" — is wrong in both directions, and
its "No agent cooperation required" selling point is what makes it wrong.

**It shields the runs that should die.** Output volume measures activity, not
convergence. The 2026-07-26 40-minute failure spawned one oversized
reconnaissance worker that ran ~50 tool steps, including test runs, and never
returned a report. It was maximally chatty and never converging. Under the
original spec that run resets the idle timer continuously and burns the full
hard cap.

**It kills the runs that should live.** Cursor buffers subagent output until
completion, which is why that gate reported "no output" while the transcript was
actively growing. On Cursor a healthy child emits nothing for its entire run, so
a 2–3 minute idle timer terminates working reviews far more aggressively than
the fixed timeout it replaces — on the exact runtime where these failures occur.

The original mechanism 2 already contained the fix and then set it aside:
"A dedicated status/heartbeat file is likely unnecessary given output streaming;
revisit only if streaming proves insufficient." Streaming has now proven
insufficient. Filesystem artifact progress becomes the primary liveness channel
precisely because stdout is unreliable across hosts; stdout is demoted to a
supplementary positive signal that can never alone justify a kill or an
extension.

**Cooperation is an acceptable cost.** Artifact-anchored liveness requires the
reviewer to write, so a reviewer that ignores the instruction emits no signal.
That failure is cheap: the wrapper verifies the correlated artifact appeared
shortly after launch, so a broken reviewer fails in seconds with a clear reason
instead of silently consuming the full budget. Better than today in both
directions.

**Scope boundary with `review-plan-workflow`.** That project's `spec.md`
Non-Goals explicitly exclude "Transactional in-progress or partial review
artifacts" and "Adaptive or work-derived outer timeout calculation," and its
design keeps "a hard ceiling rather than an activity-aware extension." Its
`artifactDraftPath` is a _private_ store (`0600`, exclusive/no-follow) that
receives complete candidates, and any draft attached to a blocked result "is
deleted after private diagnostics are recorded." So this item cannot consume that
work as a liveness prerequisite; it must add per-boundary writes, draft
retention, and progress-aware timeout behavior itself.

That deletion behavior exists for a real reason — a blocked result must expose
"no discoverable review artifact path, GitHub post, passing ledger entry, or
receive-eligible handoff." The reconciliation is that _gate-internal_ path
knowledge is not the same as discoverability to review resolution or receive.
Preserving that separation is the design work here, not a blocker.

Architecturally, the outer timeout is resolved before the child builds its
ChangeMap, which is why scope-aware sizing cannot be an expansion of `p05-t07`
and belongs here alongside extension.

## Acceptance Criteria

### Artifact-anchored liveness

- A reviewer whose artifact advances is not killed at the initial budget, even
  when total duration exceeds it.
- A child that is chatty on stdout but whose artifact has not advanced is
  terminated — the 2026-07-26 oversized-worker shape does not survive.
- A child on a runtime that buffers output until completion is never killed for
  stdout silence alone.
- An artifact rewritten with unchanged content or size does not count as
  progress and does not extend the deadline.
- The wrapper verifies the correlated artifact path exists shortly after launch
  and fails fast with a distinct reason when it never appears.

### Incremental artifact writing

- Reviewer guidance directs artifact-template creation as the first action and
  updates at each phase boundary (intake, plan, per lane, verification).
- A draft associated with a timed-out or blocked run is retained for diagnosis
  and records completed lanes, uncovered lanes, and commands already run.
- A retained partial is never discoverable to review resolution or receive, and
  cannot be parsed as a completed or passing review.

### Bounded extension

- Extension requires all six conditions in mechanism 3; violating any one
  prevents it.
- Transcript growth alone never extends a deadline.
- Extension count and total extended time are capped and configurable.
- Sufficient reserve for reconciliation and publication is preserved.

### Scope-aware initial sizing

- Computed sizing occupies one documented position in the precedence chain and
  every higher-precedence layer still overrides it.
- Budgets derive from changed file/line counts and artifact byte volume, with
  deterministic tests pinning representative scopes.
- Sizing and extension share a single hard ceiling; a computed floor can never
  exceed the extension cap.

### Outcomes and recovery

- On any timeout, the gate checks for a correlated, complete, run-ID-matching
  review artifact before reporting loss; a recovered artifact flows through
  normal corroboration and severity thresholds.
- Structured gate output distinguishes stall-kill, hard-cap-kill, and
  recovered-after-timeout, and separates "timed out while active" from "timed
  out with no observed activity."
- Existing `activityEvidence` is surfaced in the human-facing gate failure
  summary and persisted in implementation closeout notes, without an
  incompatible change to the structured envelope.
- Behavior is covered by gate command tests (progress reset, stall kill, cap
  kill, extension caps, recovery path) and verifiable via the live smoke fixture
  (`oat-project-fixture` project) once available.
