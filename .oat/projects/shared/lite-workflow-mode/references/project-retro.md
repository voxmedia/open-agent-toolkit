---
oat_retro_project: lite-workflow-mode
oat_retro_generated: '2026-09-06T05:17:39Z'
oat_retro_evidence_sources:
  - source: project-log
    status: used
  - source: oat-execution-learnings
    status: unavailable
  - source: lifecycle-artifacts
    status: used
  - source: archived-review-markdown
    status: used
  - source: gate-receipts
    status: used
  - source: dispatch-records
    status: used
  - source: git-history
    status: used
  - source: session-transcript
    status: used
  - source: github-pr-state
    status: used
  - source: spec
    status: unavailable
oat_retro_promotions: proposed
oat_retro_filing: proposed
oat_generated: true
oat_template: false
---

# Project Retrospective: lite-workflow-mode

## Executive Summary

The project delivered Lite as a first-class OAT workflow and proved its core
contracts through 27 implementation tasks, independent phase reviews,
production-derived promotion controls, and a configured exit gate. The result
is credible because several initially green or apparently complete paths failed
under real artifacts, full-surface tests, or independent review and were then
reproduced before correction. The largest opportunity is not more Lite code;
it is reducing workflow friction around cross-cutting mode inventories,
prelaunch provenance, dispatch terminalization, and review-artifact closeout.

## Evidence and Review Method

The synthesis read the append-only `project-log.md` first, then the lifecycle
artifacts, 29 archived review documents, three exit-gate receipts, 33 dispatch
records, relevant Git history, and the current session transcript
`01a073de-998c-7541-97c9-379dade1c17e`. Live GitHub state for PR #264 was used
only for the generation-time boundary snapshot. Three bounded read-only lanes
separately examined durable outcomes, failure taxonomy, and feedback
deduplication; root synthesis reopened the cited sources before retaining their
claims.

No project-local `oat-execution-learnings.md` or formal `spec.md` exists. That
absence is expected for the Quick workflow used to build Lite, but both sources
are recorded as unavailable rather than inferred. Committed artifacts outrank
session recollection. Causes below are labeled confirmed only when a receipt,
review, reproduction, or durable ledger supports them; otherwise the text says
hypothesis or inconclusive.

## Outcome Snapshot

| Area              | Generation-time outcome                                                                                    | Evidence anchor                            |
| ----------------- | ---------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| Product           | Fourth workflow mode with a three-artifact Lite scaffold and dedicated planning skill                      | `summary.md` → What Was Implemented        |
| Promotion         | In-place Lite-to-Quick promotion preserves identity and captured context                                   | `DR-260906-promote-oversized-lite-work`    |
| Execution         | 27/27 tasks across six phases                                                                              | `implementation.md` → Progress Overview    |
| Review            | Every phase passed; exit gate run `0da02d5a-4d15-4c3c-97bf-94cf246ac945` passed the Important threshold    | `plan.md` → Reviews; matching gate receipt |
| Verification      | Full repository/release/docs gates plus uncached, smoke, skill, lint, format, and negative controls passed | `implementation.md` → Final Summary        |
| Delivery boundary | PR #264 was open at `975a5169c`; GitHub reported merge conflicts and Cursor Bugbot had passed              | live GitHub PR state at generation         |

## Current State

- **Promotions:** `proposed` — RP-01 and RP-02 await an apply decision.
- **Filing:** `proposed` — UP-01 and UP-02 await a filing decision and destination.
- **Unsettled items:** RP-01, RP-02, UP-01, and UP-02.

## What Went Well

- The reduced workflow did not reduce assurance. `DR-260906-retain-managed-implementation`
  preserved managed ceilings, per-phase review, final review, and the exit gate.
- Pre-edit SHA validation prevented a stale p06 launch from changing code. The
  `INVALID_RUN_ABORT` record shows 0/3 tasks executed before explicit relaunch
  authorization.
- Production-derived controls materially improved confidence. Gate run
  `e1faf839-7cd8-4635-8d73-2196ade93c55` disproved a hand-built routing fixture;
  p06-t10 then proved shared and local promotion through real artifacts and a
  neutralized-guard failure.
- Failure bookkeeping generally failed closed. The first p04 recovery was
  settled as failed, the attempted correction was restored, and the second
  authorized recovery produced commit `479d2f1a1c0ebbe3e64445d3af14d5bcde3e18b1`.
- The final gate receipts consistently preserved configured-target provenance,
  run correlation, and receive eligibility without claiming unreported runtime
  identity.

## Challenges and Struggles

### Plan review did not converge within its normal budget

Eleven plan-gate rounds found additional mode-aware surfaces, with Important
counts oscillating instead of trending to zero. This delayed implementation and
made another automated round a poor proxy for completion. The user first
authorized bounded continuation, then stopped the loop after round eleven and
accepted the explicit residual-risk handoff to phase and final reviews. Those
later reviews found real omissions, validating the risk disclosure without
showing that an unbounded planning loop would have been efficient. Evidence:
`plan.md` → Plan artifact review disposition.

