---
oat_status: complete
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-09-21
oat_generated: true
oat_summary_last_task: p05-t01
oat_summary_revision_count: 0
oat_summary_includes_revisions: []
---

# Summary: claude-effort-levels

## Overview

OAT could select model and effort independently for Codex and Cursor dispatch, while Claude remained model-only even after Claude Code added effort controls to subagent definitions. This project added deterministic Claude model-plus-effort dispatch for managed reviewer and phase-implementer roles, taught orchestrators how to choose eligible effort levels, refreshed bundled recommendations, and stopped quick-start from asking about unrelated planning-mode gates.

## What Was Implemented

- Added a Claude target resolver that treats model and effort as separate axes, validates model/effort capability evidence, preserves model-only and inherited routes, and fails closed on unsupported or conflicting pairs.
- Added managed Claude role materialization and sync lifecycle support for reviewer and phase-implementer variants. Generated definitions carry the selected model and effort, use deterministic names, and are removed safely when they become obsolete.
- Bound native launch records to the exact selected variant and validated the materialized definition and launch payload through the production dispatch-record boundary.
- Updated provider guidance, implementation and review workflows, and the reviewer contract so Claude orchestrators select effort by task class while preserving capped-review policy and Opus-first hard-reasoning guidance.
- Updated the bundled Economy, Balanced, High, and Frontier recommendations with Claude effort candidates while preserving explicit user-owned cells and legacy model-only configuration.
- Scoped lifecycle-gate setup prompts to the active planning workflow plus downstream implementation. Quick-start no longer asks about lite, import-plan, or separate plan gates.
- Superseded the model-axis-only Claude decision, documented capability and precedence rules, regenerated provider projections, and bumped the five public packages to 0.3.2.

## Key Decisions

- **Claude effort-aware dispatch.** Managed Claude reviewer and phase-implementer targets may select model and effort independently. OAT materializes each explicit pair as a named subagent definition because Claude's Agent call has no per-call effort field. Model-only routes remain compatible, inherited routes leave both axes to the host, and version-aware capability evidence is required before OAT claims an effort pin. This decision supersedes the earlier model-axis-only constraint while retaining Opus-first routing.

## Design Deltas

No separate design artifact was required for this quick workflow. Final review added a version-aware Claude capability validator and corrected the ceiling-mechanism description before acceptance. The first configured exit-gate review then added phase p05 to align documentation with that fail-closed capability contract and current generated-role naming.

## Notable Challenges

- Claude runtime support varies by model generation and precedence layer. The implementation used disposable project and configuration roots plus provider-written observations to distinguish selected controls from effective runtime behavior without changing user settings.
- Review uncovered two subtle contract gaps after the first implementation pass: registry prose still described model-only Claude ceilings, and recognized effort values were not sufficient evidence that every versioned model supported them. Both were fixed and independently re-reviewed.
- Lifecycle closeout required two configured gate attempts. The first passed its blocking threshold but identified documentation drift; the second passed cleanly after p05 and fresh project-wide verification.

## Tradeoffs Made

- Explicit named variants increase generated-role count, but they provide the deterministic effort control Claude exposes today and avoid claiming a nonexistent per-call effort argument.
- Recommendation adoption preserves explicit existing cells, including model-only cells. Users opt into new effort-pinned candidates instead of receiving a silent migration.
- Structural equality for the Claude dispatch payload still relies on canonical key order in current producers and strict parsers. Review accepted this as a Low-risk deferral because mismatches fail closed before launch.

## Integration Notes

- Canonical agent and skill sources remain under `.agents`; provider views are generated through sync tooling and must not be edited as owners.
- Claude effort targets require a recognized versioned model ID or a family pin that resolves to one, plus provider capability evidence that declares `effort` support. Unknown declarations and unsupported pairs are rejected.
- The bundled ladder is a recommendation. Applying it fills missing cells and does not replace explicit user configuration.
- Generated definitions and dispatch records prove configured intent; provider-written transcript metadata records observed execution and any settings-cap divergence without overwriting that provenance.
- Planning entry points consider only their own configured gate plus downstream implementation, while preserving settings for workflows that are not active.
- Verification passed the full repository and release sequence after p05: check, type-check, test, build, skill-bump validation, origin-aware version validation, release validation, docs build, lint, and format. Live probes covered medium/high selection, capped review, inheritance, and runtime divergence.

## Follow-up Items

- Consider replacing order-sensitive `JSON.stringify` comparisons in the Claude target and dispatch-envelope paths with a canonical structural comparison if a real producer begins emitting equivalent objects in a different key order. The current paths produce canonical order and fail closed, so this remains a Low-priority deferred cleanup.

## Workflow Observations

### 2026-09-20 · structural · oat gate review · plan

target=cursor-fable-5-1-high threshold=high findings=critical:0,high:0,medium:1,low:2 exit=0 status=ok artifact=.oat/projects/shared/claude-effort-levels/reviews/artifact-plan-review-2026-09-20T235147Z.md run=6be6a7aa-cd6e-46ae-9efc-9dfb26efc3cc

### 2026-09-21 · structural · oat gate review · plan

target=cursor-fable-5-1-high threshold=high findings=critical:0,high:0,medium:0,low:2 exit=0 status=ok artifact=.oat/projects/shared/claude-effort-levels/reviews/artifact-plan-review-2026-09-21T000015Z.md run=4b0b73b8-93d9-4bd5-bfb3-0f43e55b9dfe

### 2026-09-21 · structural · oat-project-implement · p01

p01 passed after one bounded fix iteration; first review orchestration is recorded in reviews/p01-review-2026-09-21T005952Z.md; clean re-review: reviews/p01-review-2026-09-21T012030Z.md; idempotency p01-outcome-run1-20260921T012030Z

### 2026-09-21 · structural · oat-project-implement · p02

p02 passed after one bounded fix iteration; first review orchestration is recorded in reviews/p02-review-2026-09-21T020650Z.md; passing re-review with one Low: reviews/p02-review-2026-09-21T022325Z.md; idempotency p02-outcome-run1-20260921T022325Z

### 2026-09-21 · structural · oat-project-implement · p03

p03-outcome-run1-20260921T040439Z Phase p03 passed after two bounded fix rounds; reviews/p03-review-2026-09-21T040439Z.md is clean, and the attempted reconnaissance recorded in reviews/p03-review-2026-09-21T035607Z.md was rejected before start and reconciled inline.

### 2026-09-21 · structural · oat-project-implement · final

final-review-run2-20260921T144805Z Final lifecycle review passed with zero findings; attempted reconnaissance and inline reconciliation are recorded in reviews/final-review-2026-09-21T144805Z.md.

### 2026-09-21 · structural · oat gate review · final

target=cursor-fable-5-1-high threshold=high findings=critical:0,high:0,medium:1,low:4 exit=0 status=ok artifact=.oat/projects/shared/claude-effort-levels/reviews/final-review-2026-09-21T151012Z.md run=6e5693ec-5f6c-46a2-b26b-7585321b1903

### 2026-09-21 · structural · oat-project-implement · final

final-review-run3-20260921T153433Z Final lifecycle review passed its blocking threshold with one Low tracking-artifact wording finding; attempted reconnaissance and inline reconciliation are recorded in reviews/final-review-2026-09-21T153433Z.md.

### 2026-09-21 · structural · oat gate review · final

target=cursor-fable-5-1-high threshold=high findings=critical:0,high:0,medium:0,low:0 exit=0 status=ok artifact=.oat/projects/shared/claude-effort-levels/reviews/final-review-2026-09-21T203110Z.md run=a0edfdfe-585d-467c-b189-b5300b17d667
