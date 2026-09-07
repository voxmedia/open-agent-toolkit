---
oat_status: complete
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-09-06
oat_generated: true
oat_summary_last_task: prev2-t04
oat_summary_revision_count: 2
oat_summary_includes_revisions: [p-rev1, p-rev2]
---

# Summary: lite-workflow-mode

## Overview

This project added a Lite OAT workflow for single-sitting changes that still
benefit from a critical interview, a durable plan, resumable task commits,
managed dispatch, and independent review. Lite removes the discovery, spec,
design, multi-phase, recap, and documentation ceremony that made Quick too
heavy for this class of work while retaining OAT's safety and handoff value.

## What Was Implemented

- Added `lite` as a first-class workflow mode across control-plane parsing,
  project scaffolding, status routing, dashboard commands, progress, next-step,
  review, import, brainstorm, PR, and closeout surfaces.
- Added a three-artifact Lite scaffold: `plan.md`, `state.md`, and
  `implementation.md`. Its single-phase plan always carries Summary, Decisions,
  Assumptions, Out of Scope, and Validation Criteria, then adds numbered Product
  Behavior and bounded Technical Design sections when observable triggers apply.
- Added `oat-project-lite`, which runs a batched critical interview, writes the
  pre-approval plan, detects scope that outgrows Lite, obtains one plan
  approval, resolves managed dispatch, configures project-local lifecycle-gate
  posture through the shared planning contract, and hands off to implementation.
- Added `oat project promote <path> --to quick`. It preserves the Lite plan,
  renders discovery, scaffolds a Quick plan, updates project state, and commits
  or pushes according to project scope. Real shared and local promotion paths
  now carry artifact-level quick-start readiness.
- Added validation, fail-capable integration coverage, provider projections,
  lifecycle documentation, a disposable end-to-end Lite run, and synchronized
  public release surfaces at `0.2.60` after integrating Wave 4.
- Replaced mandatory test-first task wording with a declared, risk-proportionate
  proof strategy. Behavioral changes retain fail-capable evidence, while prose
  and mechanical changes can use focused static or composition checks instead
  of new fixtures or harnesses.

## Key Decisions

- **Lite is a first-class workflow mode.** Keeping Lite in the existing project
  registry preserves progress, resume, handoff, and routing behavior instead
  of inventing an untracked task concept.
- **Use a three-artifact Lite project shape.** `plan.md` is the only authored
  lifecycle artifact; `state.md` and `implementation.md` remain machine-owned
  so progress updates do not dirty the approved plan.
- **Keep Lite single-phase and sequential.** Atomic task commits and one phase
  provide a clear recovery trail; parallelism or unresolved architecture means
  the work should promote to Quick.
- **Promote oversized Lite work in place.** The project slug and branch survive,
  the authored Lite plan is retained under `references/`, and Quick discovery
  receives the interview context before replanning.
- **Retain managed implementation and independent review.** Reduced planning
  ceremony does not waive dispatch ceilings, per-phase review, final review, or
  the configured implementation exit gate.
- **Scale Lite specification depth from observable triggers.** User-visible
  behavior requires Product Behavior; cross-module, format, state, or consumed
  contract changes require Technical Design. Mechanical work may remain minimal.
- **Use proportionate proof instead of universal TDD.** The plan declares the
  risk and proof strategy. Review evaluates whether the evidence can prove the
  claim, and the executor stops when required manual or visual proof is unavailable.

## Design Deltas

- Promotion initially recorded quick-start readiness only in project state,
  while the recommender reads discovery artifact readiness. The shipped fix
  stamps both surfaces and uses production-derived tests for shared and local
  promotion. The design was aligned during the passing exit-gate receive.
- Final-review corrections added bounded contract repairs and release bumps
  beyond the original terminal-docs task. Each repair preserved the approved
  architecture and was independently verified.
- One historical p06-t02 sentence about provider-view header ownership remains
  deferred. Current canonical and bundled projections are correct and a full
  sync dry-run is a no-op; revisit only if projection ownership changes.
