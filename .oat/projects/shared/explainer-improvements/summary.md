---
oat_status: complete
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-07-29
oat_generated: true
oat_summary_last_task: p05-t07
oat_summary_revision_count: 0
oat_summary_includes_revisions: []
---

# Summary: Explainer Improvements

## Overview

The explainer runtime could produce mechanically valid artifacts but did not
reliably apply visual judgment, preserve whole-set cohesion, or prove that
rendered output had passed trustworthy browser review. This project restored
golden-quality unattended project recaps while preserving the existing
fact-reconciliation, safety, provenance, approval, and durability foundations.

## What Was Implemented

- Shipped complete upstream MIT notices in affected package payloads and added
  packed-artifact provenance checks. Replaced the oversized visual backlog item
  with ordered, independently verifiable outcomes and retained additional
  workflow recipes as a separate P2 follow-up.
- Bundled versioned visual-authoring and review guidance and introduced
  provider-neutral set-plan and visual-review contracts. Unattended project
  recaps now plan one adaptive set with a required hub, architecture view, and
  deck plus source-backed optional artifacts.
- Added real Chromium evidence at 320, 768, and 1440 pixels, an independent
  whole-set visual critic, and a hard state-machine cap of one targeted
  correction followed by one final review. Missing or failed evidence ends as
  `built-needs-review` before publication, finalization, durability, or archive
  export.
- Bound successful review to fully decoded PNG pixels, geometry, browser
  metrics, trusted Chromium runtime identity, complete package coverage, and
  immutable evidence hashes shared across core, adapter, finalizer, archive,
  release, and smoke consumers.
- Added non-linear graph detection and artistic rerouting, complete semantic
  graph validation, commit-pinned source backlinks, and a manifest-derived
  initiative catalog with publish-root URL validation.
- Hardened approval resume around authenticated `ekrt2` tokens, the complete
  canonical request, and the original canonical output root. Legacy `ekrt1`
  downgrade paths and coordinated retained-state or symlink retarget attacks
  fail closed.
- Passed all three real-Chromium golden benchmarks: simple project, non-linear
  architecture, and archived project recap. All 62 implementation tasks and
  final release closure checks completed.

## Key Decisions

- **Adaptive recaps share one immutable set plan.** Every artifact uses the same
  terminology, status, number, source-coverage, portfolio, draft, and visual
  intent ledger so whole-set cohesion is a runtime contract rather than an
  author convention.
- **Unattended recap publication requires trusted browser review.** Browser
  evidence and independent visual criticism are mandatory for unattended
  adaptive recaps; absence or invalidity preserves a manual-review handoff and
  blocks every durability and publication consumer.
- **Visual correction is capped at one pass.** The runtime permits one targeted
  correction and one final review, retaining every attempt and never recursing.
  This preserves bounded execution while still putting visual judgment in the
  production loop.
- **Resume accepts authenticated current tokens only.** Transparent legacy
  resume compatibility was explicitly traded away after mutable retained state
  repeatedly enabled downgrade and relocation attacks. Current resumes bind
  the complete request and canonical output root to external approval state.
- **Non-linear graphs use the artistic path.** Branches, fan-ins, and cycles are
  detected and rerouted instead of being silently flattened or forcing a
  general graph-layout engine into the deterministic renderer.

## Design Deltas

- PR #179 had already merged before this imported project began, so the required
  notice fix shipped immediately afterward rather than before that merge.
- The imported 19-task outline expanded to 62 tasks as clean builds, full-suite
  checks, and adversarial reviews exposed version drift, incomplete evidence
  binding, consumer mismatches, graph semantic gaps, and resume attacks.
- The original one-remediation default was raised by operator approval for
  bounded phase closure. The final project contract remained one review and one
  authorized Critical/Important fix pass; that fix pass completed without a
  second final review.

## Notable Challenges

- Green fixture tests initially accepted pseudo-PNG bytes and callback-asserted
  browser identity. Closure required real image decoding, geometry-aware hashes,
  branded browser sessions, and one canonical evidence contract across every
  consumer.
- Resume hardening required several adversarial iterations because mutable
  retained projections, symlink retargeting, and legacy-token eligibility could
  be coordinated. The final boundary authenticates immutable external state
  rather than cross-checking mutable records.
- Generated golden HTML contained trailing whitespace from shared substitution
  logic. The generator boundary was corrected and all retained runtime evidence
  was regenerated cleanly.

## Tradeoffs Made

- Deterministic Markdown recap rendering remains an explicit simpler fallback,
  not an automatic downgrade from the artistic golden path.
- Interactive recap compatibility remains mode-aware; strict browser-review
  evidence gates apply to unattended adaptive recaps without reclassifying
  intentional partial `built-needs-review` handoffs as malformed packages.
- Pixel identity with the personal kit was not required. Equivalent workflow,
  evidence, bounded review, first-viewport clarity, and internal cohesion are
  the conformance standard.

## Integration Notes

- The OAT adapter owns provider resolution for set planning, browser sessions,
  artifact authorship, and independent visual review. Core runtime contracts
  remain provider-neutral.
- Successful package consumers must use the shared mode-aware coverage contract;
  caller-supplied browser names, versions, screenshot claims, or partial success
  evidence are not trustworthy.
- Canonical skills changed in this project were versioned and synced to provider
  views. Public package functionality and bundled assets use the repository's
  five-package lockstep release policy.

## Follow-up Items

- `BL-260728-additional-visual-workflows` remains open at P2 to evaluate diff
  review, plan review, fact-check, dashboards, complex tables, and richer
  compositions based on observed demand. These recipes are intentionally
  outside the golden unattended recap recovery.
