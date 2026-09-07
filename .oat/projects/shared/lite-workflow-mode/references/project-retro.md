---
oat_retro_project: lite-workflow-mode
oat_retro_generated: '2026-09-07T00:38:07Z'
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
  - source: github-actions
    status: used
  - source: spec
    status: unavailable
oat_retro_promotions: proposed
oat_retro_filing: complete
oat_generated: true
oat_template: false
---

# Project Retrospective: lite-workflow-mode

## Executive Summary

The project delivered Lite as a first-class OAT workflow, then materially
improved it through a user-directed revision that restored adaptive product and
technical specification depth and replaced mandatory test-first ceremony with
risk-proportionate proof. The final result spans 39 tasks across eight phases,
including Wave 4 integration, five governed p-rev2 recoveries, independent
review, and exact-head CI and release validation. The strongest lesson is that
workflow changes must be verified at composition boundaries and on the same
platform classes that consume their evidence.

## Evidence and Review Method

The synthesis read the append-only `project-log.md` first, then the current
plan, state, implementation, discovery, design, summary, decision records,
archived reviews, gate receipts, dispatch records, Git history, and session
transcript `01a073de-998c-7541-97c9-379dade1c17e`. Live GitHub evidence was
limited to PR #264 and exact-head Actions runs `34070017663` and `34070017665`.
Two bounded read-only lanes checked the post-retro execution chronology and
deduplicated feedback against existing backlog and GitHub issues; root reopened
the cited durable sources before retaining their conclusions.

No project-local `oat-execution-learnings.md` or formal `spec.md` exists. That
is expected for this Quick-origin project and is recorded as unavailable.
Committed evidence and exact run receipts outrank recollection. The two final
test mechanisms are confirmed by preserved negative controls and focused
review; the cause of older unreconciled dispatch terminal state remains
inconclusive.

## Outcome Snapshot

| Area              | Generation-time outcome                                                                                              | Evidence anchor                                       |
| ----------------- | -------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| Product           | Lite is a first-class, three-artifact, single-phase workflow with safe in-place promotion                            | `summary.md` → What Was Implemented                   |
| Specification     | Lite plans adaptively include Product Behavior and Technical Design and preserve them during promotion               | `plan.md` → Phase p-rev1                              |
| Proof             | Plans select proportionate, fail-capable evidence instead of requiring test-first work for every change              | `design.md` → Revision 1                              |
| Execution         | 39/39 tasks across eight phases, including five governed p-rev2 recoveries                                           | `implementation.md` → Progress Overview               |
| Review            | Final stabilization review accepted both substantive test fixes; its wording-only Medium was resolved in `prev2-t05` | `reviews/archived/final-review-2026-09-07T002708Z.md` |
| Verification      | Local required and supplemental gates passed; exact-head CI and Release Dry Run passed                               | Actions runs `34070017663`, `34070017665`             |
| Delivery boundary | PR #264 is open and mergeable at `15ad3374c`; merge, release, and lifecycle approval are not implied                 | live GitHub and `state.md`                            |

## Current State

- **Promotions:** `proposed` — RP-01 through RP-03 await an apply decision.
- **Filing:** `complete` — RP-04 and UP-01/UP-02 are already filed and tracked.
- **Unsettled items:** RP-01, RP-02, and RP-03 require an explicit apply
  decision. No filing item is unsettled.

## What Went Well

- Lite retained managed implementation, phase review, final review, and the
  configured exit gate even while reducing planning ceremony.
- The user feedback loop improved the product rather than merely polishing
  wording. Revision p-rev1 restored conditional specification sections and
  made proof strategy proportional to runtime risk.
- Append-only recovery preserved original task commits and exact dispatch
  provenance. Each p-rev2 attempt was reserved, bounded, verified, and settled
  without rewriting history.
- Real negative controls changed the result. Ubuntu exposed a symlink identity
  fixture that macOS did not, and full-suite load exposed a SIGTERM readiness
  race that isolated repetitions initially missed.
- Exact-head GitHub evidence closed the loop. CI `34070017663` and Release Dry
  Run `34070017665` passed on the published SHA `15ad3374c`.

## Challenges and Struggles

### Planning review exceeded its useful convergence window

Eleven early plan-gate rounds found additional mode-aware surfaces, but the
finding count did not converge monotonically. The user stopped the unbounded
loop and accepted an explicit handoff to phase and final reviews. Those later
reviews found real omissions, so the risk disclosure was warranted, but more
planning rounds would not necessarily have found them more efficiently.
Evidence: `plan.md` → Plan artifact review disposition.

### The first Lite plan shape was too compressed

The collapsed plan originally omitted explicit Product Behavior and Technical
Design sections and prescribed RED/GREEN language broadly enough to encourage
test theater. The user supplied the Warp reference again and challenged both
choices. Revision p-rev1 added observable triggers for adaptive section depth,
promotion preservation, and risk-proportionate proof. Evidence: `plan.md` →
Phase p-rev1 and `reviews/archived/p-rev1-review-2026-09-06T173547Z.md`.

### Wave 4 integration exposed a composition gap

