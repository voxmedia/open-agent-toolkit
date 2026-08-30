---
oat_status: complete
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-08-30
oat_generated: true
oat_summary_last_task: p05-t01
oat_summary_revision_count: 0
oat_summary_includes_revisions: []
---

# Summary: subagent-orchestration

## Overview

This project separated portable model-selection guidance from OAT's subagent
launch machinery. It preserves one canonical source for task classification and
provider routing while keeping OAT-specific authorization, launch, recovery,
and evidence contracts independently maintainable.

## What Was Implemented

- Added the user-invocable, self-contained `subagent-orchestration` skill with
  five task classes, durable selection principles, provider-specific dated
  guidance, and explicit evidence-refresh rules.
- Reduced `oat-dispatch-subagents` to mechanics ownership while preserving
  capability probing, live-catalog intersection, native-first routing,
  acceptance terminality, recovery, and fail-closed behavior.
- Migrated active reviewer, implementer, planning, lifecycle-adapter, Cursor
  Cloud, and repository-improvement consumers to load generic principles, one
  provider selection reference, and matching mechanics in order.
- Added directional utility installation: selecting dispatch automatically
  includes guidance, while the guidance skill remains independently
  installable. Provider sync and bundled distribution carry the same contract.
- Hardened structural coverage for ownership boundaries, task-class semantics,
  consumer composition, Claude routing, provider freshness, service tiers, and
  legacy versus enriched dispatch records. PR feedback additionally pinned
  homogeneous-wave axis equality, engine-first consumer loading, and the
  mapping from normalized request intent to resolved selector evidence.
- Updated user and maintainer documentation, then advanced the five public
  packages and release metadata to `0.2.14` after rebasing onto the release of
  `0.2.13`.

## Key Decisions

- **Guidance and mechanics ownership split.** Portable task classification,
  model-selection principles, dated provider mappings, and refresh evidence
  belong to `subagent-orchestration`; OAT dispatch retains authorization,
  launch, liveness, recovery, and record mechanics. This avoids duplicated,
  drifting model policy without weakening launch safeguards.
- **Directional utility dependency.** Installing `oat-dispatch-subagents`
  includes `subagent-orchestration`, but guidance may be installed alone.
  Dispatch therefore fails closed when required guidance is unavailable while
  non-OAT users can consume the portable layer independently.
- **Opus-first Claude routing.** Opus remains the hard-reasoning and
  consequential default; Fable is an exceptional escalation for unresolved
  ambiguity, novelty, consequence, or a directly relevant strength. Cost
  savings belong primarily in the higher-volume bounded-subagent layer rather
  than the low-volume root orchestrator.
- **Additive dispatch evidence compatibility.** New guidance, reasoning,
  service-tier, and freshness evidence remains optional so legacy records stay
  valid. Canonical legacy and enriched fixtures make that compatibility
  executable rather than implicit.

## Design Deltas

- The quick-start planning gate proceeded under an explicit operator override
  after its received findings were fixed. Independent phase, final lifecycle,
  and cross-family exit-gate reviews subsequently passed.
- Phase 3's normal merge encountered a duplicate bootstrap-sync manifest
  conflict. The two reviewed task commits were cherry-picked and the integrated
  contract and docs checks passed.

## Notable Challenges

- Phase 1 exposed directly caused autonomy-inventory and reviewer-version
  contract drift; a bounded fix restored the full suite.
- The first Phase 3 dispatch carried stale boundaries and stopped without
  edits. An operator-authorized fresh attempt used the canonical plan and
  completed successfully.
- Final verification found that the new legacy-record fixture added one prompt
  site to the autonomy inventory. Mapping it as non-gating schema evidence
  restored all repository tests.

## Tradeoffs Made

- The existing `oat-dispatch-subagents` name was retained to keep the ownership
  split reviewable; a generic dispatch-engine rename remains separate work.
- Volatile provider matrices stay in canonical skill references instead of
  being duplicated in global instructions or the docs site. Live catalogs and
  current user or repository instructions always take precedence.

## Integration Notes

- Utility installers, update/remove flows, provider synchronization, and active
  OAT consumers all rely on the two-layer contract.
- Cursor and Codex read canonical skills directly; Claude receives the
  generated canonical skill link. Generated agent roles consume the same
  loading order.
