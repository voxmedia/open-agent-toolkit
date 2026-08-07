---
oat_retro_project: subagent-orchestration
oat_retro_generated: 2026-08-07T02:59:04Z
oat_retro_evidence_sources:
  - source: project-log
    status: used
  - source: oat-execution-learnings
    status: unavailable
  - source: lifecycle-artifacts
    status: used
  - source: review-artifacts
    status: unavailable
  - source: session-transcript
    status: unavailable
  - source: repo-reference-ledgers
    status: used
oat_retro_promotions: proposed
oat_retro_filing: proposed
oat_generated: true
oat_template: false
---

# Project Retrospective: subagent-orchestration

## Executive Summary

The project delivered a portable model-selection guidance layer while
preserving OAT-specific dispatch mechanics, compatibility, and launch
safeguards. Its outcome is well supported by completed task records, repeated
full-suite verification, phase reviews, and PR-feedback fixes. The run also
exposed how stale dispatch boundaries, conflicting bootstrap commits, and
post-synthesis feedback can require explicit recovery even when implementation
is technically complete. The most useful follow-up is to make project-log
synthesis freshness explicit rather than letting later entries silently
invalidate an earlier end-of-run verdict.

## Evidence and Review Method

This retro used `project-log.md` first, then reconciled it against
`implementation.md`, `state.md`, `plan.md`, `summary.md`, `discovery.md`, and
`design.md`. Repository backlog and decision indexes were checked to avoid
re-proposing already tracked timeout, fan-in, and review-provenance work.

No `oat-execution-learnings.md` exists. The original project-run transcript was
not available in the current session; current-session and reconnaissance
transcripts are derivative and were not treated as run evidence. Referenced
archived review Markdown is also absent from this checkout, so review details
were accepted only where the committed ledger, implementation record, and
project log independently agree. Mechanisms not established by those durable
sources are labeled inconclusive or hypothetical.

## Outcome Snapshot

| Area         | Generation-time evidence                                                                |
| ------------ | --------------------------------------------------------------------------------------- |
| Delivery     | 10/10 tasks completed across five phases                                                |
| Architecture | Guidance owns classification and routing policy; dispatch owns launch and recovery      |
| Verification | Focused suites plus full test, lint, type, format, build, docs, release, and sync gates |
| Reviews      | Phase and final reviews passed before later PR-feedback changes                         |
| Lifecycle    | PR open; final review and exit-gate evidence recorded as stale after later code changes |
| Boundaries   | No original session transcript or archived review files were available in this checkout |

## Current State

- **Promotions:** `proposed` — RP-01 awaits an apply or reject decision.
- **Filing:** `proposed` — UP-01 awaits filing, rejection, or a destination
  decision.
- **Unsettled items:** RP-01 and UP-01.

## What Went Well

- The guidance/mechanics split held through consumers, utility installation,
  provider synchronization, and release packaging rather than existing only as
  prose.
- Root-owned reviews found contract gaps that focused task tests missed,
  including autonomy inventory drift, consumer loading order, legacy record
  coverage, and request-to-selector evidence semantics.
- Accepted dispatches were treated as terminal. The stale Phase 3 packet made no
  edits, and recovery required a new operator-authorized action instead of an
  invisible replacement.
- Full-suite checks caught cross-cutting drift after focused tests passed.
  Repeated repository and release gates made the final implementation claims
  independently reproducible.
- Effective-delta freshness correctly invalidated historical review and gate
  approvals after PR feedback changed implementation.

## Challenges and Struggles

- The first plan gate timed out. Durable evidence confirms the timeout but not
  its mechanism; the later successful attempt does not establish a cause.
- A second plan review found blocking premise drift. The findings were fixed,
  but the clean re-review was explicitly waived after configured attempts were
  exhausted.
- Phase 3 received stale boundaries that conflicted with canonical `plan.md`.
  The no-op terminal attempt and explicit recovery preserved auditability but
  added operator work.
- Parallel fan-in encountered equivalent bootstrap-sync manifest commits in
  both worktrees. Root aborted the merge and cherry-picked reviewed task
  commits in plan order.
- Later Bugbot feedback required homogeneous-wave parity, engine-first loading,
  request-selector mapping, and Cursor Cloud ordering fixes after earlier final
  reviews.
- Review ledgers reference archived artifacts that are not present in this
  checkout. Existing dual-provenance guidance limits the damage, but detailed
  retrospective reconstruction could not independently inspect those files.

## Decision Register

- **Split guidance from mechanics without renaming.** This kept the ownership
  change reviewable and avoided coupling it to a broad compatibility migration.
- **Keep Opus-first Claude routing.** The imported Fable-first proposal was
  rejected; Fable was retained as an exceptional escalation.
- **Use a directional utility dependency.** Dispatch installation includes
  guidance, while the portable guidance skill can install alone.
