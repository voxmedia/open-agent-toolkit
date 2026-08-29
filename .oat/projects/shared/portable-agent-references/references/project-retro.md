---
oat_retro_project: portable-agent-references
oat_retro_generated: 2026-08-29T17:58:10Z
oat_retro_evidence_sources:
  - source: project-log
    status: used
  - source: lifecycle-artifacts
    status: used
  - source: review-artifacts
    status: used
  - source: session-transcript
    status: used
  - source: oat-execution-learnings
    status: unavailable
oat_retro_promotions: complete
oat_retro_filing: complete
oat_generated: true
oat_template: false
---

# Project Retrospective: portable-agent-references

## Executive Summary

The project delivered its goal: every executable cross-skill reference shipped
by a user-default pack is now scope-portable, enforced by a manifest-driven
ratchet, released as `0.2.41` in PR #231. Two phases, eight tasks, six review
rounds, zero Critical findings throughout.

The notable pattern is where the failures actually landed. Of the significant
problems this run surfaced, **one was an implementation defect and the rest
were orchestration failures by the root agent** — stale bookkeeping flagged as
Important in three separate rounds, a Turborepo cache replay reported to the
user as a genuine passing test run, and a review "fix" that replaced a vague
claim with a precise false one after two agents independently confirmed it. The
implementers and reviewers performed well; the coordination layer is where the
defects concentrated.

## Evidence and Review Method

Used: `project-log.md` (6 entries), all lifecycle artifacts
(`discovery.md`, `design.md`, `plan.md`, `implementation.md`, `state.md`,
`summary.md`), 8 archived review artifacts under `reviews/archived/`, and the
live session transcript for this run.

Unavailable: `oat-execution-learnings.md` (never created for this project).

Load-bearing claims are anchored to commit IDs and review artifact paths.
Where a mechanism was not conclusively established, it is marked inconclusive
rather than asserted.

## Outcome Snapshot

- 8/8 planned tasks, one verified commit each, across 2 phases.
- 6 review rounds: p01 ×3, p02 ×2, final ×1. Final passed 0 Critical /
  0 Important.
- 1 in-phase recovery event (`rec-p01-01`), attempt 1/10, disposition
  `recovered`.
- Released `0.2.41` across five lockstep public packages.
- Full CI gate list passed uncached and HOME-isolated at the final head.

## Current State

PR #231 is open against `main` with CI green and `mergeStateStatus: CLEAN`.
Retro register: 5 RP items and 2 UP items, all settled.

Apply lane (`oat_retro_promotions: complete`): RP-01 and RP-02 applied to
`AGENTS.md` in `38e011b36`; RP-05 written to the `synced-project-scope` project
directory in the main checkout, deliberately untracked on that branch.

Filing lane (`oat_retro_filing: complete`): UP-01 filed as new backlog item
`BL-260829-order-phase-bookkeeping-before`; UP-02 and RP-03 strengthened the
existing `BL-260718-fix-oat-docs-generate-index` and
`BL-260829-unified-agent-provider-root` with operator-approved scope broadening;
RP-04 rejected as transient PR-specific material already delivered via the
handoff document. All three local destinations share destination commit
`00976e850` and are **unpushed** — durable locally, not yet visible on the
remote.

## What Went Well

- **Reviewers verified rather than accepted.** The p01 reviewer mutation-tested
  the ratchet by reverting a ported agent file and confirming the zero-debt test
  failed with exact `source -> target` evidence; the final reviewer repeated the
  exercise independently by injecting a bare read into `oat-codebase-mapper.md`.
  Both restored the worktree cleanly. For a self-policing test, this is the only
  evidence that actually matters, and it was produced without being asked twice.
- **Baseline honesty was checked, not assumed.** Reviewers verified
  `PINNED_HISTORICAL_CROSS_SKILL_READS` was byte-identical across every phase
  commit, proving live debt was drained rather than reclassified into the
  historical baseline — the specific way this kind of ratchet is usually gamed.
