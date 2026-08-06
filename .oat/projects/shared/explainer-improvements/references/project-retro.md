---
oat_retro_project: explainer-improvements
oat_retro_generated: '2026-08-06T02:57:17Z'
oat_retro_evidence_sources:
  - source: project-log
    status: unavailable
  - source: oat-execution-learnings
    status: unavailable
  - source: lifecycle-artifacts
    status: used
  - source: session-transcript
    status: unavailable
oat_retro_promotions: complete
oat_retro_filing: proposed
oat_generated: true
oat_template: false
---

# Project Retrospective: Explainer Improvements

## Executive Summary

Explainer Improvements completed 62 tasks across five phases and left a PR open
after restoring trusted, browser-reviewed adaptive project recaps. The project
turned an imported 19-task outline into a substantially larger integrity effort:
real Chromium evidence, bounded visual correction, authenticated resume state,
semantic graph validation, release-payload checks, and three golden benchmarks
all became enforceable runtime contracts.

The strongest result was not merely that the golden examples rendered. The
implementation made a successful artifact traceable to reviewed source bytes,
decoded image geometry, a trusted browser identity, one immutable set plan, and
a bounded review history. The main process weakness is that the terminal
project artifacts did not receive the same consistency discipline: the summary
and task table establish completion, while parts of `state.md` and
`implementation.md` still preserve stale in-progress counts and placeholders.

## Evidence and Review Method

This retrospective used the committed lifecycle artifacts:

- `summary.md` for the final shipped behavior, decisions, challenges, and
  follow-up;
- `implementation.md` for 62 task outcomes, 33 orchestration runs, review
  findings, verification results, and operator-authorized changes;
- `plan.md` and `references/imported-plan.md` for the imported goal, planned
  acceptance boundaries, and later bounded task additions; and
- `state.md` for the terminal PR-open lifecycle state and durable progress
  record.

No `project-log.md` or `oat-execution-learnings.md` exists for this project.
Session transcript evidence was not available in this run, so chronology and
runtime claims rely on committed lifecycle artifacts. The exact reasons that
some reviews discovered defects after green suites are confirmed only where the
implementation log records a direct adversarial probe; broader explanations
about why those gaps escaped earlier tests remain hypotheses.

## Outcome Snapshot

| Area                | Outcome                                                                                  |
| ------------------- | ---------------------------------------------------------------------------------------- |
| Lifecycle           | Five phases complete; 62/62 tasks complete; PR open                                      |
| Runtime             | Adaptive recap set with independent browser critic and one-correction cap                |
| Evidence            | Decoded PNG pixels and geometry, browser metrics, and trusted Chromium identity retained |
| Resume safety       | Complete canonical request and output root authenticated with current `ekrt2` tokens     |
| Topology            | Non-linear graphs routed to artistic output and checked semantically                     |
| Acceptance          | Three real-Chromium golden benchmarks passed                                             |
| Release             | Workspace, docs, package, visual-measurement, and release validation passed              |
| Remaining work      | P2 additional visual workflows remain backlogged                                         |
| Evidence limitation | No project log, execution-learnings file, or session transcript                          |

## What Went Well

### Adversarial review changed the implementation contract

Phase reviews did more than repeat green tests. They used direct probes to show
that pseudo-PNG bytes, caller-asserted browser identity, incomplete package
coverage, mutable resume records, symlink retargeting, and legacy-token
downgrades could satisfy earlier fixtures. Each finding was converted into a
bounded task, verified against the demonstrated attack, and retained in the
implementation log.

### Evidence became a cross-consumer contract

The project converged on shared contracts rather than letting core, adapter,
finalizer, archive, release, and smoke consumers interpret success separately.
That reduced the risk that one consumer would accept a package another would
reject. Final browser evidence binds image bytes and geometry, capture metrics,
runtime identity, and complete package coverage.

### Runtime correction remained bounded

Despite extensive implementation review, the shipped visual runtime retained a
hard operational cap: one targeted correction and one final review. Missing or
failed evidence ends in `built-needs-review` before publication or durability
instead of triggering an unbounded retry loop or a silent downgrade.

### Golden acceptance used generated evidence

The three benchmark cases ran through real Chromium, and a later whitespace
finding was fixed in the shared renderer before all retained outputs were
regenerated. The project did not hand-edit generated HTML to satisfy the
acceptance oracle.

## Challenges and Struggles

### Green tests initially proved too little

Early test suites passed while accepting pseudo-image bytes and untrusted
callback assertions. Later direct probes established that test success did not
yet authenticate the evidence chain. The response was to strengthen the
contract and its consumers, not to reinterpret prior green output as proof.