### Prelaunch bookkeeping invalidated its own execution baseline

The first p06 launch recorded its journal commit after the payload's expected
base had been captured. The accepted-run HEAD therefore differed from
`expected_base_sha`; the implementer rejected the run before edits, leaving all
three tasks untouched. The response was an explicit user-authorized relaunch
whose base matched the post-journal HEAD. Safety worked, but the producer and
consumer disagreed about which required bookkeeping belonged to the launch
baseline. Evidence: `implementation.md` → p06 invalid-run abort before
implementation; dispatch record `lite-p06-49152831-dceb-492d-8f66-a0e03c5d683a`.

### Fixture fidelity produced false confidence twice

The p03 promotion tests did not initially model the untouched canonical Lite
template, and a later recommender test hand-built a readiness state no
production path emitted. Both suites could pass while real artifacts failed.
The response was to derive unresolved markers from the resolved template and
to test promote-then-recommend through real shared/local projects. The final
controls also neutralized the guard to prove the requirement test could fail.
Evidence: archived `code-p03-review-2026-09-05T210319Z.md`; gate run
`e1faf839-7cd8-4635-8d73-2196ade93c55`; commit
`f3abb7688f005353ebee472c3d4df36e3c99cd0c`.

### Review closeout crossed a tracked-to-ignored boundary awkwardly

During final PR preparation, eleven tracked top-level review files had to move
into the repository's gitignored `reviews/archived/` surface. The scoped rename
commit succeeded, but the lint-staged hook attempted to re-add ignored
destinations and emitted an error while applying its formatting results. This
did not lose data, yet it made a successful closeout look partially failed and
exposed missing acceptance criteria in the existing archival backlog record.
Evidence: session transcript `01a073de-998c-7541-97c9-379dade1c17e`; commit
`6e31c6f579e438afacd6399de285d188fc7ffcd5`;
`BL-260903-pr-final-archives-reviews`.

## Decision Register

| Decision                  | Why it mattered                                                     | Durable record                             |
| ------------------------- | ------------------------------------------------------------------- | ------------------------------------------ |
| Make Lite first-class     | Reuses project identity, routing, resume, and review infrastructure | `DR-260906-lite-is-a-first-class-workflow` |
| Use three artifacts       | Separates approved intent from machine-mutated execution state      | `DR-260906-use-a-three-artifact-lite`      |
| Keep one sequential phase | Makes scope growth an explicit promotion signal                     | `DR-260906-keep-lite-single-phase`         |
| Promote in place          | Preserves interview context and project identity                    | `DR-260906-promote-oversized-lite-work`    |
| Retain managed review     | Planning reduction does not waive execution assurance               | `DR-260906-retain-managed-implementation`  |

## Rejected or Superseded Alternatives

- A conversation-only micro mode was rejected because it lacked durable resume
  and handoff state.
- A minimal-profile flag inside Quick was rejected because it would compound
  Quick's existing branching complexity.
- Branch-only draft-PR specs were rejected because they bypassed project
  registration and structured progress.
- Making Quick the default was deliberately deferred to
  `BL-260904-make-quick-the-default-oat` so the Lite project did not absorb a
  repo-wide rename and migration.

Evidence: `discovery.md` → Solution Space and Deferred Ideas.

## Where We Changed Course

- Repeated plan-gate findings triggered a user-directed stop and a move from
  planning convergence to implementation-time phase/final review coverage.
- The p06 terminal test failure triggered an authorized plan revision rather
  than an out-of-scope repair hidden inside a release task.
- A supposedly complete router fix was replaced after a real promoted project
  proved the fixture impossible; the new direction used producer-generated
  artifacts end to end.
- The final Minor finding was resolved as artifact wording under the user's
  explicit no-re-review direction, avoiding a redundant code-review cycle.

## New Architecture Patterns and Approaches

- **Three-artifact Lite contract:** `plan.md` holds approved intent while
  `state.md` and `implementation.md` remain machine-owned.
- **In-place workflow promotion:** a project changes mode without losing slug,
  branch, interview context, or historical Lite plan.
- **Artifact-level readiness:** promoted discovery remains `in_progress` while
  carrying `oat_ready_for: oat-project-quick-start`, matching project state for
  consumers that route from artifacts.
- **Mode-specific closeout resolution:** Lite defaults to PR-only closeout while
  allowing explicitly configured summary/document steps and excluding recap.

## Domain Learnings

- A workflow-mode addition is a compatibility change across declarations,
  routers, templates, lifecycle prose, provider projections, and release
  assets—not a local enum edit.
- Tests of parsers and routers must consume artifacts produced by the real
  writer. A syntactically valid fixture can encode the same false model as the
  code under test.
