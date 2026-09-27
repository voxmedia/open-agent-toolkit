---
oat_retro_project: triage-correctness-wave
oat_retro_generated: 2026-09-27T12:05:29Z
oat_retro_evidence_sources:
  - source: archived-review-markdown
    status: used
  - source: child-run-transcripts
    status: unavailable
  - source: lifecycle-artifacts
    status: used
  - source: oat-execution-learnings
    status: used
  - source: orchestrator-session-summary
    status: used
  - source: project-log
    status: used
  - source: repository-source
    status: used
  - source: session-transcript
    status: used
oat_retro_promotions: proposed
oat_retro_filing: proposed
oat_generated: true
oat_template: false
---

# Project Retrospective: triage-correctness-wave

## Executive Summary

The wave shipped nine verified correctness fixes from the 2026-09-26 triage as
one PR (#331), archived ten backlog items, and moved the five lockstep packages
to 0.3.8. Every phase review, every Codex phase gate, the final review, the
implementation exit gate, and PR CI passed. The product work went smoothly. The
review loops caught real defects, the worst being a secret-echo regression in
p03, and the recovery contract absorbed one composition failure cleanly.

Most of the friction was orchestration overhead, not product work. It came from
five sources: a hand-typed base SHA, a gate reviewer that skipped a headless
step, a ledger cell the PR step could not parse, pre-commit reformatting that
broke exact-text edits, and gates that ran the released CLI instead of the
branch. Future waves should derive identifiers mechanically, edit
hook-formatted artifacts by content rather than exact text, and treat
self-referential gate changes as untested by their own gates.

## Evidence and Review Method

- **Used:** the append-only `project-log.md` (nine structural gate receipts);
  `oat-execution-learnings.md` (eight entries); `discovery.md`, `plan.md`
  (`## Reviews` ledger and the review/gate notes under it), `implementation.md`
  (recovery event `p03-rec-01`, deviations table, review outcomes, Definition of
  Done table, `### Final PR boundary (PRFINAL-05)`), `state.md`, and
  `summary.md`; archived reviews under `reviews/archived/`, in particular
  `p02-review-2026-09-27T054138Z.md`, `p03-review-2026-09-27T061910Z.md`, and
  `final-review-2026-09-27T070931Z.md`; a bounded search of the orchestrating
  session's local transcript (operator messages and root narration from
  2026-09-27T03:50Z onward); the orchestrator's supplied summary of session
  facts; and repository source, read to confirm mechanisms
  (`packages/cli/src/commands/gate/branch-local-cli.ts`,
  `.agents/skills/oat-project-plan-writing/SKILL.md`,
  `.agents/skills/oat-worktree-bootstrap-auto/SKILL.md`,
  `.agents/skills/oat-project-implement/references/phase-execution.md`,
  `.lintstagedrc.mjs`).
- **Unavailable:** transcripts of the child runs (Claude phase implementers,
  Claude reviewers, and Codex gate reviewers) were not read. Where this retro
  describes what a child did, it relies on committed reviews, implementation
  notes, and gate receipts. In particular, it does not assert why the p02 gate
  reviewer skipped the route step.
- Claims are **confirmed** against committed artifacts or source unless
  labelled **hypothesis** or **inconclusive**.

## Outcome Snapshot

| Area         | Generation-time outcome                                                                                                   |
| ------------ | ------------------------------------------------------------------------------------------------------------------------- |
| Scope        | 23/23 tasks across four phases; p01 and p02 in parallel worktrees, then p03 and p04                                       |
| Backlog      | Nine items delivered plus `BL-260908-restore-recon-s-cheap-fan-out` reconciled; ten archived in `a90da4f49`               |
| Release      | Lockstep public packages 0.3.7 → 0.3.8; six skill version bumps                                                           |
| Reviews      | 3 structured plan rounds, 3 plan-gate attempts, 2 rounds per phase for p01–p03, final review plus one re-review           |
| Gates        | Codex `codex-6-sol-xhigh` on plan, every phase, and exit; one operational p02 gate retry                                  |
| Verification | Full Definition of Done plus `lint` and `format` at `a90da4f49`, exit codes captured; forced tests under an isolated HOME |
| Lifecycle    | PR #331 open with `ci`, `release-dry-run`, and Bugbot green; not merged at generation time                                |

## Current State

- **Promotions:** `proposed`. RP-01 and RP-02 are `proposed` apply-items
  (target `AGENTS.md`). Apply was deferred because `workflow.retro.apply` is
  `ask` and this run was non-interactive.
