---
oat_current_task: null
oat_last_commit: null
oat_blockers: []
associated_issues: [] # [{type: backlog|project|jira|linear, ref: "identifier"}]
oat_hill_checkpoints: { OAT_HILL_CHECKPOINTS } # Configured: which phases require human-in-the-loop lifecycle approval
oat_hill_completed: [] # Progress: which HiLL checkpoints have been completed
oat_parallel_execution: false
oat_phase: { OAT_PHASE } # Current phase: discovery | spec | design | plan | implement
oat_phase_status: in_progress # Status: in_progress | complete | pr_open
oat_execution_mode: single-thread # single-thread | subagent-driven
oat_workflow_mode: { OAT_WORKFLOW_MODE } # spec-driven | quick | import
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

**Status:** {OAT_STATUS}
**Started:** YYYY-MM-DD
**Last Updated:** YYYY-MM-DD

## Current Phase

{OAT_CURRENT_PHASE}

## Artifacts

{OAT_ARTIFACTS}

## Progress

{OAT_PROGRESS}

## Blockers

None

## Next Milestone

{OAT_NEXT_MILESTONE}