- **A reviewer caught its own subagent's error.** The p02 round-2 reviewer
  delegated one mechanical recon lane, then found the worker's `.cursor/agents`
  change count (39–40, self-inconsistent between sections) was wrong, and
  replaced it with direct measurement (36 of 40 tracked; `.claude` shows 0
  because all four entries are symlinks). It re-derived every load-bearing
  worker claim instead of passing them through.
- **Interruption cost nothing.** An accidental user cancel left a complete,
  coherent uncommitted edit; a fresh same-target implementer verified and
  finished it rather than restarting, and independently improved on the
  inherited work.

## Challenges and Struggles

### A cache replay was reported to the user as a passing test run

While validating the p01 phase report, the implementer reported 3 `pnpm test`
failures caused by the host's `~/.oat/templates/` shadowing bundled assets. The
root ran `pnpm test`, saw exit 0 with 290 files passed, and told the user the
failures "do not reproduce."

That run executed nothing. The log showed `Cached: 10 cached, 10 total` and
`>>> FULL TURBO` — a replay of the implementer's earlier clean-`HOME` result.
The implementer had been right. The root corrected the claim to the user
unprompted after checking the log, then established the correct invocation
(`HOME=$(mktemp -d) pnpm exec turbo run test --force`) and used it for all
subsequent gate evidence.

Impact: one false verification statement to the user, and a `Test Results` row
in `implementation.md` asserting a clean `pnpm test` that had to be corrected in
`52745ef93` with an explicit retraction. A separate session independently
recorded the same trap on the same day, which is what makes this a systemic
issue rather than a one-off lapse.

### Per-phase review inspects a stale ledger by construction

The workflow orders per-phase review _before_ Step 7 bookkeeping, so the
reviewer always evaluates a head where `implementation.md` and `state.md` have
not yet been updated for the phase just completed. It correctly flags this as an
Important finding every time.

It happened in p01 round 1 (`reviews/archived/p01-review-2026-08-29T000007Z.md`,
finding I1), again in p01 round 2 after the first fix closed only the file the
reviewer named and not its sibling pointer, and again in p02 round 1
(`reviews/archived/p02-review-2026-08-29T080559Z.md`). Three Important findings,
none of which were implementation defects, and at least one extra review round
consumed.

The root's own contribution to this was real: after round 1 flagged
`implementation.md`, it fixed that file and did not check `state.md`, which
still read `oat_current_task: p01-t01` against `implementation.md`'s `p02-t01` —
two authoritative resume pointers disagreeing, with the stale one aimed at a
completed task. That is the same failure mode the finding had just described.

### A fix replaced a vague claim with a precise false one

The p02 round-1 review raised a Minor: `tool-packs.md` said agents are "shipped
by these packs," citing `pack-manifest.ts:225-229` and concluding only the
`workflows` pack ships agents. The fix agent independently "confirmed" this,
verified that `utility` is skills-only, and wrote "shipped by `workflows`" into
the documentation.

Both were wrong. The `research` pack also ships `agent('skeptical-evaluator.md')`
at `pack-manifest.ts:320`. The original text was vague; the replacement was
precise and false, which is worse in a document whose subject is the exact
contract. The root caught it during fix validation by sweeping every `agent(`
call site rather than reading the cited range, and returned it. The corrected
fix (`fa9d6e37d`) additionally proved exhaustiveness structurally — `kind: 'agent'`
occurs exactly once in non-test source, inside the `agent()` helper, so its two
call sites are the only construction path.

The fix agent's own diagnosis is the durable lesson: _"I verified the review's
claim (`utility` is skills-only) and treated its converse as established,
instead of sweeping for other `agent(` call sites. Confirming the cited half of
a claim is not confirming the claim."_

### A version collision surfaced only at the final gate

During closeout, `release:check-versions` failed: PR #229 had merged mid-run
carrying `bf84fdcac chore(release): bump lockstep public packages to 0.2.40`,
so this branch's `0.2.40` was no longer strictly greater than `origin/main`.