- **Filing:** `proposed`. UP-01 through UP-04 are `proposed` with no
  destination. Filing was deferred because neither
  `workflow.retro.filing.repo` nor `workflow.retro.filing.upstream` is
  configured.
- **Unsettled items:** RP-01 and RP-02 need an apply decision (run retro apply
  mode). UP-01 through UP-04 need filing (`oat-project-retro-file`).

## What Went Well

- **Review loops caught real defects before merge.** The p03 review reproduced
  a High with the built CLI: the new single-run violation report echoed a
  `ghp_` token from a rejected enum value. p03-t06 fixed it at the shared
  output boundary with a neutralize-and-restore proof (six tests fail without
  the scrub), and the round-2 review found a residual unterminated-key shape
  that p03-t07 closed. The final review measured a rollout risk: the new check
  would reject 62 of 70 historical stamped gate artifacts. p04-t04 then
  stated the label rule in the gate prompt itself.
- **Failing-first discipline held everywhere it was load-bearing.** Every defect
  fix records a pre-fix failure or a neutralization control
  (`implementation.md`, per-task notes and `### Backlog acceptance evidence`).
- **The recovery contract worked as designed.** A composition failure in the
  full CLI suite (`p03-rec-01`) was recovered in one bounded, append-only
  attempt (`c4ef806fb`). The implementer reran the suites against the committed
  head, and the root settled the ledger afterwards.
- **The implementer's base check caught the root's error.** The p02 implementer
  refused to start on a nonexistent base SHA instead of guessing. A
  context-only continuation fixed it with no lost work.
- **Cross-family gating needed no configuration change.** Target priority with
  same-family avoidance selected `codex-6-sol-xhigh` for every gate, and the
  root checked the selection in each structured result.
- **Evidence-grade Definition of Done.** Exit codes were captured per gate. Two
  `FULL TURBO` replays (`pnpm build`, `pnpm build:docs`) were detected and
  rerun with `--force` rather than reported as passes.

## Challenges and Struggles

### p02 gate failed after a clean review (reviewer skipped the route step)

The p02 phase gate's Codex reviewer finished with zero findings and committed
its artifact and a `received` ledger row. The gate process still ended
`review_failed`: `unexpected_post_selection_failure` at
`postSelection.step: target-dispatch`, with the message "Branch-local gate route
did not return JSON." (project-log structural entry `oat gate review · p02`, run
`ee0f0803`). The reviewer had never run `"$OAT_GATE_CLI_PATH" gate route --json`,
so no route receipt file existed. `readGateRouteReceipt` in
`packages/cli/src/commands/gate/branch-local-cli.ts` reads a missing file as an
empty string and reports it as a JSON parse failure. The message named neither
the missing receipt nor the skipped step. The root found the cause by searching
the failed run's output. One identical-payload retry (`4bd88e02`) passed clean.
The first row stays `received` and is not receive-eligible. The p01 gate had
the same setup, ran the route step, and passed. Why the p02 reviewer skipped
the step is **inconclusive** because no child transcript was available.

### PR-final stopped at PRFINAL-05 on a non-canonical ledger cell

The plan's structured (in-memory) artifact review wrote no artifact, and the
root recorded that event with `structured (no artifact)` in the `## Reviews`
Artifact cell. `oat-project-pr-final`'s ledger-path guard skips only `-` and
treats every other value as a path. It stopped closeout at `PRFINAL-05`
(`boundary:unresolved-critical-findings`). That gate is never auto-resolved, so
the root recorded the boundary (`a35c36abb`), rewrote the cell to `-`
(`fc0b96738`), and resumed. Cost: one extra PR-final round late in closeout.
The root cause is that `oat-project-plan-writing` Step 6 ("Record the outcome")
tells the caller to update the plan row after a structured review that writes
no artifact, but never says what goes in the Artifact cell.

### Pre-commit formatting broke exact-text bookkeeping edits

