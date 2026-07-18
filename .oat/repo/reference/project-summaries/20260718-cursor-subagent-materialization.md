---
oat_status: complete
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-07-18
oat_generated: true
oat_summary_last_task: p07-t01
oat_summary_revision_count: 0
oat_summary_includes_revisions: []
---

# Summary: cursor-subagent-materialization

## Overview

OAT could materialize model-pinned Codex roles but Cursor dispatch was limited to the narrower native catalogue and an opaque model argument. This project added Cursor-native materialized reviewer and phase-implementer variants so OAT can safely use Cursor's multi-family model catalogue while preserving explicit ownership, deterministic sync behavior, and honest provenance.

## What Was Implemented

- Extracted a provider-neutral materialization-extension lifecycle while preserving provider-owned Codex TOML and Cursor Markdown codecs.
- Added an explicit 15-entry Cursor mapping registry, translating ladder IDs into live-verified base-ID-plus-bracket frontmatter pins for GPT, Claude, Grok, and Composer.
- Materialized approximately 30 deterministic Cursor reviewer and phase-implementer variants with managed owner markers for supported, user, and project configuration.
- Integrated Cursor variants with sync, status, init, doctor, stray detection, collision handling, partial filters, failure propagation, and idempotence.
- Changed managed Cursor dispatch from opaque model arguments to exact native materialized-role selection, with configured controls separated from unobserved runtime identity.
- Shipped a multi-family Cursor dispatch recommendation and updated canonical dispatch, planning, review, and workflow-gate guidance.
- Added declared planning-producer identity and aggregate configured-target family fallback so gate reviews avoid producer families without promoting inferred data into runtime identity.
- Preserved configured model provenance for legacy bare Cursor targets after successful materialized-role compilation.
- Reconciled current `origin/main` and advanced all five public packages in lockstep to `0.1.74`.

## Key Decisions

- **Provider-neutral lifecycle with provider-owned codecs.** Shared orchestration computes and applies materialization plans, while Codex and Cursor retain native formats, marker parsing, target collection, and collision rules.
- **Explicit verified Cursor mapping registry.** Ladder IDs are never parsed into frontmatter pins. Every shipped mapping is a recorded flat-ID-to-bracket-form pair approved by an independent Cursor IDE launch.
- **Launcher-owned configured provenance.** Variant selection proves what OAT configured, not which model Cursor ultimately ran. Runtime model and effort remain `not-reported` without independent evidence.
- **Native materialized role first.** Managed Cursor dispatch launches the resolver-selected native agent type. Alternate routes are eligible only after a recorded pre-start role-selection rejection.
- **Family exclusion without identity promotion.** Declared planning identity and configured stamp targets may inform diversity routing at their original confidence, but neither becomes observed producer or reviewer runtime identity.

## Design Deltas

- Cursor IDE lifecycle hooks supplied live mapping evidence because the tested Cursor CLI did not emit sufficient child start/stop hook coverage.
- Production behavior does not depend on undocumented `CURSOR_CONVERSATION_ID`; hook correlation remains verification-only.
- Final/range gate aggregation gained a bounded configured-target family fallback when stamped producer identity is unknown or not claimable.
- Merging `origin/main` required advancing the planned lockstep release from `0.1.73` to `0.1.74`.
- The sole Important final-review finding was fixed; the operator explicitly waived another final re-review after the full post-merge release boundary passed.

## Notable Challenges

- Live probes corrected several plausible but invalid pin forms: GPT required `reasoning`, Fable and Grok required different base IDs, and Composer required explicit `fast=true`.
- Parallel worktree bootstrap initially dirtied the sync manifest and invalidated the run. Recovery recreated clean worktrees and committed bootstrap-owned sync metadata before relaunch.
- Release validation exposed stale autonomy-inventory metadata and a doctor fixture that accidentally invoked the live Cursor catalogue; both were repaired and revalidated.
- Final cross-family gate reviewers twice exhausted the original 30-minute budget immediately before artifact creation. The configured code-review timeout was raised to 40 minutes, and the later manual review produced one bounded finding.
- Integrating `origin/main` required reconciling autonomy prompt-site coverage, generated sync state, and skill-version assertions while preserving both feature sets.

## Tradeoffs Made

- The explicit mapping table requires a live verification row for each new model, but avoids undocumented syntax generation and silent mis-pinning.
- Materialized files increase generated surface area, but eliminate hand-maintained role copies and keep canonical instructions authoritative.
- Configured provenance is less assertive than runtime verification, but accurately reflects Cursor's silent fallback behavior.
- Configured target families may provide lower-confidence diversity exclusions, but known producer identities always remain authoritative.

## Integration Notes

- New Cursor mappings must be verified through the same mapping-specific Cursor IDE lane before entering the registry.
- Canonical skill or agent changes still require frontmatter version bumps, provider-view sync, lockstep public-package versioning, and `pnpm release:validate`.
- Managed Cursor consumers should use `providers.cursor.dispatchArgs.variant`; model strings remain opaque inside the registry and resolver.

## Follow-up Items

- Evaluate large-context reviewer variants using verified `context` parameters.
- Revisit definition-level background reviewer variants alongside gate dispatch-mode work.
- Extend materialization to additional roles only after validating demand and mapping coverage.
- Explore parallel review decomposition for large final-review scopes that approach single-reviewer time budgets.