- Revision 1 restored Product Behavior and Technical Design depth, payload-safe
  promotion, and executor-owned proof boundaries after the initial Lite contract
  proved too shallow and too prescriptive.

## Notable Challenges

- Nominal tests initially modeled promoted readiness with a hand-built fixture
  no production path emitted. A later gate reproduced the real failure, after
  which production-derived shared/local controls and a neutralized-guard check
  proved the correction could fail.
- Generated provider views and lockstep release metadata required repeated
  boundary checks. Final verification used isolated-HOME forced tests, explicit
  exit ledgers, version parity, release validation, and true no-op sync checks.
- Revision 1 needed one bounded recovery and two review-fix loops. The final
  reviewer reproduced the tail-only Technical Design omission control and passed
  the phase with no findings.

## Tradeoffs Made

- A dedicated Lite skill avoids expanding the already complex Quick workflow,
  at the cost of adding a third project mode to every mode-aware surface.
- Lite skips summary, documentation, recap, and final HiLL approval by default,
  but shared Quick-mode projects that implement Lite still follow their own
  configured closeout sequence.
- The two route tables remain separate; deduplicating them was outside this
  feature and would have widened the risk surface.
- The proof-strategy revision is Lite-only. Universal plan guidance remains a
  separate backlog decision so this PR does not silently change other workflows.

## Integration Notes

- Treat the control-plane workflow-mode declaration as canonical and update all
  mode-aware inventories when adding a future mode.
- A promoted discovery artifact intentionally remains `in_progress` while
  carrying `oat_ready_for: oat-project-quick-start`; consumers must preserve
  both fields.
- Docs, canonical skills, agent definitions, templates, and bundled assets are
  shipped CLI functionality and therefore require the five-package lockstep
  version bump plus sync-manifest regeneration.
- Wave 4's repository-wide option sweep composes with Lite's proportionate proof
  strategy: mechanical caller expansion is reported, while new behavior or
  cross-owner scope still stops for direction.

## Revision History

- **p-rev1 — Adaptive specification depth and proportionate proof.** Restored
  conditional Product Behavior and Technical Design sections, preserved their
  payloads during promotion, and replaced mandatory test-first wording with a
  risk-based proof strategy. Seven tasks completed after one recovered execution
  defect and two review-fix loops; the final independent review had no findings.
- **p-rev2 — Wave 4 integration and closeout.** Composed native Lite planning
  with the complete shared lifecycle-gate posture contract, registered
  `LITE-10`, and aligned local closeout and PR artifacts to Wave 4 and `0.2.60`.
  All five p-rev2 tasks and five bounded recovery events are complete. The two
  final test-only recoveries made the symlink replacement control portable and
  removed a reproduced SIGTERM readiness race without changing production
  behavior. The focused review accepted both corrections, and exact-head CI
  plus Release Dry Run passed at `15ad3374c` after publication.

## Follow-up Items

- Revisit the deferred p06-t02 provider-view wording only if base/variant
  projection ownership or header contracts change.
- Re-evaluate universal plan-template proof and testing guidance under
  `BL-260906-re-evaluate-universal-plan`.
- Generate the refreshed project retrospective and resolve lifecycle approval.
  PR merge and release remain separate authorization boundaries.

## Workflow Observations

### 2026-09-04 · structural · oat gate review · plan

target=cursor-gpt-5-6-sol-xhigh threshold=important findings=critical:0,important:3,medium:1,minor:1 exit=1 status=blocked artifact=.oat/projects/shared/lite-workflow-mode/reviews/artifact-plan-review-2026-09-04T231105Z.md

### 2026-09-05 · structural · oat gate review · plan

target=cursor-gpt-5-6-sol-xhigh threshold=important findings=critical:0,important:4,medium:2,minor:0 exit=1 status=blocked artifact=.oat/projects/shared/lite-workflow-mode/reviews/artifact-plan-review-2026-09-05T141656Z.md

### 2026-09-05 · structural · oat gate review · plan