Resolution required merging `origin/main` (deliberately **not** rebasing — a
rebase would rewrite every commit SHA the review ledger records as reviewed
heads, task commits, and recovery provenance), re-bumping all five packages to
`0.2.41`, regenerating `public-package-versions.json` via `bundle-assets.sh`,
and rebuilding the CLI before re-running `oat sync` so `.oat/sync/manifest.json`'s
`oatVersion` picked up the new value from `OAT_VERSION`.

The near-miss worth recording: the root had already told the user closeout was
complete before this gate ran. Only the final full-gate rerun caught it.

### A documentation command corrupted repository config

Running `oat docs generate-index` from the repo root during the docs-delta step
rewrote `documentation.index` in `.oat/config.json` from `apps/oat-docs/index.md`
to `index.md`, and wrote a bogus 4-line `index.md` at the repository root
indexing `research/`.

Caught in the post-commit `git status` and reverted; `apps/oat-docs/index.md`
was never touched. Had the commit happened two minutes earlier, the config
corruption would have shipped in PR #231.

## Where We Changed Course

- **Trigger:** the `~/.oat/templates/` test-isolation bug was diagnosed as
  pre-existing and unrelated to this project. **Change:** rather than letting the
  fix ride along on the project branch, it moved to a separate Orca worktree and
  its own PR. **Outcome:** PR #229, merged the same day, keeping #231's diff
  focused — though #229's later `0.2.40` bump is what forced this project's
  re-bump.
- **Trigger:** the final gate's version failure suggested "rebase on current
  main." **Change:** merged instead. **Outcome:** every SHA recorded in the
  review ledger stayed valid.

## Domain Learnings

- A green gate on this repository is not evidence of execution. Turborepo
  replays cached results by default, and `pnpm test --force` does not force it
  because pnpm appends the flag to the last command of a chained root script.
- Generated files must be regenerated, never hand-merged or hand-edited.
  `public-package-versions.json` is written by `bundle-assets.sh` on every
  build; `.oat/sync/manifest.json`'s `oatVersion` is stamped from the _built_
  CLI, so it needs a rebuild before sync, not a text edit.
- A review ledger that records commit SHAs makes rebasing a destructive
  operation. Merge instead, and say why in the record.
- Verification anchored to coordinates supplied by the claim tends to confirm
  the claim. Verify the question, not the citation.

## Gotchas for Humans

- Before trusting any gate result on this repo, grep the log for
  `cache hit, replaying` and `FULL TURBO`. Use
  `HOME=$(mktemp -d) pnpm exec turbo run test --force` from the repo root for
  evidence-grade runs.
- Do not run `oat docs generate-index` from the repository root without
  confirming the resolved docs root first; it can rewrite
  `documentation.index` in `.oat/config.json`.
- A long-running branch can be invalidated by an unrelated merge. Re-run
  `release:check-versions` against a freshly fetched `origin/main` immediately
  before declaring closeout, not only at phase end.

## Gotchas for Autonomous Agents

- When a review finding names a file, fix the finding's _class_, not only the
  named file. The round-1 bookkeeping finding named `implementation.md`; fixing
  only that file left `state.md` inconsistent and produced a second Important in
  the next round.
- When asked to confirm a claim, restate it as a question and answer that.
  "Is `utility` skills-only?" and "which packs ship agents?" have different
  answers, and only the second one was being asked.
- A negative result from a sweep is only meaningful with proof the sweep ran
  over a non-empty surface. Report the scanned file count alongside the finding.
- Do not report a task complete before the terminal gate has run at the final
  head. Closeout was declared twice in this run before the gates that would have
  contradicted it.

## Repo Improvements (Promotion Register)

### RP-01: Document the Turborepo cache-replay trap in the Definition of Done

- **Type:** docs
- **Disposition:** apply
- **Status:** applied
- **Target:** AGENTS.md
- **Applied-ref:** 38e011b36
- **Disposition-note:** Applied 2026-08-29; added to the Definition of Done section.

