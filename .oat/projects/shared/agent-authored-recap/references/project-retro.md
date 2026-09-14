---
oat_retro_project: agent-authored-recap
oat_retro_generated: 2026-09-14T14:46:47Z
oat_retro_evidence_sources:
  - source: archived-review-markdown
    status: used
  - source: gate-receipts
    status: used
  - source: git-history
    status: used
  - source: lifecycle-artifacts
    status: used
  - source: oat-execution-learnings
    status: unavailable
  - source: project-log
    status: used
  - source: recap-package-receipts
    status: used
  - source: session-transcript
    status: used
oat_retro_promotions: proposed
oat_retro_filing: proposed
oat_generated: true
oat_template: false
---

# Project Retrospective: agent-authored-recap

## Executive Summary

The project replaced a recap path that could not run on normally configured
hosts with one shared `bundle → host-agent author → verify → record` flow. It
finished 50 tasks across six phases, passed the final configured gate with no
findings, opened PR #299, and produced both the required program recap and this
project's recap. The strongest practice was proving guards with real artifacts
and negative controls. The largest cost was late discovery of lifecycle
durability and bookkeeping defects after narrower reviews had passed.

Future work should preserve the same evidence standard while moving
archive-safety and receive-transaction checks earlier. One local instruction
promotion, one local code follow-up, and two OAT workflow proposals capture
those unsettled improvements.

## Evidence and Review Method

Used durable lifecycle artifacts `discovery.md`, `spec.md`, `design.md`,
`plan.md`, `implementation.md`, `state.md`, `summary.md`, and the final PR
artifact. The project log supplied append-only workflow anchors, and archived
phase/final reviews supplied the finding lineage. The three configured gate
receipts for runs `6cf37a1e-a33f-40af-9b33-75937b421ac5`,
`756b124f-64ad-492b-96d8-2c8c9d22bbd3`, and
`52787dbb-20c4-4fe7-b484-a72f0cd20c35` were available and corroborated the
review artifacts.

Git history supplied commit identities and scope; the project path had 144
commits in the inspected history, and the implementation range changed 319
paths. The original local project session transcript was available and used
only to confirm operator corrections and repeated bounded authorizations.
The recap package's manifest and QA result confirmed
`built-needs-review`, browser rung `none`, reason
`browser-driver-not-installed`, and seven passing browser-free checks.

No `oat-execution-learnings.md` existed. Claims below are Confirmed unless
explicitly labeled otherwise; no unavailable terminal result was inferred
from a command mention.

## Outcome Snapshot

| Dimension         | Generation-time outcome                                                                                                             |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Scope             | 50/50 tasks, six independently reviewed phases                                                                                      |
| Product           | One recipe-selected agent-authored flow for project recaps, program recaps, project explainers, and direct inputs                   |
| Retirement        | Callback/provider seams, adaptive expansion, durability/S3 publication, release-candidate machinery, and obsolete contracts removed |
| Verification      | Ordered repository gates, uncached Turbo, focused suites, negative controls, lint, and format passed in the implementation evidence |
| Final gate        | Run `52787dbb-20c4-4fe7-b484-a72f0cd20c35` passed with 0 Critical, Important, Medium, or Minor findings                             |
| Lifecycle         | Implementation complete; PR #299 open at generation time                                                                            |
| Recaps            | Project explainer `built`; program recap and project recap `built-needs-review` because no browser driver was installed             |
| Accepted boundary | Four whitespace-only diagnostics in immutable program HTML deferred until substantive regeneration                                  |

## Current State

- **Promotions:** `proposed`; RP-01 is eligible to apply, but the
  non-interactive `ask` policy deferred application.
- **Filing:** `proposed`; RP-02, UP-01, and UP-02 have no configured filing
  destination, so filing was deferred.
- **Unsettled items:** RP-01, RP-02, UP-01, and UP-02. Apply or file them only
  in a later explicitly authorized run with a valid destination where needed.

## What Went Well

- The implementation landed the replacement flow before deleting the old one.
  Phase 1 task p01-t09 proved a real end-to-end path first, so retirement was
  backed by a working accepted control.
- Negative controls were treated as assurance evidence, not decoration.
  Implementation records show neutralized guards failing for browser
  downgrade, required sections, persisted intent, archive safety, claim
  tracing, sanitizer behavior, and the retired-reference sweep.
- Browser capability was reported truthfully. The project explainer reached
  Playwright and passed; the program and project recaps retained usable
  artifacts as `built-needs-review` instead of inventing visual inspection or
  blocking completion.
- Independent review materially improved the result. The final gate found the
  residual-element FR4 bypass and later the lifecycle-transient fixture
  dependency; the final gate receipt then independently reproduced their
  closure with zero findings.
