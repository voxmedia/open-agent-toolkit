---
oat_status: in_progress
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-10-02
oat_current_task_id: p02-t02
oat_generated: false
---

# Implementation: docs-improvement-overhaul

The user invoked oat-project-implement after the reviewed plan handoff. Implementation is authorized. Root owns lifecycle bookkeeping and independent reviews; each phase implementer owns its bounded task commits.

## Progress Overview

| Phase   | Status      | Tasks | Completed |
| ------- | ----------- | ----- | --------- |
| Phase 1 | complete    | 3     | 3/3       |
| Phase 2 | in_progress | 3     | 1/3       |
| Phase 3 | pending     | 2     | 0/2       |
| Phase 4 | pending     | 4     | 0/4       |
| Phase 5 | pending     | 3     | 0/3       |
| Phase 6 | pending     | 5     | 0/5       |

**Total:** 4/20 tasks completed.

## Phase 1: Make the Current Sidebar Enforceable

**Status:** complete; source, ordered gates, native terminal review and Fable fixed-diff advisory accepted
**Started:** 2026-10-02

### Task p01-t01: Compile safe Fumadocs metadata

**Status:** completed
**Commit:** a0f2e8785f56ccf0024397286c86bafa8f3736e9
**Verification:** Format, scoped oxlint, CLI type-check/build and diff check exit 0. Declared nav tests: 24 executed, exit 0. Combined help/nav: 84 executed, exit 0. Ownership-guard neutralization made the authored-metadata protection test fail (exit 1); restored valid generation, drift and refusal controls pass. Root verified immutable commit bounds and actual test logs; no recovery used. Mechanical help-snapshot update is the only derived addition to the declared nav boundary.

### Task p01-t02: Integrate the real loader and first build

**Status:** completed
**Commit:** b371e1da4b7b66cde6fa949275ea395b196dfb60
**Verification:** Focused 39 CLI/4 app tests, source checks, app/CLI type checks, pristine app checks/direct tests, cache perturbation and installed external-consumer first build passed. Final main-worktree build initially failed on formatter-modified metadata; preserved restoration and forced committed-head build then passed, exit 0, all six tasks executed with zero cached. Root verified logs and immutable task bounds. Cache graph/hash probes prove both nav compiler and pack-manifest changes invalidate app tasks through the existing CLI workspace edge; turbo.json unchanged.

### Task p01-t03: Align authoring instructions and verify foundation

**Status:** completed
**Commit:** 52190849b5dfbb023e8c0dc93cb10e27d62ad3b4
**Verification:** Four changed skill versions bumped once; public 0.3.13 manifest/index regenerated. Source checks, app types, four actual app tests, 660 actual skill tests, canonical skill validation, lint/format/output check and forced six-task docs build passed. Actual native Mini Zen smoke retained at reviews/p01-browser-smoke.md with five cropped screenshots; 70-page/848-link crawl has zero broken links; home200/missing404. Proof is bounded implementer desktop/dark smoke on parent4973e8c37 plus task working tree, not independent final QA. Original task commit and post-commit checks verified; root eight-gate closure remains pending.

## Phase 2: Migrate Information Without Rewriting It

**Status:** in_progress; reviewed t01 complete, preservation-only move authorized
**Started:** 2026-10-02

### Task p02-t01: Review the complete migration map

**Status:** completed
**Commit:** e790323680d35085f7b724862bb507c36e163d46
**Verification:** Actual Fable conditional approval fulfilled, three native conservation rounds and two intrinsic analysis rounds complete. Round03's stale count corrected without changing map data; original Low analysis wording retained/disclosed. Direct controls, app check/types, nine executed tests, formatting/lint/diff check exit0 before/after commit; hook changes zero bytes across14 bounded files. Source docs and analysis unchanged. Canonical analysis tracking exit0; t01-completion-proof.json preserves exact count/status-only correction and immutable prior receipts. Pristine/no-project CI evidence remains separate. No pages moved or phase acceptance claimed.

### Task p02-t02: Apply the preservation-only move

**Status:** in_progress
**Commit:** -
**Verification:** Not run.

### Task p02-t03: Repair consumers and verify migrated journeys

**Status:** pending
**Commit:** -
**Verification:** Not run.

## Phase 3: Improve the Evaluator README

**Status:** pending
**Started:** Not started

### Task p03-t01: Write a concise adoption story and original visual

**Status:** pending
**Commit:** -
**Verification:** Not run.

### Task p03-t02: Review actual README consumption

**Status:** pending
**Commit:** -
**Verification:** Not run.

## Phase 4: Build Complete Supported-Skill Discovery

**Status:** pending
**Started:** Not started

### Task p04-t01: Define and review the guide mapping

**Status:** pending
**Commit:** -
**Verification:** Not run.

### Task p04-t02: Independently audit every applicability claim

**Status:** pending
**Commit:** -
**Verification:** Not run.

### Task p04-t03: Author minimum useful family coverage

**Status:** pending
**Commit:** -
**Verification:** Not run.

### Task p04-t04: Generate and enforce the committed catalog

**Status:** pending
**Commit:** -
**Verification:** Not run.

## Phase 5: Fill Named Gaps and Accept the Rendered Site

**Status:** pending
**Started:** Not started

### Task p05-t01: Deepen the named thin and missing guides

**Status:** pending
**Commit:** -
**Verification:** Not run.

### Task p05-t02: Add four purposeful docs visual treatments

**Status:** pending
**Commit:** -
**Verification:** Not run.

### Task p05-t03: Verify phase visuals and release readiness

**Status:** pending
**Commit:** -
**Verification:** Not run.

## Phase 6: Evaluate and Improve the Whole Reader Experience

**Status:** pending amendment review
**Started:** Not started

### Task p06-t01: Reconcile whole-site coverage and capabilities

**Status:** pending
**Commit:** -
**Verification:** Not run.

### Task p06-t02: Run two fresh reader-persona reviews

**Status:** pending
**Commit:** -
**Verification:** Not run.

### Task p06-t03: Converge on a bounded editorial list

**Status:** pending
**Commit:** -
**Verification:** Not run.

### Task p06-t04: Apply evidence-backed editorial improvements

**Status:** pending
**Commit:** -
**Verification:** Not run.

### Task p06-t05: Re-evaluate readers and execute independent final acceptance

**Status:** pending
**Commit:** -
**Verification:** Not run.

## Orchestration Runs

<!-- orchestration-runs-start -->

### Run 1: six-phase implementation (amended during p01)

Authorization: user invoked oat-project-implement; prior autonomy and High dispatch retained. IMPLEMENT-08 covers phase implementers/reviewers. IMPLEMENT-03 initially selected p05 as absent first-run final checkpoint; the user-directed phase 6 amendment shifts that final checkpoint to p06, with IMPLEMENT-04 auto-review unchanged. Fable relayed explicit consensus triage/no user wait; removal/narrowing still needs explicit user approval. No autonomy environment signal persisted. Optional extra gates absent; configured lifecycle gates enabled. Tier1 exact native phase roles, fresh context. Host tstang-mini.local; shared OAT worktree /Users/tstang/orca/workspaces/open-agent-toolkit/amphipod, branch amphipod. Six phases sequential; separately authorized Orc guidance helper has its own Mini Orca-managed worktree, never writes this one.

