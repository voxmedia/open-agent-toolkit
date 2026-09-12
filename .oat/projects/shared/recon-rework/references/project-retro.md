---
oat_retro_project: recon-rework
oat_retro_generated: 2026-09-11T00:07:42Z
oat_retro_evidence_sources:
  - source: archived-phase-reviews
    status: used
  - source: archived-plan-reviews
    status: used
  - source: child-run-transcripts
    status: unavailable
  - source: gate-review-artifact
    status: used
  - source: lifecycle-artifacts
    status: used
  - source: oat-execution-learnings
    status: unavailable
  - source: pr-artifact
    status: used
  - source: project-log
    status: used
  - source: session-transcript
    status: used
  - source: verification-ledger
    status: used
oat_retro_promotions: none
oat_retro_filing: complete
oat_generated: true
oat_template: false
---

# Project Retrospective: Recon rework

## Executive Summary

The project restored recon's economical fan-out without weakening explicit
approval or caller-owned judgment. It ships one current manifest-v2 routing
model, uses session-local approval for an exact displayed proposal, bounds
conditional evidence work, and makes one terminal reconciliation the only
judgment-bearing synthesis pass.

The result is well verified, but the route there exposed two different classes of
follow-up. The recon validator still has non-blocking diagnostic and schema-design
debt recorded by the exit gate, while OAT's review workflows need clearer
boundaries around artifact intake and correctly formed reconnaissance assignments.

## Evidence and Review Method

The retrospective used the append-only project log; discovery, design, plan,
state, implementation, summary, handoff, and PR artifacts; all archived plan,
phase, final, and gate reviews; and the repeatable Phase 4 verification ledger.
Stable anchors include project-log events `run-1-p02-outcome-20260910` and
`run-1-p02-pass-20260910`, decision `DR-260910-restore-economical-recon`, task
commits named in `implementation.md`, and the archived review filenames cited
below.

The live session transcript supplied operator corrections about review-receive
delegation and the final dispatch policy. No standalone
`oat-execution-learnings.md` or first-class child-run transcript archive was
available. Where child tool-result bodies were unavailable, committed review and
implementation artifacts were treated as authoritative; no child-only mechanism
is asserted.

## Outcome Snapshot

| Area              | Generation-time outcome                                                                                                       |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Delivered scope   | 17/17 implementation tasks across five phases                                                                                 |
| Product contract  | Per-wave approved routing, manifest v2 only, session-local approval, structured conditional gaps, one terminal reconciliation |
| Verification      | Run 1 gates passed; Run 2 passes 265/265 recon tests, all repository gates, and fourteen guard-neutralization controls        |
| Reviews           | Every final-review finding was fixed directly; the terminal freshness review reports no findings                              |
| Lifecycle         | Final HiLL and implementation closeout completed; draft PR #285 is open                                                       |
| Shipping boundary | PR #285 conflicts with current `main`; merge, issue #274 closure, and backlog closure were not performed                      |

## Current State

- **Promotions:** None; the register has no `Disposition: apply` items.
- **Filing:** Complete. RP-01, RP-02, UP-01, and UP-02 were implemented directly, so their proposed tracker filings were rejected as unnecessary.
- **Unsettled items:** None from this retrospective.

## What Went Well

- The design kept authority boundaries explicit. Decision
  `DR-260910-restore-economical-recon` assigns economical evidence collection to
  bounded waves while leaving scope, sufficiency, interpretation, and conclusions
  with the caller.
- Review findings were treated as executable work rather than prose acknowledgments.
  Phase 2's approved extra round closed the final topology defect, and the final
  review converted proposal-versus-publication drift into production fixes
  `p04-t03` and `p04-t04` before lifecycle approval.
- The post-retro complexity review removed an assurance mechanism that had no
  operator requirement behind it. Exact target comparison and renewed approval
  remain, while persisted fingerprints and legacy-manifest branches are gone.
- The Phase 4 ledger distinguishes cached gates, fresh execution, synthetic
  harness coverage, and unavailable live-provider evidence. Guard-neutralization
  proved the exact-target and single-reconciliation tests could fail.
- The review-cycle cap behaved as a stop, not a pass. Event
  `run-1-p02-outcome-20260910` kept the Important finding binding until the user
  authorized one bounded extension and a fresh review passed.

## Challenges and Struggles

The largest implementation difficulty was keeping the approval-time proposal and
the publication-time validator semantically identical. Phase 2 needed three fix
rounds to enforce complete ordered profiles, condition binding, safe previews, and
one-to-one lane outcomes. The first final review then found that the final packet
validator still did not use the same topology policy and could publish a packet
whose reconciliation was not terminal. The response was to extract one production
validator used by both paths and add hostile controls; the terminal narrowed review
then passed. Evidence: `p02-review-2026-09-10T030647Z.md` through
`p02-review-2026-09-10T050659Z.md`, `final-review-2026-09-10T075058Z.md`, and
commit `4f6884a99844cf5e86168ad422db7f2f49a23c08`.

