---
oat_current_task: null
oat_last_commit: 243acef2aae94895e4a6815ee26bf724a8b7c7ea
oat_blockers: []
associated_issues: [] # [{type: backlog|project|jira|linear, ref: "identifier"}]
oat_kind: implementation # implementation | coordination; coordination parents may use oat_phase: decomposition
oat_parent: null # optional child-only coordination parent slug
oat_siblings: [] # optional child-only sibling slugs
oat_depends_on: [] # optional child-only sibling dependencies
oat_children: [] # optional coordination-parent child slugs
oat_hill_checkpoints: [] # Configured: which phases require human-in-the-loop lifecycle approval; [] = none for brief modes
oat_hill_completed: [] # Progress: which HiLL checkpoints have been completed
oat_parallel_execution: false
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
oat_phase_recovery_policy:
  phase_attempt_usage:
    p13:
      used_attempts: 1
      pending_attempt: null
    p01:
      used_attempts: 1
      pending_attempt: null
    p02:
      used_attempts: 3
      pending_attempt: null
    p04:
      used_attempts: 1
      pending_attempt: null
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
oat_workflow_mode: goal # spec-driven | quick | import | lite | brief | goal
oat_workflow_origin: native # native | imported
oat_milestone: m04
oat_milestone_status: delivering
oat_goal_status: active
oat_goal_outcome_audit: null
oat_goal_recovery: null
oat_milestone_gates:
  m01:
    plan:
      status: allowed
      disposition: project_disabled
      resolution: project_disabled
      config_fingerprint: null
      reviewed_head: null
      subject:
        kind: plan
        scope: [p01, p02, p03, p04]
        ref: 4c6881ac5e2c5a431f6e7d479cf0122ab750e8b7
      decided_at: '2026-11-21T19:50:59Z'
    exit:
      status: allowed
      disposition: project_disabled
      resolution: project_disabled
      config_fingerprint: null
      reviewed_head: null
      subject:
        kind: code
        scope: [p01, p02, p03, p04]
      freshness: fresh
      freshness_reason: null
      decided_at: '2026-11-22T16:02:01Z'
  m02:
    plan:
      status: allowed
      disposition: project_disabled
      resolution: project_disabled
      config_fingerprint: null
      reviewed_head: null
      subject:
        kind: plan
        scope: [p05, p07, p10, p08]
        ref: 1874426187e7ef1e9e6a4613ff10ff72bf4426da
      decided_at: '2026-11-23T00:54:44Z'
    exit:
      status: allowed
      disposition: project_disabled
      resolution: project_disabled
      config_fingerprint: null
      reviewed_head: null
      subject:
        kind: code
        scope: [p05, p07, p10, p08]
      freshness: fresh
      freshness_reason: null
      decided_at: '2026-11-23T06:39:38Z'
  m03:
    plan:
      status: allowed
      disposition: project_disabled
      resolution: project_disabled
      config_fingerprint: null
      reviewed_head: null
      subject:
        kind: plan
        scope: [p11, p12]
        ref: 74f6ac43ca7471de628de9a4f2f200c397f006a9
      decided_at: '2026-11-23T17:18:30Z'
    exit:
      status: allowed
      disposition: project_disabled
      resolution: project_disabled
      config_fingerprint: null
      reviewed_head: null
      subject:
        kind: code
        scope: [p11, p12]
      freshness: fresh
      freshness_reason: null
      decided_at: '2026-11-23T18:56:47Z'
  m04:
    plan:
      status: allowed
      disposition: project_disabled
      resolution: project_disabled
      config_fingerprint: null
      reviewed_head: null
      subject:
        kind: plan
        scope: [p13, p14, p15]
        ref: a700322d86dd30c96e145f073b576f3ba13da6da
      decided_at: '2026-11-24T17:14:24Z'
    exit:
      status: allowed
      disposition: project_disabled
      resolution: project_disabled
      config_fingerprint: null
      reviewed_head: null
      subject:
        kind: code
        scope: [p13, p14, p15, p-rev1, p-rev2]
      freshness: fresh
      freshness_reason: null
      decided_at: '2026-11-24T21:30:07Z'
