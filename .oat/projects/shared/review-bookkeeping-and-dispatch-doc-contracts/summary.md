---
oat_status: complete
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-07-15
oat_generated: true
oat_summary_last_task: p05-t05
oat_summary_revision_count: 2
oat_summary_includes_revisions: [p04, p05]
---

# Summary: review-bookkeeping-and-dispatch-doc-contracts

## Overview

This project resolved lifecycle contract inconsistencies found during downstream OAT runs. It preserves independent review events without status regression, makes resolver dispatch instructions executable as written, recovers validated review artifacts at a gate timeout boundary, and closes terminal regressions in Reviews-ledger extraction, consumed-artifact routing, and timeout diagnostics.

## What Was Implemented

- Review bookkeeping now treats rows as append-ordered events identified by scope, type, and artifact filename. Writers claim only an unbound placeholder or append a new event, later updates match the artifact, and readers route from the latest matching event.
- Local and remote review receipt, implementation fix bookkeeping, finalization, cleanup, progress reporting, and control-plane recommendation routing follow the same event-distinct and monotonic contract.
- Resolver guidance now presents preferred selection and exact-candidate selection as mutually exclusive branches. Cross-runtime phase-gate prompts explicitly distinguish additional gate reviews from built-in root and final reviews.
- Project completion guidance names both supported orderings: completion before PR merge and merge before completion. An open PR is treated as a valid input to completion without adding a new configuration preference.
- Gate execution counts stdout and stderr bytes. After a timeout it re-scans for a unique, run-correlated artifact and routes a validated recovery through the existing envelope checks; successful recovery adds `lateCompletion: true`, while an unrecovered timeout reports `noOutputProduced`.
- Reviews-ledger readers now require the exact level-two `## Reviews` heading and stop at the next level-two section, so inline code references cannot hide authoritative rows or final status.
- CLI and control-plane routing correlate top-level project artifacts with their scope, type, artifact filename, and receive-eligible ledger state. Consumed `fixes_added` and `passed` artifacts no longer route back to receive, and remote receive stores dispositioned artifacts in history.
- Timeout handling reports duplicate run-ID matches and changed artifacts with mismatched run IDs through `targeting_correlation_failed`; only a timeout with no matching path and no diagnostic artifact returns the unrecoverable timeout envelope.
- Gate documentation now describes `OAT_GATE_EXEC_TIMEOUT_MS`, its 900,000 ms default, and the additive timeout fields.
- All five public packages, bundled release metadata, canonical skills, and provider views were synchronized and validated at `0.1.68`.

## Key Decisions

- **Append-ordered review event identity.** A review event is identified by scope, type, and artifact filename rather than scope alone. This preserves multiple legitimate same-scope reviews, prevents status regression, and allows latest-event routing without changing the Markdown table schema.
- **Additive timeout recovery envelopes.** Timeout recovery reuses run-ID correlation and existing project, timestamp, invocation, normalization, threshold, and handoff validation. The implementation adds `lateCompletion` and `noOutputProduced` instead of introducing a new positive status or changing attempt and routing semantics.
- **Mutually exclusive resolver selection paths.** Preferred selection and exact-candidate selection are separate branches; exact-candidate dispatch does not inherit `--preferred`. Runtime re-resolution and resolver-owned priority routing remain unchanged.
- **Documentation-only completion ordering.** Both complete-before-merge and merge-before-complete were already supported, so the project clarified routing and archival behavior instead of adding `workflow.completeBeforeMerge`.
- **Ledger-correlated actionability.** Top-level placement alone is not proof that a project review remains actionable. Receive routing requires the artifact-identified ledger event to remain `received`; later lifecycle states are consumed.
- **Diagnostic timeout precedence.** A timeout is unrecoverable only when correlation produced neither a matching run-ID path nor a changed diagnostic artifact. Correlation anomalies retain their more specific non-remediable result.

## Design Deltas

Quick mode produced no design artifact. During final fan-in, the full CLI suite found two descriptive dispatch lines missing from the autonomy prompt-site inventory; the project added both non-gate mappings, bumped `oat-project-autonomous`, re-synchronized provider views, and re-ran release validation. Two later terminal review rounds added bounded p04 and p05 fixes for actionable-review lookup, exact Reviews-section reads, archive identity, consumed-artifact routing, and timeout-correlation diagnostics.

## Notable Challenges

- The original review-row failure was a structural collision between two valid final review events, not a duplicate write. Characterization tests confirmed duplicate scopes were already parseable and narrowed the required code change to latest-event readers and consistent writer guidance.
- The timeout work had to recover late artifacts without disturbing the previously landed closed-stdin fix, execution-target resolution, availability checks, priority ordering, or ordinary envelope finalization.
- Review actionability required separating physical top-level placement from logical ledger state while preserving all-history lookup for other callers.
- The final timeout fix had to distinguish genuine zero-output timeouts from duplicate and mismatched correlation evidence without weakening existing artifact validation.
- Phase 2 link checks exposed two pre-existing fragment failures; the implementation verified them against baseline and did not misattribute them to this project.

## Tradeoffs Made

- The Markdown ledger remains agent-authored. A CLI-owned mutation helper would provide harder enforcement, but the bounded change used explicit shared contracts and characterization tests while keeping the control plane read-only.
- Timeout launch-defect handling is telemetry-only. `noOutputProduced` lets orchestrators distinguish zero-output timeouts without changing remediation-attempt accounting in this project.
- The unused fixed-threshold `ReviewGateVerdict.blocking` property was left unchanged because current routing derives status and exit behavior from the same threshold-aware computation and already has pinning coverage.

## Integration Notes

- Consumers must preserve duplicate-scope rows and treat table order as event order. Mutations should match an existing artifact filename; readers that need current state should select the latest matching scope and type.
- Project receive routing must correlate scope, type, and artifact filename with a `received` event. `fixes_added`, `fixes_completed`, and `passed` artifacts are consumed even if a stale file remains top-level.
- Gate consumers should continue routing on `status`, `receiveEligible`, and `handoff`. `lateCompletion` and `noOutputProduced` are additive diagnostics, not replacement statuses.
- Canonical skill changes live under `.agents/skills`; provider views are synchronization outputs. The shipped skill changes participate in the five-package lockstep release policy.
- PR #151 remains open. Root closeout must set `oat_phase_status: pr_open` while `oat_pr_status: open`; `oat_phase_status: complete` is invalid until the open-PR lifecycle advances.

## Verification

- Full CLI suite: 246 files and 2,896 tests passed.
- Full control-plane suite: 9 files and 51 tests passed.
- Repository formatting, canonical validation for 58 skills, lint, type checks, and docs production build passed.
- Provider synchronization, bundled `0.1.68` metadata assertion, and five-package `pnpm release:validate` passed.