The repository's lint-staged hook runs `oxfmt --write` on every staged Markdown
file (`.lintstagedrc.mjs`). It re-padded `## Reviews` and progress tables in
`plan.md` and `implementation.md` after each commit. At least three later
pattern-based root edits then missed their target: a plan-review row, the
progress table, and a row restore that silently committed nothing. The fix each
time was a whitespace-tolerant match. The hook also re-quoted two timestamps in
`state.md` after the scaffold commit, leaving the file `MM` after a successful
commit (execution learning 04:05). Clean-tree checks after each commit caught
every instance, so no data was lost. The dirty-after-commit half is already
tracked as `BL-260927-share-one-hook-safe-exact-path` (GitHub #306). The
edit-after-commit half is not tracked.

### Phase gates exercised the released CLI, not the branch

The configured gate command invokes `oat` on PATH, which is the globally
installed 0.3.7. The gate's branch-local shim wraps the invoking CLI's own
entrypoint. So the new `gate_dispatch_audit_mismatched` check from p01-t03 was
never enforced during this wave's own gates, and reviewers loaded the
user-scope `oat-project-review-provide` 1.5.10, not the branch's 1.5.11. This
luckily avoided the planned rollout risk (M2). It also meant the one behavior
most likely to break gates was verified only by unit tests and the final
reviewer's offline probe over 141 artifacts, not by a live gate.

### Smaller frictions

- **Hand-expanded base SHA.** The root typed a 40-character SHA from a short
  one into both phase briefs, naming a nonexistent commit. The existing
  guidance already says to take `PHASE_BASE_HEAD` from `git rev-parse HEAD`.
  The error was in transcription.
- **Recovery ledger absent from state.md.** The scaffolded `state.md` has only
  a commented template for `oat_phase_recovery_policy`. The p03 implementer
  stopped at the recovery point, and the root had to create the ledger block
  (`83aba024f`) before sending a recover-mode brief. The contract says the
  implementer reserves the attempt, but it does not say who creates an absent
  ledger block. Whether the implementer could have created it itself is
  **inconclusive**.
- **Hand-built managed Claude dispatch input.** Until p03 shipped
  `oat project dispatch canonical-role` and a validated example, every managed
  Claude launch needed a validation-only record input built by a local script
  (`.oat/repo/analysis/tackle-2026-09-26/managed-input.mjs`). The input was
  documented only with placeholders. The wave's own deliverable fixed this.
- **Autonomous worktree bootstrap syncs user scope.** In normal mode,
  `oat-worktree-bootstrap-auto` Step 4 runs `oat sync --scope all`, which
  rewrites user-scope provider directories. The root used the repository's
  `pnpm run worktree:init` instead and restored the manifest version refresh.

## Decision Register

- **`alwaysApply: true` accepted as `activation: always`** in canonical rules,
  matching the Cursor importer. The alternative, warn-and-skip, would drop a
  rule the author clearly meant to apply (`discovery.md`, Key Decision 1).
- **Policy-view label instead of a gate-built stamp.** Gate artifacts label the
  resolver stamp `**Dispatch audit (policy view):**`. The label keeps the
  `Dispatch:` token, so only one extraction path exists. This was simplified
  from a second stamp by the complexity review.
- **One scrubbed multi-line error instead of a `violations` JSON field** for
  dispatch-record validation (complexity review).
- **Fail closed on wrong-typed `pjm.remote` leaves with no repair reader.** The
  repair is to edit the file, the same as for unknown keys (complexity review).
- **Dead `failed === 0` conjunct removed.** It was removed rather than pinned by
  a test that could not fail, and backlog AC2 is recorded as met by the outcome
  test (deviations table, p02-t06 L1).
- No new durable decision record is warranted. Each choice is local to its item
  and recorded in `summary.md` and the shipped docs.

## Where We Changed Course

- **Plan review converged slowly.** Trigger: the structured plan review returned
  3H/8M/10L, then 3H/2M/4L, then 1H. The last High fix landed after the retry
  bound and was not re-reviewed. Change: the root relied on the independent
  Codex gate to cover the residual. Outcome: gate attempt 1 raised 2 Mediums.
  Receiving them showed that the real gate artifact wrote a prose
  `**Resolver policy view:**` label, which p01-t03 then accepted.
- **The complexity review came after the gate passed.** Trigger: after gate
  attempt 2 passed, a fresh complexity review found four over-built mechanisms.
  Change: all four were simplified. Outcome: the changes were material, so the
  gate had to run a third time, which passed clean.
- **The gate prompt now states the label rule.** Trigger: the final review
  showed that the CLI enforced a label that only the new skill copy described.
  Change: p04-t04 added the rule to the gate prompt. Outcome: reviewers loading
  an older installed skill now get the instruction from the CLI itself.

## Domain Learnings

- A validator that collects every error has to redact every error. Once errors
  from separate checks are combined, a value one check flags as sensitive can
  be echoed by another check's message. Scrub once, at the shared output
  boundary.
- A gate that enforces an artifact format has to state that format in its own
  prompt. Skill copies drift independently of the CLI, and a format mismatch
  that surfaces only after a full review wastes the most expensive step.
- Self-referential changes to gates and review skills are not tested by the
  project's own gates when those gates resolve an installed CLI. Unit tests and
  offline probes are the only evidence until release.
- `diversity: unknown-producer` in gate output is expected when implementer
  stamps carry `producer=unknown`. Confirm cross-family coverage from the
  selected target in the structured result, not from the diversity field.

## Gotchas for Humans

- If you want a complexity review, run it before the independent plan gate. A
  simplification after the gate passes is a material plan change and forces
  another gate run.
- After this release, run `oat tools update` before the next gated run. Older
  installed review-provide copies write unlabeled stamps, and the new CLI
  rejects those when they disagree with the gate.

## Gotchas for Autonomous Agents

- Fill every SHA field (`phase_base_head`, `expected_base_sha`, group bases) by
  pasting `git rev-parse` output or reading a file it wrote. Never expand a
  short SHA by hand.
- After any commit that stages Markdown, re-read a table row before editing it,
  and match rows by cell content, not exact padding. Then confirm
  `git status --short` is clean.
- Record a review event that wrote no artifact with `-` in the `## Reviews`
  Artifact cell, and explain it in prose under the table.
- A gate failure reading "Branch-local gate route did not return JSON." after a
  clean review usually means the reviewer skipped `gate route --json`, so no
  receipt was written. Check for the receipt before retrying.
- Bootstrap phase worktrees with the repository's `pnpm run worktree:init`, or
  a project-scope sync. Do not run `oat sync --scope all` from a lane.

## Repo Improvements (Promotion Register)

### RP-01: Warn that the pre-commit hook reformats staged Markdown

- **Type:** agents-instruction
- **Disposition:** apply
- **Status:** proposed
- **Target:** `AGENTS.md`
- **Applied-ref:** —
- **Disposition-note:** —

Problem: `.lintstagedrc.mjs` runs `oxfmt --write` on every staged `*.md`. It
re-pads tables in `plan.md`/`implementation.md` and can re-quote YAML scalars
in `state.md`. `AGENTS.md` does not mention this. In this run, at least three
root bookkeeping edits that matched pre-commit text missed silently, and one
committed nothing. The scaffold commit also left `state.md` `MM`. Proposed
change: add a short note under `### Development Workflow` in `AGENTS.md` saying
that the pre-commit hook formats staged Markdown, JSON, and JS/TS. It should
tell agents to re-read a file after committing before any exact-text edit, to
match table rows by cell content rather than padding, and to confirm
`git status --short` is clean after every commit. It should cross-reference
`BL-260927-share-one-hook-safe-exact-path` for the dirty-after-commit case.

### RP-02: Say that gates run the installed CLI, so gate changes need a branch probe

- **Type:** agents-instruction
- **Disposition:** apply
- **Status:** proposed
- **Target:** `AGENTS.md`
- **Applied-ref:** —
- **Disposition-note:** —

Problem: the configured gate command invokes `oat` from PATH. The branch-local
gate shim wraps the invoking CLI's own entrypoint, and reviewers load
user-scope skills. So a PR that changes `packages/cli/src/commands/gate/**` or
the `oat-project-review-provide*` skills is reviewed by the released behavior,
not its own. In this run, `gate_dispatch_audit_mismatched` was never enforced
live, and the rollout risk showed up only in the final reviewer's offline probe.
Proposed change: add a note to `AGENTS.md` (Definition of Done or Development
Workflow) saying that when a change touches gate or review-provide contracts,
`implementation.md` must record that the project's own gates did not exercise
the change. Where feasible, run one gate probe through the branch build
(`node packages/cli/dist/index.js --json gate review …`) against a scratch
project, or probe committed gate artifacts with the built extractor.

## OAT Upstream Feedback (Upstream Register)

### UP-01: Name a missing gate route receipt instead of reporting a JSON parse failure

- **Status:** proposed
- **Destination:** —
- **Destination-receipt:** —
- **Remote-visibility:** —
- **Sanitized:** no
- **Disposition-note:** —

Problem: `readGateRouteReceipt` (`packages/cli/src/commands/gate/branch-local-cli.ts`)
reads a missing receipt file as `''` and throws "Branch-local gate route did not
return JSON." When a headless reviewer skips `"$OAT_GATE_CLI_PATH" gate route --json`,
a clean, committed review becomes `review_failed`
(`unexpected_post_selection_failure`, `target-dispatch`), and the message points
at JSON parsing instead of the skipped step. Evidence: the p02 phase gate run
`ee0f0803` completed with zero findings and failed, and an identical retry
passed. Suggested direction: distinguish an absent receipt (for example
`gate_route_receipt_missing`, with recovery text saying the reviewer did not
run the route step) from a malformed one. Have the gate prompt, which already
restates other enforced artifact rules, also restate the route step. Add a
test for the absent-file case.

### UP-02: Specify the Artifact cell for structured artifact reviews that write no file

- **Status:** proposed
- **Destination:** —
- **Destination-receipt:** —
- **Remote-visibility:** —
- **Sanitized:** no
- **Disposition-note:** —

Problem: `oat-project-plan-writing` Step 6 ("Record the outcome") tells the
caller to update the plan artifact row after a structured-mode review that, by
Step 3, "writes no artifact". It never says what goes in the Artifact cell.
`oat-project-pr-final`'s ledger-path guard skips only `-`, so a descriptive
value such as `structured (no artifact)` stops closeout at `PRFINAL-05`, which
is never auto-resolved. Evidence: this project's PR-final stop and repair
commits `a35c36abb` and `fc0b96738`. Suggested direction: state in Step 6 that
a no-artifact event uses `-` in the Artifact cell, with an explanation in prose
under the table. Consider having an earlier writer or validator reject a
non-path, non-`-` Artifact cell so the error surfaces at write time, not at PR
time.

### UP-03: Scope autonomous worktree bootstrap sync to the project

- **Status:** proposed
- **Destination:** —
- **Destination-receipt:** —
- **Remote-visibility:** —
- **Sanitized:** no
- **Disposition-note:** —

Problem: in normal mode, `oat-worktree-bootstrap-auto` Step 4 runs
`oat sync --scope all`, which rewrites user-scope provider directories, a side
effect outside the phase worktree. Evidence: execution learning "Worktree bootstrap
used the repository init without all-scope sync". The p01 and p02 worktrees
were bootstrapped with `pnpm run worktree:init` (a project sync) and the
manifest refresh was restored. Suggested direction: use `--scope project` for
phase and lane worktrees, or prefer a repository-declared worktree init when
one exists. Keep all-scope sync as an explicit opt-in.

### UP-04: Say who creates an absent phase recovery ledger

- **Status:** proposed
- **Destination:** —
- **Destination-receipt:** —
- **Remote-visibility:** —
- **Sanitized:** no
- **Disposition-note:** —

Problem: the scaffolded `state.md` has `oat_phase_recovery_policy` only as a
commented template. The recovery contract in
`oat-project-implement/references/phase-execution.md` says the phase
implementer atomically reserves an attempt in
`phase_attempt_usage.<pNN>`, but never says who creates the block when it is
absent. Evidence: at p03's composition failure, the implementer stopped and
the root created the ledger (`83aba024f`) before sending a recover-mode brief.
That cost one extra round trip. Suggested direction: either scaffold an
explicit default ledger block, or state that the root creates it at dispatch
time (reflecting the resolved limit) so that a recover-mode implementer never
has to stop for it.

## Remaining Boundaries and Follow-Ups

- **Merge and release:** at generation time, PR #331 is open and unmerged.
  After release, run `oat tools update` before the next gated run.
- **Deferred audit-line Low (p01-t05):** a blockquote line containing a
  backtick-wrapped stamp, and a bullet under a flat `## High` heading, are
  still read as audit lines. No false failures appeared across 137 local
  artifacts. Revisit only if a real artifact trips on either shape.
- **Hook-modified commits:** owned by `BL-260927-share-one-hook-safe-exact-path`
  (GitHub #306).
- **Dispatch journal:** whether to keep it is owned by
  `BL-260909-give-the-dispatch-record`.

## Reflections

The product fixes were well specified before work began, and that paid off:
every item had verified evidence and acceptance criteria, so implementation
and review stayed focused. The result is trustworthy because of executable
controls rather than prose: failing-first tests, neutralize-and-restore proofs
for the security scrub and the gate target clause, forced test runs, and
detected cache replays.

The time went to the seams between agents and artifacts. Each seam failed the
same way: an identifier or cell written by hand where a command could have
produced it, or an edit that assumed text the formatter had already changed.
The fixes above either make the canonical value explicit (UP-02, UP-04),
make a failure name its own cause (UP-01), or warn agents where the
repository changes files under them (RP-01, RP-02). This retro was produced by
the `oat-project-retro` 1.0.7 skill that the wave itself shipped, including
the Step 7 walkthrough requirement.
