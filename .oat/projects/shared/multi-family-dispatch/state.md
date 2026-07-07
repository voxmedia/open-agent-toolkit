---
oat_current_task: p04-t01
oat_last_commit: 16ba9041b3d65a65c2aab531297ae1df51b19fa0
oat_blockers: []
associated_issues:
  - { type: backlog, ref: 'bl-c3d8' }
  - { type: backlog, ref: 'bl-e6fc' }
oat_kind: implementation
oat_parent: null
oat_siblings: []
oat_depends_on: []
oat_children: []
oat_hill_checkpoints: []
oat_hill_completed: []
oat_parallel_execution: false
oat_phase: implement
oat_phase_status: in_progress
# oat_orchestration_retry_limit: 2  # optional; override fix-loop retry limit (range 0-5)
oat_dispatch_policy:
  mode: managed
  policy: high
  providers:
    codex: xhigh
    claude: opus
  source: project-state
oat_workflow_mode: quick
oat_workflow_origin: native
oat_docs_updated: null
oat_pr_status: null
oat_pr_url: null
oat_project_created: '2026-07-06T14:49:31.299Z'
oat_project_completed: null
oat_project_state_updated: '2026-07-07T14:42:55Z'
oat_generated: false
---

# Project State: multi-family-dispatch

**Status:** Implementation in progress
**Started:** 2026-07-06
**Last Updated:** 2026-07-07

## Current Phase

Implementation in progress. Phases p01, p02, and p03 are complete. p03 added the tier
matrix, resolver merge semantics, Cursor adapter, availability oracles, doctor checks,
and adopt-time recommendation flow, then passed standard review after one bounded fix.
Next: run the p03 phase review gate, then continue with p04-t01.

## Artifacts

- **Discovery:** `discovery.md` (complete)
- **Spec:** N/A (quick mode)
- **Design:** `design.md` (complete; p01 confidence-rule updates applied)
- **Plan:** `plan.md` (complete; p01 review passed)
- **Implementation:** `implementation.md` (in progress; next task p04-t01)

## Progress

- ✓ Lightweight design drafted ahead of project init
- ✓ Extensive discovery captured
- ✓ Project initialized via `oat project new` (quick mode)
- ✓ Artifacts restored after accidental removal by parent final-review fix (`b4601236`)
- ✓ Discovery Round 2 (parent shipped; identity provenance; matrix; gates; validation)
- ✓ Design revised to shipped-parent ground truth
- ✓ Design signed off (plan-gating decisions, Q23)
- ✓ Implementation plan complete (6 phases / 25 tasks; artifact review passed)
- ✓ Dispatch policy persisted (managed high — codex xhigh · claude opus)
- ✓ Phase p01 kickoff revalidation and blocking Cursor experiments complete
- ✓ p01 standard review passed after one bounded fix
- ✓ p01 external phase review gate passed and was consumed
- ✓ Phase p02 shared identity foundation complete
- ✓ p02 standard review passed after one bounded fix
- ✓ p02 external phase review gate passed and was consumed
- ✓ Phase p03 matrix/resolver/validation implementation complete
- ✓ p03 standard review passed after one bounded fix
- ⧗ p03 external phase review gate pending

## Blockers

None

## Next Milestone

Run the configured p03 phase review gate, then continue implementation with p04-t01
(family-aware gate avoidance).

## Notes

**Intentionally included on this branch.** This project is follow-on discovery/design
(and possibly plan) material kept on the `model-dispatch-improvements` PR branch for
continuity. It is **not** part of the parent's shipped implementation surface, and
implementation will happen later in a **new worktree**. Review passes should treat these
files as planning artifacts — they were once removed as "stray project artifacts"
(`b4601236`) and deliberately restored (`9745e7a2`).

Follow-on to `model-dispatch-improvements` (single-axis dispatch policy), extending it to
multi-family providers (Cursor first). The parent shipped **without** the producer-identity
stamp, so the stamp is phase 1 of this project. Revalidate all assumptions at kickoff —
see the design's Revalidation Checklist. Tracks backlog items `bl-c3d8` (third-provider
ceiling adapter) and `bl-e6fc` (gate cross-target execution).