target=cursor-gpt-5-6-sol-xhigh threshold=important findings=critical:0,important:4,medium:2,minor:0 exit=1 status=blocked artifact=.oat/projects/shared/lite-workflow-mode/reviews/artifact-plan-review-2026-09-05T150544Z.md

### 2026-09-05 · structural · oat gate review · plan

target=cursor-gpt-5-6-sol-xhigh threshold=important findings=critical:0,important:2,medium:2,minor:0 exit=1 status=blocked artifact=.oat/projects/shared/lite-workflow-mode/reviews/artifact-plan-review-2026-09-05T151613Z.md

### 2026-09-05 · structural · oat gate review · plan

target=cursor-gpt-5-6-sol-xhigh threshold=important findings=critical:0,important:2,medium:2,minor:0 exit=1 status=blocked artifact=.oat/projects/shared/lite-workflow-mode/reviews/artifact-plan-review-2026-09-05T152744Z.md

### 2026-09-05 · structural · oat gate review · plan

target=cursor-gpt-5-6-sol-xhigh threshold=important findings=critical:0,important:3,medium:2,minor:0 exit=1 status=blocked artifact=.oat/projects/shared/lite-workflow-mode/reviews/artifact-plan-review-2026-09-05T181952Z.md

### 2026-09-05 · structural · oat gate review · plan

target=cursor-gpt-5-6-sol-xhigh threshold=important findings=critical:0,important:1,medium:2,minor:0 exit=1 status=blocked artifact=.oat/projects/shared/lite-workflow-mode/reviews/artifact-plan-review-2026-09-05T185313Z.md

### 2026-09-05 · structural · oat gate review · plan

target=cursor-gpt-5-6-sol-xhigh threshold=important findings=critical:0,important:1,medium:1,minor:1 exit=1 status=blocked artifact=.oat/projects/shared/lite-workflow-mode/reviews/artifact-plan-review-2026-09-05T190345Z.md

### 2026-09-05 · structural · oat gate review · plan

target=cursor-gpt-5-6-sol-xhigh threshold=important findings=critical:0,important:1,medium:2,minor:1 exit=1 status=blocked artifact=.oat/projects/shared/lite-workflow-mode/reviews/artifact-plan-review-2026-09-05T195731Z.md

### 2026-09-05 · structural · oat gate review · plan

target=cursor-gpt-5-6-sol-xhigh threshold=important findings=critical:0,important:2,medium:2,minor:0 exit=1 status=blocked artifact=.oat/projects/shared/lite-workflow-mode/reviews/artifact-plan-review-2026-09-05T200630Z.md

### 2026-09-05 · structural · oat gate review · plan

target=cursor-gpt-5-6-sol-xhigh threshold=important findings=critical:0,important:2,medium:1,minor:0 exit=1 status=blocked artifact=.oat/projects/shared/lite-workflow-mode/reviews/artifact-plan-review-2026-09-05T201454Z.md

### 2026-09-05 · structural · oat-project-implement · p01

verdict=pass; fix_loops=0; review=reviews/code-p01-review-2026-09-05T204609Z.md; reviewed_head=3427d2176a86b3f6a95219f6557b4d4798a6f1a2

### 2026-09-05 · structural · oat-project-implement · p02

verdict=pass; fix_loops=1; review=reviews/code-p02-review-2026-09-05T210504Z.md; reviewed_head=948434796085b5c537542213fd562194827a822c; merge=d8e94966424e10b5616a09abc62d758e15ac672c

### 2026-09-05 · structural · oat-project-implement · p03

verdict=pass; fix_loops=1; review=reviews/code-p03-review-2026-09-05T210747Z.md; reviewed_head=4b1eb65a41ffe179793cd9eca7e7f3d963ec6766; merge=2e922483f

### 2026-09-05 · structural · oat-project-implement · p04-recovery-1