- Final verification passed workspace tests, lint, type-check, package and docs
  builds, release validation, registry checks, local docs-link crawling, and
  provider-sync dry runs. Final lifecycle and Fable exit-gate reviews reported
  no findings.

## Follow-up Items

- Evaluate a generic dispatch-skill rename as a separate compatibility
  migration if naming consistency becomes worth the consumer churn.
- Consider user-scope installation of the portable guidance skill after the
  project-level distribution has operating evidence.

## Workflow Observations

### 2026-07-23 · structural · oat gate review · plan

target=cursor-fable-5-xhigh threshold=important exit=124 status=review_failed

### 2026-07-23 · structural · oat gate review · plan

target=cursor-fable-5-xhigh threshold=important findings=critical:0,important:1,medium:1,minor:3 exit=1 status=blocked artifact=.oat/projects/shared/subagent-orchestration/reviews/artifact-plan-review-2026-07-23T024325Z.md

### 2026-07-23 · structural · oat-project-implement · p01-implementation-dispatch

Accepted request implement-p01-20260723T0437Z-b0cc87dd on target oat-phase-implementer-gpt-5-6-sol-high; tracking anchor .oat/projects/shared/subagent-orchestration/implementation.md#orchestration-runs-start.

### 2026-07-23 · structural · oat-project-implement · p01-review-dispatch

Accepted request review-p01-20260723T0454Z-1af57239 on target oat-reviewer-gpt-5-6-sol-high for range b0cc87dd..1af57239; tracking anchor .oat/projects/shared/subagent-orchestration/implementation.md#orchestration-runs-start.

### 2026-07-23 · structural · oat-project-implement · p01-fix1-dispatch

Resumed request implement-p01-20260723T0437Z-b0cc87dd as fix-p01-r1-20260723T0500Z-5b7cae1e on the original target for findings in reviews/p01-review-2026-07-23T045715Z.md; tracking anchor implementation.md#orchestration-runs-start.

### 2026-07-23 · structural · oat-project-implement · p01-rereview-dispatch

Accepted request rereview-p01-20260723T0506Z-0dda1cf3 on target oat-reviewer-gpt-5-6-sol-high for fix range 5b7cae1e..0dda1cf3; tracking anchor implementation.md#orchestration-runs-start.

### 2026-07-23 · structural · oat-project-implement · p01-outcome

Phase p01 passed root-owned re-review after 1 fix iteration; evidence: reviews/p01-review-2026-07-23T050810Z.md and implementation.md#run-1.

### 2026-07-23 · structural · oat-project-implement · implement-p02-20260723T0516Z-1668d004

Accepted p02 phase implementer dispatch in worktree .worktrees/subagent-orchestration-p02. Dispatch: scope=p02 action=implementation role=implementer producer=unknown provenance=unknown model_axis=selected:gpt-5.6-sol-high effort_axis=not-applicable dispatch_policy=high dispatch_ceiling=high target=oat-phase-implementer-gpt-5-6-sol-high

### 2026-07-23 · structural · oat-project-implement · implement-p03-20260723T0516Z-199bc797

Accepted p03 phase implementer dispatch in worktree .worktrees/subagent-orchestration-p03. Dispatch: scope=p03 action=implementation role=implementer producer=unknown provenance=unknown model_axis=selected:gpt-5.6-sol-high effort_axis=not-applicable dispatch_policy=high dispatch_ceiling=high target=oat-phase-implementer-gpt-5-6-sol-high

### 2026-07-23 · structural · oat-project-implement · p03-outcome-implement-p03-20260723T0516Z-199bc797

Phase p03 outcome: block; fix-loop count 0. Root dispatch carried stale boundaries that conflicted with canonical plan.md; accepted implementer made no changes and left .worktrees/subagent-orchestration-p03 clean at 199bc797. Recovery requires a new explicitly operator-authorized action.

### 2026-07-23 · structural · oat-project-implement · implement-p03-recovery1-20260723T1112Z-199bc797

Accepted operator-authorized p03 recovery in unchanged worktree .worktrees/subagent-orchestration-p03, linked to terminal request implement-p03-20260723T0516Z-199bc797. Dispatch: scope=p03-recovery1 action=implementation role=implementer producer=unknown provenance=unknown model_axis=selected:gpt-5.6-sol-high effort_axis=not-applicable dispatch_policy=high dispatch_ceiling=high target=oat-phase-implementer-gpt-5-6-sol-high