Phase recovery limit: default 10, no prior usage or pending attempt. Phase implementers may execute narrowly authorized recovery without changing target. No nested workers are required by default. Required computer-use proof must be performed before its task is committed.

Phase outcomes: p01 implementation complete, gates/review pending; p02-p06 pending. Phase 6 amendment review pending before its execution; baseline capture is moved forward into p02-t01.

<!-- orchestration-runs-end -->

### p01 implementation dispatch

Generic dispatch record (launcher-owned; runtime identity not reported):

```json
{
  "request_id": "docs-overhaul-run1-p01-implementation",
  "caller": "oat-project-implement",
  "scope": "p01",
  "objective": "Execute p01 three tasks, safe Fumadocs nav compiler, real consumer integration and authoring guidance",
  "action": "implementation",
  "role_name": "oat-phase-implementer",
  "role_class": "worker",
  "provider": "codex",
  "dispatch_context": "root-native",
  "dispatch_policy": "high",
  "dispatch_ceiling": "high",
  "catalog_snapshot": {
    "id": "root-native-20261002",
    "source": "agents.spawn_agent tool schema",
    "observed_at": "2026-10-02"
  },
  "authority": "write p01 declared files; commit planned tasks; no publication/merge",
  "role_selector": "oat-phase-implementer-gpt-6-1-sol-high",
  "model_selector": "gpt-6.1-sol",
  "model_selector_granularity": "materialized-native-role",
  "effort_selector": "high",
  "reasoning_mode_selector": null,
  "service_tier_selector": null,
  "guidance_reference": ".agents/skills/subagent-orchestration/references/provider-codex.md",
  "guidance_version": "2026-10-01",
  "guidance_verified_at": "2026-10-01",
  "guidance_status": "fresh",
  "selection_source": "policy-resolved",
  "candidates_considered": ["gpt-6.1-sol/high"],
  "selection_reason": "native-catalog",
  "selected_route": "native",
  "task_class": "hard-reasoning",
  "model_class_floor": "hard-reasoning",
  "classification_source": "caller",
  "classification_reason": "Compiler ownership/write protection and Fumadocs loader semantics require architectural reasoning",
  "floor_satisfaction": "satisfied",
  "deadline_seconds": 14400,
  "retry_limit": 2,
  "launch_status": "accepted",
  "child_outcome": "completed",
  "runtime_confirmation": "not-reported",
  "diagnostics": [],
  "continuation_events": [
    {
      "event_id": "cont-docs-overhaul-p01-fix-1",
      "original_request_id": "docs-overhaul-run1-p01-implementation",
      "action": "fix",
      "round": 1,
      "agent_handle": "/root/phase01",
      "target": "oat-phase-implementer-gpt-6-1-sol-high",
      "launch_status": "accepted",
      "base_head": "d054882593181f5a3e727db7ac281607ec707825",
      "artifact": "reviews/p01-code-review-2026-10-02T045526Z.md",
      "authority": "root accepted H1/M1-M3/L1 and Fable P1/P2/P4; exact-byte ownership design amendment committed",
      "child_outcome": "completed",
      "dispatch_stamp": "Dispatch: scope=p01 action=fix role=fix producer=unknown provenance=unknown model_axis=selected:gpt-6.1-sol effort_axis=selected:high dispatch_policy=high dispatch_ceiling=high target=oat-phase-implementer-gpt-6-1-sol-high",
      "head_sha": "686b2663fd8eaf51b7e736cdc01d71df187d930b"
    },
    {
      "event_id": "cont-docs-overhaul-p01-fix-2",
      "original_request_id": "docs-overhaul-run1-p01-implementation",
      "action": "fix",
      "round": 2,
      "agent_handle": "/root/phase01",
      "target": "oat-phase-implementer-gpt-6-1-sol-high",
      "launch_status": "accepted",
      "base_head": "68a7a043b187f6cfab94308b185a2e34b75ccb23",
      "artifact": "reviews/p01-code-review-round02-2026-10-02T055341Z.md",
      "authority": "root accepted only compact and bare separator variants of L1; two nav files",
      "child_outcome": "completed",
      "head_sha": "727c40abb5be32885d37d28b21887ac7c986ea42"
    }
  ],
  "payload": {
    "task_name": "phase01",
    "agent_type": "oat-phase-implementer-gpt-6-1-sol-high",
    "fork_turns": "none",
    "scope": "p01 phase packet in accepted native launch"
  },
  "configured_invocation_evidence": [
    {
      "source": "native launcher payload and spawn acceptance",
      "agent_handle": "/root/phase01",
      "role": "oat-phase-implementer-gpt-6-1-sol-high",
      "model": "gpt-6.1-sol",
      "effort": "high"
    }
  ]
}
```

Dispatch stamp: Dispatch: scope=p01 action=implementation role=implementer producer=unknown provenance=unknown model_axis=selected:gpt-6.1-sol effort_axis=selected:high dispatch_policy=high dispatch_ceiling=high target=oat-phase-implementer-gpt-6-1-sol-high

Acceptance: /root/phase01 (Ptolemy); holding before work until root supplies clean committed base. No project log append while child owns worktree.

Phase implementation return: DONE_WITH_CONCERNS, three planned task commits in order, final source head52190849b5dfbb023e8c0dc93cb10e27d62ad3b4, original request/target/stamp unchanged, zero recovery attempts and no nested agents. The source-free output stop was resolved by root and remains disclosed. Full CI closure and independent review are not claimed passed. Same handle is retained for bounded findings.

### p01 review dispatch

```json
{
  "request_id": "docs-overhaul-run1-p01-review01",
  "caller": "oat-project-implement",
  "scope": "p01",
  "objective": "Independent review of p01 source and current task ledger",
  "action": "review",
  "role_name": "oat-reviewer",
  "role_class": "reviewer",
  "provider": "codex",
  "dispatch_context": "root-native",
  "dispatch_policy": "high",
  "dispatch_ceiling": "high",
  "catalog_snapshot": {
    "id": "root-native-20261002",
    "source": "agents.spawn_agent live schema",
    "observed_at": "2026-10-02"
  },
  "authority": "Read reviewed source/artifacts; write only named review artifact; no source edits/publication/UI/nested agents",
  "role_selector": "oat-reviewer-gpt-6-1-sol-high",
  "model_selector": "gpt-6.1-sol",
  "model_selector_granularity": "materialized-native-role",
  "effort_selector": "high",
  "reasoning_mode_selector": null,
  "service_tier_selector": null,
  "guidance_reference": ".agents/skills/subagent-orchestration/references/provider-codex.md",
  "guidance_version": "2026-10-01",
  "guidance_verified_at": "2026-10-01",
  "guidance_status": "fresh",
  "selection_source": "policy-resolved",
  "candidates_considered": ["gpt-6.1-sol/high"],
  "selection_reason": "configured-review-ceiling",
  "selected_route": "native",
  "task_class": "consequential",
  "model_class_floor": "consequential",
  "classification_source": "caller",
  "classification_reason": "Independent assurance of shipped source or expanded conservation/reader-evidence contracts",
  "floor_satisfaction": "satisfied",
  "deadline_seconds": 3600,
  "retry_limit": 2,
  "launch_status": "accepted",
  "child_outcome": "completed",
  "runtime_confirmation": "not-reported",
  "diagnostics": [],
  "continuation_events": [],
  "payload": {
    "task_name": "phase01_review",
    "agent_type": "oat-reviewer-gpt-6-1-sol-high",
    "fork_turns": "none",
    "reviewed_head": "6145054067bef937d74cf7e952a0c56da67f4264",
    "scope": "p01",
    "output": "reviews/p01-code-review-<UTC>.md",
    "message_evidence": "Full Review Scope in accepted native tool invocation"
  },
  "configured_invocation_evidence": [
    {
      "source": "native payload and acceptance",
      "agent_handle": "/root/phase01_review",
      "role": "oat-reviewer-gpt-6-1-sol-high",
      "model": "gpt-6.1-sol",
      "effort": "high"
    }
  ],
  "dispatch_stamp": "Dispatch: scope=p01 action=review role=reviewer producer=unknown provenance=unknown model_axis=selected:gpt-6.1-sol effort_axis=selected:high dispatch_policy=high dispatch_ceiling=high target=oat-reviewer-gpt-6-1-sol-high"
}
```