The merge preserved both sides mechanically, but Lite did not invoke Wave 4's
new shared lifecycle-gate posture setup. The post-merge review found this as an
Important issue. `prev2-t01` composed the contracts and added `LITE-10` plus
caller-inventory coverage. Evidence:
`reviews/archived/final-review-2026-09-06T225347Z.md` and
`implementation.md` → Task prev2-t01.

### Cross-platform negative controls were initially unstable

Required CI run `34067919653` failed because Ubuntu reused a deleted symlink
inode while the fixture recreated the same raw link text. The production guard
correctly returned `partial`; recovery 4 changed only the fixture to use a
distinct raw spelling that resolves to the same canonical target, preserving
the strong `changed` expectation. A later full smoke run then reproduced a
60-second SIGTERM timeout: the generated wrapper wrote its readiness sentinel
before installing its test-local listener. Recovery 5 armed the listener first
in both branches. Focused stress, the 160-test smoke suite, independent review,
and exact-head CI all passed afterward. Evidence: recovery events 4–5 in
`implementation.md` and
`reviews/archived/final-review-2026-09-07T002708Z.md`.

### Durable bookkeeping repeatedly crossed awkward boundaries

Mandatory launch journaling once invalidated its own expected base SHA, and
ignored PR/review destinations required force-staging after lint-staged tried
to re-add them generically. These failures did not corrupt source, but they
made valid work look incomplete and consumed recovery attention. GitHub issues
#265/#266 and the existing PR-final archival backlog item retain the follow-up.

## Decision Register

| Decision                  | Rationale                                                          | Durable record                             |
| ------------------------- | ------------------------------------------------------------------ | ------------------------------------------ |
| Make Lite first-class     | Reuse project identity, routing, resume, and review infrastructure | `DR-260906-lite-is-a-first-class-workflow` |
| Use three artifacts       | Separate approved intent from machine-mutated execution state      | `DR-260906-use-a-three-artifact-lite`      |
| Keep one sequential phase | Make scope growth an explicit promotion signal                     | `DR-260906-keep-lite-single-phase`         |
| Promote in place          | Preserve interview context and project identity                    | `DR-260906-promote-oversized-lite-work`    |
| Retain managed review     | Planning reduction does not waive execution assurance              | `DR-260906-retain-managed-implementation`  |
| Use adaptive plan depth   | Require product/technical sections from observable change triggers | p-rev1 design revision                     |
| Use proportionate proof   | Prefer the cheapest evidence that can fail for the relevant risk   | p-rev1 design revision                     |

## Rejected or Superseded Alternatives

- A conversation-only micro mode was rejected because it lacked durable resume
  and handoff state.
- A minimal-profile flag inside Quick was rejected because it would compound
  Quick's branching complexity.
- A fixed five-section Lite plan was superseded because it could hide
  user-visible behavior and cross-module design decisions.
- Mandatory test-first wording was superseded because docs, skills, config, and
  mechanical changes can gain no confidence from bespoke fixtures or harnesses.
- Increasing smoke deadlines was rejected because it would mask the readiness
  race rather than fix the test contract.

## Where We Changed Course

- Non-converging plan review triggered a bounded handoff to implementation-time
  review, preserving explicit residual risk.
- The user's Warp refresher triggered a formal revision phase rather than a
  template-only patch; the result changed plan, promotion, reviewer,
  implementer, validator, and documentation contracts together.
- Wave 4 review triggered composition with the shared lifecycle-gate posture
  instead of treating a conflict-free merge as semantic compatibility.
- An isolated SIGTERM pass was superseded when the full smoke suite produced a
  negative control; the project moved from inconclusive mechanism to confirmed
  test-harness race.

## New Architecture Patterns and Approaches

- **Adaptive Lite plan shape:** observable behavior and implementation triggers
  determine whether product or technical sections are required.
- **Proof-strategy declaration:** each plan chooses evidence based on risk and
  executor capability; runtime behavior still requires a check that can fail.
- **Lossless in-place promotion:** authored product and technical payloads move
  into Quick discovery instead of disappearing during escalation.
- **Governed append-only recovery:** reservation, exact target, candidate
  commit, verification, and settlement preserve task history and provenance.

## Domain Learnings

- Workflow modes are composition contracts across schemas, routers, templates,
  skills, agents, docs, bundled assets, and provider projections.
- A green fixture is weak evidence when the platform can vary filesystem
  identity or scheduling. State the invariant directly in test data.
- Readiness sentinels must mean the consumer is actually ready, not that an
  earlier asynchronous step completed.
- Test proportionality is not reduced rigor. It moves rigor to the failure mode
  that matters and avoids fixtures that only rehearse implementation details.
- A later successful isolated run cannot classify an earlier failure. Preserve
  the failure and keep the mechanism inconclusive until a matching negative
  control exists.

## Gotchas for Humans

- Review a merge for semantic composition even when Git reports no conflict.
- Do not call a branch stable until required CI and release validation pass on
  the exact published SHA.
- In zsh evidence wrappers, avoid the reserved `status` variable; use `rc`.
- Treat review-cycle caps and merge/release steps as authorization boundaries.
- When moving tracked files into ignored OAT archive directories, expect to
  force-stage the exact paths and verify the commit contents.

