---
oat_generated: true
oat_generated_at: 2026-08-27T01:42:20Z
oat_review_scope: plan
oat_review_type: artifact
oat_review_invocation: gate
oat_project: .oat/projects/shared/synced-project-scope
oat_gate_headless: true
oat_gate_run_id: e89d09d1-8211-4f8a-b156-efa831e2d40f
oat_gate_target: cursor-gpt-5-6-sol-xhigh
oat_gate_runtime: cursor
oat_invocation_model: gpt-5.6-sol-xhigh
oat_invocation_reasoning_effort: provider-default
oat_invocation_source: exec-target-config
---

# Artifact Review: plan

**Reviewed:** 2026-08-27T01:42:20Z
**Scope:** Implementation plan readiness and alignment with the spec and design
**Files reviewed:** 3
**Commits:** Not applicable (artifact review)
**Gate route:** inline (runtime=cursor, cliRoot=/Users/tstang/Code/open-agent-toolkit)
**Managed policy audit:** Dispatch: scope=plan action=review role=reviewer producer=unknown provenance=unknown model_axis=selected:gpt-5.6-sol-high effort_axis=not-applicable dispatch_policy=high dispatch_ceiling=gpt-5.6-sol-high target=oat-reviewer-gpt-5-6-sol-high

## Summary

The plan has strong task decomposition and substantially complete requirement coverage, but it is not ready for implementation. Two P0 safety/lifecycle gaps are blocking: the allowlisted parent-branch commit helper is not required or tested to exclude pre-staged unrelated changes, and the skill sweep plus validator omit the review-provide bookkeeping path. Three additional upstream-alignment and failure-path gaps should be resolved before implementation.

Findings: 2 critical, 3 important, 1 medium, 0 minor

## Findings

### Critical

- **Parent-branch commit safety does not cover pre-staged unrelated changes** (`.oat/projects/shared/synced-project-scope/plan.md:476`)
  - Issue: p01-t09 tests an unrelated dirty file but not an unrelated file that is already staged. The plan also does not explicitly require the commit itself to be pathspec-limited or use an isolated index. An implementation that runs `git add -- <allowlisted paths>` followed by an ordinary `git commit` would include every pre-existing staged change, violating the helper's "only allowlisted paths" contract and NFR4. The existing scaffold helper's pathspec-limited commit behavior is load-bearing and must be preserved by the extraction.
  - Fix: Require `commitRecordChange` to commit only the validated pathspecs (for example, the existing `git commit ... -- <pathspecs>` semantics or an isolated index). Add an integration test that pre-stages an unrelated file, invokes the helper, verifies the new commit contains only allowlisted paths, and verifies the unrelated change remains staged.
  - Requirement: NFR4

- **The lifecycle sweep and validator leave review-provide bookkeeping unsafe for `synced` projects** (`.oat/projects/shared/synced-project-scope/plan.md:1396`)
  - Issue: p04-t01 through p04-t05 do not include `.agents/skills/oat-project-review-provide/SKILL.md`, even though its required Step 9.5 writes a review artifact, updates `plan.md`, and commits both. That branch commit cannot persist files inside a `synced` nested worktree. The p04-t06 validator cannot catch this omission because it rejects only literal `.oat/projects/synced/` pathspecs, while lifecycle skills use variables such as `$PROJECT_PATH` or describe the commit procedurally.
  - Fix: Add `oat-project-review-provide` to the bookkeeping sweep, apply the canonical scope guard and `oat project push`, and bump its version. Expand the inventory/validator tests to reject an unguarded project-artifact commit expressed through `$PROJECT_PATH` or procedural bookkeeping instructions, including a fixture modeled on review-provide.
  - Requirement: FR6

### Important

- **Prune can bypass the open-PR guard when an active checkout is absent** (`.oat/projects/shared/synced-project-scope/plan.md:1126`)
  - Issue: p03-t05 reads `state.md` only from the checkout or an archived snapshot. An active synced project may legitimately have a record and remote ref but no checkout in a fresh worktree or clone. In that state, the command cannot see `oat_pr_status: open` and may delete the retained ref without `--force`, breaking pinned links and violating FR11.
  - Fix: Fetch the project ref and read `state.md` from the ref when the checkout is absent (or materialize through a non-mutating equivalent) before authorizing prune. Add a test with an active record, absent checkout, and open-PR state on the ref that refuses without `--force`.
  - Requirement: FR11