### p01 review round 2 dispatch

```json
{
  "request_id": "docs-overhaul-run1-p01-review02",
  "caller": "oat-project-implement",
  "scope": "p01",
  "objective": "Independent p01 bounded-fix re-review with real consumer and raw-byte refusal controls",
  "action": "review",
  "role_name": "oat-reviewer",
  "role_class": "reviewer",
  "provider": "codex",
  "dispatch_context": "root-native",
  "dispatch_policy": "high",
  "dispatch_ceiling": "high",
  "catalog_snapshot": {
    "id": "root-native-20261002",
    "source": "agents.spawn_agent live schema",
    "observed_at": "2026-10-02"
  },
  "authority": "Read reviewed source/artifacts; write only named review artifact; no source edits/publication/UI/nested agents",
  "role_selector": "oat-reviewer-gpt-6-1-sol-high",
  "model_selector": "gpt-6.1-sol",
  "model_selector_granularity": "materialized-native-role",
  "effort_selector": "high",
  "reasoning_mode_selector": null,
  "service_tier_selector": null,
  "guidance_reference": ".agents/skills/subagent-orchestration/references/provider-codex.md",
  "guidance_version": "2026-10-01",
  "guidance_verified_at": "2026-10-01",
  "guidance_status": "fresh",
  "selection_source": "policy-resolved",
  "candidates_considered": ["gpt-6.1-sol/high"],
  "selection_reason": "configured-review-ceiling",
  "selected_route": "native",
  "task_class": "consequential",
  "model_class_floor": "consequential",
  "classification_source": "caller",
  "classification_reason": "Independent assurance of shipped source or expanded conservation/reader-evidence contracts",
  "floor_satisfaction": "satisfied",
  "deadline_seconds": 3600,
  "retry_limit": 2,
  "launch_status": "accepted",
  "child_outcome": "completed",
  "runtime_confirmation": "not-reported",
  "diagnostics": [],
  "continuation_events": [],
  "payload": {
    "task_name": "phase01_review02",
    "agent_type": "oat-reviewer-gpt-6-1-sol-high",
    "fork_turns": "none",
    "reviewed_head": "ee1675e6be034f64a644d7fdc04aee3862cf4436",
    "scope": "p01",
    "output": "reviews/p01-code-review-round02-<UTC>.md",
    "message_evidence": "Bounded review scope in accepted native invocation"
  },
  "configured_invocation_evidence": [
    {
      "source": "native payload and acceptance",
      "agent_handle": "/root/phase01_review02",
      "role": "oat-reviewer-gpt-6-1-sol-high",
      "model": "gpt-6.1-sol",
      "effort": "high"
    }
  ],
  "dispatch_stamp": "Dispatch: scope=p01 action=review role=reviewer producer=unknown provenance=unknown model_axis=selected:gpt-6.1-sol effort_axis=selected:high dispatch_policy=high dispatch_ceiling=high target=oat-reviewer-gpt-6-1-sol-high"
}
```

### p01 terminal review dispatch

```json
{
  "request_id": "docs-overhaul-run1-p01-review03",
  "caller": "oat-project-implement",
  "scope": "p01",
  "objective": "Terminal bounded p01 separator-diagnostic review and prior-fix regression assurance",
  "action": "review",
  "role_name": "oat-reviewer",
  "role_class": "reviewer",
  "provider": "codex",
  "dispatch_context": "root-native",
  "dispatch_policy": "high",
  "dispatch_ceiling": "high",
  "catalog_snapshot": {
    "id": "root-native-20261002",
    "source": "agents.spawn_agent live schema",
    "observed_at": "2026-10-02"
  },
  "authority": "Read reviewed source/artifacts; write only named review artifact; no source edits/publication/UI/nested agents",
  "role_selector": "oat-reviewer-gpt-6-1-sol-high",
  "model_selector": "gpt-6.1-sol",
  "model_selector_granularity": "materialized-native-role",
  "effort_selector": "high",
  "reasoning_mode_selector": null,
  "service_tier_selector": null,
  "guidance_reference": ".agents/skills/subagent-orchestration/references/provider-codex.md",
  "guidance_version": "2026-10-01",
  "guidance_verified_at": "2026-10-01",
  "guidance_status": "fresh",
  "selection_source": "policy-resolved",
  "candidates_considered": ["gpt-6.1-sol/high"],
  "selection_reason": "configured-review-ceiling",
  "selected_route": "native",
  "task_class": "consequential",
  "model_class_floor": "consequential",
  "classification_source": "caller",
  "classification_reason": "Independent assurance of shipped source or expanded conservation/reader-evidence contracts",
  "floor_satisfaction": "satisfied",
  "deadline_seconds": 3600,
  "retry_limit": 2,
  "launch_status": "accepted",
  "child_outcome": "completed",
  "runtime_confirmation": "not-reported",
  "diagnostics": [],
  "continuation_events": [],
  "payload": {
    "task_name": "phase01_review03",
    "agent_type": "oat-reviewer-gpt-6-1-sol-high",
    "fork_turns": "none",
    "reviewed_head": "24d1bddfbf1ea4467125c2b8ca88c65ce57fc06a",
    "scope": "p01",
    "output": "reviews/p01-code-review-round03-<UTC>.md",
    "message_evidence": "Bounded review scope in accepted native invocation"
  },
  "configured_invocation_evidence": [
    {
      "source": "native payload and acceptance",
      "agent_handle": "/root/phase01_review03",
      "role": "oat-reviewer-gpt-6-1-sol-high",
      "model": "gpt-6.1-sol",
      "effort": "high"
    }
  ],
  "dispatch_stamp": "Dispatch: scope=p01 action=review role=reviewer producer=unknown provenance=unknown model_axis=selected:gpt-6.1-sol effort_axis=selected:high dispatch_policy=high dispatch_ceiling=high target=oat-reviewer-gpt-6-1-sol-high"
}
```

### plan-amendment review dispatch

