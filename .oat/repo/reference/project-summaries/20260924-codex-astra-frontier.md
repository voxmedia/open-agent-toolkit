---
oat_status: complete
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-09-24
oat_generated: true
oat_summary_last_task: p01-t04
oat_summary_revision_count: 0
oat_summary_includes_revisions: []
---

# Codex Astra Frontier project summary

## Overview

The project adds GPT-6 Astra as an exact model-and-effort option for Codex OAT
phase implementers and reviewers and places Astra high and xhigh in the bundled
Codex Frontier recommendation. It also compares the bundled provider ladders
with the dated accepted model-selection matrix and newer review-pending notes.

## What Was Implemented

- Admitted `gpt-6-astra` at low, medium, high, xhigh, and max. Generated ten
  pinned Codex role variants and registered them in `.codex/config.toml`.
- Changed the Codex Frontier recommendation to GPT-6 Sol xhigh, GPT-6 Astra
  high, then GPT-6 Astra xhigh. GPT-6 Sol max remains supported in the catalog;
  adoption preserves populated user-owned cells.
- Updated canonical dispatch guidance, CLI and provider-sync documentation,
  related tests, bundled assets, and the five lockstep public package versions
  to `0.3.3`.
- Recorded all twelve provider/tier comparison cells in `implementation.md`.
  The audit separates accepted vault guidance from newer review-pending notes
  and flags other ladder differences for separate follow-up.

## Key Decisions

- **Astra Frontier placement is user-directed.** The project
  does not claim that Astra has a measured advantage for local workloads;
  routine Codex task-class defaults continue to use Sol.
- **Astra effort catalog and Sol max support.** The supported Astra catalog has
  five effort levels through max. `ultra` is
  outside this product contract. GPT-6 Sol max stays available even though it
  leaves the bundled Frontier recommendation.
- **Model guidance source status separation.** The vault's accepted matrix and
  review-pending release notes remain distinct
  evidence states. This project records differences without retuning Claude or
  Cursor ladders or editing the vault.

## Verification and Reviews

An uncached workspace test run completed 10/10 Turbo tasks and 7,532 CLI
tests. Repository check, type-check, test, build, skill-bump, release-version,
release-validation, docs-build, lint, and format checks passed. A subsequent
focused suite passed 242 tests, and project sync planned zero changes.

The phase and manual final reviews found no Critical or High product findings.
Their Medium documentation and project-record findings were corrected. The
configured cross-runtime exit gate passed with zero Critical, High, or Medium
findings; its two Low wording findings were corrected without a repeat gate.
All consumed review artifacts are archived locally and indexed in `plan.md`.

## Follow-up Items

- Evaluate Astra on representative OAT work before making broader routing or
  performance-policy claims.
- Review the separately recorded Claude and Cursor ladder differences against
  accepted source guidance in a future model-selection update.

## Workflow Observations

### 2026-09-24 · structural · oat gate review · plan

target=cursor-gpt-5-6-sol-xhigh threshold=high findings=critical:0,high:1,medium:1,low:0 exit=1 status=blocked artifact=.oat/projects/shared/codex-astra-frontier/reviews/artifact-plan-review-2026-09-24T144531Z.md run=d83d6337-bc2b-4a9f-9f9e-65f9f444246d

### 2026-09-24 · structural · oat gate review · plan

target=cursor-gpt-5-6-sol-xhigh threshold=high findings=critical:0,high:1,medium:1,low:0 exit=1 status=blocked artifact=.oat/projects/shared/codex-astra-frontier/reviews/artifact-plan-review-2026-09-24T145158Z.md run=9f62ddde-50b4-47fd-8909-317e762948e5

### 2026-09-24 · structural · oat gate review · plan

target=cursor-gpt-5-6-sol-xhigh threshold=high findings=critical:0,high:2,medium:1,low:1 exit=1 status=blocked artifact=.oat/projects/shared/codex-astra-frontier/reviews/artifact-plan-review-2026-09-24T150001Z.md run=0128f0e6-eaa4-4440-ad24-1050ecd81df2

### 2026-09-24 · structural · oat gate review · plan

target=cursor-gpt-5-6-sol-xhigh threshold=high findings=critical:0,high:0,medium:2,low:0 exit=0 status=ok artifact=.oat/projects/shared/codex-astra-frontier/reviews/artifact-plan-review-2026-09-24T150841Z.md run=9837567e-df23-4af9-9081-485dab3c6184

### 2026-09-24 · structural · oat-project-implement · p01

astra-p01-20260924: phase verified; review attempted two bounded recon waves, 0 Critical/High and one Medium corrected in b8834e1fa; artifact reviews/archived/p01-review-2026-09-24T155712Z.md; fix-loop count 0.

### 2026-09-24 · structural · oat-project-implement · final-review

Final review passed with 0 Critical/High and one resolved Medium lifecycle-artifact finding; see reviews/archived/final-review-2026-09-24T161719Z.md. astra-final-review-20260924

### 2026-09-24 · structural · oat gate review · final

target=cursor-fable-5-1-high threshold=high findings=critical:0,high:0,medium:0,low:2 exit=0 status=ok artifact=.oat/projects/shared/codex-astra-frontier/reviews/final-review-2026-09-24T162937Z.md run=a0133ea7-07d2-4728-970b-641db774496e

### 2026-09-24 · structural · oat-project-review-receive · final

Passing gate review received and two Low wording findings addressed; see reviews/archived/final-review-2026-09-24T162937Z.md. astra-gate-receive-20260924