- **Migration rollback is not retryable under its own preconditions** (`.oat/projects/shared/synced-project-scope/plan.md:1160`)
  - Issue: The plan tests failure during the ref push but not failure during the parent-branch mutation. The referenced design says a step-5 failure leaves the pushed ref and destination checkout for reuse, while migration preconditions reject any existing ref or destination. A retry after that failure therefore cannot proceed as documented.
  - Fix: Choose one coherent recovery contract: either fully remove the destination worktree/ref when parent-branch commit fails, or recognize and safely resume the exact migration-created ref/checkout. Add a failure-injection test at `commitRecordChange` and prove the source/index are restored and a retry succeeds.
  - Requirement: FR12

- **Listing `local` projects conflicts with the specification's unchanged-scope boundary** (`.oat/projects/shared/synced-project-scope/plan.md:853`)
  - Issue: p02-t07 deliberately makes previously unlisted `local` projects appear in `oat project list`, while the specification names changing how `local` projects are listed as a non-goal and requires existing `local` behavior to remain unchanged. The design acknowledges the behavior as additive, but the upstream requirement was not revised.
  - Fix: Resolve the product decision before implementation. Either keep `local` listing behavior unchanged and scope enumeration to `shared` plus `synced`, or explicitly align the spec's non-goal/NFR1 acceptance criteria with the additive listing behavior and retain the planned tests.
  - Requirement: NFR1

### Medium

- **The Reviews ledger contains a dangling unresolved event** (`.oat/projects/shared/synced-project-scope/plan.md:1715`)
  - Issue: The `received` row points to `reviews/artifact-plan-review-2026-08-27T013313Z.md`, which is absent, while the same timestamped artifact is present under `reviews/archived/` and already has a `fixes_completed` row. This leaves the canonical plan ledger claiming an unresolved review that cannot be received.
  - Fix: Preserve the append-only event history, but reconcile the dangling row to a terminal status and valid archived provenance through the review-receive bookkeeping path. Verify no `received` row points to a missing active artifact.

### Minor

None

## Requirements/Design Alignment

**Evidence sources used:** `plan.md`, `spec.md`, and `design.md`; `state.md`, `discovery.md`, and `implementation.md` were consulted for lifecycle context. The current canonical skill sources were inspected to verify the review-provide omission and existing pathspec-limited scaffold commit behavior.

### Requirements Coverage

| Requirement group | Status  | Notes                                                                |
| ----------------- | ------- | -------------------------------------------------------------------- |
| FR1-FR5, FR7-FR10 | planned | Bounded implementation and verification tasks are present.           |
| FR6               | partial | Review-provide bookkeeping is omitted and the validator misses it.   |
| FR11              | partial | The open-PR guard does not cover an absent active checkout.          |
| FR12              | partial | Parent-branch failure recovery contradicts migration preconditions.  |
| FR13-FR15         | planned | Doctor, documentation, and gitattributes work is represented.        |
| NFR1              | partial | Planned local-project listing conflicts with the unchanged boundary. |
| NFR2-NFR3         | planned | External host verification and credential constraints are covered.   |
| NFR4              | partial | Pre-staged unrelated changes are not covered by the safety test.     |
| NFR5-NFR6         | planned | Rebase recovery and release gates are represented.                   |

### Extra Work (not in declared requirements)

- Adding previously absent `local` projects to `oat project list` is outside the current specification boundary unless the spec is explicitly aligned.

## Verification Commands

After revising the artifacts:

```bash
pnpm exec oxfmt --check .oat/projects/shared/synced-project-scope/plan.md .oat/projects/shared/synced-project-scope/spec.md .oat/projects/shared/synced-project-scope/design.md
pnpm exec oxfmt --check .oat/projects/shared/synced-project-scope/reviews/artifact-plan-review-2026-08-27T014220Z.md
```

Re-run the plan artifact gate review and confirm the revised tasks explicitly cover pre-staged parent-index isolation, review-provide sync, absent-checkout prune protection, and retryable migration recovery.

## Recommended Next Step

Run the `oat-project-review-receive` skill to convert findings into plan tasks.