```json
{
  "request_id": "docs-overhaul-phase06-amendment-review01",
  "caller": "oat-project-implement",
  "scope": "plan-amendment",
  "objective": "Review whole-site conservation, persona, scenario and configuration scope amendment",
  "action": "review",
  "role_name": "oat-reviewer",
  "role_class": "reviewer",
  "provider": "codex",
  "dispatch_context": "root-native",
  "dispatch_policy": "high",
  "dispatch_ceiling": "high",
  "catalog_snapshot": {
    "id": "root-native-20261002",
    "source": "agents.spawn_agent live schema",
    "observed_at": "2026-10-02"
  },
  "authority": "Read reviewed source/artifacts; write only named review artifact; no source edits/publication/UI/nested agents",
  "role_selector": "oat-reviewer-gpt-6-1-sol-high",
  "model_selector": "gpt-6.1-sol",
  "model_selector_granularity": "materialized-native-role",
  "effort_selector": "high",
  "reasoning_mode_selector": null,
  "service_tier_selector": null,
  "guidance_reference": ".agents/skills/subagent-orchestration/references/provider-codex.md",
  "guidance_version": "2026-10-01",
  "guidance_verified_at": "2026-10-01",
  "guidance_status": "fresh",
  "selection_source": "policy-resolved",
  "candidates_considered": ["gpt-6.1-sol/high"],
  "selection_reason": "configured-review-ceiling",
  "selected_route": "native",
  "task_class": "consequential",
  "model_class_floor": "consequential",
  "classification_source": "caller",
  "classification_reason": "Independent assurance of shipped source or expanded conservation/reader-evidence contracts",
  "floor_satisfaction": "satisfied",
  "deadline_seconds": 3600,
  "retry_limit": 2,
  "launch_status": "accepted",
  "child_outcome": "completed: 0 critical, 0 high, 1 medium, 1 low",
  "runtime_confirmation": "not-reported",
  "diagnostics": [],
  "continuation_events": [],
  "payload": {
    "task_name": "phase06_amendment_review",
    "agent_type": "oat-reviewer-gpt-6-1-sol-high",
    "fork_turns": "none",
    "reviewed_head": "6145054067bef937d74cf7e952a0c56da67f4264",
    "scope": "plan-amendment",
    "output": "reviews/phase06-plan-amendment-2026-10-02T045216Z.md",
    "message_evidence": "Full Review Scope in accepted native tool invocation"
  },
  "configured_invocation_evidence": [
    {
      "source": "native payload and acceptance",
      "agent_handle": "/root/phase06_amendment_review",
      "role": "oat-reviewer-gpt-6-1-sol-high",
      "model": "gpt-6.1-sol",
      "effort": "high"
    }
  ],
  "dispatch_stamp": "Dispatch: scope=plan-amendment action=review role=reviewer producer=unknown provenance=unknown model_axis=selected:gpt-6.1-sol effort_axis=selected:high dispatch_policy=high dispatch_ceiling=high target=oat-reviewer-gpt-6-1-sol-high"
}
```

### p02 implementation dispatch

```json
{
  "request_id": "docs-overhaul-run1-p02-implementation",
  "caller": "oat-project-implement",
  "scope": "p02",
  "objective": "Preservation-only IA migration with mechanical conservation baseline and live-consumer repair",
  "action": "implementation",
  "role_name": "oat-phase-implementer",
  "role_class": "worker",
  "provider": "codex",
  "dispatch_context": "root-native",
  "dispatch_policy": "high",
  "dispatch_ceiling": "high",
  "catalog_snapshot": {
    "id": "root-native-20261002",
    "source": "agents.spawn_agent tool schema",
    "observed_at": "2026-10-02"
  },
  "authority": "p02 declared files and mechanical route consumers; no core writes/publication; t01 review handoff before moves",
  "role_selector": "oat-phase-implementer-gpt-6-1-sol-high",
  "model_selector": "gpt-6.1-sol",
  "model_selector_granularity": "materialized-native-role",
  "effort_selector": "high",
  "reasoning_mode_selector": null,
  "service_tier_selector": null,
  "guidance_reference": ".agents/skills/subagent-orchestration/references/provider-codex.md",
  "guidance_version": "2026-10-01",
  "guidance_verified_at": "2026-10-01",
  "guidance_status": "fresh",
  "selection_source": "policy-resolved",
  "candidates_considered": ["gpt-6.1-sol/high"],
  "selection_reason": "native-catalog",
  "selected_route": "native",
  "task_class": "hard-reasoning",
  "model_class_floor": "hard-reasoning",
  "classification_source": "caller",
  "classification_reason": "Cross-surface source-route migration and conservation need explicit ownership and independent normalization review",
  "floor_satisfaction": "satisfied",
  "deadline_seconds": 14400,
  "retry_limit": 2,
  "launch_status": "accepted",
  "child_outcome": null,
  "runtime_confirmation": "not-reported",
  "diagnostics": [],
  "continuation_events": [
    {
      "request_id": "cont-docs-overhaul-p02-draft-correction-1",
      "agent_handle": "/root/phase02",
      "status": "completed-draft-correction",
      "authority": "pre-commit M1/M2 baseline correction only; no moves, commit, tracking or analysis edits",
      "child_outcome": "stable-corrected-draft-no-moves"
    },
    {
      "request_id": "cont-docs-overhaul-p02-fable-map-corrections",
      "agent_handle": "/root/phase02",
      "status": "accepted-holding",
      "authority": "R1 CLI router consolidation/new onboarding landing; R2 exact H1/anchor accounting; O3 body discovery; no moves/commit before non-author recheck",
      "child_outcome": null
    }
  ],
  "payload": {
    "task_name": "phase02",
    "agent_type": "oat-phase-implementer-gpt-6-1-sol-high",
    "fork_turns": "none",
    "phase_base": "8b78d9a935b31ef50e65713b03a022a5d022aa59",
    "scope": "p02 t01 draft then root continuation"
  },
  "configured_invocation_evidence": [
    {
      "source": "native launcher payload and spawn acceptance",
      "agent_handle": "/root/phase02",
      "role": "oat-phase-implementer-gpt-6-1-sol-high",
      "model": "gpt-6.1-sol",
      "effort": "high"
    }
  ]
}
```

Dispatch: scope=p02 action=implementation role=implementer producer=unknown provenance=unknown model_axis=selected:gpt-6.1-sol effort_axis=selected:high dispatch_policy=high dispatch_ceiling=high target=oat-phase-implementer-gpt-6-1-sol-high

Accepted native /root/phase02 (Hilbert), holding before commands until clean bookkeeping SHA. Ownership initially t01 draft/evidence only; Fable map and non-author normalization review required before moves. No project-log append while child owns the worktree.

Correction report accepted: all 477 destination spans, 17 real collisions, 70 raw page hashes, 840 section hashes and eight literal controls pass; copied-helper pre-fix control fails its intended assertion. Direct nine app tests pass. Exactly 69 retained router entries plus one root compatibility item and two Guide sentences are individually accounted. Receipts: references/draft-correction-receipts.json (SHA256 c4769cda4624a80393d6f24640b99593410dd674198a93b9078c731cd080210a). Same non-author reviewer recheck and Fable approval remain required.