`AGENTS.md` already warns that `pnpm <gate> | tail && echo OK` reports the
wrong exit status. It does not warn that a passing gate may not have executed
at all. Two independent agent sessions hit this on 2026-08-29: this run
reported a cache replay to the user as a genuine test pass, and a separate
session recorded the same trap during the synced-project-scope gate review.
Add to the Definition of Done: gate runs default to Turborepo cache replays;
`pnpm test --force` does not force turbo because pnpm appends the flag to the
last command of the chained root script; use
`HOME=$(mktemp -d) pnpm exec turbo run test --force` for evidence-grade runs
and check the log for `cache hit, replaying` / `FULL TURBO`.

### RP-02: Note the host `~/.oat/templates/` interaction for maintainers

- **Type:** docs
- **Disposition:** apply
- **Status:** applied
- **Target:** AGENTS.md
- **Applied-ref:** 38e011b36
- **Disposition-note:** Applied 2026-08-29 in the same commit as RP-01.

Maintainers who run `oat tools install --scope user` acquire
`~/.oat/templates/`, which changed local test behavior until PR #229 landed.
The class of problem recurs whenever a test exercises the bundle tier without
injecting `home`. A short maintainer note prevents the next occurrence from
being diagnosed from scratch, as it was here.

### RP-03: Sync the duplicate matcher in `skills.test.ts`

- **Type:** code-follow-up
- **Disposition:** file
- **Status:** filed
- **Destination:** .oat/repo/pjm/backlog/items/BL-260829-unified-agent-provider-root.md
- **Destination-receipt:** 00976e85085b2c056e429e30e62ae6c05c6e17ce
- **Remote-visibility:** unpushed
- **Sanitized:** no
- **Disposition-note:** Strengthened the existing BL-260829 rather than filing new; operator approved the acceptance-scope broadening at filing time. Note the proposal body's claim that this was already folded into BL-260829 was aspirational — the item did not mention it until this filing.

`packages/cli/src/validation/skills.test.ts:4695` carries a copy of the
pre-fix matcher and still has the single-`../` blind spot that `7f7dd6cfc`
closed canonically. Harmless today because the canonical ratchet already scans
the same four agent files with the stronger pattern, but a knowingly divergent
duplicate of a matcher will drift. Folded into
`BL-260829-unified-agent-provider-root`, whose matcher work is the natural
place to fix it.

### RP-04: Report the version-narrative inconsistency in PR #227

- **Type:** code-follow-up
- **Disposition:** file
- **Status:** rejected
- **Destination:** —
- **Destination-receipt:** —
- **Remote-visibility:** —
- **Sanitized:** no
- **Disposition-note:** Rejected as backlog material by operator decision at filing time. Transient and PR-specific: it resolves or becomes moot when #227 merges. Already delivered where the person resolving the merge will see it, in the handoff document written to the synced-project-scope project directory. Not lost, just not tracked.

PR #227's `.oat/repo/pjm/current-state.md` narrative says `CLI 0.2.43` while
its five `package.json` files and `public-package-versions.json` say `0.2.44`.
Pre-existing and independent of the #231 merge, found during merge-conflict
analysis. Worth correcting before #227 merges so the shipped narrative matches
the shipped version.

### RP-05: Record the #231 × #227 conflict analysis where the merger will find it

- **Type:** docs
- **Disposition:** apply
- **Status:** applied
- **Target:** .oat/projects/shared/portable-agent-references/references/
- **Applied-ref:** /Users/tstang/Code/open-agent-toolkit/.oat/projects/shared/synced-project-scope/references/merge-conflict-analysis-pr231.md
- **Disposition-note:** Applied 2026-08-29. Destination redirected by the operator at apply time from this project's references/ to the synced-project-scope project directory in the main checkout, so the agent resolving the merge finds it in their own project. Written untracked on the feat/synced-project-scope branch; not committed, because adding a commit to an in-flight PR branch was outside this session's authority.

