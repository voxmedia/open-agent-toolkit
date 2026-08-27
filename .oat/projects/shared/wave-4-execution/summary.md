---
oat_status: complete
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-08-27
oat_generated: true
oat_summary_last_task: p01-t01
oat_summary_revision_count: 0
oat_summary_includes_revisions: []
---

# Summary: wave-4-execution

## Overview

Wave 4 ("Codex skill policy correction") — the final wave of the 2026-08-19
execution program — executed as a thin wrapper OAT project over the immutable
external plan `2026-08-19-refresh-codex-skill-routing.md`. One solo lane
(`p01`) on the integration checkout `wave-4-execution`, from main `3c135e21`
(public packages 0.2.35). Quick mode: discovery + wrapper plan; the external
plan is the requirements. The plan's STOP #2 (live `codex exec --help` has no
`--full-auto`, which the skill used) was reported at the drift refresh and
reconciled non-narrowingly by the operator (option 1, 2026-08-27) inside the
plan's own step 2.

## What Was Implemented

- **Authority-based model/effort selection:** `codex-skill` classifies the
  requested work by OAT task class and takes the model and reasoning effort
  from `.agents/skills/subagent-orchestration/references/provider-codex.md`,
  named as the source of truth (dated examples never override it; compatibility
  snapshots are never defaults); routes are offered as one combined model+effort
  choice; a valid user-supplied pair is honored — below-floor pairings are
  reported once without blocking, direct-API specialist classifications confirm
  before launching; if the reference is unavailable the skill stops and asks.
- **Conditional, authorized repository-check bypass:** `--skip-git-repo-check`
  removed from ordinary initial-run, `-C`, and resume commands; used only for a
  non-Git target directory (or another documented Codex requirement) with the
  reason stated and `AskUserQuestion` authorization.
- **Examples validated against codex-cli 0.149.1:** resume examples normalized
  to the live `codex exec resume` usage; the dead `--full-auto` replaced —
  `--approve-for-me` only with `-s workspace-write`, network inside a write
  sandbox via `-c sandbox_workspace_write.network_access=true`,
  `-s danger-full-access` reserved for genuine broad-filesystem needs, the
  bypass-all flag for externally sandboxed automation; sandbox and high-impact
  authorization rules retained and tightened.
- **Prose contract test** (`.agents/skills/codex-skill/tests/codex-skill-contract.test.mjs`,
  8 cases): logical-line normalization, a structural exemption rule (an
  exempted line must not itself run the command), semantic assertions; rejects
  the stale `gpt-5.3-codex`/`gpt-5.4` pair and any single retired slug
  (without a `gpt-5.4-mini` false positive), a blanket or example-default
  bypass across every command-ish line including Quick Reference rows and
  fenced blocks, a removed authority sentence, and a blocking below-floor
  clause. Root-run 36-probe mutation matrix (with isolation controls) in the required state; two phrase-level guard residuals ledgered to backlog at the cycle cap.
- **Release bookkeeping:** `codex-skill` 1.2.0 → 1.3.0 (once); lockstep
  0.2.35 → 0.2.36 across the five public packages;
  `packages/cli/assets/public-package-versions.json` regenerated; lockfile
  unchanged. `codex-skill` is repo-only (not bundled).
- **Tests:** `pnpm test:skills` 586/586 (578 + 8 new); focused 8/8; CLI suite
  273 files / 3695 tests. `SKILL.md` is byte-identical since `39121c35`; every
  later commit hardened the contract test only.

