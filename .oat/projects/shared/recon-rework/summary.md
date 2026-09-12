---
oat_status: complete
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-09-11
oat_generated: true
oat_summary_last_task: prev8-t03
oat_summary_revision_count: 8
oat_summary_includes_revisions:
  [p-rev1, p-rev2, p-rev3, p-rev4, p-rev5, p-rev6, p-rev7, p-rev8]
---

# Summary: Recon rework

## Overview

Recon had drifted from its intended role as an inexpensive, high-volume evidence
workflow: one homogeneous run-wide target made every worker inherit the cost and
capability of the hardest assignment. This project restored economical per-wave
routing while keeping the calling agent responsible for scope, approval,
interpretation, evidence sufficiency, and final conclusions.

## What Was Implemented

- Added a closed manifest-v2 packet contract with independently selected per-wave
  targets, task classes, floors, rationale, conditions, and session-local explicit
  approval. Legacy manifest v1 and persisted approval fingerprints were removed;
  evidence artifact formats remain independently versioned at v1.
- Added shared routing helpers and a thin `prepare-routing.mjs` CLI for complete
  pre-approval previews and exact approved-versus-constructed target checks. The
  helpers preserve provider-native model, effort, reasoning-mode, service-tier,
  and opaque selector values without trying to rank models by name.
- Added bounded conditional escalation with forward-only dependencies, finite
  activation and execution limits, explicit dispositions, and exact outcome
  accounting. A conditional contradiction-resolution wave seeks discriminating
  evidence; standard and thorough profiles still have exactly one terminal
  reconciliation.
- Enforced the complete approved profile topology at both proposal and final
  packet validation, including profile-specific mode allowlists, 4/10/20 adaptive
  evidence-lane caps, exact singleton cardinality, condition binding, and rejection
  of shadow reconciliation. Hostile collection shapes now return structured errors,
  withdraw stale output, and preserve independent diagnostics instead of throwing.
- Consolidated condition semantics and same-run attribution, and replaced encoded
  conditional-gap strings with structured wave/lane identity. These changes closed
  every retrospective follow-up directly in the project.
- Required same-run condition evidence, gather-before-compile provenance, and exact
  approved-wave ownership for primary and redundant gather passes. Pass outcomes
  now reconcile at exact lane granularity, preserving honest mixed-lane partials
  while rejecting same-lane contradictions.
- Published categorical contracts for lane-outcome and same-run evidence failures,
  and bounded derivative-diagnostic suppression so independent defects stay
  visible without avoidable cascades.
- Aligned the recon controller, worker role, shared orchestration guidance,
  packet renderer, public docs, bundled runtime, provider projections, and bundle
  consistency tests. Recon remains at skill version `1.1.2`; all five public
  packages remain in lockstep at `0.2.73`.

## Key Decisions

- **Restore economical recon routing and caller-owned judgment.** Select each
  bounded wave independently from current provider guidance, starting with the
  least costly qualified route. One explicit approval binds every exact intended
  target, topology, scope, limit, and selection reason. Predeclared conditional
  escalation cannot become an automatic retry or target substitution, and packet
  routing intent is not actual-launch proof. This supersedes homogeneous
  run-wide dispatch while preserving the unsupported-receipt prohibition. See
  [DR-260910-restore-economical-recon](../../repo/reference/decisions/DR-260910-restore-economical-recon.md).
- **Use session-local recon approval.** Proposal, explicit approval, and exact
  launch remain adjacent in one live session. Reload, resume, or proposal change
  clears approval and requires a fresh preview; no compatibility fingerprint or
  controller-authored proof is persisted. See
  [DR-260911-use-session-local-recon](../../repo/reference/decisions/DR-260911-use-session-local-recon.md).

## Design Deltas

- Planning review clarified that contradiction search and judgment-bearing
  synthesis are separate assignments. The implemented topology therefore uses an
  optional adversary-mode contradiction-resolution evidence pass followed by one
  mandatory terminal reconciliation with its own approved target. Foreseeable
  judgment needs are priced into that terminal wave; unexpected inadequacy returns
  an out-of-envelope gap for renewed approval.