- **Keep dispatch evidence additive.** Reasoning, service-tier, guidance, and
  freshness fields remain optional so legacy request and record shapes stay
  valid.

## Rejected or Superseded Alternatives

- A simultaneous dispatch-skill rename was deferred because it would expand the
  consumer and compatibility surface without improving the core ownership
  split.
- A staged guidance-first migration was rejected because its intermediate state
  would duplicate canonical policy.
- Fable-first hard-reasoning defaults were rejected in favor of preserving the
  established Opus-first policy and concentrating economy choices in
  high-volume bounded work.

## Where We Changed Course

- The project continued after an explicit plan-gate override, then relied on
  independent phase and final reviews for compensating assurance.
- The failed Phase 3 launch was replaced only after explicit operator
  authorization with canonical plan boundaries.
- Fan-in changed from merge commits to reviewed-task cherry-picks after the
  duplicate bootstrap metadata conflict.
- Rebasing onto a newly published `0.2.13` release changed the lockstep target
  to unpublished `0.2.14`.
- Two PR-feedback rounds expanded semantic coverage beyond the original final
  review basis and correctly made that basis stale.

## New Architecture Patterns and Approaches

The project established a reusable two-layer pattern: portable, dated selection
guidance can evolve independently from provider-specific launch mechanics,
while consumers load the engine, principles, one active-provider guide, and
matching mechanics in a fixed order. Optional evidence fields let the record
schema enrich new launches without invalidating old records.

## Domain Learnings

- Dispatch acceptance and dispatch success are separate states. Once accepted,
  a retry is a new authorized action, not an implementation detail.
- Review freshness belongs to the effective implementation delta, not to a
  historical pass label.
- Focused suites prove a local contract; full suites are needed when skills,
  generated assets, autonomy inventories, and release metadata share hidden
  coupling.
- Equivalent generated bootstrap commits are operationally duplicate even when
  each worktree is individually correct.

## Gotchas for Humans

- Treat a timed-out review and a failed review as different evidence. A retry
  can resolve work without explaining the timeout.
- After rebasing a release branch, re-check registry availability before
  preserving a planned package version.
- When a project log already contains an end-of-run synthesis, later PR
  feedback needs an append-only correction; never edit the old entry.

## Gotchas for Autonomous Agents

- Validate phase boundaries against canonical `plan.md` before launch. Stop
  without edits when the packet and plan disagree.
- Do not replace an accepted failed or blocked dispatch automatically.
- During fan-in, abort on generated-manifest conflicts and preserve reviewed
  task commits rather than resolving semantically equivalent metadata by guess.
- Do not claim cross-family runtime diversity when producer provenance is
  recorded as unknown.

## Repo Improvements (Promotion Register)

### RP-01: Append a correction to the stale end-of-run synthesis

- **Type:** docs
- **Disposition:** apply
- **Status:** proposed
- **Target:** `.oat/projects/shared/subagent-orchestration/project-log.md`
- **Applied-ref:** —
- **Disposition-note:** —

Use `oat project log append` to add a project-scoped correction referencing the
existing `## End-of-run synthesis`. The correction should state that subsequent
PR-feedback fixes invalidated the prior final review and configured exit-gate
basis, so a fresh final review and gate were required before approval. Preserve
the original synthesis unchanged.

## OAT Upstream Feedback (Upstream Register)

### UP-01: Detect stale project-log synthesis after later entries

- **Status:** proposed
- **Destination:** —
- **Destination-receipt:** —
- **Remote-visibility:** —
- **Sanitized:** no
- **Disposition-note:** —

Add lifecycle support for detecting structural or judgment entries appended
after an end-of-run synthesis. Surface a stale-synthesis state and require an
append-only correction before completion can treat the project log as fully
rolled up. This complements existing log grammar and roll-up checks without
rewriting historical entries.

## Remaining Boundaries and Follow-Ups

- At generation time, project state recorded the prior final review and
  configured exit gate as stale after PR-feedback fixes; refreshing them was
  the next lifecycle action.
- The project was PR-open rather than archived, and `oat_project_completed` was
  unset.
- Detailed review prose could not be re-audited because archived review files
  were unavailable in this checkout. The plan ledger and durable implementation
  notes supplied only reduced-assurance review evidence.
- RP-01 requires an explicit apply decision. UP-01 requires a separate filing
  decision and public-destination sanitization.

## Reflections

This run showed that strong execution controls are most valuable at recovery
boundaries: stale inputs stopped cleanly, accepted work was not silently
replaced, full checks caught cross-surface drift, and review freshness reacted
to later changes. It also showed that lifecycle truth can decay after a
well-formed synthesis. Future workflows should treat synthesis as a checkpoint
with freshness, not as a timeless verdict.
