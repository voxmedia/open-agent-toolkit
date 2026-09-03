# Backlog Priority Alignment

<!-- markdownlint-disable MD013 -->

**Date:** 2026-08-30 (America/Chicago)
**Status:** Active — Post-PR #244 alignment. The provider-root contract shipped;
the scope/provider umbrella and scope-adoption diagnostics are active in
separate worktrees; ReviewPlan remains an existing project; and the two bounded
gate projects remain independent launch candidates.

This is the compact execution guide. For the full catalog and historical
value/effort review, see
[backlog-and-roadmap-review.md](./backlog-and-roadmap-review.md) and
[roadmap.md](../../roadmap.md).

## Current ownership

| Lane                    | Owned work                                                                                                                                                                                                                                                                                                                                                                         | Current disposition                                                                                              |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Scope/provider umbrella | [BL-260829-make-tool-pack-scope-selection](../items/BL-260829-make-tool-pack-scope-selection.md), [BL-260724-support-provider-directory](../items/BL-260724-support-provider-directory.md), [BL-260826-populate-native-subagent](../items/BL-260826-populate-native-subagent.md), [BL-260828-add-project-level-oat-guidance](../items/BL-260828-add-project-level-oat-guidance.md) | Active tool-pack-scope-provider-truthfulness project. Revalidate against PRs #227, #240, and #242 before design. |
| Scope diagnostics       | [BL-260827-correct-scope-and-adoption](../items/BL-260827-correct-scope-and-adoption.md)                                                                                                                                                                                                                                                                                           | Active scope-adoption-diagnostics project. Keep its diagnostics slice bounded.                                   |
| ReviewPlan              | [BL-260729-implement-reviewplan-first](../items/BL-260729-implement-reviewplan-first.md)                                                                                                                                                                                                                                                                                           | Existing review-plan-workflow project; reconcile PR #190 against current main.                                   |
| Review/gate integrity   | [BL-260829-order-phase-bookkeeping-before](../items/BL-260829-order-phase-bookkeeping-before.md) and dependent review-receipt work                                                                                                                                                                                                                                                 | Preserve shared lifecycle ordering; do not replace the cluster with isolated plans.                              |
| Headless gate           | [BL-260826-gate-targets-must-not-yield](../items/BL-260826-gate-targets-must-not-yield.md)                                                                                                                                                                                                                                                                                         | Existing gate-headless-no-yield project; independent bounded launch candidate.                                   |
| Structured output       | [BL-260726-validate-structured-output](../items/BL-260726-validate-structured-output.md)                                                                                                                                                                                                                                                                                           | Existing gate-structured-output-contract project; independent bounded launch candidate.                          |

The archived
[BL-260829-unified-agent-provider-root](../archived/BL-260829-unified-agent-provider-root.md)
shipped in PR #242 as CLI 0.2.47. It is now a prerequisite consumed by the
scope/provider umbrella, not an active lane.

## Dependency interpretation

- PR #242's provider-root contract precedes scope/provider implementation; that
  dependency is satisfied.
- The active scope/provider and diagnostics worktrees may proceed concurrently,
  but must coordinate changes to inventory, diagnostics, sync, and shared
  provider-state surfaces.
- ReviewPlan must establish the current review artifact/event baseline before
  exact received-event identity and later receipt-provenance work.
- [BL-260829-order-phase-bookkeeping-before](../items/BL-260829-order-phase-bookkeeping-before.md)
  should precede
  [BL-260711-skip-re-review-for-bookkeeping](../items/BL-260711-skip-re-review-for-bookkeeping.md).
- The headless and structured-output projects remain independent probes. They
  support review/gate integrity without taking ownership of its lifecycle model.

## External-plan readiness

Plan readiness and execution readiness are separate decisions. A coherent,
well-scoped backlog item may receive an external plan even when execution is
blocked by an unshipped hard dependency. Dependency state alone is not a reason
to exclude an item from the next `oat-repo-improve` pass.

For every dependency-aware external plan:

- reverse-link the source backlog item and plan;
- link related backlog items, projects, pull requests, and external plans by
  stable ID, title, repository path, or URL;
- classify each dependency as hard or soft;
- mark execution `BLOCKED` for unsatisfied hard dependencies and name the exact
  state that unblocks execution;
- use a dated filename and record the exact current `origin/main` commit; and
- revalidate before import or execution when the freshness window expires,
  `origin/main` advances, cited surfaces change, backlog or issue intent
  changes, or a dependency lands after planning.

[BL-260830-distinguish-external-plan](../items/BL-260830-distinguish-external-plan.md)
owns the missing `oat-repo-improve` skill and plan-template enforcement. Until
that item ships, apply this section as the operator rule for candidate
selection and plan review.