### Resume hardening required several distinct threat models

Cross-checking mutable records did not protect against coordinated edits.
Subsequent reviews exposed configured-root symlink retargeting, retained-request
mutation, and a downgrade to legacy `ekrt1` eligibility. Closure required
external authentication of the current request and canonical root, followed by
an explicit operator decision to remove transparent legacy-token acceptance.

### Planned scope expanded materially

The imported 19-task outline expanded to 62 tasks as full-suite checks and
reviews found missing consumers, stale version assertions, generated-output
hygiene defects, graph semantic gaps, and resume attacks. The additions were
bounded and recorded, but this scale of expansion made terminal bookkeeping
consistency harder to maintain.

### Lifecycle artifacts retained stale interim state

The final summary and progress overview say 62/62 tasks are complete, while
`state.md` still contains earlier in-progress markers such as “Phase p03 begins”
and “58 tasks currently tracked.” `implementation.md` also retains an
unfilled final-summary placeholder that refers to 58 tasks and a test-results
table whose p04/p05 rows no longer describe the terminal outcome. These
contradictions do not invalidate the implementation, but they weaken the
durable evidence surface used by later workflows.

## Decision Register

| Decision                                             | Rationale                                                                 | Consequence                                                                                 | Durable record                       |
| ---------------------------------------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | ------------------------------------ |
| Require one immutable set plan                       | Whole-set cohesion cannot be inferred from individually valid artifacts   | All recap artifacts share terminology, coverage, portfolio, and visual intent               | `summary.md`, Phase 2 implementation |
| Require trusted browser review for unattended recaps | Callback claims and pseudo-images did not prove rendered quality          | Missing or invalid evidence blocks publication as `built-needs-review`                      | Phase 3 implementation and reviews   |
| Cap visual correction at one pass                    | Visual judgment is needed without recursive execution                     | One correction and one final review are the maximum runtime loop                            | `plan.md`, `summary.md`              |
| Route non-linear graphs artistically                 | Deterministic linear rendering could flatten branches, fan-ins, or cycles | Unsupported topology is rerouted and semantically checked                                   | Phase 4 implementation               |
| Remove transparent `ekrt1` resume compatibility      | Legacy eligibility was inferred from mutable retained state               | Current resumes require authenticated `ekrt2`; old paused runs may not resume transparently | Phase 4 operator disposition         |
| Accept bounded review-cap extensions                 | Adversarial findings remained actionable after the default cap            | Phase 4 received explicit, scoped operator-approved closure attempts                        | `implementation.md`, `state.md`      |

## Rejected or Superseded Alternatives

| Alternative                                          | Disposition                                                                                |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Treat fixture callbacks as proof of browser identity | Rejected; production evidence now comes from a branded browser probe session.              |
| Hash decoded pixels without geometry                 | Rejected after a reshape probe preserved flat bytes while changing meaning.                |
| Cross-check only mutable retained records            | Rejected because coordinated edits can recompute every mutable projection.                 |
| Follow a configured output-root symlink on resume    | Rejected; resume identity is bound to the original canonical root.                         |
| Preserve transparent `ekrt1` compatibility           | Explicitly rejected by the operator in favor of authenticated current tokens.              |
| Hand-edit golden HTML whitespace                     | Rejected; the shared renderer was fixed and evidence regenerated.                          |
| Automatically downgrade failed artistic output       | Rejected; deterministic Markdown remains an explicit fallback, not a hidden recovery path. |

## Where We Changed Course

The work moved from adding visual planning and criticism to authenticating the
entire evidence chain. Phase 3 review showed that screenshots and callback
results were not trustworthy merely because tests were green, so image
decoding, geometry, runtime identity, and immutable review evidence became
first-class contracts.

Phase 4 then shifted from ordinary resume validation to adversarial state
authentication. Each review ruled out another mutable-state defense until the
project bound the canonical request and output root to external approval state
and removed the legacy downgrade path.

Finally, the acceptance phase treated generated whitespace as a generator
defect rather than fixture cleanup. That preserved the rule that retained
evidence must be reproducible from the shipped runtime.

## New Architecture Patterns and Approaches

### Evidence identity spans production consumers

A successful recap package is identified by more than artifact filenames.
Source provenance, set-plan coverage, decoded screenshot content and geometry,
browser runtime identity, review attempts, and outcome must agree across every
consumer that publishes, finalizes, archives, or validates the package.

### Authenticated resume state outranks mutable projections

