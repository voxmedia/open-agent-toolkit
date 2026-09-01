---
oat_retro_project: retire-archived-synced-project
oat_retro_generated: '2026-09-01T21:48:38Z'
oat_retro_evidence_sources:
  - source: archived-review-markdown
    status: used
  - source: decision-records
    status: used
  - source: gate-receipts
    status: used
  - source: git-history
    status: used
  - source: lifecycle-artifacts
    status: used
  - source: pr-metadata
    status: used
  - source: project-log
    status: used
  - source: session-transcript
    status: used
  - source: gate-run-marker
    status: unavailable
  - source: oat-execution-learnings
    status: unavailable
oat_retro_promotions: none
oat_retro_filing: complete
oat_generated: true
oat_template: false
---

# Project Retrospective: retire-archived-synced-project

## Executive Summary

The project delivered a durable terminal contract for synced projects: completion
now archives before retirement, records an authoritative completed ref, preserves
recoverability across retries, and prevents terminal projects from reappearing as
active work. The result is unusually well supported by adversarial review and
test evidence, but reaching it required two review-budget resets and a final
whole-project correction round. At generation time, one non-blocking
maintainability follow-up was unsettled: consolidate six correct but
near-duplicate remote-ref advertisement parsers when one of those sites next
changes.

## Evidence and Review Method

The retrospective reconciled `discovery.md`, `plan.md`, `implementation.md`,
`state.md`, `summary.md`, the project log, five decision records, 17 archived
review artifacts, Git history, live PR #254 metadata, the durable Claude Fable
closeout receipt, and the current session transcript. Load-bearing claims were
cross-checked between the implementation ledger, committed reviews, commits, and
receipt rather than inferred from state labels alone.

The temporary gate-run marker named in `state.md` is no longer present, and no
`oat-execution-learnings.md` artifact exists. The marker's disappearance is
inconclusive; it does not weaken the final gate result because the durable receipt,
archived review, Reviews event, and receive commit agree on the same run and
finding counts.

## Outcome Snapshot

This snapshot reflects the generation-time state on 2026-09-01.

| Area               | Outcome                                                                                                                               |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| Delivered contract | Durable archive receipt, completed-ref authority, retry-safe completion, terminal discovery exclusion, and explicit destructive prune |
| Implementation     | Four phases and 13 tasks complete; all Critical, Important, and Medium findings resolved                                              |
| Independent gate   | Claude Fable passed at Important with one Minor maintainability finding, explicitly deferred                                          |
| Durable decisions  | Five records under `.oat/repo/reference/decisions/`                                                                                   |
| Pull request       | PR #254 is open, mergeable, and green at remote head `363820074c067c1c69388ed0fb1ccf99b61376f9`                                       |
| Current boundary   | Two later documentation commits were local-only; project completion and archival had not run                                          |

## Current State

- **Promotions:** None; no repository changes are proposed for immediate application.
- **Filing:** Complete; RP-01 was filed in the local OAT backlog.
- **Unsettled items:** None.

## What Went Well

- The project converted review findings into concrete plan tasks and re-ran focused
  reviews instead of treating green tests as sufficient proof. This caught child
  resurrection, interrupted completed-only prune, and fail-open lookup handling
  after the phase reviews had passed.
- Parallel p02/p03 work used disjoint ownership and then recombined under an
  integration phase. The branch passed scoped tests, uncached package suites, the
  full repository gate matrix, and independent final review.
- Durable evidence survived a provider change. Cursor Fable was never launched
  while the login keychain was locked; the operator selected Claude Fable, and its
  launch intent, structured result, review artifact, and receive correlation were
  persisted and reconciled.
- The five material policy choices were promoted into decision records, giving
  future completion and sync work a stable contract instead of leaving rationale
  buried in review history.

## Challenges and Struggles

The first p01 review generation exhausted its bounded budget on an atomic no-op
active-ref deletion race. The underlying problem was not merely implementation:
the original contract gave the active ref more authority than the desired terminal
model could safely support. The operator approved completed-ref authority, after
which a fresh bounded generation fixed torn two-process observation and unleased
prune deletion and passed review.

The p02 retry path initially recognized an existing archive but exited the entire
completion skill, skipping durability and closeout. After the automatic budget
stopped, an authorized fresh generation replaced the terminal exit with bounded
continuation, restored exact recap evidence, and made tracked-PR closeout
fail-closed. This passed the next review.

The final whole-project review then exposed three cross-boundary failures that
phase-local review had missed: a completed coordination child could be resurrected,
completed-only prune could be interrupted after local deletion, and a transport
lookup error could be misclassified as absence. All three became p04 tasks and
passed focused re-review. Separately, the implementation workflow briefly paused
before p04 by misreading its HiLL checkpoint; the operator corrected the timing and
p04 proceeded. Existing plan, skill, and documentation language already defines
listed checkpoints as post-phase, so this was an execution error rather than an
unresolved product defect.

## Decision Register

- `DR-260831-transactional-active-records`: active records participate in a
  transaction rather than serving as an independently trusted completion signal.
- `DR-260831-durability-before-retirement`: archive durability must be proven before
  mutable coordination state is retired.
- `DR-260831-completed-ref-authority`: the completed ref is authoritative; a
  same-SHA active ref is an inert alias, while differing SHAs are a hard mismatch.
- `DR-260831-terminal-discovery-exclusion`: terminal identities are excluded from
  active discovery and action surfaces.
