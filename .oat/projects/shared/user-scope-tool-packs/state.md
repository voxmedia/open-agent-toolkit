---
oat_current_task: null
oat_last_commit: a8c63f078
oat_blockers: []
associated_issues: [
    { type: backlog, ref: 'BL-260818-make-the-project-management' },
  ] # [{type: backlog|project|jira|linear, ref: "identifier"}]
oat_kind: implementation # implementation | coordination; coordination parents may use oat_phase: decomposition
oat_parent: null # optional child-only coordination parent slug
oat_siblings: [] # optional child-only sibling slugs
oat_depends_on: [] # optional child-only sibling dependencies
oat_children: [] # optional coordination-parent child slugs
oat_dispatch_policy:
  mode: managed
  policy: high
  source: project-state
oat_hill_checkpoints: ['discovery', 'design'] # Configured: which phases require human-in-the-loop lifecycle approval
oat_hill_completed: ['discovery', 'design'] # Progress: which HiLL checkpoints have been completed
oat_parallel_execution: false
oat_phase: plan # Current phase: discovery | spec | design | plan | implement | decomposition
oat_phase_status: complete # Status: in_progress | complete | pr_open
# oat_orchestration_retry_limit: 2  # optional; override fix-loop retry limit (range 0-5)
# oat_phase_recovery_policy: # optional; automatic append-only post-commit phase recovery
#   default_attempt_limit: 10 # project default, integer 0-20; 0 disables automatic recovery
#   phase_attempt_limits: {} # optional pNN: 0-20 overrides; prior usage never resets
#   phase_attempt_usage: # authoritative monotonic per-phase attempt ledger
#     pNN:
#       used_attempts: 0
#       pending_attempt: null # null or {attempt, event_id, original_request_id, original_task_id, original_commit, discovered_by, dispatch_target, reservation_head, status}
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
# oat_implement_exit_gate: # optional; durable configured implementation exit-gate state
#   status: pending # pending | allowed | blocked | stale
#   resolution: configured # configured | no_gate
#   disposition: null # null | passed | warned | prompt_approved | no_gate
#   config_fingerprint: '<stable hash of resolved gate declaration>'
#   resolved_command: null
#   resolved_description: null
#   on_failure: block # block | prompt | warn | null
#   max_attempts: 2
#   attempts_completed: 0
#   reviewed_head: null
#   implementation_base_ref: null # exact logical base ref for effective-delta-v1
#   implementation_fingerprint: null # new generations use sha256:effective-delta-v1:<digest>
#   freshness_head: null # rolling accepted tree checkpoint
#   freshness_fingerprint: null # full effective delta at freshness_head
#   launch_state: not_started # not_started | intent_persisted | accepted | result_persisted | not_accepted
#   launch_attempt_id: null
#   launch_started_at: null
#   launch_result_receipt: null
#   gate_run_marker: null
#   gate_run_id: null
#   envelope_status: null # ok | blocked | review_failed | other terminal status
#   artifact: null
#   handoff: null
#   receive_state: not_started # not_started | intent_persisted | completed | reconciliation_required
#   receive_correlation: null
#   receive_source_artifact: null
#   receive_archived_artifact: null
#   receive_event_identity: null
#   receive_pre_head: null
#   receive_commit: null
#   receive_eligible: false
#   receive_completed: false
#   failure: null
#   updated_at: '2026-07-18T00:00:00Z'
oat_docs_updated: null # null | skipped | complete — documentation sync status
oat_pr_status: null # null | ready | open | closed | merged — actual PR state for the current project
oat_pr_url: null # null | string — tracked PR URL when a PR exists
oat_project_created: '2026-08-20T19:49:14.674Z' # ISO 8601 UTC timestamp — set once at project creation
oat_project_completed: null # ISO 8601 UTC timestamp — set when project is completed/archived
oat_project_state_updated: '2026-08-27T02:25:49Z' # ISO 8601 UTC timestamp — updated on every state.md mutation
oat_generated: false
oat_project_explainer:
  decision: skip
  source: interactive
  decided_at: '2026-08-27T01:31:26Z'
---

# Project State: user-scope-tool-packs

**Status:** Planning complete — ready for implementation
**Started:** 2026-08-20
**Last Updated:** 2026-08-27

## Current Phase

Planning is complete. The executable 34-task plan passed the configured Fable
gate after one bounded fix cycle, and the passing review's non-blocking findings
were resolved during receipt.

## Artifacts

- **Discovery:** `discovery.md` (complete and approved)
- **Spec:** `spec.md` (complete)
- **Design:** `design.md` (complete and approved)
- **Plan:** `plan.md` (complete and ready for `oat-project-implement`)
- **Implementation:** `implementation.md` (scaffolded template — not started)

## Progress

- ✓ Discovery started
- ✓ Downstream lifecycle files scaffolded
- ✓ Unified user-scope pack contract selected
- ✓ Pack membership, PJM ownership, template precedence, and migration safety defined
- ✓ Discovery HiLL checkpoint approved
- ✓ Specification confirmed
- ✓ Technical design drafted
- ✓ Independent Fable design review received
- ✓ One bounded design fix pass applied
- ✓ Design HiLL checkpoint completed under the user's continuation instruction
- ✓ Implementation plan drafted
- ✓ Requirements mapped to stable task IDs
- ✓ Inline structured plan self-review passed
- ✓ First Fable plan gate received and all findings resolved
- ✓ Fable verification gate passed with no blocking findings
- ✓ Passing review received and non-blocking findings resolved
- ✓ Planning complete
- ⧗ Awaiting implementation

## Blockers

None

## Next Milestone

Run `oat-project-implement` when implementation should begin.