## Gotchas for Autonomous Agents

- Resolve the accepted execution baseline after every mandatory journal commit.
- Use production-emitted artifacts for router and promotion controls.
- For cross-platform symlink tests, do not rely on inode churn to prove user
  replacement; make identity differ explicitly while preserving the target.
- Arm signal handlers before publishing readiness to a controlling process.
- A wording-only waiver does not cover substantive test changes. Re-review
  evidence semantics after changing a negative control.
- Reconcile accepted dispatch records to terminal outcomes before closeout.

## Repo Improvements (Promotion Register)

### RP-01: Add a workflow-mode change inventory to contributor guidance

- **Type:** agents-instruction
- **Disposition:** apply
- **Status:** proposed
- **Target:** `AGENTS.md`
- **Applied-ref:** —
- **Disposition-note:** —

Add a compact checklist requiring workflow-mode changes to enumerate and test
the canonical declaration, recommender/router consumers, templates, lifecycle
skills, agent contracts, documentation, bundled assets, and provider
projections. Include semantic composition with newly shared contracts. The
early review volume and Wave 4's missed gate-posture composition show that
generic repository gates do not front-load this inventory.

### RP-02: Make the existing PR-final archival backlog item testable

- **Type:** docs
- **Disposition:** apply
- **Status:** proposed
- **Target:** `.oat/repo/pjm/backlog/items/BL-260903-pr-final-archives-reviews.md`
- **Applied-ref:** —
- **Disposition-note:** —

Replace its placeholder acceptance criteria with controls that resolve every
review-ledger path before PR creation, cover late final reviews, and prove that
tracked-to-ignored archive moves survive formatting and staging hooks without
losing the destination or presenting a false failure.

### RP-03: Add the Linux symlink mechanism to the collection-stability backlog

- **Type:** docs
- **Disposition:** apply
- **Status:** proposed
- **Target:** `.oat/repo/pjm/backlog/items/BL-260904-stabilize-the-collection.md`
- **Applied-ref:** —
- **Disposition-note:** —

Record required CI run `34067919653` and recovery commit `ddddba079` as evidence
that Linux can reuse a deleted symlink inode. State that same-target replacement
tests need distinct raw link text, not presumed inode churn. Do not close the
item unless its separate ten-consecutive-uncached-run criterion is satisfied.

### RP-04: Re-evaluate proof guidance across every plan workflow

- **Type:** code-follow-up
- **Disposition:** file
- **Status:** filed
- **Destination:** `.oat/repo/pjm/backlog/items/BL-260906-re-evaluate-universal-plan.md`
- **Destination-receipt:** 25ec799cc61be6d538d716c3e3f6028e775117a9
- **Remote-visibility:** pushed
- **Sanitized:** no
- **Disposition-note:** —

The Lite revision established a proportionate proof strategy, but the same
policy should be reconciled across all plan templates, planning skills,
implementer/reviewer contracts, docs, and workflow modes. The existing backlog
item already owns this work; no duplicate was created.

## OAT Upstream Feedback (Upstream Register)

### UP-01: Calculate execution baselines after mandatory launch journaling

- **Status:** filed
- **Destination:** https://github.com/voxmedia/open-agent-toolkit/issues/265
- **Destination-receipt:** —
- **Remote-visibility:** —
- **Sanitized:** yes
- **Disposition-note:** Tracked by `BL-260906-harden-dispatch-launch`.

Phase dispatch must not invalidate its own `expected_base_sha`. Persist all
mandatory prelaunch journal commits before resolving the accepted base, or
define one semantic-head rule that launcher and implementer both validate.

### UP-02: Reconcile every accepted dispatch to a terminal outcome

- **Status:** filed
- **Destination:** https://github.com/voxmedia/open-agent-toolkit/issues/266
- **Destination-receipt:** —
- **Remote-visibility:** —
- **Sanitized:** yes
- **Disposition-note:** Tracked by `BL-260906-harden-dispatch-launch`.

Require a linked terminal envelope or append-only reconciliation event for
every accepted dispatch. Preserve launch provenance, terminal provenance, and
a closeout check for accepted records that still report in-progress state.

No new upstream feedback was identified from Wave 4 or recoveries 4–5. Their
actionable follow-up is covered by RP-01, RP-03, and existing backlog items.

## Remaining Boundaries and Follow-Ups

At generation time, PR #264 is open and mergeable at `15ad3374c`; exact-head CI
and Release Dry Run are green. Lifecycle approval is still pending, and merge
and release remain separate authorization boundaries. RP-01 through RP-03 await
an apply decision. The universal proof-guidance backlog item and GitHub issues
#265/#266 are already filed and must not be duplicated.

## Reflections

Lite succeeded because reduced ceremony was paired with durable intent,
proportionate evidence, and independent review. The project also showed why
“small workflow” cannot mean “small systems surface”: the hardest defects sat
between artifacts, shared contracts, operating systems, and asynchronous test
control. Future work should inventory those seams before implementation, use
real producer outputs, and preserve exact negative controls long enough to
classify failures honestly.
