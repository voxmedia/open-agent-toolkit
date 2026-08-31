---
oat_generated: true
oat_external_plan_index: false
oat_execution_program: true
oat_program_supersedes: .oat/repo/reference/external-plans/2026-08-19-execution-program.md
oat_program_indexes:
  - .oat/repo/reference/external-plans/2026-08-30-backlog-review-wave-1-plan-index.md
  - .oat/repo/reference/external-plans/2026-08-30-backlog-review-wave-2-plan-index.md
  - .oat/repo/reference/external-plans/2026-08-30-backlog-review-wave-3-plan-index.md
created: '2026-08-31T05:24:43Z'
---

# Execution Program: 2026-08-31 (revalidated backlog-review implementation corpus)

This artifact is the durable program map for the external-plan corpus listed in
`oat_program_indexes`. It records wave composition and status. It is not an
executable plan and is not an `oat-project-import-plan` target—each wave runs as
a wrapper OAT project via `oat-wave-execute`, and each plan's implementation
contract remains its immutable plan file.

This program supersedes the composition map in
[the 2026-08-19 execution program](./2026-08-19-execution-program.md), whose four
implementation waves are already merged. It does not absorb or resolve that
program's deferred human-gated completion tails; those remain owned by the
predecessor record and the operator.

## Status Ledger

Execution approval: awaiting operator composition approval. No wave execution,
wrapper project, implementation branch, or implementation PR has started.

| Wave | Theme                                | Lanes | Status   | Record                                                        |
| ---- | ------------------------------------ | ----- | -------- | ------------------------------------------------------------- |
| W1   | CLI resolution and asset correctness | 4     | composed | Awaiting operator composition approval; no execution started. |
| W2   | Skill contract truthfulness          | 4     | composed | Awaiting operator composition approval; no execution started. |
| W3   | Workflow durability and containment  | 3     | composed | Awaiting operator composition approval; no execution started. |
| W4   | Delivered-project follow-ups         | 2     | composed | Awaiting operator composition approval; no execution started. |

## Wave Table (coverage: 13 plans = 13 index rows; verified 2026-08-31)

| Plan                                                                                                           | Index                                                            | Wave | Ordering notes                                            | Status  |
| -------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- | ---- | --------------------------------------------------------- | ------- |
| [Use configured docs index paths](./2026-08-30-use-configured-docs-index-paths.md)                             | [Wave 1 index](./2026-08-30-backlog-review-wave-1-plan-index.md) | W1   | parallel group 1                                          | pending |
| [Emit dispatch stamp with resolver JSON](./2026-08-30-emit-dispatch-stamp-with-resolver-json.md)               | [Wave 2 index](./2026-08-30-backlog-review-wave-2-plan-index.md) | W1   | parallel group 1; issue #211 is soft                      | pending |
| [Validate assets bundle structure](./2026-08-30-validate-assets-bundle-structure.md)                           | [Wave 1 index](./2026-08-30-backlog-review-wave-1-plan-index.md) | W1   | parallel group 1; merge before asset-error successor      | pending |
| [Make asset errors override-aware](./2026-08-30-make-assets-errors-override-aware.md)                          | [Wave 1 index](./2026-08-30-backlog-review-wave-1-plan-index.md) | W1   | group 2 after dependency revalidation sets the plan READY | pending |
| [Repair bundled skill contract drift](./2026-08-30-repair-bundled-skill-contract-drift.md)                     | [Wave 1 index](./2026-08-30-backlog-review-wave-1-plan-index.md) | W2   | group 1; merge-first contract baseline                    | pending |
| [Harden codex-skill anaphora guard](./2026-08-30-harden-codex-skill-anaphora-guard.md)                         | [Wave 3 index](./2026-08-30-backlog-review-wave-3-plan-index.md) | W2   | group 2 after bundled-skill repair revalidation           | pending |
| [Guard docs-app mirrors of skill prose](./2026-08-30-guard-docs-app-mirrors-of-skill-prose.md)                 | [Wave 3 index](./2026-08-30-backlog-review-wave-3-plan-index.md) | W2   | group 2 after bundled-skill repair revalidation           | pending |
| [Require named lifecycle skills to be loaded](./2026-08-30-require-named-lifecycle-skills-to-be-loaded.md)     | [Wave 2 index](./2026-08-30-backlog-review-wave-2-plan-index.md) | W2   | group 2; revalidate if draft PR #190 changes first        | pending |
| [Require repo-wide call-site sweeps](./2026-08-30-require-repo-wide-call-site-sweeps.md)                       | [Wave 3 index](./2026-08-30-backlog-review-wave-3-plan-index.md) | W3   | parallel group 1                                          | pending |
| [Journal deterministic smoke worktrees](./2026-08-30-journal-deterministic-smoke-worktrees-before-creation.md) | [Wave 3 index](./2026-08-30-backlog-review-wave-3-plan-index.md) | W3   | parallel group 1; dedicated safety review                 | pending |
| [Require executable backstops](./2026-08-30-require-executable-backstops-for-contract-claims.md)               | [Wave 3 index](./2026-08-30-backlog-review-wave-3-plan-index.md) | W3   | group 2 after concrete guard examples and call-site sweep | pending |
| [Disable configured gates per project](./2026-08-30-disable-configured-gates-per-project.md)                   | [Wave 2 index](./2026-08-30-backlog-review-wave-2-plan-index.md) | W4   | parallel group; preserve PR #246 contracts                | pending |
| [Warn on non-sync manifest restamps](./2026-08-30-warn-on-non-sync-manifest-restamps.md)                       | [Wave 1 index](./2026-08-30-backlog-review-wave-1-plan-index.md) | W4   | parallel group; preserve PR #249 diagnostics              | pending |

