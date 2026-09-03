---
oat_retro_project: recon-skill
oat_retro_generated: 2026-09-03T20:20:00Z
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
  - source: decision-records
    status: used
  - source: backlog-records
    status: used
  - source: pr-artifact
    status: used
  - source: github-pr-status
    status: used
  - source: session-transcript
    status: used
oat_retro_promotions: complete
oat_retro_filing: complete
oat_generated: true
oat_template: false
---

# Project Retrospective: recon-skill

## Executive Summary

The project delivered the intended standalone `recon` capability, but the path
to a trustworthy packet boundary was materially harder than the original
implementation plan suggested. Independent reviewers and cross-family gates
repeatedly found publishable false-assurance paths after focused suites were
green. The decisive improvements were architectural simplifications and strict
invariant boundaries: first, the p-rev1 consolidation into one immutable
`ValidatedRun` boundary; second, the p-rev5–p-rev7 closure of publication races
via atomic promotion and canonical byte continuity; and third, the p-rev8–p-rev9
gating that bound `ValidatedRun` strictly to publishable status, enforced
synthesis referential integrity, and transitioned rejected claims honestly to
`unsupported`.

The run also validated the user's concern about over-engineering. The successful
response was to simplify internal trust boundaries while preserving the product
contract, then keep later lifecycle fixes narrowly tied to final-state and
per-asset invariants. Future assurance-bearing work should front-load
reproduction-grade negative controls and offer an explicit corrective-revision
transition when repeated review loops reveal a design problem rather than an
isolated defect.

## Evidence and Review Method

The retrospective reviewed the append-only project log; discovery, design,
plan, implementation, state, summary, and PR artifacts; all archived phase and
final review Markdown (including the p-rev8 and p-rev9 phase reviews and the
two configured-gate reviews); all configured-gate receipts; four accepted recon
decision records; the two deferred integration backlog items; the active
session transcript; and a generation-time GitHub status query. Durable
artifacts were authoritative where session detail and current state differed.

No `oat-execution-learnings.md` exists, so that evidence source is explicitly
unavailable. Bounded analysis examined durable lifecycle evidence and the full
review/fix history across all nine revisions; conclusions were checked against
the referenced committed artifacts before inclusion. Confirmed causes are
stated directly. No unsupported model-behavior or hidden-runtime cause is
inferred from successful later runs.

## Outcome Snapshot

| Area                | Generation-time outcome                                                                                                |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Product             | Provider-neutral `recon` skill, bounded `recon-worker`, and directory-first validated evidence packets                 |
| Distribution        | Research-pack ownership with same-scope utility dependencies and current-only user-agent materialization               |
| Execution           | 36 of 36 planned and revision tasks complete across four phases and nine revisions (`p-rev1` through `p-rev9`)         |
| Assurance           | Terminal phase reviews, post-rebase final reviews, and configured cross-family gate passed with zero blocking findings |
| Release preparation | Lockstep CLI `0.2.54` metadata and all repository completion gates passed                                              |
| PR                  | At generation time, PR #248 was open, non-draft, merge-clean, and green at head `1364ea13c`                            |
| Boundary            | PR merge, project archival, discovery integration, and broader research-skill integration were not part of this run    |

## Current State

- **Promotions:** `complete`; RP-01 is applied to `AGENTS.md`.
- **Filing:** `complete`; UP-01 and UP-02 are filed in the canonical repository
  backlog with verified local commit receipts.
- **Unsettled items:** None.

## What Went Well

- The project preserved explicit authorization boundaries. When p02 exhausted
  its configured review-fix budget, continuation required operator approval;
  the later design revision remained append-only and reviewable.
- Reviewers used direct counterexamples and valid controls rather than treating
  green test totals as proof. The final p-rev2 cycle independently rejected
  approval-axis deletion, invalid canonical arrays, receipt-chain drift, and
  stale catalog observations while valid packets still published.
- Scope stayed disciplined. The research pack owns the standalone capability,
  while automatic discovery and broader skill-family integrations remain in
  `BL-260830-integrate-recon-with-oat` and
  `BL-260830-integrate-recon-across`.
- The post-rebase review and fresh configured gate correctly invalidated stale
  assurance. They caught non-current user-agent projection after the earlier
  final gate had passed, leading to the bounded p-rev3 guard at commit
  `834f28fa41f163091a1b3904d6daf2fd158e2560`.