### 2026-07-23 · structural · oat-project-implement · review-p03-20260723T1121Z-f15b713c

Accepted fresh root-owned p03 review for recovered range 199bc797..f15b713c. Dispatch: scope=p03 action=review role=reviewer producer=unknown provenance=unknown model_axis=selected:gpt-5.6-sol-high effort_axis=not-applicable dispatch_policy=high dispatch_ceiling=high target=oat-reviewer-gpt-5-6-sol-high

### 2026-07-23 · structural · oat-project-implement · p03-outcome-review-p03-20260723T1121Z-f15b713c

Phase p03 outcome: pass after operator-authorized recovery; fix-loop count 0. Task commits bc3c81d6 and f15b713c; review evidence reviews/p03-review-2026-07-23T112224Z.md. The two docs link failures were independently confirmed pre-existing and out of scope.

### 2026-07-23 · structural · oat-project-implement · review-p02-20260723T1135Z-22ae2325

Accepted fresh root-owned p02 review for range 1668d004..22ae2325. Dispatch: scope=p02 action=review role=reviewer producer=unknown provenance=unknown model_axis=selected:gpt-5.6-sol-high effort_axis=not-applicable dispatch_policy=high dispatch_ceiling=high target=oat-reviewer-gpt-5-6-sol-high

### 2026-07-23 · structural · oat-project-implement · p02-fix1

Accepted p02 fix iteration 1 by resuming original request implement-p02-20260723T0516Z-1668d004 against review reviews/p02-review-2026-07-23T113654Z.md. Dispatch: scope=p02-fix1 action=fix role=fix producer=unknown provenance=unknown model_axis=selected:gpt-5.6-sol-high effort_axis=not-applicable dispatch_policy=high dispatch_ceiling=high target=oat-phase-implementer-gpt-5-6-sol-high

### 2026-07-23 · structural · oat-project-implement · rereview-p02-20260723T1148Z-0692243e

Accepted fresh root-owned p02 re-review for fix iteration 1, range 22ae2325..0692243e. Dispatch: scope=p02 action=review role=reviewer producer=unknown provenance=unknown model_axis=selected:gpt-5.6-sol-high effort_axis=not-applicable dispatch_policy=high dispatch_ceiling=high target=oat-reviewer-gpt-5-6-sol-high

### 2026-07-23 · structural · oat-project-implement · p02-outcome-rereview-p02-20260723T1148Z-0692243e

Phase p02 outcome: pass after 1 fix iteration; task commit 22ae2325 and fix commit 0692243e; review evidence reviews/p02-review-2026-07-23T115055Z.md. One non-blocking Medium legacy-record fixture gap remains recorded.

### 2026-07-23 · structural · oat-project-implement · implement-p04-20260723T1157Z-96cb638f

Accepted p04 phase implementer in root worktree at base 96cb638f. Dispatch: scope=p04 action=implementation role=implementer producer=unknown provenance=unknown model_axis=selected:gpt-5.6-sol-high effort_axis=not-applicable dispatch_policy=high dispatch_ceiling=high target=oat-phase-implementer-gpt-5-6-sol-high

### 2026-07-23 · structural · oat-project-implement · review-p04-20260723T1203Z-7d3aaab7

Accepted fresh root-owned p04 review for range 96cb638f..7d3aaab7. Dispatch: scope=p04 action=review role=reviewer producer=unknown provenance=unknown model_axis=selected:gpt-5.6-sol-high effort_axis=not-applicable dispatch_policy=high dispatch_ceiling=high target=oat-reviewer-gpt-5-6-sol-high

### 2026-07-23 · structural · oat-project-implement · p04-outcome-review-p04-20260723T1203Z-7d3aaab7

Phase p04 outcome: pass with 0 Critical, Important, Medium, or Minor findings; task commits 8856fa4e and 7d3aaab7; review evidence reviews/p04-review-2026-07-23T120818Z.md.

### 2026-07-23 · structural · oat-project-implement · review-final-20260723T121234Z-85591011