Review orchestration also spent work without producing evidence. The passing Phase
2 review and initial Phase 3 review record recon workers rejecting incomplete
assignment envelopes before reading sources; the primary reviewers had to repeat
the work inline. During plan-review receipt, the live session also surfaced an
ownership ambiguity when explorers were used around review feedback: the operator
clarified that the receiving agent should read the review artifact itself, using
explorers only to inspect related code when corroboration is needed. The work still
completed because primary reviewers retained judgment, but the avoidable dispatches
added latency and obscured what the subagents had actually done.

Finally, the Phase 4 verification note stated that each gate's exit code was
captured, while its retained raw logs lacked explicit `exit=` markers. The Phase 4
review classified this as an evidence-quality gap, not a failed gate, because
ordered outputs supported the runs and later reviewers re-executed relevant checks
with captured exits. The result stayed trustworthy, but only through redundant
verification rather than the intended receipt quality.

## Decision Register

- **Economical per-wave routing:** Accepted in
  `DR-260910-restore-economical-recon`. Exact provider-native targets are approved
  per wave under one envelope; a hard assignment does not raise unrelated workers.
- **Evidence search versus synthesis:** The topology plan review established that a
  condition-bound contradiction-resolution wave gathers discriminating evidence
  in adversary mode, while one separately targeted terminal reconciliation performs
  synthesis. An unexpected need for stronger judgment becomes an out-of-envelope
  gap rather than a silent target change or second reconciliation.
- **Bounded review override:** After Phase 2 exhausted its normal two fix rounds,
  the user authorized exactly one additional round. The limit changed only for that
  phase and reverted afterward.
- **Dispatch policy:** The initially accepted managed `frontier` ceiling was
  corrected by the user to managed `high` before implementation; concrete routes
  remained resolver-owned.

## Rejected or Superseded Alternatives

- Homogeneous run-wide routing was superseded because the hardest assignment made
  every evidence worker unnecessarily expensive.
- A second conditional reconciliation was rejected because it conflicts with the
  single terminal ledger transition and would make the non-triggered branch unable
  to satisfy the requested profile.
- Mapping `contradiction-resolution` to worker mode `reconcile` was rejected after
  production consumers showed it is an adversary-mode evidence assignment.
- Inferring capability from model names or treating intended routing as a launch
  receipt was excluded; current provider guidance and launcher evidence retain
  those responsibilities.
- Treating a review-cycle cap as an implicit pass was rejected. The cap stops
  automation while unresolved findings remain binding.

## Where We Changed Course

- A topology review exposed that the planned escalation conflated evidence search
  with judgment. The plan changed to optional adversary evidence followed by one
  mandatory, independently targeted terminal reconciliation; both trigger branches
  then validated.
- A plan re-review originally strengthened the v1 compatibility control. The later
  complexity review established that compatibility itself was not a requirement,
  so the final contract removed both that control and the legacy manifest path.
- The final review showed that preview correctness did not imply publication
  correctness. The implementation changed from parallel validators to one shared
  profile-topology policy at both boundaries.
- The operator changed the project ceiling from `frontier` to `high`; implementation
  then used exact high-class phase implementer and reviewer roles without changing
  the reusable ladder.

## New Architecture Patterns and Approaches

- **Session-local exact approval:** The caller displays one complete proposal,
  receives explicit approval, launches that exact target immediately, and requires
  a fresh approval after resume, reload, or proposal change.
- **One policy at proposal and consumption:** The same topology validator governs
  the human-facing approval preview and final packet validation, preventing a
  permissive publication path from drifting behind a stricter proposal path.
- **Complete target inheritance:** A wave inherits the entire execution target or
  supplies a complete replacement; partial axis merging is forbidden.
- **Conditional evidence, terminal judgment:** Finite condition-bound waves gather
  evidence and record explicit outcomes, while exactly one non-conditional terminal
  reconciliation owns the ledger transition.

## Domain Learnings

- Classify the concrete assignment, not its label. Counterexample search can be
  mechanical even when the wave is called adversarial; resolving competing
  explanations can require much stronger judgment.
- Compatibility machinery should exist only when compatibility is a real product
  requirement. Otherwise its branches, hashes, and fixtures increase assurance
  surface without protecting an outcome the operator values.
- A complete approval surface includes topology, conditions, authority, lanes, and
  limits—not just selected models. Fingerprinting hidden values does not make them
  meaningfully approved.
- Synthetic provider-shaped workflows establish deterministic contract behavior,
  not native model identity, availability, billing, or worker quality.

## Gotchas for Humans

- Treat a review cap as a request for judgment: either authorize a precisely bounded
  extension, accept a known risk explicitly, or stop. Never relabel unresolved work
  as passed because the loop ended.
- Inspect every wave's exact provider-native axes and rationale before approval;
  `null` means the adapter does not expose that control, not that the value is
  implicitly inherited.
