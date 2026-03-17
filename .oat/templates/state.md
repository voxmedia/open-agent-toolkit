---
oat_current_task: null
oat_last_commit: null
oat_blockers: []
associated_issues: [] # [{type: backlog|project|jira|linear, ref: "identifier"}]
oat_hill_checkpoints: ['discovery', 'spec', 'design'] # Configured: which phases require human-in-the-loop lifecycle approval
oat_hill_completed: [] # Progress: which HiLL checkpoints have been completed
oat_parallel_execution: false
oat_phase: discovery # Current phase: discovery | spec | design | plan | implement
oat_phase_status: in_progress # Status: in_progress | complete
oat_execution_mode: single-thread # single-thread | subagent-driven
oat_workflow_mode: spec-driven # spec-driven | quick | import
oat_workflow_origin: native # native | imported
oat_docs_updated: null # null | skipped | complete — documentation sync status
oat_project_created: null # ISO 8601 UTC timestamp — set once at project creation
oat_project_completed: null # ISO 8601 UTC timestamp — set when project is completed/archived
oat_project_state_updated: null # ISO 8601 UTC timestamp — updated on every state.md mutation
oat_generated: false
oat_template: true
oat_template_name: state
---

# Project State: {Project Name}

**Status:** Discovery
**Started:** YYYY-MM-DD
**Last Updated:** YYYY-MM-DD

## Current Phase

Discovery - Gathering requirements and understanding the problem space

## Artifacts

- **Discovery:** `discovery.md` (in_progress)
- **Spec:** Not yet created
- **Design:** Not yet created
- **Plan:** Not yet created
- **Implementation:** Not yet created

## Progress

- ✓ Discovery started
- ⧗ Awaiting user input

## Blockers

None

## Next Milestone

Complete discovery and move to specification phase
