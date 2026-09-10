---
oat_status: complete
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-09-10
oat_generated: true
oat_summary_last_task: p04-t06
oat_summary_revision_count: 0
oat_summary_includes_revisions: []
---

# Summary: Recon rework

## Overview

Recon had drifted from its intended role as an inexpensive, high-volume evidence
workflow: one homogeneous run-wide target made every worker inherit the cost and
capability of the hardest assignment. This project restored economical per-wave
routing while keeping the calling agent responsible for scope, approval,
interpretation, evidence sufficiency, and final conclusions.

## What Was Implemented

- Added a closed versioned packet contract: manifest v2 carries independently
  selected per-wave targets, task classes, floors, rationale, conditions, and one
  approval fingerprint, while valid v1 manifests retain their original shape and
  literal fingerprint semantics. Evidence artifact formats remain v1.
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
  packet validation, including ordered singleton modes, condition binding, and
  rejection of shadow reconciliation. Malformed v1/v2 wave containers now return
  stable structured validation errors instead of throwing.
- Aligned the recon controller, worker role, shared orchestration guidance,
  packet renderer, public docs, bundled runtime, provider projections, and bundle
  consistency tests. All five public packages advanced in lockstep to `0.2.72`.

## Key Decisions

- **Restore economical recon routing and caller-owned judgment.** Select each
  bounded wave independently from current provider guidance, starting with the
  least costly qualified route. One explicit approval binds every exact intended
  target, topology, scope, limit, and selection reason. Predeclared conditional
  escalation cannot become an automatic retry or target substitution, and packet
  routing intent is not actual-launch proof. This supersedes homogeneous
  run-wide dispatch while preserving the unsupported-receipt prohibition and
  valid legacy approvals. See
  [DR-260910-restore-economical-recon](../../repo/reference/decisions/DR-260910-restore-economical-recon.md).

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
- Final review also found object-valued wave arrays could throw. `p04-t04` retained
  the public categorical error contract for malformed v1 and v2 inputs.

## Notable Challenges

- Phase 2 exhausted the normal two review-fix rounds with one Important topology
  finding still open. A user-authorized third bounded fix added ordered singleton
  cardinality and condition-binding enforcement; a fresh fourth review then passed
  with no findings.
- Lifecycle closeout required two narrowed final-review fixes after the original
  final review. The terminal lifecycle review passed with no findings, and the
  independent configured exit gate later passed at the Important threshold.
- Verification-note whitespace triggered the phase recovery protocol once. The
  recovery commit changed only tracked evidence formatting, reran the scoped
  checks, and preserved the original task commit.

## Tradeoffs Made

- Recon validates structural class/floor consistency and exact target identity,
  but does not infer capability from model names. Qualification remains owned by
  current provider guidance, the live catalog, and the calling agent.
- The integration suite uses provider-shaped synthetic controls rather than live
  provider launches. It proves production helper and workflow behavior, not native
  runtime identity or billing.
- The configured exit-gate review's three Medium findings and one Minor finding
  were accepted as post-release maintainability/documentation work because packet
  validation remains fail-closed and publication-safe.

## Integration Notes

- Canonical behavior lives under `.agents/skills/recon`; generated CLI assets and
  provider views must continue to come from repository build/sync tooling.
- The manifest exposes approved intended routing only. Constructed invocation,
  accepted execution, or observed runtime identity may be claimed only when the
  responsible launcher supplies that evidence.
- Quick remains an evidence packet for an intelligent caller and intentionally has
  no independent semantic pass. Standard/thorough assurance still depends on their
  required typed evidence and single terminal reconciliation.
- Verification passed all eight CI-equivalent gates in order, fresh isolated Turbo
  execution, the final 258/258 recon suite, 29/29 bundle tests, release validation,
  docs build, and targeted negative controls. The exact repeatable evidence is in
  [phase-4-validation.md](references/verification/phase-4-validation.md).

## Follow-up Items

- Consolidate duplicated v2 condition validators and normalize diagnostic codes
  in the next condition-schema refactor.
- Reduce redundant approval-drift and inactive foreign-run diagnostics while
  preserving fail-closed rejection.
- Replace the activated-lane gap message's backticked identity syntax with
  structured fields, then pin the public packet-contract rule.
- Reconcile GitHub issue #274 and any canonical backlog record through their
  owning workflows at the authorized shipping boundary. No live-provider
  acceptance run, PR publication, merge, or issue closure is included here.

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
