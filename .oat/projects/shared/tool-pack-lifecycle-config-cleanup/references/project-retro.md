---
oat_retro_project: tool-pack-lifecycle-config-cleanup
oat_retro_generated: 2026-08-30T15:16:25Z
oat_retro_evidence_sources:
  - source: project-log
    status: used
  - source: oat-execution-learnings
    status: unavailable
  - source: lifecycle-artifacts
    status: used
  - source: archived-review-markdown
    status: used
  - source: git-history
    status: used
  - source: session-transcript
    status: used
  - source: github-pr-status
    status: used
oat_retro_promotions: none
oat_retro_filing: none
oat_generated: true
oat_template: false
---

# Project Retrospective: Tool-Pack Lifecycle and Config Cleanup

## Executive Summary

The project delivered its five intended lifecycle/configuration corrections and
reached a clean, review-complete PR, but the path exposed three recurring
failure classes: materialization behavior can invalidate naive content
comparison, release closeout spans more state than package code, and verified
work still needs exact commit-composition checks. The review and recovery
machinery caught each class before release. Future work should preserve those
controls while keeping implementation, repo-reference maintenance, and legacy
layout migration in separately owned changes.

## Evidence and Review Method

The retrospective used the append-only `project-log.md`; `implementation.md`,
`state.md`, `plan.md`, `summary.md`, and `discovery.md`; all ten archived phase
and final review artifacts; the five `DR-260830-*` decision records; Git commit
history; the current interactive session; and live PR #240 status. Three
read-only reconnaissance lanes independently audited durable outcomes,
incidents, and repo-versus-upstream feedback, after which their load-bearing
claims were checked against the committed artifacts.

No project-local `oat-execution-learnings.md` exists. Durable project artifacts
therefore remain authoritative for command outcomes and chronology. Causes
below are marked confirmed only where the project log, implementation ledger,
review artifact, or commit history provides direct evidence.

## Outcome Snapshot

| Area         | Generation-time evidence                                                                                                                                   |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Scope        | 13 tasks completed across four phases                                                                                                                      |
| Behavior     | Content-accurate inventory, exact adoption output, true-or-absent supported pack intent, and removal of inert per-pack `--force`                           |
| Release      | Five public packages aligned at `0.2.46`, still pending merge and publication in PR #240                                                                   |
| Review       | Final lifecycle review and configured cross-family exit gate passed; no unresolved Medium-or-higher finding                                                |
| Verification | 495 merged focused tests, 482 release-focused tests, forced Turbo with 4,645 package tests, full CI-order gates, and green remote CI/release/Bugbot checks |
| Closeout     | Final approval received; completion and archive bookkeeping had not yet run when this retro was generated                                                  |

## Current State

- **Promotions:** None; no RP apply-items were generated.
- **Filing:** None; no RP file-items or UP items were generated.
- **Unsettled items:** None in the retro registers. The separately owned
  `BL-260830-migrate-the-legacy-pjm` backlog item is not a retro proposal.

## What Went Well

- Parallel p01/p02 work stayed isolated, merged in plan order, removed both
  temporary worktrees, and passed a 495-test fan-in. The project-log event
  `oat-project-implement · parallel-p01-p02` preserves the exact merge heads.
- Independent p01 review found a real install-path regression that focused unit
  coverage had not excluded. One bounded task, `p01-t03`, repaired it and a
  narrowed re-review passed at commit `caea5ebafe10883b39336219a5cb76a188c96358`.
- The documentation checkpoint stopped p03 before public wording expanded. The
  approved compatibility and troubleshooting scope then resumed from a clean
  head, as recorded by `oat-project-implement · p03-docs-approval`.
- Review findings became bounded tasks with exact evidence instead of informal
  cleanup. Four p04 tasks closed direct-pack JSON coverage, archived-link,
  ledger, and reusable-summary gaps before the third narrowed review passed.
- The final cross-family gate run
  `eff218f5-9e87-41be-891c-79301573b4f8` passed at the Important threshold.
  Receive dispositioned all three Minor findings without manufacturing a code
  change, and PR #240 later showed CI, release dry run, and Bugbot all green.

## Challenges and Struggles

### Materialized file modes broke naive same-version comparison

The first p01 implementation hashed raw modes even though installation
intentionally promotes nested scripts from `0644` to executable. The phase
review reproduced 22 lifecycle acceptance failures: clean installs for three
packs appeared drifted and could not satisfy the apply path. The response was
to add `p01-t03`, normalize only the expected executable-mode delta, and retain
content, type, symlink, and unexpected-mode checks. The succeeding review found
zero findings. This cause and result are confirmed by
`reviews/archived/p01-review-2026-08-30T022309Z.md`, the narrowed review, and
`DR-260830-normalize-executable-modes`.

### Parallel fan-in encountered host capacity, not a code failure

The first no-edit post-merge verification stopped with `ENOSPC`. The operator
approved deletion of 74 stale unopened temporary directories older than three
hours, restoring about 1.6 GiB. The unchanged merged code then passed the
495-test fan-in. `implementation.md` under `Parallel Group Outcome: p01/p02`
confirms the environmental classification; the later passing run does not by
itself establish any more specific storage mechanism.

### Release closeout needed append-only composition recovery

During p03, backlog archival pre-staged a rename. A later explicit stage named
the now-missing source path, failed, and the surrounding shell continued,
leaving the verified release remainder outside the task commit. Recovery event
`recovery-p03-20260830T043447Z-01` reserved attempt 1/10, committed only that
remainder in `ae7bbc84e8ca115e3146fc2def4511e5135ac43b`, preserved the original
task commit, and reran all 482 focused tests plus phase gates. The incident was
contained, but it demonstrates why successful verification and correct commit
composition are separate claims.