- Final code review found that preview validation enforced the topology but final
  packet validation did not. `p04-t03` moved the rule into one shared production
  validator used at both boundaries.
- A later complexity review established that backward compatibility and persisted
  approval fingerprints protected no required outcome. Phase 5 removed both,
  centralized condition validation, and completed the structured-gap work instead
  of carrying small maintenance items into a backlog.
- Merged-head review exposed aggregate profile caps that both rejected the maximum
  quick topology and admitted foreign modes, plus hostile object-valued collection
  paths. Revisions 2 and 3 replaced that rule with explicit allowed modes, adaptive
  caps, and exact singleton bounds at both preview and packet boundaries.
- Later review cycles made provenance and outcome ownership explicit: condition
  evidence must belong to the same run, thorough compilation must consume both
  gather waves, each derived pass belongs to its approved wave, and material gaps
  identify the exact lane before they affect assurance.

## Notable Challenges

- Phase 2 exhausted the normal two review-fix rounds with one Important topology
  finding still open. A user-authorized third bounded fix added ordered singleton
  cardinality and condition-binding enforcement; a fresh fourth review then passed
  with no findings.
- After merging current `origin/main`, merged-head lifecycle review and the first
  configured-gate attempt found two input/topology defects and three cap-contract
  mismatches. All five were fixed; both narrowed lifecycle reviews passed, and the
  second cross-family configured-gate attempt reported no findings.
- Verification-note whitespace triggered the phase recovery protocol once. The
  recovery commit changed only tracked evidence formatting, reran the scoped
  checks, and preserved the original task commit.
- Five late review rounds found increasingly narrow provenance, ownership, and
  outcome-reconciliation defects. Each blocking defect received a bounded revision
  and a passing phase review; the final diagnostic-only edge stayed fail-closed
  and was explicitly deferred instead of extending implementation again.

## Tradeoffs Made

- Recon validates structural class/floor consistency and exact target identity,
  but does not infer capability from model names. Qualification remains owned by
  current provider guidance, the live catalog, and the calling agent.
- Backward compatibility was intentionally dropped. Supporting manifest v1 and
  persisted approval fingerprints would add branches and fixtures without serving
  a required user outcome; evidence artifacts retain their separate v1 contract.
- The integration suite uses provider-shaped synthetic controls rather than live
  provider launches. It proves production helper and workflow behavior, not native
  runtime identity or billing.

## Revision History

- **p-rev1:** Merged current `origin/main`, resolved nine conflicts semantically,
  advanced the lockstep public packages to `0.2.73`, and passed the complete
  repository gate sequence plus lint and format.
- **p-rev2:** Fixed the merged-head review's profile-mode/cap mismatch and hostile
  manifest collection failures, including stale-output withdrawal and fallible
  negative controls.
- **p-rev3:** Fixed the configured gate's remaining singleton-lane bound, aligned
  the adaptive-cap references, and made preview output distinguish counted adaptive
  lanes from total lanes. The terminal gate then passed with 0 findings.
- **p-rev4:** Required conditional predicate evidence to belong to the current run,
  then suppressed only the derivative predecessor and predicate diagnostics when a
  primary evidence-ownership check fails. The narrowed phase review passed cleanly.
- **p-rev5:** Moved thorough redundant gathering before compilation and required
  the candidate ledger to bind both independent dossiers by exact provenance
  before review briefs are built. The focused and full recon suites passed.
- **p-rev6:** Bound primary and redundant gather pass derivation to the approved
  wave that owns each lane, preventing cross-wave impersonation while retaining
  honest partial outcomes. The narrowed review passed with no findings.
- **p-rev7:** Reconciled complete artifacts with material failed or omitted pass
  outcomes before profile derivation, so contradictory evidence cannot preserve
  assurance or publication. The authorized review cycle passed cleanly.
- **p-rev8:** Refined that reconciliation to exact lane identity, documented the
  public categorical contract, and bounded derivative thorough-ledger diagnostics.
  Mixed-lane partials remain publishable at their achieved profile; same-lane
  contradictions remain invalid.

