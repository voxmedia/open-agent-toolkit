---
oat_status: complete
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-09-06
oat_generated: true
oat_summary_last_task: p05-t03
oat_summary_revision_count: 0
oat_summary_includes_revisions: []
---

# Summary: wave-2-execution

## Overview

Wave 2 ("skill contract truthfulness") of the 2026-08-31 execution program:
five external plans, each an immutable implementation contract, run as a thin
wrapper project so the fixes could execute in parallel worktrees with
root-owned reviews, one lockstep release bump, and full integration gates
after every fan-in. The motivating defects were bundled skills whose prose
described inventories, tools, and steps that did not match what shipped; a
safety guard in the codex skill that a one-sentence rewrite could bypass; docs
pages that mirrored guarded skill prose without any test; lifecycle skills that
told orchestrators to "run skill X" from memory; and no recovery path for a
child agent's staged work when its handle was lost.

## What Was Implemented

- **Bundled-skill contract repairs (p01).** `oat-doctor` declares the pack
  inventory exactly as `PACK_MANIFEST` ships it, `oat-brainstorm` no longer
  promises a later doctor run, `oat-idea-summarize` declares `Bash` and `Glob`,
  and `analyze` describes one ten-step model; each repair carries its own
  contract group in `packages/cli/src/validation/skills.test.ts`, including a
  bounded positive invariant with inline negative controls for the brainstorm
  guard and a manifest-membership assertion for the doctor example table.
- **Codex-skill anaphora guard (p02).** The below-floor guard in
  `codex-skill/tests/codex-skill-contract.test.mjs` attaches anaphoric
  continuations ("In that case…", list-marker, blockquote, scenario and
  circumstance forms) to the non-blocking anchor and rejects them, while the
  legitimate direct-API confirmation stays accepted as an independent clause;
  15 rejected, 6 accepted, and 6 documented-boundary cases are pinned.
- **Docs-app mirrors of guarded prose (p03).** `explainer-kit/tests/contracts.test.mjs`
  runs the publication-boundary matrix over both the canonical reference and
  the docs page, with sentence-scoped, negation- and mutation-aware positive
  patterns and a whole-document forbidden-phrase guard that is proven
  load-bearing through the real matrix; the docs page names the catalog
  requirement and its canonical owner.
- **Mandatory skill-load clauses (p04).** Thirteen lifecycle skills require
  loading the current `SKILL.md` of every OAT skill they direct an orchestrator
  to execute, or record a narrow inline fallback; the new
  `packages/cli/src/validation/named-skill-load-contract.test.ts` sweeps the
  bounded surface (verb and anaphor detection, exemptions bound to exactly one
  sentence, stray-fence detection, corpus floors). Three four-backtick fences
  that had hidden whole steps of `oat-project-plan`,
  `oat-project-review-receive`, and `oat-project-revise` are repaired, and the
  plan skill now stops with a handoff when `design.md` is missing instead of
  reading as a silent continuation.
- **Patch-and-restore recovery for lost child handles (p05).**
  `oat-project-implement/scripts/capture-dirty-tree.mjs` captures a child's
  staged, unstaged, and untracked work into a digest-verified, sealed artifact
  outside the worktree (quiescence check, realpath containment, exclusive
  creates, mandatory phase bound, expected-head reconciliation, scoped literal
  pathspecs, exec-bit authentication, fail-closed on renames and mixed states,
  guarded invocations in every prose block, symlinked-install fail-closed), and
  `phase-execution.md` plus `oat-phase-implementer.md` (1.1.1 → 1.1.2) define
  `recovered_patch` as the one permitted pre-existing dirt, applied and
  committed first.
- **Release.** Lockstep public packages 0.2.56 → 0.2.57 in one fan-in bump;
  `.oat/sync/manifest.json` `oatVersion` restamped; `.codex/agents` and
  `.cursor/agents` views regenerated.

## Key Decisions

- **One bump per skill per PR.** p05 carried p04's `oat-project-implement`
  bump (2.3.1 → 2.3.2) instead of re-bumping; the rule is recorded in the
  plan's Drift Refresh Record and enforced by `check:skill-bumps`.
- **Anaphor-only attachment in the codex guard.** A Codex-suggested "clause
  classifies its own route" exemption was reverted on round-2 evidence: every
  workable form was an ordered-token heuristic that admitted real escapes, and
  the plan's "explicitly and independently classifies" wording makes an
  anaphoric continuation non-independent by construction.
- **Fail closed on unrestorable dirt.** Staged renames and paths that are both
  tracked-changed and untracked are `unsupported-dirt`; the capture refuses
  rather than guessing, within the plan's enumerated supported set.
- **Address-now sweeps stay bounded.** The p04 round-2 sweep fixed only the
  reviewer's one-line items; the `oat-project-review-provide` fence repair,
  which needs its own bump and a coupled matrix-row deletion, became a backlog
  item instead.

## Design Deltas

- p01 shipped four per-defect commits (the plan's own batch-exception
  boundary) and moved the `analyze` pin the plan said did not exist.