Reviews: plan artifact gate passed on round 1 (`cursor-gpt-5-6-sol-xhigh`,
run `0d369be4`, one medium — mutation probes mapped into the wrapper
checklist); p01 code review three rounds (0C/0I/3M/4m → 0C/0I/3M/2m →
0C/0I/1M/1m) with append-only fixes `d9ce0c33`, `39121c35`, and — at the
cycle cap — the reviewer-specified, root-verified `44fb2327` (test file only);
final-scope review three rounds (0C/1I/4M/1m → 0C/0I/2M/1m → 0C/0I/3M/0m)
with append-only test-only fixes `94d6f74d`, `495d4b9a`, `601c950b` (the last a
reviewer-specified, root-verified bounded fix at the cap); eighteen Codex
cross-model rounds across seven commits (a sandbox-weakening `--full-auto`
mapping caught before commit); root final verification 10/10 at `6075a705`;
configured exit gate generation 1 passed on `cursor-gpt-5-6-sol-xhigh` (run
`10c732b5`, 0C/0I/3M/0m — the two ledgered residuals plus closeout prose).

## Key Decisions

1. **Reconcile the STOP #2 contradiction non-narrowingly** (operator option 1):
   replacing the dead `--full-auto` with the live documented approval flags is
   part of the plan's step 2 and Done criterion 4 — same file, no behavior
   weakening, no undocumented flags — with each example row re-evaluated for
   sandbox semantics rather than swapped mechanically.
2. **Guard structurally, not by keyword:** after three guard widenings each
   opened a narrower hole, the contract test keys exemptions on "an exempted
   line must not itself run the command" and normalizes soft-wrapped prose to
   logical lines; wording dispositions get their own assertion.
3. **Cycle-cap disposition:** at the third p01 review cycle the reviewer's
   verified patches were applied as a bounded root-verified fix (22-probe
   runner, `NO-TESTS-RAN` guard) and independently verified by the final
   review — no self-authorized fourth cycle.
4. **Cross-model review stopping rule:** two consecutive clean rounds or
   below-Medium findings; root dispositions are settled (Codex re-litigated one
   twice).

## Design Deltas

N/A (quick mode; no `design.md`). Nine Codex-review-driven wording edits beyond
the plan's minimal text (combined route choice, warn-not-block, direct-API-only
handling, effort as the exact reference string, resume configuration wording,
sandbox row split) were judged in scope and non-narrowing by the phase
reviewers.

## Notable Challenges

- The program-level live-guidance reread caught a dead flag the plan's authoring
  evidence missed, and the implementer's per-subcommand help capture found that
  `codex exec resume` lacks `-s`, `-C`, and `--approve-for-me`.
- Guard coverage took three rounds to converge (bare `only` matched
  `read-only`; backtick-keyed derivation missed fenced examples; keyword
  allowlists exempted prohibition-shaped sentences).
- Two committed-state-only gates (`release:check-versions`,
  `check:skill-bumps`) report no-op passes before the commit; post-commit
  re-runs are now standing.

## Integration Notes

- `provider-codex.md` stays a consumed authority: the live docs list a new
  `ultra` effort tier and note GPT-5.4 / 5.4-mini retire from Codex on
  2026-08-31 (its `review_after` is 2026-09-08) — filed as a follow-up.
- `.oat/sync/manifest.json` `oatVersion` sits at 0.2.35 while packages are
  0.2.36 (pre-existing pattern; `BL-260826-warn-on-silent-oatversion`).

## Follow-up Items

- Backlog candidates (file at wave close): widen the below-floor guard from the
  phrase literal to `\bconfirm`; span-based prose guards + anchored probe
  records + a generalized probe runner for skill contract tests; refresh
  `provider-codex.md` (ultra tier, GPT-5.4 retirement, per-subcommand flags).
- Program close: generate (not publish) the program recap; the completion tail
  across all four wrapper projects is HUMAN-GATED.

## Associated Issues

- `BL-260819-refresh-codex-skill-model` — closed by this wave.

## Workflow Observations

### 2026-08-27 · structural · oat gate review · plan

target=cursor-gpt-5-6-sol-xhigh threshold=important findings=critical:0,important:0,medium:1,minor:0 exit=0 status=ok artifact=.oat/projects/shared/wave-4-execution/reviews/artifact-plan-review-2026-08-27T020212Z.md
