---
oat_status: complete
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-09-13
oat_generated: true
oat_summary_last_task: p06-t18
oat_summary_revision_count: 0
oat_summary_includes_revisions: []
---

# Summary: agent-authored-recap

## Overview

The project replaced an implementation-tail recap path that depended on five provider seams, adaptive expansion, and separate publication and durability machinery but produced no recap on normally configured hosts. It delivered one agent-authored HTML flow for project recaps, program recaps, plan-time project explainers, and direct use, while preserving bounded facts, mechanical verification, and archive-safe evidence.

## What Was Implemented

- Rebuilt Explainer Kit around `bundle → host-agent author → verify → record`: allowlisted inputs become a canonical fact base and claims ledger, the host agent authors one recipe-guided HTML page, and the flow writes an exact manifest-v2 package with immutable hashes.
- Added browser-free structure, safety, source-dumping, and bidirectional claim checks, followed by a host-browser → Playwright → browser-free verification ladder. Outcomes now truthfully distinguish `built`, `built-needs-review`, `failed`, and `incomplete`.
- Retired callback orchestration, critic and planner seams, multi-artifact expansion, durability attestation, S3 publication, release-candidate tooling, obsolete schemas, and their tests and configuration.
- Routed project completion, implementation closeout, autonomous runs, planning, summaries, and both wave program-close callers through the shared Generate contract and documented the new workflow.
- Added persisted retry-or-skip evidence, strict manifest-v2 archive validation for project recaps, generic package validation for other recipes, fresh-host and negative-control coverage, and a repository-wide retired-reference guard.
- Generated this project's Playwright-verified `project-explainer` and the 2026-08-31 execution program's complete `program-recap`; the latter passed every browser-free and package check as `built-needs-review` because no browser driver was installed.

## Key Decisions

- **Explainers are agent-authored; the provider seams and durability path are retired** — The host agent owns prose and page composition while the core owns allowlisted evidence, safety, traceability, verification, and immutable recording. One recipe-selected flow serves every caller; the archive export is the durable copy, a browser-less verified artifact remains usable as `built-needs-review`, failures require explicit retry or skip, and no new CLI command was added for skill-owned mechanics.

## Design Deltas

- Non-project recap packages compose generic manifest, immutable-hash, and exact-inventory validation directly; the project archive validator remains strictly pinned to the `project-recap` recipe.
- Persisted `skip/failed_attempt` intent may carry one validated project-relative evidence locator so a fresh process can satisfy the terminal guard without reopening discovery.
- The documented QA and failure records were aligned to the defensible shipped validators: exact structural fields, canonical run-root binding, and mutually exclusive manifest or failure evidence.

## Notable Challenges

- Final review exposed several fail-open edges in reuse ordering, diagnostic sanitization, multi-root locators, and subject-aware claim tracing. Phase 6 closed them with reproduction-grade controls, including real tracked-package verification and neutralized-guard failures.
- The configured exit gate then found that a test depended on this shared project's live package and would fail after archival. An explicitly authorized bounded remediation replaced that dependency with provenance-recorded byte-exact fixtures and preserved a load-bearing live-source sweep.
- The program recap host lacked browser control and its Playwright driver was unavailable. The ladder downgraded honestly to browser-free verification, retained the usable artifact, and recorded the reason instead of claiming visual inspection.

## Tradeoffs Made

- Browser-free success is accepted as `built-needs-review` rather than blocking lifecycle completion, preserving availability while carrying an explicit human-review signal.
- The archive command stays recipe-specific instead of becoming a generic explainer validator; other recipes use the same underlying contracts without widening the archive boundary.
- Deterministic generation mechanics remain in skill scripts rather than a new CLI surface, avoiding lockstep API expansion while all current consumers remain skill-driven.
- Four whitespace-only diagnostics in immutable program recap HTML were left unchanged because cosmetic edits would require regenerating QA and manifest hashes without behavioral benefit.

## Integration Notes

- New runs use `explainer-kit.manifest/v2`; the v1 package shape and retired durability outcomes are not compatibility surfaces.
- Lifecycle consumers should invoke the shared Generate flow and read persisted intent plus `manifest.json` and `qa/result.json`. Existing `skip/capability_probe` records remain readable but are no longer written.
- `verifySelectedProjectRecapForArchive` remains project-recap-only. Program recaps, project explainers, and direct-input runs validate through the generic manifest/hash/inventory contract.
- The canonical repository decision is `DR-260911-explainers-are-agent-authored`; `BL-260727-make-explainer-run-durability` was archived `wont_do` because archive export now owns durability.

## Follow-up Items

- Regenerate the immutable 2026-08-31 program recap package when a substantive content change is needed; that regeneration may also remove its four whitespace-only diagnostics.

## Workflow Observations

### 2026-09-11 · structural · oat-project-implement · p01-review-round-3

p01-r3-governance-exhausted-20260911: review round 3 requested changes; one Important terminal-guard assurance gap remains and automatic retries are exhausted; see reviews/p01-review-2026-09-11T173707Z.md.

### 2026-09-11 · structural · oat-project-implement · p01-governance-extension

p01-governance-manual-fix-authorized-20260911: operator authorized one bounded terminal-guard remediation and one independent verification review; automatic retry accounting remains exhausted and unchanged.

### 2026-09-11 · structural · oat-project-implement · p01

phase-outcome-p01-20260911T1902Z: PASS; 0 Critical, 0 Important, 3 deferred Medium; 2 automatic fix iterations plus 1 operator-authorized remediation; independent verification artifact reviews/p01-review-2026-09-11T185739Z.md.

### 2026-09-11 · structural · oat-project-implement · p02