- p04 covered thirteen skills where the brief pre-declared ten (all inside the
  plan's In-scope surface) and placed the matrix in an adjacent test file the
  plan's Test plan permits.
- p05 strengthened the plan's "two byte-identical status snapshots" rule to a
  superset (porcelain v2 carries no worktree object id) and left the autonomy
  inventory untouched because its mirrors are symlinks and no prompt-site token
  changed; the plan's step 5 is therefore conditional.
- Plan corrections for the above are tracked in
  `BL-260906-wave-2-external-plan` for the wave-close program refresh.

## Notable Challenges

- **Fixes that introduced the next defect.** The p03 refactor narrowed a
  whole-document guard to one passage (Critical, caught by the reviewer's
  same-input/opposite-verdict probe), and the p05 round-1 fix left the
  script-path guard in a different shell block than its invocations, so an
  empty path would have exited zero (Critical, caught by executing the prose
  snippets verbatim in a fresh shell). Both were repaired and pinned; the
  second also surfaced a same-class fail-open inside the script for symlinked
  installs.
- **Dead assertions.** The wave-level final review found that the p03
  whole-source guard was only exercised at one direct call site; a fixture now
  drives the real matrix against injected copies of both guarded files.
- **Findings after the gate.** Cursor Bugbot found a High ordering defect in the recover-mode contract that three root final-review rounds, three p05 rounds, and the first exit-gate pass had all missed; the fix then needed a second correction (the artifact-free retry path) caught by the exit gate's re-run.
- **Hidden fences.** Four-backtick fences had turned whole lifecycle steps into
  code blocks invisible to every prose scan and every gate; three are repaired
  and a fourth is filed.

## Tradeoffs Made

- The codex guard's fail-open boundary (a filler clause between the anchor and
  the anaphor breaks attachment) is documented and pinned rather than closed,
  because closing it needs the antecedent resolution owned by
  `BL-260827-span-based-prose-guards`; widening the span would reintroduce the
  false positive the plan forbids.
- The explainer-kit sentence splitter now splits at terminators followed by
  closing punctuation; finer splitting also narrows what the negation marker
  can disqualify, so the guard stays a drift alarm rather than a proof of
  meaning (documented in the helper comment).

## Exit Gate History

- Configured cross-family exit gate (`codex-5-6-sol-xhigh`): generation 1 run `45ee23dc` passed with zero findings, then went stale when Cursor Bugbot's High finding on PR #267 (recover mode committed the recovered patch before reconciling the pending attempt) was fixed in `3ee49fcad`; generation 2 attempt 1 (run `ba8ff320`) blocked on two Important findings (the artifact-free retry still ran the verifier; duplicate gate ledger rows), fixed in `e8e25f780` and the record commits; generation 2 attempt 2 (run `1c033697`) passed with zero findings. Exit gate history: three runs, two passes.

## Follow-up Items

- `BL-260906-repair-the-stray-fence-in-oat` — `oat-project-review-provide`
  fence repair with the coupled matrix row, fence-rule tightening, and the three
  out-of-surface fences.
- `BL-260906-cover-skill-test-files-under` — `.agents/skills/**/*.mjs` in
  `pnpm check` and lint-staged.
- `BL-260906-reconcile-the-oat-doctor` — the doctor example's
  both-installed-and-available contradiction.
- `BL-260906-wave-2-external-plan` — external-plan corrections for the
  program refresh.
- `BL-260827-span-based-prose-guards` — anaphora-guard residuals appended.
- Skill signals for `oat-wave-execute` (fan-in manifest restamp, forced-gate
  and scratch-hygiene brief clauses, capped cross-model rounds, verbatim
  snippet execution in disposition rounds) are recorded in the wrapper's
  `orchestration-log.md` synthesis.

## Associated Issues

- `BL-260819-repair-verified-bundled-skill`, `BL-260827-harden-the-codex-skill-below`,
  `BL-260818-extend-guarded-prose-contract`, `BL-260718-mandatory-skill-load-clause`,
  `BL-260902-document-patch-and-restore` — archived by this wave.

## Workflow Observations

### 2026-09-06 · structural · oat gate review · plan

target=codex-5-6-sol-xhigh threshold=important findings=critical:0,important:1,medium:0,minor:1 exit=1 status=blocked artifact=.oat/projects/shared/wave-2-execution/reviews/artifact-plan-review-2026-09-06T023526Z.md

### 2026-09-06 · structural · oat-wave-execute · final

End-of-run synthesis for this wave wrapper lives in orchestration-log.md (convention verdicts, skill-signal rulings, adopted rules, graduated-entries ledger); this project log carries structural events only.

### 2026-09-06 · structural · oat gate review · final

target=codex-5-6-sol-xhigh threshold=important findings=critical:0,important:0,medium:0,minor:0 exit=0 status=ok artifact=.oat/projects/shared/wave-2-execution/reviews/final-review-2026-09-06T093256Z.md