## Integration Notes

- Canonical behavior lives under `.agents/skills/recon`; generated CLI assets and
  provider views must continue to come from repository build/sync tooling.
- The manifest exposes approved intended routing only. Constructed invocation,
  accepted execution, or observed runtime identity may be claimed only when the
  responsible launcher supplies that evidence.
- Quick remains an evidence packet for an intelligent caller and intentionally has
  no independent semantic pass. Standard/thorough assurance still depends on their
  required typed evidence and single terminal reconciliation.
- Final verification passed all eight CI-equivalent gates in order plus `pnpm lint`
  and `pnpm format`, for ten required repository gates total; the terminal recon
  suite passed 281/281. Release validation packed all five public packages at
  `0.2.73`, docs built, and targeted negative controls proved the assurance guards
  can fail. Earlier repeatable evidence is in
  [phase-4-validation.md](references/verification/phase-4-validation.md).
- Final lifecycle review
  [`final-review-2026-09-11T230845Z.md`](reviews/archived/final-review-2026-09-11T230845Z.md)
  passed with 0C/0I/0M/1m; Thomas explicitly deferred its fail-closed,
  diagnostic-only Minor.
- Configured exit-gate run `965e9704-ba33-443b-adca-e494b6692fbc` passed at the
  Important threshold with 0C/0I/0M/2m and was durably received as allowed. Its
  second Minor joins the same post-release diagnostic cleanup.

## Follow-up Items

- **Post-release recon diagnostic cleanup:** suppress the derivative thorough
  gather-input diagnostic when terminal reconciliation is absent, and share the
  singleton-qualified legacy gap predicate across all pass-outcome consumers.
  Both accepted Minors are diagnostic-only; affected packets already remain
  invalid and unpublishable.

## Explainer Outcome

- **project-recap:** skipped — recorded interactive decision; no recap run or run
  path was created.

## Workflow Observations

### 2026-09-10 · structural · oat-project-implement · p01

run-1-p01-outcome-20260910 Phase p01 passed with two task commits, zero fix loops, and review artifact reviews/p01-review-2026-09-10T020657Z.md (0C/0I/1M/0m).

### 2026-09-10 · structural · oat-project-implement · p02

run-1-p02-outcome-20260910 Phase p02 stopped at the review-cycle cap after two bounded fix rounds; terminal artifact reviews/p02-review-2026-09-10T041234Z.md records 0 Critical, 1 Important, 0 Medium, 0 Minor and attempted reconnaissance with complete orchestration evidence.

### 2026-09-10 · structural · oat-project-implement · p02

run-1-p02-authorized-extension-20260910 User authorized exactly one additional bounded Phase 2 fix round after the terminal review cap; orchestration retry limit advances from 2 to 3 and unresolved finding remains binding until fresh review passes.

### 2026-09-10 · structural · oat-project-implement · p02

run-1-p02-pass-20260910 Phase p02 passed after the user-authorized third fix round; reviews/p02-review-2026-09-10T050659Z.md records 0 Critical, 0 Important, 0 Medium, 0 Minor and attempted reconnaissance whose rejected optional lane was reconciled inline.

### 2026-09-10 · structural · oat-project-implement · p03

run-1-p03-outcome-20260910 Phase p03 passed after two bounded fix rounds; reviews/p03-review-2026-09-10T065216Z.md records 0 Critical, 0 Important, 0 Medium, 0 Minor and attempted reconnaissance with complete orchestration evidence.

### 2026-09-10 · structural · oat-project-implement · p04

run-1-p04-outcome-20260910 Phase p04 passed blocking review after 0 fix rounds and 1 mechanical recovery; reviews/p04-review-2026-09-10T073941Z.md records 0 Critical, 0 Important, 1 Medium, 2 Minor with attempted reconnaissance and complete orchestration evidence.

### 2026-09-10 · structural · oat gate review · final

target=cursor-fable-5-1-high threshold=important findings=critical:0,important:0,medium:3,minor:1 exit=0 status=ok artifact=.oat/projects/shared/recon-rework/reviews/final-review-2026-09-10T091637Z.md run=4b362f5c-6edd-463b-b63f-4b4f46596830