- Revisions 4 through 9 systematically resolved subtle edge-case publication
  races, unpublishable state leakage, and referential integrity without adding a
  heavy state simulator or changing external contracts.

## Challenges and Struggles

### Packet integrity became a sequence of adjacent bypasses

P02 initially distributed validation across artifact and relationship checks.
After two configured fix rounds and one explicitly authorized extension,
focused tests had reached 79 passing cases, yet the fourth independent review
still found three Critical and two Important paths involving incomplete
approval binding, shadow reconciliation, secret-bearing audit evidence, caller
controlled gap materiality, and aliased trust roots. The impact was a blocked
phase and repeated correction cost without a stable proof boundary.

The response was p-rev1: replace incremental patches with one non-persisted,
deeply immutable `ValidatedRun` that owns canonical roots, complete topology and
receipts, terminal reconciliation, secret-safe persistence, material gaps,
assurance, and publication eligibility. Three narrow follow-up rounds closed
identity and URL-union edge cases. Terminal review at `841a7164a` then closed
the full p02 history with zero findings and explicitly judged the simplification
proportionate.

### Pack lifecycle correctness depended on final-state reasoning

P03's first implementation passed 782 focused tests, but review reproduced
transitive intent promotion, orphaning during final lease release, and unsafe
migration recovery. Later rounds found provider-planning containment, mixed
install/remove ordering, retry cleanup, and partially overlapping selected
assets. These were not independent random bugs: request-order logic was being
used where the contract required final-consumer, per-asset state.

The response remained bounded. The implementation projected final consumers,
retained assets per selected ID, and verified expected state per asset without
introducing the generalized inventory simulator or transaction framework that
reviewers explicitly rejected. Terminal p03 review passed at `cb3d94ac2` and
closed all seven prior Critical or Important findings.

### Publication race conditions and post-promotion continuity

During post-rebase reviews (Revisions 4 through 7), reviewers identified
concurrency and promotion races: a failed re-render could delete an existing
valid packet; withdrawal could remove a replacement root; and post-promotion
modifications could violate canonical continuity. The response was to enforce
atomic promotion through a unique temporary sibling, verify pre- and post-rename
canonical byte digests, and execute explicit canonical-byte continuity checks as
the final awaited step before publication returns success.

### Valid-but-unpublishable states and referential integrity

The configured cross-family implementation exit gates (Revisions 8 and 9)
surfaced two subtle integrity gaps:

1. `validate-packet.mjs` checked structural validity separately from
   publishability (`complete`/`partial`), returning a valid `ValidatedRun` for
   `running`, `failed`, or `awaiting-approval` statuses that could then be
   rendered into an misleading `packet.md`.
2. When semantic review rejected a claim, the reconciler filtered it out of the
   ledger's claims, but `synthesis.answer` and `synthesis.keyClaimIds` continued
   to reference and assert the rejected claim. Because the validator lacked
   referential integrity checks on synthesis, a packet could publish stating a
   claim that review had explicitly rejected.

The response was p-rev8 and p-rev9: bind `ValidatedRun` creation and rendering
strictly to publishability (`complete` or `partial`), withdraw `packet.md` with
categorical `PACKET_NOT_PUBLISHABLE` on any non-publishable candidate,
categorically validate synthesis referential integrity
(`SYNTHESIS_REFERENCE_MISSING`), and transition rejected claims to an honest
`unsupported` state rather than wholesale deletion.

## Decision Register

- **Directory-first evidence packets.** `DR-260831-directory-first-evidence`
  keeps raw dossiers outside normal consumer context while preserving targeted
  auditability.
- **Approval-bound homogeneous dispatch.** `DR-260831-approval-bound-homogeneous`
  makes model and effort cost explicit; independence comes from bounded blind
  roles and source reopening.
- **Canonical validated-run boundary.** `DR-260831-canonical-validated-run`
  records the simplifying trust boundary adopted after p02's distributed
  validation failed adversarial review.
- **Research-pack ownership.** `DR-260831-research-pack-owns-recon` keeps the
  skill general-purpose and defers automatic callers to separately owned work.

## Rejected or Superseded Alternatives

