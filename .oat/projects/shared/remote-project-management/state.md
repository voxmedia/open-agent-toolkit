---
oat_current_task: null
oat_last_commit: null
oat_blockers: []
oat_hill_checkpoints: ['discovery', 'spec', 'design'] # Configured: which phases require human-in-the-loop lifecycle approval
oat_hill_completed: ['discovery'] # Progress: which HiLL checkpoints have been completed
oat_parallel_execution: false
oat_phase: discovery # Current phase: discovery | spec | design | plan | implement
oat_phase_status: complete # Status: in_progress | complete
oat_execution_mode: single-thread # single-thread | subagent-driven
oat_workflow_mode: spec-driven # spec-driven | quick | import
oat_workflow_origin: native # native | imported
oat_dispatch_policy:
  mode: managed
  policy: high
  source: project-state
oat_docs_updated: null # null | skipped | complete — documentation sync status
oat_project_created: '2026-03-15T20:13:09.030Z' # ISO 8601 UTC timestamp — set once at project creation
oat_project_completed: null # ISO 8601 UTC timestamp — set when project is completed/archived
oat_project_state_updated: '2026-08-31T00:40:15Z' # ISO 8601 UTC timestamp — updated on every state.md mutation
oat_generated: false
---

# Project State: remote-project-management

**Status:** Discovery complete — ready for design
**Started:** 2026-03-15
**Last Updated:** 2026-08-30

## Current Phase

Discovery — complete. The local-first multi-provider binding, authority, reconciliation, closeout, and transport policies are approved for design.

## Artifacts

- **Discovery:** `discovery.md` (complete)
- **Spec:** Not yet created
- **Design:** Not yet created
- **Plan:** Not yet created
- **Implementation:** Not yet created

## Progress

- ✓ Discovery started
- ✓ Linear integration handover reference added (`reference/linear-integration-discovery-handover.md`)
- ✓ GitHub Issues, Linear, and Jira provider dossiers added under `reference/`
- ✓ Local-first, multi-provider binding model confirmed
- ✓ Normalized fields, content ownership, mutation authority, reconciliation, closeout, and transport policy confirmed
- ✓ Discovery HiLL checkpoint approved
- ⧗ Drafting requirements and technical design

## Blockers

None

## Next Milestone

Draft the complete specification and design, then run up to two independent design-review gate loops before planning.