- Scope and recovery accounting stayed explicit. Project-log entries separate
  automatic fix limits, phase recovery, configured-gate attempts, and
  operator-authorized exceptions instead of silently extending a budget.

## Challenges and Struggles

The project expanded during design from replacing the default project recap to
making agent-authored explainers work for every caller. The amendment in
`discovery.md` removed the premise that an unusable advanced callback path
should remain. This increased the migration surface to lifecycle skills,
archive behavior, docs, package versions, direct invocation, and the program
recap, but it also avoided preserving two incompatible architectures.

Review findings arrived in layers. Early Phase 1 reviews found that a recorder
could claim success without complete verification and that the terminal guard
could accept a malformed or stale manifest. Later whole-project and configured
gate reviews found residual HTML facts escaping FR4 traceability, subject
selection that rejected a valid program recap, and finally a skill test whose
live project fixture would disappear when the shared project was archived.
Each issue was repaired with a reproduction-grade control; the impact was a
growth from the original 32 tasks to 50 and several operator-authorized review
extensions. The final evidence was stronger, but archive-lifecycle behavior
was tested too late.

Two operational incidents added avoidable friction. The first configured gate
launch did not start because the global `oat` shim targeted a missing
`dist/index.js`; a branch-local build and session-only PATH shim preserved the
configured command and allowed the review to run. During Phase 5,
`origin/main` advanced to public version `0.2.73`, so the lockstep set had to
move again to `0.2.74`. Both were recovered without weakening their gates.

Review receipt also exposed transaction fragility. The second gate receive
initially omitted the source deletion from an intended archive move and needed
commit `322791386ee9127c96b59f6c629a2a6e31663079`; later reviews corrected a
stale `oat_last_commit` and a stale Phase 6 progress label. The implementation
was unaffected, but resume evidence briefly disagreed across artifacts.

## Decision Register

- **DR-260911-explainers-are-agent-authored:** The host agent owns prose and
  page composition; the core owns bounded inputs, safety, traceability,
  verification, and immutable recording. Archive export, not a separate
  publisher, is the durable copy.
- **No archive-validator widening:** The operator correction preserved
  `verifySelectedProjectRecapForArchive` as project-recap-only. Other recipes
  compose generic manifest, immutable-hash, and inventory checks directly.
- **Usable browser-free outcome:** Missing browser capability yields
  `built-needs-review`; it neither discards the artifact nor claims visual
  verification.
- **No new CLI generation command:** Skill scripts remain the execution
  surface until a non-agent or CI consumer creates a second need.

No missing durable product decision was identified. The two UP items below
are workflow improvement proposals, not product architecture decisions.

## Rejected or Superseded Alternatives

- Keeping callback orchestration with optional defaults was superseded after
  live-tree evidence showed no configured host could provide the required
  modules and only fixtures had exercised them.
- A Markdown-only recap was rejected because it could not satisfy the
  standalone navigable HTML and visual-verification requirements.
- Backward compatibility for manifest v1 was explicitly rejected; the
  lifecycle migrated as one coordinated compatibility change.
- Applying the project-recap archive validator to every recipe was corrected
  because its recipe pin is an intentional boundary, not a generic package
  validator.

## Where We Changed Course

- **Trigger:** Design review established that the supposedly retained
  advanced path had no runnable host configuration. **Change:** Expand one
  project to replace all caller paths and retire the seams. **Outcome:** One
  shared flow serves four caller classes.
- **Trigger:** The operator identified misuse of the project-only archive
  validator. **Change:** Preserve that strict boundary and compose generic
  checks for other recipes. **Outcome:** Recipe boundaries remained explicit.
- **Trigger:** The second configured gate found that test evidence would be
  deleted at project completion after its normal budget was exhausted.
  **Change:** Authorize only p06-t17, p06-t18, current-basis reviews, and one
  exceptional gate. **Outcome:** Archive-safe provenance fixtures passed the
  final gate with zero findings.

## New Architecture Patterns and Approaches

- **Agent-authored, mechanically bounded output:** Separate creative HTML
  authorship from deterministic input allowlisting, safety, claim checks, and
  immutable recording.
- **Capability ladder with truthful degradation:** Host browser, Playwright,
  then browser-free verification, with the highest reached rung recorded.
- **Recipe-specific boundary plus generic primitives:** Keep strict
  project-recap archive semantics while reusing manifest/hash/inventory
  primitives for other recipes.
- **Persisted retry-or-skip evidence:** Resume behavior reads an explicit
  decision and bound failure evidence instead of repeating prompts or silently
  accepting a warning.

## Domain Learnings

- A validator's narrow recipe pin can be a correctness boundary even when its
  underlying checks look reusable. Reuse the primitives, not the boundary
  wrapper.
- Bidirectional claim checking must cover the HTML structures authors actually
  use. Paragraph-only extraction did not cover stat cards, definition lists,
  or composite labels.