- Bundled skills, docs, templates, and provider views are shipped CLI behavior;
  they require lockstep package versions and sync verification.
- A configured cross-family target proves configured invocation diversity, not
  actual runtime model identity when telemetry reports `not-reported`.

## Gotchas for Humans

- In zsh evidence wrappers, use `rc` rather than the reserved `status` variable;
  the p06-t11 wrapper failed before its assertion for this reason.
- Treat review-cycle caps as authorization boundaries. A new finding after the
  cap does not authorize another automated review.
- Before merge, reconcile PR #264 with current `main`; at generation time GitHub
  reported conflicts in generated reference, sync, and lockstep-version files.
- Do not interpret a clean configured-target receipt as runtime-model
  attestation when runtime identity is explicitly unreported.

## Gotchas for Autonomous Agents

- Resolve the exact accepted HEAD only after every required launch-journal
  commit; otherwise pre-edit provenance correctly aborts the run.
- Before consuming a review attempt, verify the target artifact changed. One
  plan review repeated an unchanged target after an edit script aborted.
- Use production-emitted artifacts for routing and scaffold controls, and prove
  high-value guards can fail by neutralizing them once.
- When archiving tracked reviews into an ignored directory, verify both the
  index rename and hook behavior; a generic restage may reject the destination.
- Treat accepted dispatch records as launch provenance until a linked terminal
  outcome is durably reconciled.

## Repo Improvements (Promotion Register)

### RP-01: Add a workflow-mode change inventory to contributor guidance

- **Type:** agents-instruction
- **Disposition:** apply
- **Status:** proposed
- **Target:** `AGENTS.md`
- **Applied-ref:** —
- **Disposition-note:** —

Add a compact checklist requiring workflow-mode changes to enumerate and test
the canonical declaration, recommender/router consumers, scaffold/templates,
lifecycle-skill contracts, documentation, bundled release assets, and provider
projections. Preserve the intentionally separate route tables unless a change
explicitly owns their consolidation. Eleven plan reviews and later production
controls showed that generic repository gates did not front-load this
cross-surface inventory.

### RP-02: Make the existing PR-final archival backlog item testable

- **Type:** docs
- **Disposition:** apply
- **Status:** proposed
- **Target:** `.oat/repo/pjm/backlog/items/BL-260903-pr-final-archives-reviews.md`
- **Applied-ref:** —
- **Disposition-note:** —

Replace the placeholder acceptance criteria with explicit controls: validate
that every Reviews-ledger path resolves before `gh pr create`; cover late final
reviews; and prove that tracked-to-ignored archive moves survive formatting and
staging hooks without losing the destination or presenting a false failure.
This extends the existing item rather than creating a duplicate.

## OAT Upstream Feedback (Upstream Register)

### UP-01: Calculate execution baselines after mandatory launch journaling

- **Status:** proposed
- **Destination:** —
- **Destination-receipt:** —
- **Remote-visibility:** —
- **Sanitized:** yes
- **Disposition-note:** —

Phase dispatch should not invalidate its own `expected_base_sha`. Persist all
mandatory prelaunch journal commits before resolving the accepted base, or
encode an explicit semantic-head rule that both launcher and implementer
validate. Add a control in which launch journaling advances Git HEAD and prove
the first authorized dispatch remains valid without weakening pre-edit aborts.
The p06 abort demonstrates the defect and the corrected relaunch demonstrates
the intended invariant.

### UP-02: Reconcile every accepted dispatch to a terminal outcome

- **Status:** proposed
- **Destination:** —
- **Destination-receipt:** —
- **Remote-visibility:** —
- **Sanitized:** yes
- **Disposition-note:** —

Several accepted p01-p03 implementation and review records still report
`child_outcome: in-progress` even though committed implementation and review
artifacts record completion or pass. Require a linked terminal envelope or an
append-only reconciliation event for every accepted dispatch, preserve both
launch and terminal provenance, and add a closeout check that detects accepted
records lacking terminal truth. The mechanism that left these records stale is
inconclusive; the durable inconsistency is confirmed.

## Remaining Boundaries and Follow-Ups

At generation time, PR #264 was open but conflicting with `main`; merge and
release were not authorized. The configured closeout sequence had completed
summary, documentation, and PR creation and was awaiting final HiLL approval.
The separately owned Quick-default rename remained tracked in
`BL-260904-make-quick-the-default-oat`. RP-01/RP-02 require an apply decision;
UP-01/UP-02 require a filing decision and destination.

## Reflections

Lite succeeded because its smaller artifact contract was paired with strong
execution evidence, not because the project was intrinsically simple. The run
also showed a recurring systems lesson: cross-cutting workflow changes fail at
the seams between producers and consumers—template versus validator, state
versus discovery artifact, configured target versus runtime identity, launch
journal versus accepted SHA. Future work should inventory those seams before
review, test them with producer-generated artifacts, and retain exact failure
receipts when an independent gate disproves a green fixture.