RESUME 2026-10-02: actual Fable review arrived via user, not inferred from queue. Destinations/route-only supersessions approved conditional on R1/R2; source-only advisory, nothing executed. Root accepts required corrections and O3 discovery additions, carries mandatory O4 residues to phase6, defers O1/O2. Same phase handle receives bounded correction and holds for bookkeeping release. User explicitly authorizes direct peer sends despite draft signals; correction is appended to orchestration-log.md, not a claim that historical draft fields prove human input. Direct request66d8973c-6ee0-410e-8e65-c0f641e78bd7 proves input_accepted only. Peer actual response supplies review completion evidence. Prior STOP remains historical; no current external blocker. Receipt references/fable-p02-map-review.md.

### docs-analysis draft review dispatch

```json
{
  "request_id": "docs-overhaul-run1-p02-analysis-review01",
  "caller": "oat-project-implement",
  "scope": "docs-analysis",
  "objective": "Structured analysis accuracy review, no file writes",
  "action": "review",
  "role_name": "oat-reviewer",
  "role_class": "reviewer",
  "provider": "codex",
  "dispatch_context": "root-native",
  "dispatch_policy": "high",
  "dispatch_ceiling": "high",
  "catalog_snapshot": {
    "id": "root-native-20261002",
    "source": "agents.spawn_agent tool schema",
    "observed_at": "2026-10-02"
  },
  "authority": "read-only; in-memory StructuredFindings only",
  "role_selector": "oat-reviewer-gpt-6-1-sol-high",
  "model_selector": "gpt-6.1-sol",
  "model_selector_granularity": "materialized-native-role",
  "effort_selector": "high",
  "reasoning_mode_selector": null,
  "service_tier_selector": null,
  "guidance_reference": ".agents/skills/subagent-orchestration/references/provider-codex.md",
  "guidance_version": "2026-10-01",
  "guidance_verified_at": "2026-10-01",
  "guidance_status": "fresh",
  "selection_source": "policy-resolved",
  "candidates_considered": ["gpt-6.1-sol/high"],
  "selection_reason": "native-catalog",
  "selected_route": "native",
  "task_class": "consequential",
  "model_class_floor": "consequential",
  "classification_source": "caller",
  "classification_reason": "Independent load-bearing conservation and evidence review before moves",
  "floor_satisfaction": "satisfied",
  "deadline_seconds": 3600,
  "retry_limit": 2,
  "launch_status": "accepted",
  "child_outcome": "completed-with-one-low-residual",
  "runtime_confirmation": "not-reported",
  "diagnostics": [],
  "continuation_events": [],
  "payload": {
    "task_name": "p02_analysis_review",
    "agent_type": "oat-reviewer-gpt-6-1-sol-high",
    "fork_turns": "none",
    "output_mode": "structured",
    "committed_head": "fc3515327df51632286f0c9a373e76e7b36b8c30",
    "source_baseline": "8b78d9a935b31ef50e65713b03a022a5d022aa59",
    "draft_binding": "uncommitted exact SHA256; not reviewed at committed HEAD"
  },
  "configured_invocation_evidence": [
    {
      "source": "native launcher payload and spawn acceptance",
      "agent_handle": "/root/p02_analysis_review",
      "role": "oat-reviewer-gpt-6-1-sol-high",
      "model": "gpt-6.1-sol",
      "effort": "high"
    }
  ]
}
```

Dispatch: scope=docs-analysis action=review role=reviewer producer=unknown provenance=unknown model_axis=selected:gpt-6.1-sol effort_axis=selected:high dispatch_policy=high dispatch_ceiling=high target=oat-reviewer-gpt-6-1-sol-high

Structured return accepted from /root/p02_analysis_review; no reviewer artifact writes or reconnaissance dispatch. Exact reviewed analysis SHA256 d8603c7f8b8ce03809a1b6c7e1c460052e97f321a9c4b0d8d68ff522d705fa33. Root independently confirms 40 scoped unmentioned catalog entries versus 39 unique keys. One optional wording correction is offered and retained as a non-blocking residual; no silent fix, rewrite or retry. Receipt: references/docs-analysis-review-01.json. This is analysis accuracy review, not migration-map approval.

### p02-map draft review dispatch

```json
{
  "request_id": "docs-overhaul-run1-p02-map-review01",
  "caller": "oat-project-implement",
  "scope": "p02-map",
  "objective": "Non-author destination, normalization and capability inventory review; one review artifact only",
  "action": "review",
  "role_name": "oat-reviewer",
  "role_class": "reviewer",
  "provider": "codex",
  "dispatch_context": "root-native",
  "dispatch_policy": "high",
  "dispatch_ceiling": "high",
  "catalog_snapshot": {
    "id": "root-native-20261002",
    "source": "agents.spawn_agent tool schema",
    "observed_at": "2026-10-02"
  },
  "authority": "read-only except declared p02 draft review artifact",
  "role_selector": "oat-reviewer-gpt-6-1-sol-high",
  "model_selector": "gpt-6.1-sol",
  "model_selector_granularity": "materialized-native-role",
  "effort_selector": "high",
  "reasoning_mode_selector": null,
  "service_tier_selector": null,
  "guidance_reference": ".agents/skills/subagent-orchestration/references/provider-codex.md",
  "guidance_version": "2026-10-01",
  "guidance_verified_at": "2026-10-01",
  "guidance_status": "fresh",
  "selection_source": "policy-resolved",
  "candidates_considered": ["gpt-6.1-sol/high"],
  "selection_reason": "native-catalog",
  "selected_route": "native",
  "task_class": "consequential",
  "model_class_floor": "consequential",
  "classification_source": "caller",
  "classification_reason": "Independent load-bearing conservation and evidence review before moves",
  "floor_satisfaction": "satisfied",
  "deadline_seconds": 3600,
  "retry_limit": 2,
  "launch_status": "accepted",
  "child_outcome": "completed-after-clean-M1-M2-recheck",
  "runtime_confirmation": "not-reported",
  "diagnostics": [],
  "continuation_events": [
    {
      "request_id": "docs-overhaul-run1-p02-map-review02",
      "agent_handle": "/root/p02_map_review",
      "status": "completed-clean-recheck",
      "authority": "M1/M2 corrected draft recheck; new round02 review artifact only",
      "child_outcome": "zero-findings-M1-M2-resolved"
    }
  ],
  "payload": {
    "task_name": "p02_map_review",
    "agent_type": "oat-reviewer-gpt-6-1-sol-high",
    "fork_turns": "none",
    "output_mode": "artifact",
    "committed_head": "fc3515327df51632286f0c9a373e76e7b36b8c30",
    "source_baseline": "8b78d9a935b31ef50e65713b03a022a5d022aa59",
    "draft_binding": "uncommitted exact SHA256; not reviewed at committed HEAD"
  },
  "configured_invocation_evidence": [
    {
      "source": "native launcher payload and spawn acceptance",
      "agent_handle": "/root/p02_map_review",
      "role": "oat-reviewer-gpt-6-1-sol-high",
      "model": "gpt-6.1-sol",
      "effort": "high"
    }
  ]
}
```

Dispatch: scope=p02-map action=review role=reviewer producer=unknown provenance=unknown model_axis=selected:gpt-6.1-sol effort_axis=selected:high dispatch_policy=high dispatch_ceiling=high target=oat-reviewer-gpt-6-1-sol-high