### 2026-09-11 · structural · oat-project-implement · p05

run-2-p05-outcome-20260911 Phase p05 implementation completed in f16437f54491c57f9ad9518c34b415ffb7418a7e; 251/251 recon tests, four guard-neutralization controls, project validation, sync, and repository gates passed; fresh final review remains pending.

### 2026-09-11 · structural · oat gate review · final

target=cursor-fable-5-1-high threshold=important findings=critical:0,important:1,medium:2,minor:4 exit=1 status=blocked artifact=.oat/projects/shared/recon-rework/reviews/final-review-2026-09-11T014112Z.md run=f3f5aaf3-da8f-4d3c-adf6-9933538c4169

### 2026-09-11 · structural · oat gate review · final

target=cursor-fable-5-1-high threshold=important findings=critical:0,important:0,medium:1,minor:4 exit=0 status=ok artifact=.oat/projects/shared/recon-rework/reviews/final-review-2026-09-11T020623Z.md run=240c8e01-eaac-45d3-a179-21c9d465c0a9

### 2026-09-11 · structural · oat-project-review-receive · final

run-2-final-followups-20260911 The passing review's 1 Medium and 4 Minor findings were all accepted and fixed in 01a2a92c5e0de817110feea6cd88503636308585; the review was archived with no backlog filing, and narrowed final re-review remains pending.

### 2026-09-11 · structural · oat gate review · final

target=cursor-fable-5-1-high threshold=important findings=critical:0,important:1,medium:0,minor:2 exit=1 status=blocked artifact=.oat/projects/shared/recon-rework/reviews/final-review-2026-09-11T022854Z.md run=60e7fe16-0eee-4f9b-aac4-d774732391e2

### 2026-09-11 · structural · oat-project-review-receive · final

run-2-malformed-manifest-fixes-20260911 The review's 1 Important and 2 Minor findings were all accepted and fixed in cfd2f25a539499276ae00f51c11b067f5c4871cf; malformed top-level fields now return structured diagnostics and withdraw stale output, all manifest collection loops are shape-safe, and quick terminal topology has one diagnostic owner.

### 2026-09-11 · structural · oat gate review · final

target=cursor-fable-5-1-high threshold=important findings=critical:0,important:0,medium:1,minor:1 exit=0 status=ok artifact=.oat/projects/shared/recon-rework/reviews/final-review-2026-09-11T024939Z.md run=f0529599-5745-4bcb-8abf-a72b5b0b7f1f

### 2026-09-11 · structural · oat-project-review-receive · final

run-2-collection-residuals-20260911 The passing review's 1 Medium and 1 Minor residuals were both fixed in bd5dded4d460a95a1f9cd7ca46475ac49249dbbe; non-array gaps and artifacts now stop at structured diagnostics, withdraw stale output, and cannot cascade into downstream validation.

### 2026-09-11 · structural · oat gate review · final

target=cursor-fable-5-1-high threshold=important findings=critical:0,important:0,medium:0,minor:0 exit=0 status=ok artifact=.oat/projects/shared/recon-rework/reviews/final-review-2026-09-11T030536Z.md run=626478bd-1ce7-4e53-8328-9f3b694c1558

### 2026-09-11 · structural · oat-project-review-receive · final

run-2-terminal-pass-20260911 The terminal freshness review reported 0 Critical, 0 Important, 0 Medium, and 0 Minor findings against the final collection guard; p05-t04 and all 17 implementation tasks are complete.

### 2026-09-11 · structural · oat-project-implement · p-rev1

run-3-p-rev1-pass-20260911 Phase p-rev1 passed at merge commit 9d27e15a615fc18056a8c5b7501a0508ffb9c4a4 after all repository gates passed; reviews/archived/p-rev1-review-2026-09-11T143545Z.md records 0 Critical, 0 Important, 0 Medium, and 1 Minor, with m1 accepted as a formatter-owned non-semantic scope exception.