oat_deliveries:
  - delivery_id: d01
    milestone: m01
    scope: [p01, p02, p03, p04]
    endpoint: merged
    kind: pr
    status: at_endpoint
    superseded_by: null
    corrects_delivery_id: null
    covers_scope_of: null
    lookup:
      repository: voxmedia/open-agent-toolkit
      head_branch: feat/freestyle-projects
      head_sha_at_registration: '80ac675110e82069dd9f222743d8e7d414468ca8'
    members:
      - url: https://github.com/voxmedia/open-agent-toolkit/pull/429
        base: '78b88baba57847a417cbba1f8294e82ffa3d34c6'
        reviewed_head: '32919c56a87403c526f8d7251b791d8210f192c7'
        observed_head: cbb0dfe4a2bc1eab5a43cf7c1b2ae0f5249e1584
        observed_base: 78b88baba57847a417cbba1f8294e82ffa3d34c6
        status: merged
    integrated_review:
      artifact: reviews/archived/m01-integrated-review-2026-11-22T174038Z.md
      scope: [p01, p02, p03, p04]
      bound_revisions:
        [
          {
            member: 0,
            base: '78b88baba57847a417cbba1f8294e82ffa3d34c6',
            head: '32919c56a87403c526f8d7251b791d8210f192c7',
          },
        ]
      disposition: passed
    exit_gate:
      status: allowed
      disposition: project_disabled
      resolution: project_disabled
      config_fingerprint: null
      reviewed_head: null
      subject: { kind: code, scope: [p01, p02, p03, p04] }
      freshness: fresh
      freshness_reason: null
      decided_at: '2026-11-22T16:02:01Z'
    endpoint_attainment:
      observed_at: 2026-11-22T18:35:20.274Z
      members:
        - url: https://github.com/voxmedia/open-agent-toolkit/pull/429
          head: cbb0dfe4a2bc1eab5a43cf7c1b2ae0f5249e1584
          base: 78b88baba57847a417cbba1f8294e82ffa3d34c6
          status: merged
    freshness_waivers:
      - waived_by: Thomas Stang
        reason: 'Operator (2026-11-22): fine waiving another review for straightforward fixes. Head moved by test-only PR #429 self-review fixes (ffaefa31b: T-1..T-4) plus OAT bookkeeping; no product code changed.'
        waived_at: 2026-11-22T18:07:56.650Z
        members:
          - url: https://github.com/voxmedia/open-agent-toolkit/pull/429
            waived_head: aeaa9b46977d8003cfe5fb05f70a2e05bcb12be2
      - waived_by: Thomas Stang
        reason: 'Head moved only through the PR #429 Bugbot fix (ca5f8c338, oat-project-revise reads the mode before writing the pointer) and a test-only CI fix (16f859911); both are straightforward and verified, and the operator waived re-review for straightforward fixes.'
        waived_at: 2026-11-22T18:26:10.002Z
        members:
          - url: https://github.com/voxmedia/open-agent-toolkit/pull/429
            waived_head: e711fdade8db9045cf486d9f24a48a250e853386
  - delivery_id: d02
    milestone: m02
    scope: [p05, p07, p10, p08]
    endpoint: merged
    kind: pr
    status: at_endpoint
    superseded_by: null
    corrects_delivery_id: null
    covers_scope_of: null
    lookup:
      repository: voxmedia/open-agent-toolkit
      head_branch: feat/freestyle-projects-m02
      head_sha_at_registration: '337d3e069dd5bc60e3ed3a0db67572851f774b45'
    members:
      - url: https://github.com/voxmedia/open-agent-toolkit/pull/430
        base: '699f8ee43e4e1e8ba7f315e9d2d2cc451e097222'
        reviewed_head: '9ffa307eb6bbb42f5661c90bf529f2a56b231dba'
        observed_head: 25a9114109e9c05b0bf916b2f60f27910ad29505
        observed_base: 699f8ee43e4e1e8ba7f315e9d2d2cc451e097222
        status: merged
    integrated_review:
      artifact: reviews/archived/m02-integrated-review-2026-11-23T063938Z.md
      scope: [p05, p07, p10, p08]
      bound_revisions:
        [
          {
            member: 0,
            base: '699f8ee43e4e1e8ba7f315e9d2d2cc451e097222',
            head: '9ffa307eb6bbb42f5661c90bf529f2a56b231dba',
          },
        ]
      disposition: passed
    exit_gate:
      status: allowed
      disposition: project_disabled
      resolution: project_disabled
      config_fingerprint: null
      reviewed_head: null
      subject: { kind: code, scope: [p05, p07, p10, p08] }
      freshness: fresh
      freshness_reason: null
      decided_at: '2026-11-23T06:39:38Z'
    endpoint_attainment:
      observed_at: 2026-11-23T07:27:14.444Z
      members:
        - url: https://github.com/voxmedia/open-agent-toolkit/pull/430
          head: 25a9114109e9c05b0bf916b2f60f27910ad29505
          base: 699f8ee43e4e1e8ba7f315e9d2d2cc451e097222
          status: merged
  - delivery_id: d03
    milestone: m03
    scope: [p11, p12]
    endpoint: merged
    kind: pr
    status: at_endpoint
    superseded_by: null
    corrects_delivery_id: null
    covers_scope_of: null
    lookup:
      repository: voxmedia/open-agent-toolkit
      head_branch: feat/freestyle-projects-m03
      head_sha_at_registration: '69c5266d729f783dbace4ee8d6090371d9459366'
    members:
      - url: https://github.com/voxmedia/open-agent-toolkit/pull/431
        base: '4dc1b86870fb95391b7a596f42fb3176f17ce6f0'
        reviewed_head: '22212dabbee17dba426eaf4794c4d4e7c5d81566'
        observed_head: 80e9a4c0d0c7bd2cf32fbbdbf019eabf9805838a
        observed_base: 4dc1b86870fb95391b7a596f42fb3176f17ce6f0
        status: merged
    integrated_review:
      artifact: reviews/archived/m03-integrated-review-2026-11-23T185647Z.md
      scope: [p11, p12]
      bound_revisions:
        [
          {
            member: 0,
            base: '4dc1b86870fb95391b7a596f42fb3176f17ce6f0',
            head: '22212dabbee17dba426eaf4794c4d4e7c5d81566',
          },
        ]
      disposition: passed
    exit_gate:
      status: allowed
      disposition: project_disabled
      resolution: project_disabled
      config_fingerprint: null
      reviewed_head: null
      subject: { kind: code, scope: [p11, p12] }
      freshness: fresh
      freshness_reason: null
      decided_at: '2026-11-23T18:56:47Z'
    endpoint_attainment:
      observed_at: 2026-11-23T19:42:48.110Z
      members:
        - url: https://github.com/voxmedia/open-agent-toolkit/pull/431
          head: 80e9a4c0d0c7bd2cf32fbbdbf019eabf9805838a
          base: 4dc1b86870fb95391b7a596f42fb3176f17ce6f0
          status: merged
  - delivery_id: d04
    milestone: m04
    scope: [p13, p14, p15, p-rev1, p-rev2]
    endpoint: merged
    kind: pr
    status: registering
    lookup:
      repository: voxmedia/open-agent-toolkit
      head_branch: feat/freestyle-projects-m04
      head_sha_at_registration: 'da6e73b4e7d62c00d575f3497d25a383b8660045'
    members: []
    integrated_review:
      artifact: reviews/archived/m04-integrated-review-2026-11-24T213227Z.md
      scope: [p13, p14, p15, p-rev1, p-rev2]
      bound_revisions:
        - member: 0
          base: '5fca44a5c784c4eb221fc1c7f70bf6f5e95b3f6f'
          head: '243acef2aae94895e4a6815ee26bf724a8b7c7ea'
      disposition: passed
    exit_gate:
      status: allowed
      disposition: project_disabled
      resolution: project_disabled
      config_fingerprint: null
      reviewed_head: null
      subject:
        kind: code
        scope: [p13, p14, p15, p-rev1, p-rev2]
      freshness: fresh
      freshness_reason: null
      decided_at: '2026-11-24T21:30:07Z'
