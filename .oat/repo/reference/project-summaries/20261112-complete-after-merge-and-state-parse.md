---
oat_status: complete
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-11-11
oat_generated: true
oat_summary_phase_fingerprint: 5ee26b38a7fae641528c0dbd54cb90094fbe7031b2a0165dbd23a06490f278cb
oat_summary_revision_count: 0
oat_summary_includes_revisions: []
oat_summary_learnings_fingerprint: none
---

# Project Summary: complete-after-merge-and-state-parse

## Overview

This brief project addresses goal-delivery-freshness retro UP-02 and UP-03: completion on a branch whose PR has already merged, and invalid YAML introduced by manual lifecycle state edits. Both phase-units are accepted and the independent final review and configured exit gate have passed. PR #421 was squash-merged on 2026-11-11 as `74487725450e7a9ab851150e2c154d3733d7a857`; implementation delivery is complete.

## What Was Implemented

- **Outcome 1 — completion after merge (p02):** completion observes the tracked PR live before its first write. Durable shared/synced projects prepare or reuse a bookkeeping branch from the updated PR base, preserve the original merged PR identity and body, and publish a separate follow-up under existing authority. Goal bookkeeping stays outside delivery registration and coverage. Local projects retain their branch and require no follow-up. A terminal synced archive created while the original PR was open can resume after that PR merges: exact receipt-owned results already on the fetched base, including squash merges, finish without a push, new PR, or recap/body/link rewrite. A continuation carrying the verified terminal receipt skips Step 8.6 local-export checks and rendering; earlier receipt recovery still uses its existing current-checkout preconditions. Pending bookkeeping or divergent local work stops with the pointer and receipt retained for recovery. Open, absent and closed-unmerged interactive paths retain their existing behavior; the automatic companion continues to refuse closed PRs.
- **Outcome 2 — state parsing (p01):** the installed read-only `oat project check-state <project-path>` command rejects missing, non-mapping or malformed YAML frontmatter. Canonical instructions require it at 88 manual write locations across 24 writing skills, stopping before commit or continuation on failure. It reuses the strict parser and preserves its legacy LF fence grammar.
- The automatic companion binds follow-up authority to each project/original PR, resets per-project publication state in batches, and routes missing authority through interactive completion. Wave callers retain their existing checkpoint authority.
- Human documentation, bundled shared instructions, affected skill/role versions, and all five public package versions (0.3.50) are aligned. `packages/cli/AGENTS.md` documents the new command boundary.

## Key Decisions

- **Reuse authority for merged completion:** existing explicit authority can cover the fresh branch and separate bookkeeping PR, including goal mode. `PR_ON_COMPLETE` and autonomy opt-in alone do not authorize that PR. This replaces the per-run goal prompt and the old unconditional companion prohibition on creating a PR, while retaining every other completion precondition and goal coverage boundary.
- **Check manual lifecycle state parsing:** add a shared installed parse-only check after manual writes instead of migrating all writers to setters. The check preserves bytes and validates YAML shape, not lifecycle semantics, provenance or field correctness.

## Tradeoffs Made

The work uses existing completion, archive and exact-path commit routines rather than a transaction framework. GitHub responses are substituted in executable tests; real local Git repositories prove ancestry, branch reuse and exact diffs. Instruction coverage cannot prove that every future agent follows the instructions. Template cleanup, semantic validation, broader gate freshness redesign and UP-01 remain outside scope.

## Verification and Review

The clean executable candidate `417ef4401e743773bd8dfca75f02157e375357c4` passed all 15 recorded checks, including 29 completion tests and 1,272 isolated contracts. The final docs candidate `f916330bde65ba7ad1024843ca4ac2ce88f3939d` passed all 11 required CI-order checks against unchanged integration base `ddd67fb5541bac2959ebb64ed82f4287f4f56698`. Per-command results, cache replay and clean-tree inputs are recorded in the journal and evidence manifests. Runtime was Node 22.23.3 and pnpm 10.13.1 on Darwin arm64; exact pinned Node 22.23.4 was unavailable.

The production correction at clean `128dd5163cb27c920f94b58efc49960dfdf07dc6` also passed a forced workspace run (12 tasks, zero cache hits, 9,708 CLI tests). Later checks include cached workspace tasks; no later forced-run claim is made. Independent review repeated the carried-receipt old-Step-8.6 failure, the corrected five-outcome controls and the guard-neutralization proof. A fresh invocation from a stale checkout stops earlier in archive discovery; the carried-receipt proof is not an end-to-end fresh-invocation claim.

The packed CLI was exercised outside the checkout. Historical incident state at `a323ee7ce` fails with BAD_INDENT; its parent and commented valid controls pass without byte changes, and a failing check stops before commit. Real Git and archive-producer probes cover merged/open/absent/closed PRs, local/shared/synced scopes, follow-up reuse, authority refusals, bash/zsh push guards, and merged-later terminal receipts. Neutralizing pending-path or divergent-input guards breaks the corresponding refusal tests. GitHub responses are substituted; no live GitHub publication is claimed as test evidence.

CI caught a macOS-only temporary path in an earlier test fixture. The portable temporary-directory correction passed on the prior pushed heads `fc007d4` and `7889c8d`; Linux CI, release dry-run and Bugbot all passed on final head `f374fbf24fe4405407e8a1df12493ac303452316` before merge. This is distinct from the local proof above.

Independent Opus 5.5 High confirmation at `f916330b` has no findings; the prior behavioral review at `417ef440` independently verified the carried-receipt correction, with its documentation Low corrected and confirmed. Configured exit gate generation 6 (run `daa8c9de-12be-4648-8980-c53395268196`, Opus 5.5 High) passed with 0 Critical, 0 High, 0 Medium and 2 Low bookkeeping findings. Both were fixed at receive; raw counts are preserved, with no waiver, retry or additional review cycle. Earlier review and gate events remain preserved, including the explicitly retired result lacking reviewed-head provenance. No waiver was used.

## Notable Challenges

Review caught integration regressions beyond the central merged path: literal null PR values, automatic companion authority, follow-up body sync eligibility, batch flag leakage, local scope, program-close routing, the existing closed-PR interactive path and zsh syntax. All were corrected and independently reviewed. Remote review then identified the merged-later archive-resume regression; the fix preserves delivered artifacts and refuses undelivered or divergent inputs without discarding work. Remote review also exposed the unused local link-rendering check on a carried-receipt continuation; the corrected path preserves HEAD and avoids publication. p01 recovery used 2 of 10 attempts; p02 used 1 of 10 for a mechanically bounded pinned-wording correction, successfully verified and settled. Early temporary-parent test contamination and runtime limitations remain disclosed in the journal.

## Integration Notes

Use `oat project check-state <project-path>` after manual lifecycle frontmatter edits and stop on nonzero before commit or further effects. The manual-writer inventory and completion research map exact behavior and proof to the accepted phases. Neither a successful parser check nor prose-contract tests validate lifecycle state semantics. No live GitHub publication was claimed as test evidence.

## Explainer Outcome

Skipped by explicit operator choice (interactive); no recap run was generated.

## References

- Project Brief: `plan.md`
- Accepted phases, review receipts and exact verification inputs: `implementation.md`
- Writer coverage: `references/research/manual-state-writers.md`
- Completion evidence: `references/research/completion-after-merge.md`
- Source: `.oat/repo/reference/project-summaries/20261109-goal-delivery-freshness.md`