### Planning and reusable-summary views lagged the implementation

The first p03 review found a closed backlog item still presented as active in
the curated backlog, roadmap, and current state. Its first correction left one
stale roadmap grouping sentence, requiring the second bounded fix. Later final
review found direct-pack JSON coverage, archived links, and the plan ledger
incomplete; the narrowed re-review then caught a reusable summary still saying
nine tasks. The bounded p03/p04 review chain corrected each surface and ended
with zero findings, but it consumed multiple rounds because completion state
was distributed across source, tests, planning records, and reusable prose.

## Decision Register

- `DR-260830-use-content-digests`: compare canonical managed content rather
  than trusting presence or version metadata.
- `DR-260830-normalize-executable-modes`: ignore only installer-owned executable
  normalization during drift comparison.
- `DR-260830-report-the-exact-adopted-pack`: return the exact legacy pack
  intents written by reconciliation.
- `DR-260830-keep-legacy-false-values`: read existing false intents as migration
  input but reject new supported writes.
- `DR-260830-remove-the-inert-per-pack`: remove an option that had no supported
  overwrite behavior instead of inventing destructive semantics.

## Rejected or Superseded Alternatives

- Version equality alone was rejected because same-version installed content
  can drift.
- Raw mode equality was superseded because the materializer deliberately
  changes executable bits; ignoring all mode differences was also rejected
  because it would hide real drift.
- New `tools.<pack>: false` writes were rejected in favor of true-or-absent
  supported state plus scoped removal.
- Retaining or redefining per-pack `--force` was rejected because the flag was
  inert and a late destructive overwrite contract would exceed the bounded
  cleanup.

## Where We Changed Course

- The p01 Critical review changed the comparison design from raw tree identity
  to materializer-aware identity; the narrowed fix preserved the original
  content-authority goal.
- The p03 documentation gate changed public-doc scope only after explicit user
  approval, adding bounded troubleshooting guidance without broadening the CLI
  implementation.
- Release review changed p03 from package/docs integration alone to include
  canonical planning-view cleanup, and final review added p04 as a bounded
  traceability phase.
- After PR #236 merged, the closeout refreshed `origin/main`, confirmed that
  `0.2.46` remained strictly above main's `0.2.45`, and updated canonical repo
  references instead of applying an unnecessary second version bump.

## New Architecture Patterns and Approaches

- **Materializer-aware content authority:** content digests remain authoritative
  while a narrowly defined normalization layer removes only installer-owned
  mode deltas.
- **Migration-readable, mutation-strict config:** readers accept legacy false
  intent so reconciliation remains possible, while supported writers enforce
  the canonical true-or-absent state.
- **Exact adoption receipts:** reconciliation reports only newly written pack
  intents, making JSON output deterministic and second-run behavior idempotent.

## Domain Learnings

- A version field is provenance metadata, not proof that installed assets still
  match their source.
- File-tree equality must model transformations intentionally performed by the
  installer; otherwise a correct materialization looks corrupt.
- Release completion is a multi-surface invariant spanning package versions,
  generated assets, tests, public docs, backlog lifecycle, decisions, and
  current planning views.
- Local green gates and remote GitHub checks are distinct evidence. Both were
  collected before this project was presented for completion.

## Gotchas for Humans

- Fetch and compare current `origin/main` immediately before the lockstep
  version gate; another merged PR does not automatically require another bump.
- Treat a documentation checkpoint as a real scope boundary. Public
  compatibility language can change support expectations even when code does
  not change.
- Do not delete legacy PJM reference files to silence doctor. Start from the
  `BL-260830-migrate-the-legacy-pjm` handoff after PR #240 merges and prove
  unique content is preserved first.

## Gotchas for Autonomous Agents

- Capture command exit status directly. A later stage, filter, or continued
  shell can conceal a failed staging or verification command.
- A passing test run is not proof that it executed; use forced Turbo evidence
  and inspect cache reporting when the result is load-bearing.
- Keep authorized closeout outputs and their rolling freshness checkpoint in
  separate commits. Mixing source changes with summary, documentation, or HiLL
  bookkeeping invalidates reuse of the configured exit gate.
- Reconcile task totals and backlinks across plan, implementation, summary,
  backlog, roadmap, and current state before asking for final review.

## Repo Improvements (Promotion Register)

No new repo improvement proposal was generated. The only remaining repository
cleanup identified by the evidence already has canonical ownership in
`BL-260830-migrate-the-legacy-pjm`, its roadmap entry, and its dedicated-branch
kickoff handoff. Duplicating it as an RP item would create competing status.

## OAT Upstream Feedback (Upstream Register)

No upstream feedback identified.

## Remaining Boundaries and Follow-Ups

- PR #240 still needs merge and publication before `0.2.46` is released.
- `BL-260830-migrate-the-legacy-pjm` begins from current `origin/main` after
  PR #240 merges. It owns lossless reconciliation of the four pre-existing PJM
  layout warning classes and deletion proof in a dedicated branch.
- The optional Playwright link checker was unavailable because Chromium was
  absent. No link changed in the public-doc update, while `pnpm check` and the
  docs build passed; this is recorded as verification scope, not an unresolved
  defect.

## Reflections

The result is trustworthy because every material correction crossed a distinct
evidence boundary: focused tests for behavior, independent review for missed
contracts, append-only recovery for history integrity, a different-family exit
gate for closeout quality, and remote checks for the pushed PR. The cost was
several review rounds on planning and summary drift. Future projects should
treat those reference surfaces as part of implementation completion from the
start, while preserving the same refusal to conflate a green test, a complete
commit, an approved document, and a released change.
