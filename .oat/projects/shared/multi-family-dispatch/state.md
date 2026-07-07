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
oat_phase: design
oat_phase_status: in_progress
# oat_orchestration_retry_limit: 2  # optional; override fix-loop retry limit (range 0-5)
# oat_dispatch_ceiling: # optional project override for provider-aware dispatch ceilings
#   provider: codex # codex | claude
#   value: high # codex: low|medium|high|xhigh; claude: haiku|sonnet|opus
#   source: project-state
oat_workflow_mode: quick
oat_workflow_origin: native
oat_docs_updated: null
oat_pr_status: null
oat_pr_url: null
oat_project_created: '2026-07-06T14:49:31.299Z'
oat_project_completed: null
oat_project_state_updated: '2026-07-06T14:49:31.299Z'
oat_generated: false
---

# Project State: multi-family-dispatch

**Status:** Design in progress (revising after extended discovery)
**Started:** 2026-07-06
**Last Updated:** 2026-07-06

## Current Phase

Discovery captured. Lightweight design being revised to reflect the model-identity
reframe (Current/Producer/Reviewer identities + DispatchPreference + EscalationProfile),
the two-concern split (gate cross-model vs implementation cross-model), the harness-tree
config model, and the cross-harness dispatch generalization. Not yet planned.

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
- ⧗ Revise lightweight design to match discovery
- ☐ Generate implementation plan

## Blockers

None

## Next Milestone

Sign off the revised design, then generate a quick implementation plan.

## Notes

Follow-on to `model-dispatch-improvements` (single-axis dispatch policy). This project
extends that contract to multi-family providers (Cursor first) and is intentionally kept
separate; only a minimal, semantics-free producer-identity stamp lands in the parent
(decision "B"). Revalidate all assumptions at kickoff — see the design's Revalidation
Checklist. Tracks backlog items `bl-c3d8` (third-provider ceiling adapter) and `bl-e6fc`
(gate cross-target execution).