disposition=failed-attempt; attempt=1/10; event=p04-recovery-1-bundled-autonomy-reference; original_commit=6f8d9aded4d01b73c8ec34d1b9fc7550e442b73d; ledger_commit=6f2b12bfc; recovery_commit=-; verification=bundled-doc-pass,autonomy-inventory-fail; next=operator-direction

### 2026-09-05 · structural · oat-project-implement · p04

Phase p04 passed independent review with 0 Critical, 0 Important, 0 Medium, and 0 Minor findings; artifact reviews/code-p04-review-2026-09-05T223510Z.md; fix loops 0.

### 2026-09-06 · structural · oat-project-implement · p06

verdict=blocked; tasks=2/3; request=lite-p06-relaunch-3a37d1d2-4236-4dc9-a506-c01e7c589cf7; phase_base=414778287cf4ee0735fcfa1cf9c681cbed4f44c3; head=fd9d9b217187cb07bbc43343e48cf36c80a77cf6; failures=pnpm-test,forced-turbo-test,pnpm-test-skills; cause=three-canonical-skill-contract-drifts-outside-p06-t03-boundary; uncommitted=seven-version-and-sync-paths; next=operator-direction

### 2026-09-06 · structural · oat-project-implement · p06

verdict=pass; tasks=3/3; fix_loops=1; review=reviews/p06-review-2026-09-06T011617Z.md; reviewed_head=d79a58b1b0f8aff53a361b3e591f5cff510106d9; findings=critical:0,important:0,medium:2,minor:0; next=final-review

### 2026-09-06 · structural · oat-project-review-provide · final

artifact=reviews/final-review-2026-09-06T012310Z.md; reconnaissance=attempted; lane=final-docs-1; outcome=rejected-no-artifact; fallback=caller-inline; primary-review=blocked; findings=critical:0,important:1,medium:2,minor:0

### 2026-09-06 · structural · oat gate review · final

target=claude-fable-skip-permissions threshold=important findings=critical:0,important:1,medium:1,minor:1 exit=1 status=blocked artifact=.oat/projects/shared/lite-workflow-mode/reviews/final-review-2026-09-06T021128Z.md

### 2026-09-06 · structural · oat gate review · final

target=claude-fable-skip-permissions threshold=important findings=critical:0,important:1,medium:0,minor:0 exit=1 status=blocked artifact=.oat/projects/shared/lite-workflow-mode/reviews/final-review-2026-09-06T024254Z.md

### 2026-09-06 · structural · oat gate review · final

target=claude-fable-skip-permissions threshold=important findings=critical:0,important:0,medium:0,minor:1 exit=0 status=ok artifact=.oat/projects/shared/lite-workflow-mode/reviews/final-review-2026-09-06T041855Z.md

### 2026-09-06 · structural · oat-project-retro · project-retro

retro artifact=.oat/projects/shared/lite-workflow-mode/references/project-retro.md evidence_used=archived-review-markdown,dispatch-records,gate-receipts,git-history,github-pr-state,lifecycle-artifacts,project-log,session-transcript evidence_unavailable=oat-execution-learnings,spec promotions=2 upstream=2 apply=deferred filing=deferred

### 2026-09-06 · structural · oat-project-implement · p-rev1

Phase launch invalidated before edits: accepted native child was stopped because dispatch-journal persistence failed on legacy review-record fields; root later advanced HEAD with the separately authorized backlog commit.

### 2026-09-06 · structural · oat-project-implement · p-rev1

BLOCKED after 2/2 task commits and failed recovery attempt 1/10; see implementation.md Run 2 and Recovery Event p-rev1-recovery-1.

### 2026-09-06 · structural · oat-project-implement · p-rev1

verdict=pass; tasks=7/7; fix_loops=2; recovery_attempts=2; review=reviews/archived/p-rev1-review-2026-09-06T173547Z.md; reviewed_head=1ad8e44b9b83c7d887085c04c6afafb2bb7e5056; final_task=f6504815b2e175a4d1e2af0a03baf45a59baa412; findings=critical:0,important:0,medium:0,minor:0; next=authorized-push-pr-refresh