- `DR-260831-explicit-destructive-prune`: normal completion preserves the retained
  Git root; destructive removal requires an explicit prune operation.

Together these decisions separate durable terminal truth from mutable coordination
bookkeeping. No material decision identified during the retrospective lacks a
durable record.

## Rejected or Superseded Alternatives

- Requiring atomic deletion of the active ref was superseded by completed-ref
  authority because a no-op deletion cannot prove that another writer did not
  recreate the ref.
- Treating an existing archive as permission to exit completion was rejected;
  retries must skip only obsolete active-work steps and continue durability and
  closeout.
- Automatically deleting the retained Git root during normal completion was
  rejected in favor of explicit destructive prune.
- Building a completed-project browsing surface was deferred until usage evidence
  justifies it.

## Where We Changed Course

- The remaining p01 atomicity failure triggered a contract revision from active-ref
  deletion authority to completed-ref authority; the revised model passed review.
- The exhausted p02 budget triggered a fresh, explicitly authorized generation
  focused on continuation rather than whole-skill exit; completion recovery then
  passed.
- The final review's cross-boundary findings expanded p04 from integration-only work
  to three terminal-safety fixes; the final re-review passed with zero findings.
- A locked Cursor keychain made the configured target unavailable before launch;
  the operator selected Claude Fable without consuming a failed Cursor generation.

## New Architecture Patterns and Approaches

The implementation establishes a reusable terminal-state pattern: publish an
immutable or authoritative terminal receipt first, treat mutable active state as
coordination only, and remove aliases only under leases that protect against
concurrent recreation. Recovery classifies the authoritative terminal record before
performing active work, while discovery and action surfaces probe terminal and
active refs coherently and fail closed on malformed or unavailable evidence.

## Domain Learnings

- Remote-ref absence is a verified protocol result, not a synonym for transport
  failure, malformed output, or an empty untrusted advertisement.
- A durable archive is necessary but not sufficient for completion. Retry paths must
  also finish remote terminal publication, evidence persistence, and closeout.
- Terminal correctness is cross-surface. Completion, list, open, pull, links, pause,
  prune, migration, coordination-child handling, and doctor checks must agree on
  authority and failure classification.
- Phase-local reviews can miss interaction failures; a whole-project adversarial
  review remains valuable even after every phase has independently passed.

## Gotchas for Humans

- Read a HiLL checkpoint named `pNN` as approval after phase `pNN` completes.
- Unlock the macOS login keychain before selecting a Cursor-backed gate target, and
  probe target availability before launch.
- A passed threshold can still leave non-blocking findings that require an explicit
  receive disposition before closeout.
- Do not treat the current local branch as published: commits `eabb55de` and
  `725f8d10` are not yet in PR #254's remote head.

## Gotchas for Autonomous Agents

- Probe active and completed refs together where the contract depends on their
  relationship; never infer a coherent snapshot from unrelated observations.
- Preserve original source SHA, snapshot, archive evidence, and closeout identity
  when resuming recordless or partially completed retries.
- Distinguish verified absence from lookup failure and malformed advertisement;
  terminal safety requires fail-closed diagnostics.
- Do not pause before a listed HiLL phase. Execute the phase, persist its evidence,
  then request the configured approval.
- Verify that a configured gate target is available before recording launch intent;
  an unavailable target must remain unlaunched and consume no remediation attempt.

## Repo Improvements (Promotion Register)

### RP-01: Consolidate terminal remote-ref advertisement parsing

- **Type:** code-follow-up
- **Disposition:** file
- **Status:** filed
- **Destination:** .oat/repo/pjm/backlog/items/BL-260901-consolidate-terminal-remote.md
- **Destination-receipt:** 0a309b9a644365f4ca21669643d3bdf6bd07033d
- **Remote-visibility:** unpushed
- **Sanitized:** no
- **Disposition-note:** Filed as low-priority task `BL-260901-consolidate-terminal-remote`; destination commit is local-only.

At generation time, six terminal-ref call sites parsed `git ls-remote`
advertisements with near-duplicate validation. They were correct and tested, so
an immediate refactor would have added churn without changing behavior. When any
one of those parsers next changes, extract a shared typed parser that preserves
exact-ref validation, duplicate and malformed-row rejection, fail-closed transport
handling, and each call site's actionable diagnostics. The final Claude Fable
review recorded this as Minor `m1`, and the operator explicitly deferred it on
that basis. No matching active or archived OAT backlog item or GitHub issue was
found during generation-time duplicate screening.

## OAT Upstream Feedback (Upstream Register)

No upstream feedback identified.

## Remaining Boundaries and Follow-Ups

At generation time, the remaining boundaries were:

- Decide whether RP-01 belongs in the local OAT backlog or GitHub issues.
- Push local documentation commits `eabb55de` and `725f8d10` so PR #254 contains
  the completed documentation pass.
- Merge PR #254 and run `oat-project-complete`; the project was still unarchived
  with `oat_project_completed: null`.

## Reflections

The strongest feature of this run was its refusal to collapse different kinds of
evidence into one status bit. Archive durability, remote terminal authority,
discovery behavior, destructive cleanup, gate launch, structured result receipt,
and review disposition each had their own proof. That made concurrency and retry
bugs visible even when tests were green. Future work should keep that separation,
but reduce maintenance cost by consolidating the shared advertisement parser only
when a real parser change makes the refactor timely.
