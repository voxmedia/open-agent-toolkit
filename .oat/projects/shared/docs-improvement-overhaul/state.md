---
oat_current_task: p02-t01
oat_last_commit: 727c40abb5be32885d37d28b21887ac7c986ea42
oat_blockers: []
associated_issues: [] # [{type: backlog|project|jira|linear, ref: "identifier"}]
oat_kind: implementation # implementation | coordination; coordination parents may use oat_phase: decomposition
oat_parent: null # optional child-only coordination parent slug
oat_siblings: [] # optional child-only sibling slugs
oat_depends_on: [] # optional child-only sibling dependencies
oat_children: [] # optional coordination-parent child slugs
oat_hill_checkpoints: [] # Configured: which phases require human-in-the-loop lifecycle approval
oat_hill_completed: [] # Progress: which HiLL checkpoints have been completed
oat_parallel_execution: false
oat_dispatch_policy:
  mode: managed
  policy: high
  source: project-state
oat_phase: implement # Current phase: discovery | spec | design | plan | implement | decomposition
oat_phase_status: in_progress # Status: in_progress | complete | pr_open
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
oat_workflow_mode: quick # spec-driven | quick | import | lite
oat_workflow_origin: native # native | imported
# oat_skill_gate_overrides: # optional; per-project posture for configured lifecycle gates
#   oat-project-implement: disabled # only the literal value `disabled`; absence means follow configuration
# oat_implement_exit_gate: # optional; durable configured implementation exit-gate state
#   status: pending # pending | allowed | blocked | stale
#   resolution: configured # configured | no_gate
#   disposition: null # null | passed | warned | prompt_approved | project_disabled | no_gate
#   config_fingerprint: '<stable hash of resolved gate declaration>'
#   resolved_command: null
#   resolved_description: null
#   project_override: null # null or {value: disabled, source: state.md:oat_skill_gate_overrides}
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
oat_project_created: '2026-10-01T22:42:17.072Z' # ISO 8601 UTC timestamp — set once at project creation
oat_project_completed: null # ISO 8601 UTC timestamp — set when project is completed/archived
oat_project_state_updated: '2026-10-02T11:51:01Z'
oat_generated: false
---

# Project State: docs-improvement-overhaul

**Status:** Phase 1 accepted; Fable map review received, phase 2 R1/R2 corrections in progress before moves
**Started:** 2026-10-01
**Last Updated:** 2026-10-02

## Current Phase

The user invoked oat-project-implement after the reviewed handoff. Execute six sequential phases under High dispatch, with independent reviews and Fable collaboration. User additions relayed during p01 require whole-site personas/conservation/editorial work, universal skill scenarios and configuration decision guidance. Final checkpoint moves to p06 with auto-review; triage is Codex/Fable consensus without user wait. Moved URLs may break; no aliases. Publication and merge remain separate boundaries.

## Artifacts

- **Discovery:** `discovery.md` (complete through CLI validation)
- **Spec:** N/A (quick mode)
- **Design:** `design.md` (complete; independently reviewed)
- **Plan:** `plan.md` (20 tasks across 6 phases; added scope requires amendment review before p06)
- **Implementation:** `implementation.md` (p01 tasks verified; phase gates/review pending)
- **Review receipt:** `reviews/plan-review-round-03.md` (gate provenance, fixes, independent verification and Fable final confirmation)
- **References:** [Evidence index](references/index.md), including initial evaluations, the proposed IA, Fable's skill inventory advisory, and orchestration observations.

## Progress

- Discovery started in quick mode at the user's request.
- Archived readability project, skills-repo comparison, and rendered-site observations retained.
- Codex and Fable agree on the IA; the user authorized drafting design and plan against it.
- Plan is no longer a template and routes to implementation entry after separate authorization.
- High dispatch resolved. Optional additional phase gate remains unconfigured; configured lifecycle gates remain enabled. Final implementation checkpoint is p06 with auto-review; persona triage does not wait on the user.

## Blockers

None currently. Fable's actual map review arrived via the user, approves destinations and route-only supersessions conditional on R1/R2. User explicitly directs root to send authorized peer prompts despite future draft signals rather than stopping. Receipt and override are durable; R1/R2 non-author conservation verification and later browser proof remain mandatory.

## Next Milestone

Complete bounded R1/R2 corrections on the existing phase02 handle, independently verify conservation, finish p02-t01, then apply the preservation-only migration. Fable does not require another map review unless R1 changes other destinations. Continue through p06 final QA and the configured implementation gate without another routine user checkpoint.