Artifact-mode confirmation contains exactly one Reconnaissance: not-attempted; artifact has no Review Orchestration section. Validated draft SHA256 bindings, no reviewed commit inferred (Reviewed Head remains -). Outcome 0 Critical / 0 High / 2 Medium / 0 Low. Root independently confirmed first-match href span bug and Home index.md:19 obsolete route-only entry. Both are required pre-move corrections; no content/capability removal authorized. Same accepted /root/phase02 receives bounded pre-commit draft correction, no new phase/recovery event. Source app tests 9/9 and focused 3/3 executed; pristine receipts inspected, not rerun. Fable map approval remains pending, queued not consumed.

Round02 request accepted on same reviewer handle after completed exact resolver (notices empty). Corrected map SHA256 e58c6780fae9eb1f01698018358941355e0de3f26d39caecc278f5453307436b; receipt binds other files. Source baseline unchanged; uncommitted draft is not reviewed at bookkeeping HEAD. Reviewer holds until release. Original ignored analysis copied byte-for-byte to references/docs-analysis-reviewed-snapshot.md for durable provenance; snapshot retains original historical draft status, with current verified-with-Low-residual disposition separately in docs-analysis-review-01.json. No new analysis finding fix/rewrite or reviewed-byte change.

Round02 artifact accepted: exactly one not-attempted confirmation and no Review Orchestration section. Zero Critical/High/Medium/Low findings; receipt-bound draft hashes unchanged. Real-source spans, all 840 section hashes, 70 page hashes and 17 repeated-label cases independently verified; eight literal controls pass, isolated legacy child fails intended assertion. Original review remains immutable. Reviewed Head remains -: these are exact uncommitted proposal bytes, not a reviewed commit. Permanent validator/tests retain round01 executed coverage; no new phase/build/browser acceptance.

Required peer-review boundary: Fable map approval has not arrived. Verified owning laptop relay/runtime and Mini execution worktree; Fable pane still has unsent text "what's the question codex is waiting on?". Do not overwrite, clear or submit it. Queued msg_abd20b8047be contains exact corrected map, specific review request and direct return instructions; delivered_at null and no response, so enqueue is not consumption. No page moved, p02-t01 not complete, no phase 2 acceptance claimed. Same phase handle remains available; resume after actual peer response, not by replacing its session. Two app source drafts remain intentionally uncommitted and owned by phase02. Reviewed project evidence is preserved separately as draft bookkeeping.

## Implementation Log

### p02-t01 accepted and apply continuation: 2026-10-02

Root verified e790323680d35085f7b724862bb507c36e163d46 is the single planned t01 commit with parentb0e6d239,14 declared files and clean tree. Shared release preparation is root-owned438b6ecd4d54dc4f97918e307cf5cb3cc0cbc549, five public manifests0.3.14 above freshly fetched main0.3.13; release manifest/bundles remain t03 closeout. These versions do not claim publication.

Same phase02 continuation cont-docs-overhaul-p02-t02-apply accepted at the unchanged gpt-6.1-sol/high materialized target, holding before commands until this separate bookkeeping release. Scope is approved preservation-only docs/app recovery/evidence, no core writes, tracking, publication or additional review dispatch. Canonical analyze/apply are loaded explicitly from this branch. User-approved project adaptation reuses amphipod rather than generic apply branch creation; branch cli:source owns nav/index generation. Application covers p02 approved structural/consumer recommendations only; later coverage/persona findings are not silently applied now. Root keeps shared versions/lifecycle tracking. Commit per plan, then hold for task bookkeeping before t03.

Authorized peer update requestc716ec80-cf50-4796-a3ed-b0bf410007ee returned input_accepted only (no observed turn start); no duplicate send. Actual Fable prior review supplies approval, not this receipt. Orc draft PR47 follow-up comment records new head/validation; merge/install remain separate.

### Stable draft handoff and parallel review acceptance: 2026-10-02

Terminal outcomes received: p02-map round03 contains exactly one not-attempted confirmation, no Review Orchestration, valid p02-map/artifact/auto/request provenance and exact uncommitted draft bindings. 0 Critical/High/Medium, one Low stale narrative count. R1's101 contiguous rows conserve42 guidance units; R2's exact three H1 changes and other surviving headings are independently checked. Controls pass; copied span/H1 negative children fail intended assertions. Actual Fable conditions are fulfilled without changed destinations. Root accepts the count-only correction; no fourth map review is required for that literal summary fix. Same phase02 continuation cont-docs-overhaul-p02-t01-completion is accepted and holds before commands; it owns only the narrow summary/status correction, append-only correction proof and one planned t01 commit, then holds for separate bookkeeping before moves.

Intrinsic structured round02 returned one not-attempted confirmation and no artifact writes, with only the original offered Low residual. Root accepted exact ad3fba4a analysis/snapshot bytes, wrote references/docs-analysis-review-02.json, and executed canonical resolve-tracking.sh Step10 exit0. Helper selected root main1fd10d9ce703b901e1f5615d0a81be28e1698c0d; this tracking target is not the pre-move source baseline8b78d9a9. Reviewed-with-residual is not a zero-finding pass. One analysis refresh used of two; original receipt/snapshot immutable. No apply outcome yet.

Orc override helper completed four scoped documentation changes, runtime-identity unchanged, no delegated commit/push/install/UI. Root read/reviewed the diff, committed3b7e1c55f89bf6b520969c5092f92519e1076860 and pushed only the existing authorized draft branch. Initial worktree validation refused the expected dirty pre-commit state; post-commit full worktree validation exit0:608 tests passed/11skipped,52 files passed/3skipped; lint/format actual execution, typecheck10cached and build6cached disclosed. Remote branch and GitHub API subsequently both confirm new head; initial immediate gh view was stale. PR47 remains OPEN/DRAFT, not merged/installed. Skill remains PR-scoped1.3.4.

Same accepted phase02 completed cont-docs-overhaul-p02-fable-map-corrections and holds all writes. Exact revised map SHA256 a277764b339bea9d4f7f7884aa6f250dfde23c730ad3c82b373cab70bad08417; correction receipt SHA256 221c8d6d6bd86671926a87781fe175e1ce789b86991471a4f5a3854389df47a4. 816 protected units plus 24 router units, all 42 CLI guidance units, three exact H1 exceptions, unchanged 70 source/destination pairs. No moves or task commit.

Accepted continuations on existing native handles, holding before commands until this bookkeeping commit:

| Request                                  | Handle                               | Target / authority                                                                                    | Outcome           |
| ---------------------------------------- | ------------------------------------ | ----------------------------------------------------------------------------------------------------- | ----------------- |
| docs-overhaul-run1-p02-map-review03      | /root/p02_map_review                 | oat-reviewer-gpt-6-1-sol-high; gpt-6.1-sol/high; only reviews/p02-migration-draft-review-round03.md   | accepted, holding |
| docs-overhaul-run1-p02-analysis-review02 | /root/p02_analysis_review            | oat-reviewer-gpt-6-1-sol-high; gpt-6.1-sol/high; structured in-memory only                            | accepted, holding |
| orca-draft-override-refinement           | /root/orca_draft_override_refinement | worker; explicitly gpt-6.1-sol/high; separate Orc worktree and five existing documentation files only | accepted, holding |