- A named Luna requirement was rejected in favor of live, user-approved,
  provider-neutral model and effort selection.
- Incremental validator patching was superseded by the single `ValidatedRun`
  boundary after repeated adjacent bypasses.
- A generalized pack transaction or inventory simulator was rejected; final
  consumer projection and per-asset verification were sufficient.
- Automatic discovery, quick-start, analysis, and research integration was
  deferred rather than coupled to the first release.
- Wholesale claim deletion on review rejection was rejected in favor of an
  honest transition to `unsupported` to preserve evidence trails and synthesis
  integrity.

## Where We Changed Course

- **Trigger:** p02 remained blocked after the authorized third correction and
  the user questioned whether the design was becoming over-engineered.
  **Direction:** revise the design around one normalized trust boundary.
  **Outcome:** p-rev1 passed terminal review without expanding the packet
  contract or adding a generalized validation framework.
- **Trigger:** final review found the reduced recon approval envelope did not
  bind the full dispatch projection. **Direction:** reuse the canonical
  dispatch projection and bind terminal receipt causality and fresh catalog
  evidence. **Outcome:** p-rev2 passed exhaustive mutation probes.
- **Trigger:** rebase invalidated prior final-gate freshness. **Direction:** run
  fresh review and require current agent inventory before native projection.
  **Outcome:** p-rev3 and a new configured gate passed.
- **Trigger:** post-promotion continuity and split-generation publication races
  discovered in final reviews. **Direction:** enforce atomic rename with
  pre/post promotion canonical byte continuity checks. **Outcome:** p-rev6 and
  p-rev7 passed.
- **Trigger:** gate review found valid-but-unpublishable runs could leak into
  `packet.md` and rejected claims left stale synthesis references.
  **Direction:** bind `ValidatedRun` strictly to publishability, categorically
  validate synthesis references (`SYNTHESIS_REFERENCE_MISSING`), and transition
  rejected claims to `unsupported`. **Outcome:** p-rev8 and p-rev9 passed the
  cross-family gate with zero blocking findings.

## New Architecture Patterns and Approaches

- **Normalize once, trust one type.** Assurance derivation and rendering accept
  only `ValidatedRun`; they do not reopen and reinterpret raw artifacts.
- **Context firewall.** Workers exchange bounded persisted artifacts, while the
  expensive consumer receives the packet directory and compact synthesis rather
  than every dossier or transcript.
- **Final-consumer lease projection.** Pack dependency cleanup is derived per
  asset from final direct intent and remaining leases, independent of request
  order.
- **Freshness-bound materialization.** Native provider projection requires a
  manifest-declared, bundled, installed, and `current` agent definition.
- **Atomic publication with canonical continuity.** Promotion uses atomic rename
  with verification of identical canonical byte digests before and after
  promotion.
- **Strict publishability gating.** Non-publishable runs (`running`, `failed`,
  `awaiting-approval`) yield no `ValidatedRun` and withdraw any existing
  consumer entry point.

## Domain Learnings

- A schema-valid assurance artifact can still be causally false. Approval
  projection, accepted-child identity, receipt timing, source identity, and
  terminal reconciliation must be bound together.
- For integrity contracts, a passing positive fixture is only a control. The
  useful proof is a reproduced bad-state mutation that fails before the fix and
  is rejected afterward while the valid control remains accepted.
- Stateful pack operations converge when they reason from final ownership per
  asset. Simulating intermediate request order produces asymmetric cleanup and
  recovery bugs.
- Same-model concurrence is not independent evidence. Blind inputs, direct
  source reopening, adversarial roles, and categorical unresolved states carry
  the assurance burden.
- Synthesis prose generated pre-review must be protected by referential
  integrity checks; claims rejected by review must transition to explicit
  categorical states (`unsupported`) rather than silently disappearing.

## Gotchas for Humans

- Do not authorize another local patch loop when repeated findings expose new
  representations of the same cross-cutting invariant. Pause and ask whether a
  smaller trust boundary can make the invalid states unrepresentable.
- Treat a rebase or other effective-delta change as invalidating final review
  and gate freshness until the relevant checks rerun against the new basis.
- A requested rigor profile is not achieved assurance. Consumers must inspect
  validated publication status, completed passes, material gaps, and claim
  states.

## Gotchas for Autonomous Agents

