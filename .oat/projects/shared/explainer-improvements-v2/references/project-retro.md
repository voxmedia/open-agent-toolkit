---
oat_retro_project: explainer-improvements-v2
oat_retro_generated: 2026-08-17T16:40:00Z
oat_retro_evidence_sources:
  - source: project-log
    status: used
  - source: oat-execution-learnings
    status: unavailable
  - source: lifecycle-artifacts
    status: used
  - source: archived-review-markdown
    status: used
  - source: decision-records
    status: used
  - source: backlog-items
    status: used
  - source: git-history
    status: used
  - source: current-session-transcript
    status: used
  - source: prior-session-transcripts
    status: unavailable
oat_retro_promotions: complete
oat_retro_filing: complete
oat_generated: true
oat_template: false
---

# Project Retrospective: explainer-improvements-v2

## Executive Summary

A quick-mode hardening project that grew from 34 planned tasks to 50 plus five
bounded fix batches, because its verification surface kept failing in the same
way: tests that could not fail. Six final review rounds each found something
real through round 5 — a Critical credential bypass, a total protected-mode
durability regression concealed by self-consistent fixtures, a merge version
collision invisible to every local gate, and the orchestrator's own vacuous
gate harness — and round 6 closed clean. The most important change to carry
forward is not any single fix but the evidence standard that emerged:
red/green proof for every new test, reviewer-side mutation testing, and
explicit per-gate exit codes.

## Evidence and Review Method

Durable evidence used: `project-log.md` (structural entries for every gate,
stop, and phase outcome), lifecycle artifacts (`implementation.md` is the
richest single source; `plan.md`'s 40+-row review ledger; `state.md`;
`summary.md`), all archived review artifacts under `reviews/archived/`
(tracked), the five `DR-260817-*` decision records, the `BL-260817-*` backlog
items, and git history (185 branch commits). The current session transcript is
original evidence for everything from the second full final review onward —
the root orchestrator executed that span directly. Unavailable: transcripts of
the prior sessions that executed p01–p06 (their outcomes are reconstructed
from committed artifacts only), and no `oat-execution-learnings.md` exists.
Claims below are Confirmed unless labeled otherwise.

## Outcome Snapshot

| Dimension   | Outcome                                                                                                                       |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Scope       | 7 phases / 50 tasks + 5 final-fix batches; handoff acceptance criteria normative (quick mode)                                 |
| Reviews     | 6 final rounds, ~46 ledger events; `final` `passed` at `97e5853d2` (round 6: 0 C / 0 I / 0 M / 1 m, fixed as `final-fix-005`) |
| Gates       | All ten green with explicit per-gate exit codes (8 local + `check:skill-bumps` + `release:check-versions`)                    |
| Release     | Five public packages lockstep at `0.2.31` above published `0.2.30`; `origin/main` merged                                      |
| Deliverable | PR [#196](https://github.com/voxmedia/open-agent-toolkit/pull/196) open against `main`                                        |
| Residue     | Six `BL-260817-*` backlog items; five `DR-260817-*` decision records; prior `BL-260712-serialize-cli-asset-bundling` closed   |

## Current State

- **Promotions:** complete — RP-01 applied (AGENTS.md, Definition of Done).
- **Filing:** complete — RP-02–RP-05 filed to the local backlog (receipt e2c85888b, unpushed).
- **Unsettled items:** None.

## What Went Well

- **Adversarial review earned its cost.** Every round through round 5 found a
  real defect the prior round missed, and each was confirmed by independent
  reproduction rather than prose reading (e.g. round 1's end-to-end
  protected-mode reproduction; round 5's ten-item mutation sample against
  scratch copies). The pattern legitimately terminated on evidence, not
  fatigue.
- **Bounded stop contracts worked as designed.** With `phase_recovery_limit: 0`,
  the p07 implementer stopped direction-required instead of self-repairing a
  committed defect — which surfaced that the review-prescribed correspondence
  rule was refuted by the repo's own CloudFront Origin Path fixture (Recovery
  Event `p07-rec-001`). The stop converted a wrong premise into an operator
  decision (`DR-260817-no-structural-root`) instead of a buried patch.
- **Cross-model advisory added real information.** The Codex `phone-a-friend`
  consult on the correspondence question independently concurred and caught a
  catalog hash-ordering hazard the root's own fix proposal had missed
  (recorded in `implementation.md` "Operator Direction: p07-t03").