### 2026-09-11 · structural · oat-project-review-provide · final

run-3-final-review-20260911T144641Z Final lifecycle review at 0ee34935306c0dcb711ded3f83746a890cb50c97 used two bounded recon lanes and reported 0 Critical, 2 Important, 0 Medium, and 0 Minor findings; artifact reviews/final-review-2026-09-11T144641Z.md blocks closeout pending fixes.

### 2026-09-11 · structural · oat-project-review-receive · final

run-3-final-review-receive-20260911T144641Z The merged-head final review blocking findings were accepted and converted to prev2-t01 and prev2-t02; the review is archived and lifecycle closeout remains blocked until fixes and narrowed re-review pass.

### 2026-09-11 · structural · oat-project-review-receive · final

run-3-final-rereview-pass-20260911T150854Z The narrowed final lifecycle re-review closed both prior Important findings and reported 0 Critical, 0 Important, 0 Medium, and 1 Minor; m1 PR-summary drift was fixed during receipt, so the final review is passed and the configured exit gate may refresh.

### 2026-09-11 · structural · oat gate review · final

target=cursor-fable-5-1-high threshold=important findings=critical:0,important:1,medium:1,minor:1 exit=1 status=blocked artifact=.oat/projects/shared/recon-rework/reviews/final-review-2026-09-11T152512Z.md run=c1c2d64e-b921-4484-8c81-6259fe3e397b

### 2026-09-11 · structural · oat-project-review-receive · final

run-3-exit-gate-receive-20260911T152512Z Configured gate run c1c2d64e-b921-4484-8c81-6259fe3e397b blocked at the Important threshold with 0C/1I/1M/1m; all three findings were converted to prev3-t01 through prev3-t03 for the first allowed remediation attempt.

### 2026-09-11 · structural · oat-project-review-receive · final

run-3-gate-remediation-rereview-pass-20260911T154126Z The narrowed lifecycle re-review closed all configured-gate findings and reported 0C/0I/0M/1m; m1 stale PR-summary prose was fixed during receipt, so gate attempt 2 may proceed.

### 2026-09-11 · structural · oat gate review · final

target=cursor-fable-5-1-high threshold=important findings=critical:0,important:0,medium:0,minor:0 exit=0 status=ok artifact=.oat/projects/shared/recon-rework/reviews/final-review-2026-09-11T155617Z.md run=e9a3a038-dc02-4f62-affe-c3d5cfb2c4dc

### 2026-09-11 · structural · oat-project-review-receive · final

run-3-exit-gate-pass-receive-20260911T155617Z Configured gate run e9a3a038-dc02-4f62-affe-c3d5cfb2c4dc passed at the Important threshold with 0C/0I/0M/0m; the exact run-bound artifact is archived with no remediation tasks, deferrals, or product changes.

### 2026-09-11 · structural · oat-project-implement · p-rev4

Phase p-rev4 passed after one bounded fix loop; tasks prev4-t01 and prev4-t02 completed, root-owned re-review reported 0 Critical, 0 Important, 0 Medium, and 0 Minor findings.

### 2026-09-11 · structural · oat-project-review-receive · final

run-4-final-important-20260911 Fresh final review found one Important thorough-ordering defect; p-rev5 task prev5-t01 records the accepted fix to compile both independent gather dossiers before review.

### 2026-09-11 · structural · oat-project-implement · p-rev5

run-4-p-rev5-pass-20260911 Phase p-rev5 passed with task prev5-t01 complete at 26c8357d081ced7047379140c5353ab5993a7f46; narrowed review reported 0 Critical, 0 Important, 0 Medium, and 0 Minor findings.

### 2026-09-11 · structural · oat-project-review-receive · final

run-4-final-gather-ownership-20260911 Fresh final review found one Important gather-pass ownership bypass; p-rev6 task prev6-t01 records the accepted fix to derive primary and redundant gather passes from approved wave ownership.

### 2026-09-11 · structural · oat-project-implement · p-rev6

