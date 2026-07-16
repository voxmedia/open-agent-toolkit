---
id: BL-260711-add-activity-aware-gate
title: 'Add activity-aware gate timeouts'
status: open # open | in_progress | closed | wont_do
priority: high # urgent | high | medium | low | none
scope: feature # idea | task | feature | initiative
scope_estimate: M # XS | S | M | L | XL | XXL
labels: [gates, timeout, reliability, dispatch]
assignee: null
created: '2026-07-11T16:55:00Z'
updated: '2026-07-16T19:39:00Z'
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

1. **Idle-activity timer (hang detection):** reset a short (~2–3 min) timer
   on any child stdout/stderr output. Hung children go silent and get killed
   faster than today; chatty, working reviews are never killed by this
   mechanism. No agent cooperation required.
2. **Early artifact-template write (liveness + correlation):** gate-originated
   reviewer guidance instructs the reviewer to write the review artifact
   template (frontmatter + skeleton) as its first action, registering the
   correlated artifact path immediately. This gives the wrapper a quick
   verification the child is active and makes timeout-recovery correlation
   trivial. A dedicated status/heartbeat file is likely unnecessary given
   output streaming; revisit only if streaming proves insufficient.
3. **Hard cap (runaway protection):** keep an absolute ceiling (configurable,
   e.g. `OAT_GATE_EXEC_TIMEOUT_MS`-style) well above expected review
   duration.
4. **Artifact-aware completion:** on any timeout, check for a correlated,
   complete, run-ID-matching review artifact before declaring the work lost
   (carried from codex-subagent-max-depth learnings' potential resolutions).

## Partial Progress (2026-07-16)

The `gate-execution-hardening` project shipped the enabling and diagnostic
layers in CLI `0.1.71`: scope/target-aware configurable hard budgets,
process/stdout/transcript liveness evidence, correlated timeout recovery,
headless completion-safe routing, and deterministic timeout fixtures. This item
remains open for the behavior not yet implemented: an adaptive idle-kill timer,
early correlated artifact-template creation, and distinct structured
idle-kill versus hard-cap outcomes.

## Acceptance Criteria

- A gate child producing output activity is not killed by the idle mechanism,
  even when total duration exceeds the legacy fixed timeout.
- A silent/hung child is terminated within the idle window — faster than the
  current fixed timeout would have caught it.
- A hard cap still bounds total runtime and remains configurable.
- Gate-originated reviewer instructions direct the reviewer to write the
  review artifact template early; the wrapper can verify the correlated
  artifact path exists shortly after launch.
- On any timeout, the gate checks for a correlated, complete, run-ID-matching
  review artifact before reporting loss; a recovered artifact flows through
  normal corroboration and severity thresholds.
- Structured gate output distinguishes idle-kill, hard-cap-kill, and
  recovered-after-timeout outcomes.
- Behavior is covered by gate command tests (idle reset, idle kill, cap kill,
  recovery path) and verifiable via the live smoke fixture
  (`oat-project-fixture` project) once available.
