---
oat_current_task: null
oat_last_commit: null
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
oat_phase: plan
oat_phase_status: complete
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
oat_project_state_updated: '2026-07-07T05:18:54Z'
oat_generated: false
---

# Project State: multi-family-dispatch

**Status:** Design in progress (revising after extended discovery)
**Started:** 2026-07-06
**Last Updated:** 2026-07-06

## Current Phase

Planning complete — ready for implementation **in a new worktree after PR #129 merges**.
Plan: 6 phases / 25 tasks, sequential; artifact review passed (structured, 6 findings
applied). Dispatch policy: managed `high` (Codex xhigh · Claude opus). HiLL checkpoints
deferred to `oat-project-implement` at execution start.

## Artifacts

- **Discovery:** `discovery.md` (complete)
- **Spec:** N/A (quick mode)
- **Design:** `design.md` (revising — lightweight; pre-project draft pending kickoff revalidation)
- **Plan:** `plan.md` (scaffolded template — not started; awaiting design sign-off)
- **Implementation:** `implementation.md` (scaffolded template — not started)

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
- ⧗ Awaiting implementation (new worktree; p01 opens with kickoff revalidation)

## Blockers

None

## Next Milestone

Merge PR #129, create the implementation worktree, run `pnpm run worktree:init`, then
run `oat-project-implement` (p01 kickoff revalidation + blocking experiments first).

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