- A real artifact is not automatically a durable fixture. Tests must model the
  artifact's lifecycle and survive archive or project removal.
- Browser absence is a capability fact, not a content failure. A useful
  artifact can complete with an explicit review requirement.
- Cached green tests and invented fixtures are weak evidence for assurance
  contracts. The decisive fixes used uncached execution, captured artifacts,
  pre-fix reproduction, guard neutralization, and valid accepted controls.

## Gotchas for Humans

- Before approving a live project path in a test, check whether completion
  archives or deletes that scope.
- When authorizing work beyond an exhausted retry budget, name exact tasks,
  reviews, accounting, and the next stop condition.
- Fetch `origin/main` immediately before the release-version gate; a long
  project can lose strict-greater-than validity while implementation is in
  progress.
- Do not infer visual inspection from screenshot creation. Record who or what
  inspected the page and the exact rung reached.

## Gotchas for Autonomous Agents

- Re-run producer output through its real downstream consumer, including
  archive/removal behavior, before calling lifecycle evidence durable.
- Treat a missing gate marker, empty receipt, and absent artifact as a
  not-accepted launch, not a consumed review attempt.
- Verify archive moves as exact add-plus-delete transactions before committing;
  then reconcile duplicate status and pointer fields together.
- Run mutation-based smoke checks and broad lint commands serially unless
  their worktrees are isolated.

## Repo Improvements (Promotion Register)

### RP-01: Prohibit tests from depending on lifecycle-transient project paths

- **Type:** agents-instruction
- **Disposition:** apply
- **Status:** proposed
- **Target:** AGENTS.md
- **Applied-ref:** —
- **Disposition-note:** —

Add a Definition of Done rule that tests must not read fixtures from active
shared project directories that completion may archive or delete. Require a
provenance-recorded fixture or an explicitly durable repository reference and
an archive-free control. The configured gate finding in
`reviews/archived/final-review-2026-09-13T001401Z.md` demonstrated the failure:
the suite passed before closeout but would fail afterward with `ENOENT`.

### RP-02: Isolate mutation-based lint enrollment checks

- **Type:** code-follow-up
- **Disposition:** file
- **Status:** proposed
- **Destination:** —
- **Destination-receipt:** —
- **Remote-visibility:** —
- **Sanitized:** yes
- **Disposition-note:** —

Make smoke tests that seed lint violations operate in an isolated worktree or
otherwise serialize against repository lint. During gate remediation, a
concurrent lint run observed the smoke suite's temporary seeded violations;
an isolated unchanged-tree rerun passed. The symptom is confirmed. The exact
best isolation mechanism should be established by a focused reproduction.

## OAT Upstream Feedback (Upstream Register)

### UP-01: Preflight configured gate launchers before persisting an attempt

- **Status:** proposed
- **Destination:** —
- **Destination-receipt:** —
- **Remote-visibility:** —
- **Sanitized:** yes
- **Disposition-note:** —

The first configured gate launch failed before CLI startup because the global
launcher referenced a missing built entrypoint. No marker, reviewer, artifact,
or valid receipt existed, and a branch-local build plus temporary PATH shim was
required. Add a launcher preflight that resolves and executes the configured
binary before launch intent is treated as accepted, emits a categorical
not-accepted result, and suggests a repository-local executable when valid.

### UP-02: Make review receive an atomic, postcondition-checked transaction

- **Status:** proposed
- **Destination:** —
- **Destination-receipt:** —
- **Remote-visibility:** —
- **Sanitized:** yes
- **Disposition-note:** —

One gate receive commit omitted the source deletion from the intended review
artifact move, and later reviews found stale `oat_last_commit` and phase
status fields. Strengthen receive so it verifies the exact source-to-archive
move, correlation, review-ledger event, task creation, status rollups, and
resume pointers before committing. A failed postcondition should leave a
recoverable intent rather than a partially reconciled durable state.

## Remaining Boundaries and Follow-Ups

- The four immutable program-recap HTML whitespace diagnostics should change
  only during substantive package regeneration so hashes and provenance are
  regenerated together.
- At generation time, RP-01 had no apply approval, and RP-02, UP-01, and UP-02
  had no filing destinations. A later authorized run may update their register
  fields.
- At generation time, the intentionally untracked local project-recap package
  was outside the retrospective commit.

## Reflections

The project succeeded because it repeatedly converted review criticism into
executable evidence rather than relying on a final green suite. Its most
important lesson is that lifecycle correctness includes what happens after the
feature works: archive removal, launcher resolution, receipt atomicity, and
resume-state consistency are part of the product.

The final result is trustworthy because the closing gate independently
reproduced the archive-free controls, provenance identity, strict recipe
boundary, and repository checks. Future projects can shorten this path by
testing those lifecycle transitions before the final gate instead of using the
gate to discover them.