The merge between #231 and #227 has a failure mode git will not surface:
#231's new ratchet tests assert exact version literals (`oat-phase-implementer`
`1.0.12`, `oat-project-review-provide` `1.4.1`, `oat-reviewer` `1.2.1`) in
roughly eight places, while #227 bumps the same files to `1.1.0` and `1.5.0`.
The correct post-merge version exists in neither branch. Most of those
assertion lines do not conflict, so the merge completes clean and the suite
fails afterward. This analysis should live next to the project rather than only
in a session transcript.

## OAT Upstream Feedback (Upstream Register)

### UP-01: Per-phase review evaluates a stale ledger by construction

- **Status:** filed
- **Destination:** .oat/repo/pjm/backlog/items/BL-260829-order-phase-bookkeeping-before.md
- **Destination-receipt:** 00976e85085b2c056e429e30e62ae6c05c6e17ce
- **Remote-visibility:** unpushed
- **Sanitized:** no
- **Disposition-note:** Filed as a new item rather than strengthening BL-260711-skip-re-review-for-bookkeeping: that item skips the re-review after bookkeeping-only findings, while this one prevents the finding being generated. Related mechanism, different fix; cross-referenced in both directions.

`oat-project-implement` dispatches the per-phase reviewer before Step 7
bookkeeping, so the reviewer inspects a head where `implementation.md` and
`state.md` are stale by construction, and correctly raises it as an Important
finding. It fired three times in this run and consumed at least one extra
review round, none of it an implementation defect.

Two candidate directions, both cheap: move the phase bookkeeping commit before
the review dispatch, or declare the project ledger out of scope at the reviewed
head in the reviewer's brief. The first is likely better because it also gives
the reviewer accurate task/commit context. Note the ordering exists for a
reason — the current sequence keeps the tree clean for a bounded fix child — so
any change has to preserve that.

This repository _is_ OAT, so this item is upstream and repo-local at the same
time; it is recorded here rather than duplicated into the RP lane.

### UP-02: `oat docs generate-index` can rewrite `documentation.index` and emit a stray index

- **Status:** filed
- **Destination:** .oat/repo/pjm/backlog/items/BL-260718-fix-oat-docs-generate-index.md
- **Destination-receipt:** 00976e85085b2c056e429e30e62ae6c05c6e17ce
- **Remote-visibility:** unpushed
- **Sanitized:** no
- **Disposition-note:** Strengthened the existing BL-260718, which recorded the same command and root cause from 2026-07-18 but only the stray-file symptom. Operator approved broadening its acceptance scope to cover the config rewrite, and its placeholder acceptance criteria were filled in at the same time.

Invoked from the repository root without arguments, `oat docs generate-index`
rewrote `documentation.index` in `.oat/config.json` from
`apps/oat-docs/index.md` to `index.md` and wrote a 4-line `index.md` at the
repo root indexing `research/`, while the real docs index was left untouched.
Caught and reverted here, but it was two minutes from being committed.

A command that regenerates a configured artifact should not silently
_re-point_ that configuration as a side effect. Suggested direction: resolve
the docs root from existing config and fail closed when the resolved root does
not match, rather than adopting the invocation directory and persisting it.

## Remaining Boundaries and Follow-Ups

- `BL-260829-unified-agent-provider-root` (high, L) with scaffolded project
  `agent-provider-root` — the one portability direction still unenforced.
- PR #231 awaits human review; PR #227 currently has failing CI and cannot
  merge until that is resolved.
- No register item in this retro has been applied or filed.

## Reflections

The orchestration lesson from this run is that the root agent's verification of
its _own_ bookkeeping was the weakest link, and it was weak in a specific way:
each time, the root fixed exactly what a reviewer named and did not generalize
to the class. The reviewers were more rigorous than the coordinator, which is
the opposite of the intended arrangement — the root is supposed to be the layer
that catches what bounded workers miss.

The single most valuable behavior was cheap and repeatable: re-deriving a
subagent's load-bearing claim before building on it. It caught the false pack
attribution, the wrong `.cursor` file count, and the cache replay. It cost
seconds each time.