- **Class fixes over instance fixes.** The `publicAccess` regression was fixed
  by making the argument required (`DR-260817-security-relevant-options-must`),
  the credential bypass by making gates version-agnostic
  (`DR-260817-version-agnostic-publication`) — both close the defect class, and
  both later proved out when the same shapes reappeared elsewhere and were
  caught.

## Challenges and Struggles

- **Vacuous verification, five instances (Confirmed).** (1) A prior-cycle
  canary row asserted nothing (source review M2). (2–3) Two fixtures
  (`durability.test.mjs`, `wrapper-compatibility.test.mjs`) built their
  expected value with the same `catalogFromManifest` omission as the code
  under test, so verifier and fixture agreed with each other while both
  disagreed with the shipped producer — concealing that protected-mode
  publication could never reach `built-durable` (p07 review round 1 Critical,
  fixed `159c8901c`). (4) The `final-fix-003` implementer's first `$id`-form
  test passed against both implementations because the schema registry
  rejected the version before the predicate ran; its own mutation check caught
  it. (5) The root orchestrator's gate harness — `cmd | tail && echo OK` —
  printed OK regardless of exit status, which produced a false "merged tree
  passes gates" claim later disproven by a subagent, and masked a `check`
  failure whose cause the `tail` truncation destroyed. Impact: two review
  rounds and one fix batch exist substantially because passing tests proved
  nothing. Response: red/green proof became mandatory for new tests, reviewers
  mutation-tested claims, and gates moved to explicit per-gate exit codes.
  Result: round 5's sample found nine of ten items genuinely discriminating,
  and the tenth became `final-fix-004`.
- **Boundary-scoped edits versus cross-cutting options (Confirmed).** The four
  files carrying the `publicAccess` propagation gap were exactly the four
  absent from `6f20182cd`'s declared file boundary — one systematic
  consequence, not four misses. The task-file-boundary discipline that makes
  commits reviewable actively fought a change whose correctness required a
  repo-wide sweep.
- **A review premise survived two rounds because no gate ran the check
  (Confirmed).** Both branches independently bumped `oat-project-complete`
  `1.6.0 → 1.6.1`; the merged content carried main's version number. CI's
  `validate-skill-version-bumps` failed on exactly this, but no root script
  ran it, so "all eight gates green" never implied CI green. Round 3 proved it
  by running the command. Fixed by `final-fix-002` plus making the Definition
  of Done mirror CI (`DR-260817-local-gates-mirror-ci-exactly`).
- **One reviewer self-reversal (Confirmed).** The second full final review
  initially reported the v1 credential bypass closed ("protected for v1 replay
  as well as v2"); the root's differential probe disproved it, and the
  reviewer's corrected artifact documented its own method error (an invalid v1
  probe that died on an unrelated error code). The episode is why later rounds
  were briefed to reproduce rather than inherit.

## Decision Register

Five decisions were promoted to durable records during summary generation:
`DR-260817-version-agnostic-publication`, `DR-260817-no-structural-root`,
`DR-260817-catalog-carries-policy-never`,
`DR-260817-security-relevant-options-must`,
`DR-260817-local-gates-mirror-ci-exactly`. No justified missing records
identified.

## Rejected or Superseded Alternatives

- **Strict root-path equality and suffix-containment** (both rejected):
  equality broke a production CloudFront Origin Path deployment; containment
  is vacuous for the empty-path case it was meant to admit and still
  false-rejects rewriting CDNs.
- **`rootCorrespondence` receipt field** (withdrawn by the root itself): the
  receipt's existing `skipped-protected` status already carried the honesty; a
  second weaker signal plus a schema change bought nothing.
- **Dropping `publish-request/v1` in this PR** (deferred, operator decision):
  the gate fix was version-agnostic instead, so removal became hygiene, not
  security, and belongs in a minor release
  (`BL-260817-drop-explainer-kit-publish`).

## Where We Changed Course

- **p07-t03 respecified mid-phase:** trigger — wrapper smoke 5/5 → 3/5 under
  the planned rule; direction — remove the rule, surface catalog policy
  instead; outcome — smoke restored, `DR-260817-no-structural-root`.