phase-outcome-p02-20260911T2027Z: PASS; 0 Critical, 0 Important, 0 Medium; 1 automatic fix iteration; independent re-review artifact reviews/p02-review-2026-09-11T202150Z.md.

### 2026-09-11 · structural · oat-project-implement · p03

stop-p03-governance-review-20260911T2304Z: governance-final round 3 found 1 Important typed-state compatibility defect; automatic review/fix budget exhausted; operator direction required; see reviews/p03-review-2026-09-11T225420Z.md.

### 2026-09-11 · structural · oat-project-implement · p03

stop-p03-independent-verification-20260911T2332Z: operator-authorized verification found 1 Important raw-string normalization mismatch; authorization consumed; operator direction required; see reviews/p03-review-2026-09-11T232506Z.md.

### 2026-09-12 · structural · oat-project-implement · p03

phase-outcome-p03-20260912T0021Z: PASS; 0 Critical, 0 Important, 0 Medium, 0 Minor; 2 automatic fix iterations plus 2 operator-authorized remediations; final verification artifact reviews/p03-review-2026-09-12T001522Z.md.

### 2026-09-12 · structural · oat-project-implement · p04

phase-p04-outcome-20260912T020833Z: Phase p04 passed after one bounded review-fix round; see reviews/p04-review-2026-09-12T020833Z.md.

### 2026-09-12 · structural · oat-project-implement · final

final-review-round3-override-20260912: round 3 found one Medium
`SECRET_?KEY` sanitizer gap; the operator authorized one bounded `p06-t10`
fix, a fresh Phase 6 review, and exactly one fourth final review. This is not
an unlimited retry extension and does not consume Phase 6 recovery attempts.

### 2026-09-12 · structural · oat-project-implement · p06

phase-outcome-p06-20260912T200228Z: PASS; the operator-authorized re-review
closed the `SECRET_?KEY` finding with 0 Critical, 0 Important, 0 Medium, and 0
Minor; see reviews/p06-review-2026-09-12T200228Z.md. Phase 6 recovery usage
remains zero.

### 2026-09-12 · structural · oat-project-implement · final

final-review-round4-20260912T201509Z: PASS; 0 Critical, 0 Important, 0 Medium,
and the sole approved immutable-HTML whitespace Minor; see
reviews/final-review-2026-09-12T201509Z.md. The one-cycle operator override is
consumed; continue to the configured implementation exit gate.

### 2026-09-12 · structural · oat gate review · final

target=cursor-fable-5-1-high threshold=important findings=critical:0,important:1,medium:0,minor:2 exit=1 status=blocked artifact=.oat/projects/shared/agent-authored-recap/reviews/final-review-2026-09-12T203608Z.md run=6cf37a1e-a33f-40af-9b33-75937b421ac5

### 2026-09-12 · structural · oat-project-implement · p06

phase-outcome-p06-gate-remediation-20260912T230247Z: PASS; configured-gate
remediation attempt 1 completed with 47/47 tasks, both tracked packages passing
fresh verification, and 0 Critical, Important, Medium, or Minor findings; see
reviews/p06-review-2026-09-12T230247Z.md. Phase 6 recovery remains zero.

### 2026-09-13 · structural · oat gate review · final

target=cursor-fable-5-1-high threshold=important findings=critical:0,important:1,medium:0,minor:1 exit=1 status=blocked artifact=.oat/projects/shared/agent-authored-recap/reviews/final-review-2026-09-13T001401Z.md run=756b124f-64ad-492b-96d8-2c8c9d22bbd3

### 2026-09-13 · structural · oat-project-implement · final-gate-extension

final-gate-exception-authorized-20260913: operator authorized only p06-t17 and p06-t18, current-basis lifecycle verification, and exactly one additional configured exit-gate review beyond the exhausted 2/2 budget; Phase 6 recovery remains zero, and another blocking gate must stop.

### 2026-09-13 · structural · oat-project-implement · p06-t17-plan-correction

p06-t17-historical-fixture-sweep-correction-20260913: byte-exact archive-safe snapshots contain retired historical vocabulary, so p06-t17 now owns a narrowly tested exclusion for only its immutable fixture subtree; live-source detection remains required.

### 2026-09-13 · structural · oat-project-implement · p06-final-tasks

phase-p06-exceptional-remediation-complete-20260913: p06-t17 and p06-t18 completed at 50/50 total tasks; archive-free controls, narrow historical-fixture sweep exclusion, all repository gates, and immutable package checks passed; Phase 6 recovery remains zero and reviews are pending.

### 2026-09-13 · structural · oat-project-implement · p06

phase-outcome-p06-exceptional-20260913: PASS; 0 Critical, 0 Important, 0 Medium, 1 Minor state-pointer correction resolved during receive; 18/18 tasks complete, packages unchanged, and Phase 6 recovery remains zero; see reviews/archived/p06-review-2026-09-13T043549Z.md.

### 2026-09-13 · structural · oat-project-implement · final

final-current-basis-pass-20260913: PASS; 0 Critical, 0 Important, 0 Medium, 2 Minor; corrected the Phase 6 progress label and retained the approved immutable-HTML whitespace deferral; exactly one exceptional configured exit-gate review remains authorized; see reviews/archived/final-review-2026-09-13T044417Z.md.

### 2026-09-13 · structural · oat gate review · final

target=cursor-fable-5-1-high threshold=important findings=critical:0,important:0,medium:0,minor:0 exit=0 status=ok artifact=.oat/projects/shared/agent-authored-recap/reviews/final-review-2026-09-13T050025Z.md run=52787dbb-20c4-4fe7-b484-a72f0cd20c35
