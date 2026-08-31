---
oat_retro_project: scope-adoption-diagnostics
oat_retro_generated: '2026-08-31T02:48:43Z'
oat_retro_evidence_sources:
  - source: project-log
    status: used
  - source: oat-execution-learnings
    status: unavailable
  - source: lifecycle-artifacts
    status: used
  - source: archived-review-markdown
    status: used
  - source: active-review-markdown
    status: unavailable
  - source: gate-receipts
    status: used
  - source: raw-gate-logs
    status: unavailable
  - source: decision-records
    status: used
  - source: git-history
    status: used
  - source: session-transcript
    status: used
  - source: host-resource-telemetry
    status: unavailable
oat_retro_promotions: none
oat_retro_filing: none
oat_generated: true
oat_template: false
---

# Project Retrospective: Scope and Adoption Diagnostics

## Executive Summary

The project delivered its bounded diagnostics slice without absorbing the
concurrent provider/scope program. The implementation is trustworthy because
each phase passed focused review, the exact repository gates ultimately passed,
and the final Cursor Fable gate found no issues. The main lesson is procedural:
when current main, adjacent projects, and host load all move underneath a plan,
preserve explicit ownership and exact gate criteria instead of accepting a
plausible but weaker substitute.

## Evidence and Review Method

The review started with the append-only `project-log.md`, then used
`implementation.md`, `state.md`, `plan.md`, `discovery.md`, `summary.md`, all
archived plan/phase/final reviews, the three promoted decision records, the
archived backlog record, Git history, and the current project session. Durable
artifacts outranked session recollection for command outcomes.

No `oat-execution-learnings.md`, active top-level review artifact, raw gate log,
or host resource telemetry was available. Gate receipts and retained review
artifacts were sufficient to confirm lifecycle outcomes, but the exact OS-level
cause of the changing Git-fixture timeouts remains a hypothesis rather than a
proven mechanism.

## Outcome Snapshot

| Dimension      | Generation-time result                                                                                                                    |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Delivery       | 10/10 tasks complete across PJM adoption, provider-aware diagnostics, shared ownership, inventory degradation, and test quality           |
| Scope control  | Broader provider projection, catalog, restart, picker, `AGENTS.md`, and dispatch work stayed with `tool-pack-scope-provider-truthfulness` |
| Integration    | PR #244 landed first and was integrated at `ac380219d` with no `pjm/doctor.ts` source conflict                                            |
| Verification   | Exact `pnpm test` passed 4,599/4,599; all eight repository gates passed                                                                   |
| Review         | Every phase passed; final lifecycle review had one artifact-only correction; Cursor Fable exit gate passed with zero findings             |
| Release        | Lockstep public packages advanced to `0.2.49`; backlog item `BL-260827-correct-scope-and-adoption` was archived                           |
| Delivery state | PR #249 was open and final closeout was approved with this retro as its only post-approval step                                           |

## Current State

- **Promotions:** None; no RP apply-items exist.
- **Filing:** None; no RP file-items or UP items exist.
- **Unsettled items:** None.

## What Went Well

- Current-main revalidation preserved PR #240's inventory/lifecycle work and PR
  #242's canonical agent-read contract while adapting five tasks instead of
  replaying stale assumptions (`plan.md`, `Current-Main Revalidation`).
- The cleanup-first dependency was treated as a real merge constraint. PR #244
  landed first, diagnostics integrated it, and the project verified there was
  no broader PJM doctor overlap (`project-log.md`, `p04-integration`).
- Reviews caught meaningful defects at the right boundaries: the initial plan
  gained explicit adoption/evidence and provider-activation matrices, and the
  first p01 review prevented a shallow current scaffold from being labeled
  already migrated.
- The project refused to treat focused and subset passes as equivalent to the
  required full gate. A narrowly authorized four-worker cap made the exact test
  command pass without weakening assertions, fixtures, or timeout contracts
  (`Recovery Event p04-recovery-001`, commit `162141379`).
- Failed gate provenance stayed honest. The Claude OAuth failure produced no
  receive-eligible artifact and consumed no remediation attempt; the explicit
  Cursor replacement then passed and was durably received.

## Challenges and Struggles

The first challenge was moving context. PRs #240 and #242 substantially changed
the shared inventory and agent-resolution surfaces after the original plan,
while a concurrent provider/scope project claimed adjacent behavior. Without a
fresh task-by-task classification, diagnostics could have duplicated the
umbrella or reverted shipped contracts. The revalidation kept all nine original
tasks, adapted five, and transferred only the broader behavior inside p02-t01.

The second challenge was full-suite reliability. Focused behavior passed
417/417, and the timeout-affected files passed 250/250 together, but repeated
exact runs failed with changing timeout-only sets. The project correctly stayed
blocked because those partial results did not satisfy `pnpm test`. Host-load
dependence is the supported hypothesis, not a proven root cause. After Thomas
authorized one concurrency-only recovery, the four-worker CLI Vitest cap made
the exact command pass 4,599/4,599 and survived the remaining release gates.