Resume safety cannot come from having several mutable files agree with each
other. The accepted design uses externally authenticated state to bind the
complete canonical request and original canonical output root before retained
content is adopted.

### Unsupported topology is a routing decision

The deterministic renderer is allowed to reject topology it cannot preserve.
Branches, fan-ins, and cycles route to an artistic representation whose graph
semantics are checked, rather than being flattened into a misleading diagram.

## Domain Learnings

- Browser screenshots are evidence only when their bytes decode, their geometry
  is bound, and their capture runtime is trusted.
- Whole-set visual quality requires one shared plan and an independent critic;
  individual artifact validity does not establish cohesion.
- Resume tokens must authenticate semantic policy, not merely content hashes or
  paths. Privacy, destination, rendering, and side-effect changes are part of
  request identity.
- Generated golden artifacts are acceptance evidence. Hygiene defects should be
  fixed at the generator boundary and then regenerated.
- A review cap is governance, not a correctness claim. Extending it requires an
  explicit operator decision and a bounded correction scope.

## Gotchas for Humans

1. Do not treat a green fixture using callback-provided browser metadata as
   production browser evidence.
2. A valid resume token is insufficient if the current request or canonical
   output root differs from the authenticated retained request.
3. Legacy `ekrt1` packages are intentionally not transparently resumable.
4. Never hand-edit retained golden runtime output; fix the producing path and
   regenerate all affected evidence.
5. Before closeout, reconcile task totals, phase statuses, final summary, and
   test-result tables across `state.md`, `implementation.md`, and `plan.md`.

## Gotchas for Autonomous Agents

1. Treat `INVALID_RUN_ABORT` as a successful fail-closed boundary, not
   permission to continue with an expanded file set.
2. Do not convert a review finding into an edit until the task boundary and
   retry authorization are durably recorded.
3. A current symlink path is not durable identity; compare canonical paths
   against authenticated pre-pause state.
4. Validate every consumer of a shared success schema, including archive,
   release, smoke, and finalization paths.
5. When generated evidence fails hygiene checks, change the generator and
   regenerate; do not patch fixtures.
6. Terminal implementation success includes internally consistent lifecycle
   artifacts, not only passing product gates.

## Repo Improvements (Promotion Register)

### RP-01: Require a terminal lifecycle-artifact consistency sweep

- **Type:** agents-instruction
- **Disposition:** apply
- **Status:** applied
- **Target:** .agents/skills/oat-project-implement/references/completion-and-closeout.md
- **Applied-ref:** .agents/skills/oat-project-implement/references/completion-and-closeout.md
- **Disposition-note:** —

The target project's final summary and 62/62 task table establish completion,
but `state.md` and `implementation.md` retain stale interim counts, pending
markers, an unfilled final-summary placeholder, and outdated test-result rows.
Add one closeout instruction immediately after the required Final Summary step:
before final review, reconcile `state.md`, `implementation.md`, and `plan.md` so
task totals, phase statuses, current-task pointers, final summary, and test
results all describe the same terminal evidence; treat stale interim markers as
a closeout blocker.

### RP-02: Add an automated lifecycle-artifact consistency check

- **Type:** code-follow-up
- **Disposition:** file
- **Status:** proposed
- **Destination:** —
- **Sanitized:** no
- **Disposition-note:** —

The project completed 62 tasks and passed extensive repository and release
validation, yet durable lifecycle files still disagree about tracked task
counts and terminal status. Add a bounded validator that detects contradictory
task totals, completed phases paired with pending current-task prose, missing
final summaries, and stale test-result rows before implementation closeout.
Define compatibility rules for imported and revision-generated tasks so the
check reports real drift without rewriting append-only history.

## OAT Upstream Feedback (Upstream Register)

No upstream feedback identified.

## Remaining Boundaries and Follow-Ups

- `BL-260728-additional-visual-workflows` remains a P2 follow-up for additional
  explainer recipes; it was intentionally excluded from golden recap closure.
- The PR remains open for human review.
- The lifecycle-artifact consistency gap is proposed here but is not applied or
  filed by generation.

## Reflections

This project demonstrates that visual quality can be made reviewable without
making execution unbounded. The one-correction cap remained intact even as
implementation review became more adversarial, because the project improved
the evidence contract rather than adding retries.

It also shows that durable process evidence deserves the same consistency
checks as product evidence. The implementation carefully authenticated source
bytes, browser identity, images, requests, and output roots, but its own
lifecycle files still disagree at the edges. Future runs should finish with a
small, explicit artifact-consistency sweep so the record consumed by later OAT
workflows is as trustworthy as the software it describes.