- Never infer correctness from a green suite when an independent reviewer has a
  direct failing probe; reproduce and close the probe first.
- Preserve the retry and authorization ledger. Exhaustion is a stop boundary,
  not permission to launch a fresh route or silently broaden scope.
- Keep raw dossiers out of parent context unless a specific disputed claim
  requires them.
- For user materialization, missing inventory may be absent, but installed
  non-current inventory must fail closed before provider planning.
- Ensure that helper functions (like `renderValidatedPacket`) fail closed on
  unpublishable statuses even if internal callers currently filter them.

## Repo Improvements (Promotion Register)

### RP-01: Require negative controls for assurance-bearing contracts

- **Type:** agents-instruction
- **Disposition:** apply
- **Status:** applied
- **Target:** AGENTS.md
- **Applied-ref:** AGENTS.md
- **Disposition-note:** —

Add a concise verification rule: changes to security, provenance, approval,
receipt, publication, or other assurance-bearing contracts should record a
reproduction-grade negative control, the pre-fix bad outcome, the post-fix
rejection, and a valid accepted control. This run's p01, p02, p03, and p-rev2
reviews repeatedly found real contract bypasses after positive suites were
green. The rule complements `BL-260706-front-load-recurring-gate`; it does not
replace that backlog item's cross-phase invariant propagation.

## OAT Upstream Feedback (Upstream Register)

### UP-01: Add a corrective-revision transition after review exhaustion

- **Status:** filed
- **Destination:** `.oat/repo/pjm/backlog/items/BL-260901-add-corrective-revision.md`
- **Destination-receipt:** `6a31f37a02fd6e7ac1a8dfa91b8b7844690b7d05`
- **Remote-visibility:** pushed
- **Sanitized:** yes
- **Disposition-note:** Filed as canonical backlog item
  `BL-260901-add-corrective-revision` with confirmed M scope.

Provide a first-class transition from exhausted phase or final review into a
named corrective revision. It should preserve the exhausted budget and source
review anchors, require explicit authorization, create scoped revision tasks,
and mandate whole-history re-review. The p02-to-p-rev1 transition achieved this
manually and successfully, but only after an extra patch authorization was also
exhausted.

### UP-02: Make terminal project status agree with completed revision plans

- **Status:** filed
- **Destination:** `.oat/repo/pjm/backlog/items/BL-260901-make-terminal-project-status.md`
- **Destination-receipt:** `8a614e098627cb391ab7f8c354fcbae1bc824b1c`
- **Remote-visibility:** pushed
- **Sanitized:** yes
- **Disposition-note:** Filed as canonical backlog item
  `BL-260901-make-terminal-project-status` with confirmed S scope.

`oat project status --project-path .oat/projects/shared/recon-skill --json`
currently reports `phaseStatus: complete` and 17 total tasks while reporting
zero completed tasks and recommending `oat-project-implement` because revision
work supposedly remains incomplete. Reconcile the status parser with the
completed task tables and terminal phase state, and add a regression containing
ordinary plus `p-revN` phases.

## Remaining Boundaries and Follow-Ups

- Product integration remains correctly owned by
  `BL-260830-integrate-recon-with-oat` and
  `BL-260830-integrate-recon-across`; the retro should not create duplicates.
- Existing `BL-260713-root-agent-judgment-logging` covers the absence of
  judgment entries in this project's structurally useful but sparse log.
- Existing `BL-260820-emit-source-qualified` and
  `BL-260820-track-pr-closeout-evidence` already cover self-contained receipt
  provenance and closeout-head freshness; the gate-receipt evidence from this
  run reinforces those items rather than creating another proposal.
- At generation time, PR merge and project archival still required separate
  human lifecycle actions.

## Reflections

The most important success was epistemic rather than numerical: the project
kept believing reproduced counterexamples over green totals. That discipline
made the final result trustworthy and ultimately simplified the design. The
run also showed that strong review is most economical when its recurring proof
techniques become authoring guidance and when the lifecycle can name a design
revision instead of extending a patch loop.

The final contract is deliberately smaller than the path used to discover it:
one approved homogeneous dispatch projection, one normalized validated graph,
one directory handoff, and explicit unresolved states. Future recon
integrations should reuse those boundaries rather than replaying this project's
internal complexity.