- **Final-review narrowing reversed, then reinstated:** trigger — the first
  full final review had been overturned by a reconciliation, so the root
  overrode automatic narrowing for a fresh full pass; after that pass was
  received normally, later rounds narrowed again with justification recorded
  per round.
- **Catalog carried policy, not outcome:** trigger — Codex advisory identified
  the serialize-before-verify hash ordering; direction — policy marker only;
  outcome — `DR-260817-catalog-carries-policy-never`.

## Domain Learnings

- A test that cannot fail is worse than no test: it converts absence of
  verification into apparent presence. The only trustworthy proof a new test
  works is watching it fail against the defect it guards.
- Structural invariants between independently configured identifiers (S3 key
  prefix vs public URL path) are unsound when the mapping between them lives
  in external configuration; surface uncertainty instead of inventing a rule.
- Hash-bound artifacts cannot carry facts established after they are hashed;
  policy-versus-outcome is the load-bearing distinction.
- Merge resolution of hand-maintained validated tables must use the validator
  as the oracle, not textual heuristics — the union heuristic was wrong twice
  over (wrong rows via duplicate labels; stale mappings rejected by the test).

## Gotchas for Humans

- Run `pnpm run check:skill-bumps` after any merge of `origin/main` — parallel
  version bumps collide silently and only this gate sees it.
- The `package-coverage-consumers` smoke flake (~1 in 3 full runs) and the
  `cleanup.test.mjs` SIGTERM wedge are pre-existing; rerun once before
  investigating (backlog `BL-260817-let-resolveassetsroot-honor`; RP-03).
- `packages/cli/assets/` is build-generated and gitignored; never hand-edit,
  and force `pnpm --filter @open-agent-toolkit/cli run build` when Turbo's
  `FULL TURBO` leaves it stale after `.agents/skills` edits.

## Gotchas for Autonomous Agents

- Never verify gates via `cmd | tail && echo OK` — the pipeline exit is
  `tail`'s. Capture `exit=$?` per gate to a log file.
- Never restore a mutation with `git checkout <file>` while carrying
  uncommitted fixes in the same file; mutate scratch copies.
- When adding an option that crosses module boundaries, enumerate every call
  site repo-wide before declaring the task's file boundary; the boundary
  discipline will otherwise scope the fix to a subset.
- When a reviewer inherits a claim from a prior round, require it to reproduce
  the claim; agreement without reproduction restated two false premises in
  this project.
- Treat `AskUserQuestion`-approved dispositions as scope contracts: record
  them in the plan/implementation before dispatching, so subagents cannot
  relitigate settled decisions.

## Repo Improvements (Promotion Register)

### RP-01: Add gate-runner exit-code discipline to the Definition of Done

- **Type:** agents-instruction
- **Disposition:** apply
- **Status:** applied
- **Target:** AGENTS.md
- **Applied-ref:** AGENTS.md (Definition of Done, gate exit-code discipline)
- **Disposition-note:** —

The root orchestrator's gate verification printed unconditional OK markers
because `cmd | tail && echo OK` takes `tail`'s exit status; this masked a real
`pnpm test` failure at merge commit `8bda0b22b` and a `check` failure whose
cause was destroyed by truncation. Add one sentence to the root `AGENTS.md`
Definition of Done: capture each gate's exit code explicitly (e.g.
`pnpm <gate> > log 2>&1; echo "exit=$?"`) and never derive success from a
pipeline whose final stage is a pager or filter.

### RP-02: Extend guarded-prose contract tests to docs-app mirrors

- **Type:** code-follow-up
- **Disposition:** file
- **Status:** filed
- **Destination:** `.oat/repo/pjm/backlog/items/BL-260818-extend-guarded-prose-contract.md`
- **Destination-receipt:** e2c85888bfd674f51eb692cc97fec7101b4a14ef
- **Remote-visibility:** unpushed
- **Sanitized:** no
- **Disposition-note:** filed as new; related-not-duplicate candidates recorded in item body

`contracts.test.mjs` forbids the phrase ``complete `PublishReceiptV1` `` in
`references/extension-contract.md`, but the docs-app page duplicating that
prose (`apps/oat-docs/docs/workflows/skills/explainer-kit.md`) had no guard,
so the exact forbidden phrase survived there until the post-completion docs
sync. Either extend the guarded-prose assertions to the docs-app mirrors of
skill-reference content, or replace duplicated passages with cross-links so
only one guarded copy exists.