run-4-p-rev6-pass-20260911 Phase p-rev6 passed with task prev6-t01 complete at 52c21ca6b065b95907887459770b3d38ac8cb105; narrowed review reported 0 Critical, 0 Important, 0 Medium, and 0 Minor findings.

### 2026-09-11 · structural · oat-project-review-receive · final

run-4-final-cap-pass-outcome-20260911 Cycle-cap final review found one Important artifact/failure contradiction; p-rev7 task prev7-t01 records the accepted fix, but another bounded implementation and review cycle requires explicit user authorization.

### 2026-09-11 · structural · oat-project-implement · p-rev7

implement-cycle-cap-20260911T184033Z stopped before prev7-t01 because the three-cycle final-review cap requires explicit user authorization; source reviews/archived/final-review-2026-09-11T183428Z.md.

### 2026-09-11 · structural · oat-project-implement · p-rev7

run-4-p-rev7-pass-20260911 Phase p-rev7 completed task prev7-t01 at 914e9fde6d67f6a3d1c88f2ff2b573b955503822; narrowed review reviews/archived/p-rev7-review-2026-09-11T200317Z.md reported 0 Critical, 0 Important, 0 Medium, and 0 Minor findings.

### 2026-09-11 · structural · oat-project-review-receive · final

run-4-final-rereview-pass-20260911T202308Z The authorized narrowed final lifecycle review passed with 0C/0I/0M/0m, closed prev7-t01, and dispositioned the carried deferred ledger to zero remaining items; source reviews/archived/final-review-2026-09-11T202308Z.md.

### 2026-09-11 · structural · oat gate review · final

target=cursor-fable-5-1-high threshold=important findings=critical:0,important:1,medium:1,minor:1 exit=1 status=blocked artifact=.oat/projects/shared/recon-rework/reviews/final-review-2026-09-11T204246Z.md run=e54ba2dd-6df7-468d-9984-638aa95ea3c6

### 2026-09-11 · structural · oat-project-review-receive · final

run-4-exit-gate-receive-20260911T204246Z Configured gate e54ba2dd-6df7-468d-9984-638aa95ea3c6 blocked with 0C/1I/1M/1m; all findings became prev8-t01 through prev8-t03 for remediation attempt 1 of 2.

### 2026-09-11 · structural · oat-project-implement · p-rev8

run-4-p-rev8-pass-20260911 Phase p-rev8 completed prev8-t01 through prev8-t03 at 016f7aade4e91fdcf7323d81ed4c2a5dc7374106; review reviews/archived/p-rev8-review-2026-09-11T210626Z.md reported 0C/0I/0M/1m, with its fail-closed diagnostic-only edge deferred to final disposition.

### 2026-09-11 · structural · oat-project-implement · final

final-review-cap-p-rev8-20260911T222247Z paused after p-rev8 final verification because the prior one-cycle override is exhausted; one fresh final lifecycle review is required before configured gate attempt 2.

### 2026-09-11 · structural · oat-project-implement · final

final-review-cap-p-rev8-authorized-20260911T230742Z Thomas authorized exactly one additional final lifecycle review cycle for completed p-rev8 and configured gate attempt 2 if it passes.

### 2026-09-12 · structural · oat-project-review-receive · final

run-4-final-rereview-p-rev8-pass-20260911T230845Z The authorized final review passed with 0C/0I/0M/1m; Thomas explicitly deferred the fail-closed diagnostic-only Minor to the next validator cleanup, leaving no blocking deferred findings.

### 2026-09-12 · structural · oat gate review · final

target=cursor-fable-5-1-high threshold=important findings=critical:0,important:0,medium:0,minor:2 exit=0 status=ok artifact=.oat/projects/shared/recon-rework/reviews/final-review-2026-09-12T001359Z.md run=965e9704-ba33-443b-adca-e494b6692fbc

### 2026-09-12 · structural · oat-project-review-receive · final

run-4-exit-gate-pass-receive-20260912T001359Z Gate 965e9704-ba33-443b-adca-e494b6692fbc passed at Important with 0C/0I/0M/2m; m1 preserves the user-approved diagnostic deferral and m2 is deferred to the same cleanup with no publication effect.
