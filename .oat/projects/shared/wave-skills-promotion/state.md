---
oat_current_task: null
oat_last_commit: 5237cd57
oat_blockers: []
associated_issues: [] # [{type: backlog|project|jira|linear, ref: "identifier"}]
oat_kind: implementation # implementation | coordination; coordination parents may use oat_phase: decomposition
oat_parent: null # optional child-only coordination parent slug
oat_siblings: [] # optional child-only sibling slugs
oat_depends_on: [] # optional child-only sibling dependencies
oat_children: [] # optional coordination-parent child slugs
oat_hill_checkpoints: ['discovery', 'design'] # Configured: which phases require human-in-the-loop lifecycle approval
oat_hill_completed: ['discovery', 'design'] # Progress: which HiLL checkpoints have been completed
oat_parallel_execution: false
oat_phase: design # Current phase: discovery | spec | design | plan | implement | decomposition
oat_phase_status: complete # Status: in_progress | complete | pr_open
# oat_orchestration_retry_limit: 2  # optional; override fix-loop retry limit (range 0-5)
# oat_dispatch_policy: # optional project dispatch policy; managed keeps OAT selection active, inherit leaves controls to the host
#   mode: managed # managed | inherit
#   policy: balanced # economy | balanced | high | frontier | uncapped; omit when mode: inherit
#   providers: # present for capped managed policies; omitted for uncapped/inherit
#     codex: high # low|medium|high|xhigh
#     claude: sonnet # haiku|sonnet|opus|fable
#   matrix: # optional sparse project override; full dispatch matrix lives in layered config
#     cursor:
#       high:
#         - composer-2.5
#         - { harness: cursor, model: gpt-5.5-xhigh }
#   source: project-state
# oat_dispatch_ceiling: # legacy compatibility alias for capped managed provider targets
oat_workflow_mode: spec-driven # spec-driven | quick | import
oat_workflow_origin: native # native | imported
oat_docs_updated: null # null | skipped | complete — documentation sync status
oat_pr_status: null # null | ready | open | closed | merged — actual PR state for the current project
oat_pr_url: null # null | string — tracked PR URL when a PR exists
oat_project_created: '2026-07-17T23:47:59.747Z' # ISO 8601 UTC timestamp — set once at project creation
oat_project_completed: null # ISO 8601 UTC timestamp — set when project is completed/archived
oat_project_state_updated: '2026-07-18T13:55:00Z' # ISO 8601 UTC timestamp — updated on every state.md mutation
oat_generated: false
---

# Project State: wave-skills-promotion

**Status:** Discovery
**Started:** 2026-07-17
**Last Updated:** 2026-07-17

## Current Phase

Design complete — reviewed by the stoa-side packet author (relayed by the
operator), approved with amendments applied (versioning lineage, W6
mini-runbook, fixture unhappy-path leg, B3 regression-guard framing,
row-5 closed rejection, tenth backlog item). Ready for implementation
planning.

## Artifacts

- **Discovery:** `discovery.md` (complete)
- **Spec:** `spec.md` (complete — 10 FRs + 4 NFRs, authored inline by `oat-project-design`)
- **Design:** `design.md` (complete — approved with amendments 2026-07-18)
- **Plan:** `plan.md` (scaffolded template — not started)
- **Implementation:** `implementation.md` (scaffolded template — not started)

## Progress

- ✓ Discovery complete (HiLL approved)
- ✓ Specification complete (folded into design)
- ✓ Design complete (HiLL approved with amendments)
- ⧗ Awaiting implementation plan

## Blockers

None (Phase 6 of the design is gated on the explainer-kit v1 RC, but
planning and phases 1–5 are unblocked)

## Next Milestone

Implementation plan via `oat-project-plan` (6 design phases → task
breakdown; Phase 6 tasks written as blocked/gated)