### RP-03: Investigate the cleanup.test.mjs SIGTERM wedge

- **Type:** code-follow-up
- **Disposition:** file
- **Status:** filed
- **Destination:** `.oat/repo/pjm/backlog/items/BL-260818-bound-the-smoke-cleanup.md`
- **Destination-receipt:** e2c85888bfd674f51eb692cc97fec7101b4a14ef
- **Remote-visibility:** unpushed
- **Sanitized:** no
- **Disposition-note:** filed as new; related-not-duplicate candidates recorded in item body

During final review round 5, `pnpm test` wedged for ~35 minutes inside
`tools/smoke/runner/cleanup.test.mjs`'s SIGTERM harness; killing and rerunning
completed cleanly (reviewer environment note, round-5 return). Pre-existing
and untouched by this project's range. A hang that long inside a signal
harness suggests a missed-signal race with no timeout; add a bounded timeout
to the harness or reproduce and fix the race.

### RP-04: Distinguish operator-directed review rounds from failed fix cycles in the review-cycle cap

- **Type:** code-follow-up
- **Disposition:** file
- **Status:** filed
- **Destination:** `.oat/repo/pjm/backlog/items/BL-260818-distinguish-operator-directed.md`
- **Destination-receipt:** e2c85888bfd674f51eb692cc97fec7101b4a14ef
- **Remote-visibility:** unpushed
- **Sanitized:** no
- **Disposition-note:** filed as new; related-not-duplicate candidates recorded in item body

The three-cycle review governance cap in the review skills counts artifacts
per scope, so this project's final scope exceeded it by round 3 of 6 even
though rounds were operator-directed and each found real defects. The
standing-override state had to be re-recorded manually at every subsequent
round. Consider letting the cap distinguish failed automatic fix loops (its
target) from explicitly operator-directed continuation, e.g. a durable
recorded override rather than per-round re-justification.

### RP-05: Require repo-wide call-site sweeps for cross-cutting options in phase-implementer guidance

- **Type:** agents-instruction
- **Disposition:** file
- **Status:** filed
- **Destination:** `.oat/repo/pjm/backlog/items/BL-260818-require-repo-wide-call-site.md`
- **Destination-receipt:** e2c85888bfd674f51eb692cc97fec7101b4a14ef
- **Remote-visibility:** unpushed
- **Sanitized:** no
- **Disposition-note:** filed as new; related-not-duplicate candidates recorded in item body

The `publicAccess` propagation gap occurred because a cross-cutting option was
threaded only within the task's declared file boundary; the four affected
files were exactly the four outside `6f20182cd`'s diff. Add guidance to the
phase-implementer contract (canonical skill content, hence filed rather than
applied directly): when a task adds or changes an option consumed across
module boundaries, enumerate every call site repo-wide and either widen the
boundary mechanically or stop for direction — a declared file boundary is a
review scope, not a correctness scope.

## OAT Upstream Feedback (Upstream Register)

No upstream feedback identified.

## Remaining Boundaries and Follow-Ups

- PR [#196](https://github.com/voxmedia/open-agent-toolkit/pull/196) awaits
  human review; `oat-project-complete` may run before or after merge.
- The six `BL-260817-*` backlog items own all deferred security and CI
  residue; none is blocking.
- The retained `reference/` legacy stubs flagged during the pjm sync predate
  this project and were deliberately left.

## Reflections

This run's defining tension was between evidence and appearance of evidence.
The project shipped real security hardening, but nearly every setback traced
to verification that looked stronger than it was — fixtures agreeing with the
code they tested, gates whose green was unconditional, a reviewer inheriting
a premise instead of reproducing it. What made the final result trustworthy
was the escalating insistence on mechanical proof: reproductions for every
claimed closure, mutations for every claimed test, exit codes for every
claimed gate. Future work should start from that standard rather than arrive
at it: brief implementers with red/green as a non-negotiable from task one,
brief reviewers to reproduce rather than inherit, and treat any check whose
failure has never been observed as unverified. The six-round review arc was
expensive, but each round's finding was real; the expense was the price of
the four vacuous-verification instances that preceded the standard, not of
the standard itself.