## Program-wide integration rules

- Assume a concurrency ceiling of three implementation lanes. A numbered plan
  or row does not imply serial execution unless an ordering note says so.
- Create one wrapper OAT project and one integration PR per wave. Keep lane
  commits reviewable inside the wrapper branch and record all reconciliations in
  its orchestration log.
- Public package versions and `pnpm-lock.yaml` are fan-in surfaces. Parallel
  lanes must not retain competing version bumps; choose one lockstep version
  above freshly fetched `origin/main` during integration.
- Run each lane's focused gates before fan-in, then run the repository's full
  definition-of-done gate sequence on the integrated wave branch. Fetch current
  `origin/main` immediately before release-version validation.
- Revalidate every pending wave when main materially changes. Specifically
  re-sweep W1 dispatch behavior if issue #211 changes and W2 lifecycle loading
  if draft PR #190 changes before their lanes start.
- Stop at the operator checkpoint below before creating the W1 wrapper project
  or dispatching any implementation lane.

## Wave 1: CLI resolution and asset correctness

- **Parallel group 1:** Use configured docs index paths; emit the dispatch stamp
  with resolver JSON; validate asset-bundle structure.
- **Group 2 status gate:** After structural asset validation completes and
  merges into the wave branch, revalidate the successor against that exact
  tree. Update or supersede its external plan and set `oat_execution_status` to
  `READY` only when the hard-dependency evidence and focused asset tests pass.
  Do not import or dispatch the successor while its source plan remains
  `BLOCKED`. Then implement the override-aware remedies and revalidate every
  pre-existing asset failure family plus the new structural branch.
- **Cross-wave prerequisites:** None beyond a fresh main baseline and operator
  approval. Issue #211 is a soft revalidation trigger, not an execution block.
- **Composition rationale:** The three first-group lanes are bounded CLI/runtime
  fixes with disjoint primary write surfaces. The fourth is a true ordered
  successor to the asset validator and remains in the same wrapper so its error
  matrix is tested against the exact delivered branch.

## Wave 2: Skill contract truthfulness

- **Group 1:** Repair the verified bundled-skill contract drift and merge it
  into the wave branch first.
- **Parallel group 2:** Harden the codex-skill anaphora guard; guard docs-app
  mirrors of contract-tested skill prose; require lifecycle orchestrators to
  load every named execution skill.
- **Cross-wave prerequisites:** W1 merged. Revalidate the lifecycle corpus if
  draft PR #190 changes before group 2 starts.
- **Composition rationale:** Group 1 establishes the corrected canonical prose
  baseline. The three guard/loading lanes can then run as peers against that
  baseline while coordinating canonical-skill versions, docs mirrors, shared
  contract tests, and release files once at fan-in.

## Wave 3: Workflow durability and containment

- **Parallel group 1:** Require repo-wide call-site sweeps for cross-cutting
  options; journal deterministic smoke worktrees before creation.
- **Group 2:** Require executable backstops for standing contract claims after
  the call-site sweep and W2 guard work provide current concrete examples.
- **Cross-wave prerequisites:** W2 merged. The smoke lane receives a dedicated
  ownership and deletion-safety review before integration.
- **Composition rationale:** The first two lanes have write-disjoint workflow
  policy and smoke-tooling surfaces. The authoring-policy lane is not product-
  blocked by them, but ordering it second reduces prose churn and lets its
  examples cite freshly delivered executable contracts.

## Wave 4: Delivered-project follow-ups

- **Parallel group:** Disable configured lifecycle gates per project; warn on
  every non-sync manifest version restamp.
- **Cross-wave prerequisites:** W3 merged. Revalidate both plans against live
  gate/status surfaces before implementation because they follow freshly merged
  PRs #246 and #249.
- **Composition rationale:** Both plans became ready only after their owning
  projects merged. They are independent CLI follow-ups on separate gate and
  status surfaces, but both are kept in the final wave to minimize immediate
  churn around newly delivered contracts and to reconcile release files once.

## Operator checkpoint

The four-wave composition is ready for review. Before W1 execution, the
operator must explicitly approve this program, its ordering, and its
concurrency assumptions. Approval to merge the program artifact does not by
itself authorize creation of a wave wrapper project, implementation dispatch,
or wave PR mutation.