Review resolver notices are empty; /tmp/docs-p02-map-review03-dispatch.json and /tmp/docs-p02-analysis-review02-dispatch.json select the exact configured reviewer ceiling. Analysis-only rewrite one of two refreshes stale map/status claims; reviewed bytes ad3fba4a6ad5f24b19df55a5fb9a434ee69d30442ebab1ea462edb4908320b3f are preserved at references/docs-analysis-reviewed-snapshot-round02.md. Original snapshot/receipt remain immutable; offered Low wording residual remains disclosed. No source validation or tracking outcome is inferred from this refresh.

The Orc helper is a parent-attached native lane, not a standalone persisted chat. Execution stays on the Mini at /Users/tstang/orca/workspaces/orc/docs-qa-orchestration-guidance, branch docs-qa-orchestration-guidance, existing draft PR47. Consequential authority-boundary wording uses fresh provider-codex guidance2026-10-01 and explicit native selectors; configured acceptance is recorded, runtime model identity not reported. Five-file ownership is skills/orca-orchestration/SKILL.md, references/cross-runtime-coordination.md and references/runtime-identity.md beneath that skill, docs/adapters/orca.md and playbooks/orca-cross-host-coordination.md. No commit/push/install/UI/terminal-send authority is delegated. Root reviews and owns authorized PR update; no extra skill bump beyond the existing PR-scoped1.3.4.

Actual Fable p01 fixed-diff review received via inbox msg_dd17ac7d97b5 (subject Fable-p01-fixed-diff-review), independently corroborated by the user's relay. Fable read257517ab..24d1bddf and confirmed fixes; did not run suites or gates. Its isolated temp-fixture probe verified a new non-blocking Low: index.md without Contents diagnoses frontmatter as an unsupported separator because findIndex returns-1. Carry to the next bounded nav touch or explicit residual; phase1 acceptance is unchanged. No clean-zero peer finding claim. Direct send42f84701-ed46-4987-87ea-c60c8ca0f5eb had input_accepted only; actual review is completion evidence. Historical draft-related STOP remains history, superseded by the user's explicit direct-send override already recorded in orchestration-log.md.

Task p01-t01 implemented and independently reconciled against HEAD; root task bookkeeping committed before the same phase handle continues. Phase review and release closure remain pending.

Task p01-t02 accepted after root resolved disposable-output restoration. Exact backup: /private/tmp/docs-p01-generated-quarantine-1790914670899 (11 metadata files, sidecar and hash evidence). Semantic equality and untracked regular-file checks preceded preservation; backup byte hashes matched before removing only generated files. Guard and source remained unchanged. `pnpm build:docs` exit 0 replayed six cached tasks and was not accepted as execution proof; `pnpm exec turbo run build --filter=oat-docs --force` then passed with all six tasks executed, `/tmp/docs-p01-restored-build-forced.log`. No code recovery attempt or successful recovery commit is claimed; pre-attempt stop remains recorded. Root fetch found origin/main 0.3.12; p01 lockstep release prepared at 0.3.13, without publication.

### Plan artifact review received: 2026-10-02

Eligible gate run `7b51c81d-c62c-42d2-aab5-1316713014c1`: 0 critical, 0 high, 1 medium, 1 low. Root resolved both findings directly in plan/design, with clean native re-review and Fable final readiness confirmation. No implementation fix tasks or deferrals. Review archived at `reviews/archived/artifact-plan-review-2026-10-02T032232Z.md`; durable provenance/dispositions in `reviews/plan-review-round-03.md`.

The earlier invalid gate artifact is superseded history, not a received gate pass. Implementation authorization arrived separately after this planning receipt; current implementation progress is tracked above.

## Deviations from Plan / Design

The installed Fumadocs traversal makes synthetic family cross-links participate in previous/next and URL-based breadcrumbs. The plan's explicit safe fallback was selected in p01-t02: validate cross-links but leave them in Contents/body navigation rather than metadata. No loader patch.

The p01-t02 formatter command recursively touched ignored metadata. Root narrowed the p01-t02/p01-t03 commands to Markdown files. This is a plan execution correction, not relaxation of byte ownership.

### Recovery Event p01-t02-formatted-output-stop

- Phase/task: p01/p01-t02
- Original request: docs-overhaul-run1-p01-implementation
- Original commit: b371e1da4b7b66cde6fa949275ea395b196dfb60
- Defect class: build
- Discovered by: pnpm build:docs
- Disposition: direction-required
- Authorization: phase-standing
- Attempt: 0/10
- Dispatch target: oat-phase-implementer-gpt-6-1-sol-high
- Recovery commit: -
- Verification: Focused 39 CLI and 4 app tests passed; final main-worktree build and one no-edit rerun failed, exit 1. Logs: /tmp/docs-p01-t02-build.log and /tmp/docs-p01-t02-build-rerun.log.
- Reason: The implementer inspected final build failure after committing, reported the prevention defect, and stopped before reservation or edits. All 11 manifest entries match canonical serialization hashes; five current byte hashes differ after formatting. Usage remains 0 and pending_attempt null. Root verified clean tracked history and refused to accept task completion. Root will preserve exact generated bytes outside the worktree before restoring disposable output, without changing the ownership guard or original task commit.

### p01 bounded fix round 1

Same original phase handle completed cont-docs-overhaul-p01-fix-1 at 686b2663fd8eaf51b7e736cdc01d71df187d930b. Root verified one append-only fix after acceptance bookkeeping a4140b6c8, exactly 20 bounded files, no core-artifact edits/public-version changes/page moves, and a clean tree. H1/M1-M3/L1 and Fable P1/P2/P4 implemented. Source-only parsed Markdown anchors share the installed-MDX oracle; metadata equality/hashes use raw bytes, preventing lossy UTF-8 adoption. Current-main skill reconciliation preserves approved compiler ownership/body-only behavior and bumps four versions above main.

Implementer reports post-commit 33 executed CLI navigation tests, six real app tests, source validation, output check of 11 files, skill bumps, forced docs build (six executed/zero cached), and diff check all exit zero. Logs /tmp/docs-p01-fix-post-\*.log. Pre-fix regression and guard/anchor neutralization failed as intended; root full ordered gates and fresh independent review remain pending. Original tasks/commits and zero recovery usage are unchanged. No phase acceptance is claimed.

## Test Results

### p01 bounded fix round 2

Same accepted phase handle completed cont-docs-overhaul-p01-fix-2 at 727c40abb5be32885d37d28b21887ac7c986ea42, exactly one append-only commit after328cd1058. Root verified only fumadocs.ts and fumadocs.test.ts changed and the tree is clean. Compact list/bare separator controls fail pre-fix (exit1) and reject after correction; spaced, fenced, ordinary prose and MkDocs controls remain. Direct35 nav/MkDocs tests and six real app tests, CLI types/check/build, source/output checks, formatting and post-commit reruns all exit0. Logs /tmp/docs-p01-fix02-\*.log. No recovery usage or additional scope. Final root gates and third independent review remain pending; two bounded fix rounds exhausted, no phase acceptance yet.

