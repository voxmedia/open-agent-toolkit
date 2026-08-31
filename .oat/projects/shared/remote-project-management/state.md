---
oat_current_task: null
oat_last_commit: c651c96cf
oat_blockers: []
oat_hill_checkpoints: ['discovery', 'spec', 'design'] # Configured: which phases require human-in-the-loop lifecycle approval
oat_hill_completed: ['discovery'] # Progress: which HiLL checkpoints have been completed
oat_parallel_execution: false
oat_phase: design # Current phase: discovery | spec | design | plan | implement
oat_phase_status: in_progress # Status: in_progress | complete
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
oat_project_state_updated: '2026-08-31T01:15:00Z' # ISO 8601 UTC timestamp — updated on every state.md mutation
oat_generated: false
---

# Project State: remote-project-management

**Status:** Specification complete — design awaiting review
**Started:** 2026-03-15
**Last Updated:** 2026-08-30

## Current Phase

Design — in progress. The complete specification and draft technical design are ready for two independent review loops.

## Artifacts

- **Discovery:** `discovery.md` (complete)
- **Spec:** `spec.md` (complete)
- **Design:** `design.md` (draft; awaiting review)
- **Plan:** Not yet created
- **Implementation:** Not yet created

## Progress

- ✓ Discovery started
- ✓ Linear integration handover reference added (`reference/linear-integration-discovery-handover.md`)
- ✓ GitHub Issues, Linear, and Jira provider dossiers added under `reference/`
- ✓ Local-first, multi-provider binding model confirmed
- ✓ Normalized fields, content ownership, mutation authority, reconciliation, closeout, and transport policy confirmed
- ✓ Discovery HiLL checkpoint approved
- ✓ Specification complete
- ✓ Full technical design drafted
- ✓ Design review loop 1 received and all findings resolved in artifacts
- ⧗ Running design review loop 2

## Blockers

None

## Next Milestone

Draft the complete specification and design, then run up to two independent design-review gate loops before planning.
