---
oat_status: complete
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-11-11
oat_generated: true
oat_summary_phase_fingerprint: b2adb3f3bb7776fe1641666e4d62f178adf098db12a738719c7c9a9faa536310
oat_summary_revision_count: 0
oat_summary_includes_revisions: []
oat_summary_learnings_fingerprint: none
---

# Project Summary: complete-after-merge-and-state-parse

## Overview

This brief project addresses goal-delivery-freshness retro UP-02 and UP-03: completion on a branch whose PR has already merged, and invalid YAML introduced by manual lifecycle state edits. Both phase-units are accepted and the independent final review and configured exit gate have passed. PR delivery is the remaining endpoint.

## What Was Implemented

- **Outcome 1 — completion after merge (p02):** completion observes the tracked PR live before its first write. Durable shared/synced projects prepare or reuse a bookkeeping branch from the updated PR base, preserve the original merged PR identity and body, and publish a separate follow-up under existing authority. Goal bookkeeping stays outside delivery registration and coverage. Local projects retain their branch and require no follow-up. Open, absent and closed-unmerged interactive paths retain their existing behavior; the automatic companion continues to refuse closed PRs.
- **Outcome 2 — state parsing (p01):** the installed read-only `oat project check-state <project-path>` command rejects missing, non-mapping or malformed YAML frontmatter. Canonical instructions require it at 88 manual write locations across 24 writing skills, stopping before commit or continuation on failure. It reuses the strict parser and preserves its legacy LF fence grammar.
- The automatic companion binds follow-up authority to each project/original PR, resets per-project publication state in batches, and routes missing authority through interactive completion. Wave callers retain their existing checkpoint authority.
- Human documentation, bundled shared instructions, affected skill/role versions, and all five public package versions (0.3.50) are aligned. `packages/cli/AGENTS.md` documents the new command boundary.

## Key Decisions

- **Reuse authority for merged completion:** existing explicit authority can cover the fresh branch and separate bookkeeping PR, including goal mode. `PR_ON_COMPLETE` and autonomy opt-in alone do not authorize that PR. This replaces the per-run goal prompt and the old unconditional companion prohibition on creating a PR, while retaining every other completion precondition and goal coverage boundary.
- **Check manual lifecycle state parsing:** add a shared installed parse-only check after manual writes instead of migrating all writers to setters. The check preserves bytes and validates YAML shape, not lifecycle semantics, provenance or field correctness.

## Tradeoffs Made

The work uses existing completion, archive and exact-path commit routines rather than a transaction framework. GitHub responses are substituted in executable tests; real local Git repositories prove ancestry, branch reuse and exact diffs. Instruction coverage cannot prove that every future agent follows the instructions. Template cleanup, semantic validation, broader gate freshness redesign and UP-01 remain outside scope.

## Verification and Review

The clean tested candidate is `09d08130659962709b68e2a8f5bcfe05f34ae725`, integration base `ddd67fb5541bac2959ebb64ed82f4287f4f56698`. All 15 recorded checks passed: required repository gates in order, forced workspace tests, root suites, isolated contracts, lint/format, release validation and generated docs freshness. The forced run executed 12 tasks with zero cache hits, including 9,708 CLI tests. Isolated contracts passed 1,272 tests. Runtime was Node 22.23.3 and pnpm 10.13.1 on Darwin arm64; exact pinned Node 22.23.4 was unavailable.

The packed CLI was exercised outside the checkout. Historical incident state at `a323ee7ce` fails with BAD_INDENT, its parent and commented valid controls pass without byte changes, and a failing check stops before commit. Real Git probes exercise merged/open/absent/closed PRs, local/shared/synced scopes, follow-up reuse, authority refusals and bash/zsh push guards. Negative and can-fail controls are recorded with each accepted phase.

Final Opus 5.5 High review at the candidate reported zero findings. Configured gate `9a3a24f8-e4ea-47d4-ac64-67dc109e8d26` passed with 0 Critical, 0 High, 0 Medium and one Low review-table layout finding, fixed at receive without another cycle. The gate's exact event and durable receive commit are bound in state. No gate waiver was used and no remediation attempt consumed. The prior gate generation was explicitly retired because installed CLI 0.3.46 omitted reviewedHead; its raw evidence remains preserved. The replacement used branch-local CLI 0.3.50 without changing global installation or configuration.

## Notable Challenges

Review caught integration regressions beyond the central merged path: literal null PR values, automatic companion authority, follow-up body sync eligibility, batch flag leakage, local scope, program-close routing, the existing closed-PR interactive path and zsh syntax. All were corrected and independently reviewed. p01 recovery used 2 of 10 attempts; p02 used none. Early temporary-parent test contamination and runtime limitations remain disclosed in the journal.

## Integration Notes

Use `oat project check-state <project-path>` after manual lifecycle frontmatter edits and stop on nonzero before commit or further effects. The manual-writer inventory and completion research map exact behavior and proof to the accepted phases. Neither a successful parser check nor prose-contract tests validate lifecycle state semantics. No live GitHub publication was claimed as test evidence.

## References

- Project Brief: `plan.md`
- Accepted phases, review receipts and exact verification inputs: `implementation.md`
- Writer coverage: `references/research/manual-state-writers.md`
- Completion evidence: `references/research/completion-after-merge.md`
- Source: `.oat/repo/reference/project-summaries/20261109-goal-delivery-freshness.md`