Planning-only checks remain historical evidence. p01 focused tests, real-loader/pristine/installed-consumer/cache controls and Mini browser smoke are recorded per task above. Root full CI gate results will be recorded separately with actual exits/cache evidence before phase acceptance.

Root first phase-gate sequence at committed head6145054067bef937d74cf7e952a0c56da67f4264: check0 (six executed/five cached), type-check0 (six executed/five cached), isolated-HOME test0, build0 (five cached), check:skill-bumps1. Remaining release gates were not run after this failure. Four changed skill versions need to exceed current origin/main, which advanced independently; source fixes/review and version alignment are pending. Receipts/logs: /tmp/docs-p01-gates/. Cached build is not new execution proof; prior six-task forced docs builds were actual execution.

### Phase 6 amendment review disposition

Artifact reviews/phase06-plan-amendment-2026-10-02T045216Z.md returned exactly `**Reconnaissance:** not-attempted`, with no Review Orchestration, and reviewed the exact authored614505406 head. Zero critical/high, one medium and one low. Root accepted M1: p04-t03 now explicitly owns existing validator/test files, durable skill-scenario-audit.md and scoped tooling/audit formatting with docs:test. Root accepted L1: current design/plan summaries now reflect six phases and separate implementation authorization, with implementation.md as progress authority. Artifact fixes were formatted and diff-checked; Fable amendment review remains pending. No automatic review-receive workflow was invoked and no implementation fix tasks created for artifact-only findings.

### Root eight gates and p01 re-review round 2

At reviewed snapshot ee1675e6be034f64a644d7fdc04aee3862cf4436 (source686b2663), all eight ordered gates exit0: check, type-check, isolated-HOME test, build, skill-bumps, release:check-versions after fetch0, release:validate, build:docs. Receipts/logs /tmp/docs-overhaul-p01-fix1-gates/. Check/types each six executed/five cached; tests five executed/six cached, CLI7937 passed plus smoke163/skills660/scripts1. Root build five cached and docs six cached are replay, not new execution proof; implementer post-commit forced docs build executed all six at686b. Additional applicable lint/format passed in implementer evidence. No publication.

Re-review artifact reviews/p01-code-review-round02-2026-10-02T055341Z.md returned exactly not-attempted and no Review Orchestration, scope p01/code/auto, reviewed head ee1675e6be034f64a644d7fdc04aee3862cf4436 validated. Zero Critical/High/Medium, one Low: compact or bare separator spellings remain silently ignored. Root accepts this bounded L1 completion for fix round2/2; two review cycles used, third terminal review permitted by the independent three-cycle cap. Artifact phrase “round2 of configured limit2” refers to the review iteration, not exhaustion of the separate two-fix budget. No endless additional polish or other source scope. Phase stays in_review until final verification/re-review.

## Final Summary (for PR/docs)

### Phase 1 accepted: 2026-10-02

Terminal native artifact reviews/p01-code-review-round03-2026-10-02T060828Z.md returned exactly not-attempted, no Review Orchestration, valid p01/code/auto provenance and reviewed head24d1bddfbf1ea4467125c2b8ca88c65ce57fc06a. Zero findings at all severities. Reviewer independently ran35 nav/MkDocs tests, six real app tests, source validation and additional installed-loader/source controls. Root accepts p01 after two bounded fixes and three independent review cycles; no implementation recovery used.

All eight new-head gates exit0, plus main fetch0, recorded in /tmp/docs-overhaul-p01-fix2-gates/receipts.txt. Check3 executed/8cached, types2/9, tests3/8; root test actually rebuilt oat-docs and executed7939 CLI tests/six app tests, followed by smoke163/skills660/scripts1. Build5 and final docs6 replay cached results; the actual docs build ran earlier in the same root test gate. Required per-phase Mini computer-use smoke remains the retained bounded implementer desktop/dark evidence, not final independent QA. Applicable lint/format evidence passed. No source finding or configured phase gate remains outstanding.

Fable's p01 fixed-diff advisory request is queued via Orca, consumption unverified because the pane has an unsent human draft. Root preserves it and proceeds with the p02 inventory only; the migration map still requires Fable review before moves. Optional docs-branch publication approval remains pending and does not authorize a push. The phase 6 A1/A2 readiness conditions are implemented; Fable's conditional readiness is recorded, not falsely represented as a new executed re-review.

### Fable amendment and phase-one review disposition: 2026-10-02

Fable reviewed committed 3daaacfec and read p01 source at 257517ab..61450540, executing nothing. Root accepts A1/A2: page/heading-keyed normalized section hashes protect the pure move; independently verified fact ledgers are created only before existing prose changes. One editorial round and one persona rerun end in one consensus triage of bounded small fixes or explicitly reported residuals; safety, conservation and blocking findings cannot be waived. A3/A4 are adopted with honest source-blindness limits and current-tree capability re-inventory. This is the second bounded amendment correction; Fable readiness was conditional only on A1/A2, now implemented. No new user checkpoint.

Native p01 artifact returned exactly `**Reconnaissance:** not-attempted`, contains no Review Orchestration, and has validated p01/code/auto/full-head provenance. Root accepts H1, M1-M3 and L1 for bounded same-handle fix round 1 of 2. H1 needs current-main skill versions and relevant upstream composition checked; M1 needs parsed renderer-compatible anchors shared by validators; M2 needs actual Markdown-descendant classification; M3 needs fail-closed native stem collisions; L1 needs unsupported separator diagnostics. No review-receive workflow is implicitly invoked.

Root accepts Fable P1/P2/P4: interrupted-output recovery only on exact equality with newly computed bytes (explicit design change above), contextual malformed-fragment diagnostics, and dev-server restart guidance. Negative controls must retain refusal for genuinely different authored/unowned files, malformed manifests and symlink/traversal paths. Check mode never adopts or writes. This changes the original unconditional unowned-file refusal, not the previous formatter incident disposition. P3 is an accepted IA consequence: Skills sidebar contains Skills-owned guides only; Workflows/Docs Tooling family discovery is through the body/catalog. Journeys 2 and 5 must exercise that route.

First native review dispatch outcome: completed, 0 Critical / 1 High / 3 Medium / 1 Low. Reviewer read/ran focused real-loader controls; source fixes and all ordered release gates remain pending. Original three task commits remain immutable; review-fix commits are append-only, with separate root bookkeeping. No project-log write occurs between this review and fix dispatch.

Orc follow-up is independently owned and published as draft PR https://github.com/tkstang/orc/pull/47 at 69fa78ae5411cf4c5f4da81c89e7a7380f3d220c, Mini worktree /Users/tstang/orca/workspaces/orc/docs-qa-orchestration-guidance, branch docs-qa-orchestration-guidance. Native helper attached to root; Orca CLI registration verified, standalone chat visibility not claimed. Six repository gates passed, with type/build cache replay disclosed. Not merged or installed; docs-branch publication is separately unapproved and does not block local execution.

Implementation is underway, not published or merged. Phase 1 source foundation is accepted after implementer proof, ordered root gates and a clean terminal independent review. Reader-facing migration, catalog/scenarios, persona/editorial work and final independent acceptance remain pending.

## References

- [Plan](plan.md)
- [Design](design.md)
- [Discovery](discovery.md)