oat_dispatch_policy:
  mode: managed
  policy: high
  providers:
    codex: xhigh
    claude: opus
  source: project-state
oat_skill_gate_overrides:
  oat-project-goal: disabled
  oat-project-implement: disabled
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
#   implementation_base_ref: null # exact logical base ref for the qualified effective-delta fingerprint
#   implementation_fingerprint: null # new generations use sha256:effective-delta-v2:<digest>; stored v1 values keep v1 semantics
#   freshness_head: null # rolling accepted tree checkpoint
#   freshness_fingerprint: null # full effective delta at freshness_head
#   waivers: [] # append-only operator waivers {waived_by, reason, from_commit, to_commit, covered_fingerprint, waived_at}; never self-issued, never under OAT_AUTONOMOUS=1
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
#   decided_at: null # ISO 8601 UTC; set with every allowed or blocked outcome (core record: gate-approval-record.md)
# oat_quick_start_gate: # optional; persisted quick-start plan gate outcome, absent when no gate is configured (core record: gate-approval-record.md)
#   status: allowed # allowed | blocked
#   disposition: passed # passed | warned | prompt_approved | project_disabled; null when blocked
#   config_fingerprint: '<stable hash of resolved gate declaration>'
#   reviewed_head: null # full SHA of the commit the gate reviewed; provenance only
#   decided_at: null # ISO 8601 UTC
# oat_brief_gate: # optional; persisted brief artifact gate outcome, absent when no gate is configured; provenance only, read back by no route (core record: gate-approval-record.md)
#   status: allowed # allowed | blocked
#   disposition: passed # passed | warned | prompt_approved | project_disabled; null when blocked
#   config_fingerprint: '<stable hash of resolved gate declaration>'
#   reviewed_head: null # full SHA of the commit the gate reviewed; provenance only
#   decided_at: null # ISO 8601 UTC
oat_docs_updated: null # null | skipped | complete — documentation sync status
oat_pr_status: merged # null | ready | open | closed | merged — actual PR state for the current project
oat_pr_url: https://github.com/voxmedia/open-agent-toolkit/pull/431 # null | string — tracked PR URL when a PR exists
oat_project_created: '2026-11-21T00:32:07.467Z' # ISO 8601 UTC timestamp — set once at project creation
oat_project_completed: null # ISO 8601 UTC timestamp — set when project is completed/archived
oat_project_state_updated: '2026-11-24T21:33:48Z'
oat_generated: false
---

# Project State: freestyle-projects

**Status:** Plan
**Started:** 2026-11-21
**Last Updated:** 2026-11-21

## Current Phase

Plan - Authoring the goal Project Brief and its milestones

## Artifacts

- **Plan:** `plan.md` (scaffolded goal Project Brief template — not started)
- **Implementation:** `implementation.md` (scaffolded brief journal template — not started)
- **Research:** `references/research/` (empty)

## Progress

- ✓ Goal project scaffolded
- ✓ Brief and implementation artifacts scaffolded
- ⧗ Awaiting goal interview, milestones and brief authoring

## Blockers

None

## Next Milestone

Run `oat-project-goal` to author the brief and its milestones and approve the first milestone