Accepted auto final lifecycle review for range 244e329e..85591011. Dispatch: scope=final action=review role=reviewer producer=unknown provenance=unknown model_axis=selected:gpt-5.6-sol-high effort_axis=not-applicable dispatch_policy=high dispatch_ceiling=high target=oat-reviewer-gpt-5-6-sol-high

### 2026-07-23 · structural · oat-project-implement · implement-p05-20260723T1222Z-e1662494

Accepted p05 final-review-fix implementer at base e1662494. Dispatch: scope=p05 action=implementation role=implementer producer=unknown provenance=unknown model_axis=selected:gpt-5.6-sol-high effort_axis=not-applicable dispatch_policy=high dispatch_ceiling=high target=oat-phase-implementer-gpt-5-6-sol-high

### 2026-07-23 · structural · oat-project-implement · fix-p05-20260723T1230Z-e92a50bd

Accepted p05 fix continuation for final-verification autonomy inventory drift; original request implement-p05-20260723T1222Z-e1662494. Dispatch: scope=p05-fix1 action=fix role=fix producer=unknown provenance=unknown model_axis=selected:gpt-5.6-sol-high effort_axis=not-applicable dispatch_policy=high dispatch_ceiling=high target=oat-phase-implementer-gpt-5-6-sol-high

### 2026-07-23 · structural · oat-project-implement · rereview-final-20260723T123440Z-fca6f9ce

Accepted auto final lifecycle re-review for p05 fix commits e92a50bd and ab60498b. Dispatch: scope=final action=review role=reviewer producer=unknown provenance=unknown model_axis=selected:gpt-5.6-sol-high effort_axis=not-applicable dispatch_policy=high dispatch_ceiling=high target=oat-reviewer-gpt-5-6-sol-high

### 2026-07-23 · structural · oat gate review · final

target=cursor-fable-5-xhigh threshold=important findings=critical:0,important:0,medium:0,minor:0 exit=0 status=ok artifact=.oat/projects/shared/subagent-orchestration/reviews/final-review-2026-07-23T124954Z.md

### 2026-07-23 · structural · oat-project-implement · rereview-final-docs-20260723T1612Z-47fedc68

Accepted fresh final lifecycle re-review after approved docs and repo-reference synchronization. Dispatch: scope=final action=review role=reviewer producer=unknown provenance=unknown model_axis=selected:gpt-5.6-sol-high effort_axis=not-applicable dispatch_policy=high dispatch_ceiling=high target=oat-reviewer-gpt-5-6-sol-high

### 2026-07-23 · structural · oat gate review · final

target=cursor-fable-5-xhigh threshold=important findings=critical:0,important:0,medium:0,minor:0 exit=0 status=ok artifact=.oat/projects/shared/subagent-orchestration/reviews/final-review-2026-07-23T163522Z.md

### 2026-07-23 · structural · pr-feedback · PR #172 Bugbot

Accepted and verified the homogeneous-wave axis-parity fix; rebased release metadata now targets 0.2.14, and the prior exit gate is stale pending refresh. See implementation.md.

### 2026-07-23 · structural · pr-feedback · PR #172 Bugbot rerun

Accepted and verified the engine-first consumer-load and request-selector mapping fixes in 4d59b8f7; strengthened coverage also corrected Cursor Cloud ordering. See implementation.md.

### 2026-08-07 · structural · oat-project-retro · references/project-retro.md

artifact=.oat/projects/shared/subagent-orchestration/references/project-retro.md evidence=project-log,lifecycle-artifacts,repo-reference-ledgers unavailable=oat-execution-learnings,review-artifacts,session-transcript promotions=1 filing=1 apply=deferred filing=deferred

### 2026-08-07 · project · bug · retro generation receipt keys

Correction to `### 2026-08-07 · structural · oat-project-retro · references/project-retro.md`: the unambiguous receipt is artifact=.oat/projects/shared/subagent-orchestration/references/project-retro.md evidence=project-log,lifecycle-artifacts,repo-reference-ledgers unavailable=oat-execution-learnings,review-artifacts,session-transcript promotions=1 upstream=1 apply=deferred filing=deferred. (observed on oat-project-retro 1.0.1, CLI 0.2.30)

### 2026-08-30 · structural · oat-project-complete · completion-override

Operator approved completion after PR #172 merged with green CI, release dry-run, and Bugbot checks. No implementation work remains; the stale post-feedback lifecycle gate is explicitly overridden for historical closeout.