- Capture each gate's exit status in its retained log. A summary table is weaker
  evidence if the underlying receipts cannot reproduce the claimed exits.
- Re-run release, bundle, and sync verification after reconciling PR #285 with
  `main`; the seven current conflicts sit on generated and lockstep version
  surfaces.

## Gotchas for Autonomous Agents

- In review-receive flows, read the review artifact directly in the root context.
  Delegate only bounded inspection of related production code or evidence, and say
  exactly what the delegated lane inspected.
- Before launching a recon worker, supply the complete envelope. A rejected
  incomplete assignment produces no source evidence and does not transfer any
  judgment to the worker.
- Do not infer test execution from a green Turbo summary. Preserve cache status and
  run the documented isolated forced execution when evidence-grade coverage matters.
- Do not advance a review event to passed when fixes merely exist; require the fresh
  review that validates their post-image.
- Preserve accepted-launch terminality. A rejected pre-start lane may be covered
  inline, but an accepted failed lane is not permission to launch a replacement.

## Repo Improvements (Promotion Register)

### RP-01: Consolidate recon condition and approval-drift diagnostics

- **Type:** code-follow-up
- **Disposition:** file
- **Status:** rejected
- **Destination:** —
- **Destination-receipt:** —
- **Remote-visibility:** —
- **Sanitized:** no
- **Disposition-note:** Implemented directly in project tasks `p05-t01` and `p05-t03`; no tracker filing remains.

The configured exit-gate review
`final-review-2026-09-10T091637Z.md` found three related diagnostic ownership
problems: approval drift cascades into spurious lane/condition errors, semantic
condition rules are duplicated with divergent codes, and foreign-run inactive
artifacts are attributed by the wrong validator. Consolidate semantic condition
validation, emit one owner/code per defect, continue independent validation when
routing is unavailable while skipping routing-dependent checks, and add
single-axis and one-error-per-defect controls.

### RP-02: Give activated conditional gaps structured lane identity

- **Type:** code-follow-up
- **Disposition:** file
- **Status:** rejected
- **Destination:** —
- **Destination-receipt:** —
- **Remote-visibility:** —
- **Sanitized:** no
- **Disposition-note:** Implemented directly in project task `p05-t01`; no tracker filing remains.

The same exit-gate review found that an honest partial must embed exact backticked
wave and lane substrings in a free-text gap message, while the packet contract does
not document that syntax. Replace message parsing with structured `waveId` and
`laneId` fields in the next packet-contract revision, migrate validators and
fixtures coherently, document the accepted representation, and pin both valid and
invalid controls.

## OAT Upstream Feedback (Upstream Register)

### UP-01: Make review-receive artifact ownership explicit

- **Status:** rejected
- **Destination:** —
- **Destination-receipt:** —
- **Remote-visibility:** —
- **Sanitized:** no
- **Disposition-note:** Implemented directly in commit `78f777890`; no upstream filing remains.

The live plan-review receipt prompted an operator correction after explorers were
used around review feedback. `oat-project-review-receive` says to read the selected
artifact completely but does not state the delegation boundary. Clarify and pin
that the receiving/root agent reads and interprets the review artifact, while an
optional explorer may inspect only explicitly scoped related code or evidence; the
root owns finding analysis, disposition, and artifact edits.

### UP-02: Validate reviewer reconnaissance envelopes before launch

- **Status:** rejected
- **Destination:** —
- **Destination-receipt:** —
- **Remote-visibility:** —
- **Sanitized:** no
- **Disposition-note:** Implemented directly in commit `b0ad7f2fa` with its stale version assertion corrected in `p05-t01`; no upstream filing remains.

Multiple archived reviews record optional recon workers rejecting incomplete
assignment envelopes before reading sources, including the passing Phase 2 review
and initial Phase 3 review. Add a producer-side envelope completeness check to the
reviewer orchestration path, with an executable invalid-envelope control. If a
complete bounded assignment cannot be constructed, skip the lane explicitly and
retain the review inline instead of launching a worker guaranteed to reject.

## Remaining Boundaries and Follow-Ups

- RP-01, RP-02, UP-01, and UP-02 were implemented directly and require no filing destination.
- PR #285 must be reconciled with current `main`, reverified, marked ready, and
  merged through its owning workflow before issue #274 or
  `BL-260908-restore-recon-s-cheap-fan-out` can close.
- The project performed no live-provider acceptance run and makes no claim about
  provider availability, runtime identity, billing, or semantic worker quality.

## Reflections

The project's central idea—cheap workers gather evidence while the caller judges—
also became its best execution lesson. Delegation paid off when scopes and
contracts were explicit, but rejected or ambiguously assigned lanes merely pushed
the same work back into the primary context. The most trustworthy parts of the
result use one shared production boundary and independent negative evidence: the
shared topology validator, exact target comparison, structured conditional gaps,
and neutralized guards. Future work should keep that discipline while resisting
assurance machinery that has no concrete user requirement.