## Recommended concurrent stack

These lanes are peers except where the dependencies above say otherwise:

1. Merge the completed PJM cleanup and migration PR.
2. Continue the active scope/provider umbrella and diagnostics projects with
   explicit shared-file coordination.
3. Reconcile the existing ReviewPlan project and PR #190.
4. Launch the existing headless and structured-output projects when capacity
   allows.
5. Use oat-repo-improve for remaining well-scoped backlog items that do not
   already belong to one of these projects and do not require deeper discovery.
   Include plan-ready items whose execution is dependency-blocked, with the
   dependency and revalidation controls above.

## Priority clusters

### Truthful distribution and adoption

The active umbrella owns provider × scope × content-type truth, restart
visibility, picker state, collection-level symlink adoption, project guidance,
and native/fallback provenance. The diagnostics project owns only its bounded
eligibility, attribution, materialization, and failure-rendering slice. PR #240
closed the tool-pack lifecycle/config cleanup; PR #242 closed provider-root
portability.

### Review and gate integrity

Keep the shared review lifecycle model intact:

1. Prevent stale phase bookkeeping before review dispatch.
2. Establish exact received-event identity.
3. Apply bookkeeping-only re-review suppression.
4. Add source-qualified receipt provenance.
5. Add closeout freshness and configured fail-closed behavior.
6. Advance autonomous completion and broader gate hardening only after those
   contracts are stable.

### Standalone gate contracts

gate-headless-no-yield and gate-structured-output-contract are existing bounded
projects. Improve their backlog links or estimates when needed, but do not
create replacement projects or external plans.

### Promoted legacy residuals

The legacy tree has been retired. Eighteen reviewed records now have canonical
`BL-260830-*` identities:

- Ready for bounded `oat-repo-improve` verification and planning when unowned:
  quick-mode resume routing, config unset, live brainstorm dogfood,
  persisted instruction-sync strategy, strict YAML skill validation, remote
  respond/summarize skills, and the provide-remote helper CLI wiring. (The
  project-split dogfood item was closed on 2026-09-02 after the operator ran
  both entry paths repeatedly with no defects.)
- Plan now when scope is coherent, even if execution is dependency-blocked:
  per-CLAUDE adoption opt-out (soft-depends on persisted strategy) and the
  documentation-aware discovery policy from #205. Record dependency links,
  readiness state, named unblock conditions, and revalidation triggers.
- Revalidate scope before plan generation where the work itself may have
  drifted: residual CLI P2/P3 cleanup and control-plane-backed
  plan/implementation reads. Unshipped dependencies alone do not make these
  items plan-ineligible.
- Exclude from implementation planning while labeled `needs-discussion`:
  bounded durable-reference reads, generic Jira refinement ownership,
  listProjects fast-path approval, dependency-intelligence ownership,
  same-target gate execution, and OAT memory-subsystem ownership.

## Shared-file coordination

- PR #244 owns the completed `.oat/repo/pjm/` and legacy reference-layout
  migration, removal of obsolete native-read Cursor skill mirrors, and the
  verifying issue-triage record.
- Active implementation projects own their project artifacts and implementation
  files. Avoid editing those project records here unless a broken repository
  link requires a minimal correction.
- The scope/provider and diagnostics projects should coordinate before changing
  pack-inventory, provider sync, or shared diagnostics surfaces.

## Changelog

| Date       | Update                                                                                                                                                                                                                                |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-09-02 | Program-intake triage created twelve `BL-260902-*` items and a Wave 4 plan index (12 plans, every plan with a landing-event table for the truthfulness merge and PR #190); the execution program now schedules 25 plans across W1–W5. |
| 2026-09-02 | Archived `BL-260830-live-dogfood-oat-project-split` as closed without implementation; the operator already exercised both split entry paths.                                                                                          |
| 2026-08-30 | Separated plan readiness from execution readiness for the upcoming improve pass and captured the missing skill/template enforcement in `BL-260830-distinguish-external-plan`.                                                         |
| 2026-08-30 | Promoted 18 reviewed legacy records into the canonical backlog, folded six terminal records into completed history, removed the parallel legacy tree, and separated improve-ready work from needs-discussion decisions.               |
| 2026-08-30 | Archived the PR #242 provider-root prerequisite, recorded active project ownership, moved legacy PJM cleanup into the direct administrative lane, and reserved future oat-repo-improve work for unowned well-scoped items.            |
| 2026-08-29 | Replaced the stale 2026-08-19 alignment with a post-PR #231 grouping and sequencing view.                                                                                                                                             |