The final challenge was lifecycle friction rather than product behavior. A
final reviewer found one stale-summary issue, fixed in `e920d77c1`, and Thomas
waived a redundant artifact-only re-review. The configured Claude exit gate
then failed because OAuth could not refresh. That generation was retired with
its failure intact, and a one-time Cursor Fable replacement passed with zero
findings (`project-log.md`, `implementation exit gate authentication`; gate run
`f8fd1422-ed90-466c-b3c7-9e25a562d96a`).

## Decision Register

- `DR-260831-legacy-evidence-is-independent`: adoption describes repository
  context; recognized legacy input independently authorizes migration.
- `DR-260831-provider-aware-reachability`: user-agent reachability follows
  config-aware active Codex/Cursor adapters, not filesystem detection.
- `DR-260831-diagnostic-inventory-failures`: inventory exceptions become
  structured unavailable data shared by doctor and status.
- Merge order was deliberately serialized as PJM cleanup, diagnostics, then
  provider/scope truthfulness so each project had one authoritative baseline.

## Rejected or Superseded Alternatives

- Project-management pack intent and adoption labels were rejected as proxies
  for legacy migration evidence.
- Filesystem detection and PR #242's canonical read resolution were rejected as
  proxies for native provider materialization.
- Accepting focused/subset test results or raising timeouts was rejected because
  the required exact gate still failed and slow regressions needed to remain
  visible.
- Folding projection, catalog, restart, picker, `AGENTS.md`, or dispatch
  behavior into this project was rejected as duplicate umbrella ownership.

## Where We Changed Course

- PRs #240/#242 and the concurrent umbrella triggered a current-main rewrite of
  five tasks and a sequential diagnostics-first implementation; the outcome was
  a bounded seam the umbrella can rebase onto.
- Repeated shifting timeout-only failures triggered one operator-approved
  concurrency recovery; the outcome was an exact full-suite pass without
  changing test semantics.
- The failed Claude gate triggered an explicit one-time Cursor substitution;
  the outcome was a clean independent exit-gate result with the failed
  generation preserved for audit.

## Domain Learnings

- Repository structure, migration input, provider activation, canonical
  instruction resolution, and runtime materialization are distinct facts.
  Diagnostics become truthful when those facts stay separate until the caller
  deliberately combines them.
- Shared inventory is valuable only when every renderer preserves its
  availability state. Empty inventory and unavailable inventory must remain
  distinguishable in JSON and human output.
- Shared file ownership is not enough to attribute installation. Applicability
  must be resolved across the complete inventory and intent set.

## Gotchas for Humans

- Fetch current main immediately before choosing release versions or asserting
  that a shared-surface plan is still valid.
- A focused pass is supporting evidence, not permission to waive an explicitly
  required full command.
- Treat generated project/version/backlog conflicts separately from source
  conflicts; the former can coexist even when the owned implementation files do
  not overlap.
- Provider credentials can fail after a route is accepted. Preserve the failed
  generation and authorize any replacement explicitly.

## Gotchas for Autonomous Agents

- Do not infer migration authority from adoption state or tool-pack intent;
  inventory recognized legacy evidence independently.
- Use config-aware adapter activation for materialization claims and keep
  loaded/user/project instruction precedence separate from provider reachability.
- Never convert a changing timeout-only failure set into a pass. Record the
  exact nonzero gate, exhaust bounded diagnostics, and request narrowly scoped
  recovery authority.
- Keep historical review/orchestration snapshots immutable, but reconcile every
  current summary against the authoritative ledger before closeout.
- A gate failure without a structured artifact is not review feedback and must
  not be sent to review-receive or charged as a remediation attempt.

## Repo Improvements (Promotion Register)

No repo improvements identified. The concrete improvements exposed by this run
were implemented in the project or already have durable backlog ownership.

## OAT Upstream Feedback (Upstream Register)

No upstream feedback identified.

## Remaining Boundaries and Follow-Ups

At generation time, PR #249 still required human review and merge. After it
merges, `tool-pack-scope-provider-truthfulness` must rebase and preserve or
deliberately supersede the config-aware managed-role input and canonical
inventory/rendering seams. Publishing and merging remain operator-owned and are
not implied by project closeout.

## Reflections

The project succeeded by treating truthfulness as a boundary problem rather
than a larger state-model rewrite. The result is credible because partial
evidence never replaced an exact gate, adjacent ownership stayed explicit, and
failed review infrastructure was preserved instead of rewritten as success.
Future diagnostic work should keep using the same discipline: separate facts,
name the authority that combines them, and make unavailable evidence visible.
