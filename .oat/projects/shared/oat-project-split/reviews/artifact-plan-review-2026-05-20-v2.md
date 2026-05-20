---
oat_generated: true
oat_generated_at: 2026-05-20
oat_review_scope: plan
oat_review_type: artifact
oat_review_invocation: manual
oat_project: .oat/projects/shared/oat-project-split
---

# Artifact Re-Review: plan

**Reviewed:** 2026-05-20
**Scope:** `artifact plan` re-review
**Files reviewed:** 4
**Commits:** N/A (artifact review)

## Summary

The plan fixes several issues from the first artifact review: it adds an explicit CLI-facing split surface, removes the child revalidation flag from the shared discovery template, and corrects most of the stale path references. The plan is still not ready for implementation because the new CLI task is scheduled before the functions it is supposed to invoke, the CLI surface is not registered in the project command tree, and the state-validation tasks now point at existing files that do not own the validation responsibilities described by the plan.

## Findings

### Critical

None.

### Important

1. **`p01-t06` creates a CLI surface before the implementation it adapts exists, and it omits command registration.** The new `p01-t06` task is in Phase 1 and is described as an unblocker for p02/p03 ([plan.md:59](../plan.md), [plan.md:61](../plan.md), [plan.md:303](../plan.md)). But its Step 2 says `oat project split run` should wire over `write-parent.ts`, `seed-children.ts`, `finalize.ts`, and `resume.ts` ([plan.md:358](../plan.md)), while those functions are not created until p02-t02 through p02-t05 ([plan.md:396](../plan.md), [plan.md:425](../plan.md), [plan.md:449](../plan.md), [plan.md:467](../plan.md)). That makes Phase 1 unable to go green before Phase 2, which breaks the phase dependency model and the declared p02/p03 parallelism. Separately, the task creates `packages/cli/src/commands/project/split/index.ts` but does not modify `packages/cli/src/commands/project/index.ts`; the current project command only registers archive, complete-state, list, new, open, pause, set-mode, status, and validate-plan ([index.ts:13](../../../../../packages/cli/src/commands/project/index.ts), [index.ts:24](../../../../../packages/cli/src/commands/project/index.ts)). Fix by either moving the implementation helpers into Phase 1 before `run`, or splitting `p01-t06` into an early registered CLI shell for `evaluate-signals` / `validate-plan` plus a later p02 task that wires `run` after the writer/seeder/finalize/resume helpers exist. Include `packages/cli/src/commands/project/index.ts` in the registration task.

2. **The state-validation tasks still target files that do not own general state validation.** The rework changed p01-t01/p01-t02 away from non-existent `packages/cli/src/state/schema.ts`, but now assigns state-schema and child-linkage validation to `packages/cli/src/commands/shared/frontmatter.ts` and `packages/cli/src/commands/project/complete-state/state-utils.ts` ([plan.md:68](../plan.md), [plan.md:69](../plan.md), [plan.md:120](../plan.md), [plan.md:121](../plan.md)). In the current repo, `frontmatter.ts` is a generic field reader ([frontmatter.ts:4](../../../../../packages/cli/src/commands/shared/frontmatter.ts), [frontmatter.ts:19](../../../../../packages/cli/src/commands/shared/frontmatter.ts)), and `complete-state/state-utils.ts` renders a completed project lifecycle shape ([state-utils.ts:82](../../../../../packages/cli/src/commands/project/complete-state/state-utils.ts), [state-utils.ts:129](../../../../../packages/cli/src/commands/project/complete-state/state-utils.ts)); neither is a general project-state validator or a child discovery completion gate. Implementing the plan literally would either put cross-project validation into unrelated helpers or leave it unused. Add a dedicated validation surface, or identify the actual lifecycle command(s) that must enforce `oat_kind`, `decomposition`, `oat_parent` / `oat_siblings` / `oat_depends_on`, and `oat_inherited_context_revalidated`, then update the task file lists and verification commands accordingly.

3. **One stale non-existent path remains in the list/dashboard integration test task.** Most Phase 3 paths were corrected to the current command layout, but p03-t03 still creates `packages/cli/src/projects/list/__tests__/integration.test.ts` ([plan.md:567](../plan.md), [plan.md:571](../plan.md)). The repo uses `packages/cli/src/commands/project/list.ts` and `packages/cli/src/commands/project/list.test.ts` for this command surface, not `packages/cli/src/projects/list/`. Update p03-t03 to a real test path under `packages/cli/src/commands/project/` or another existing test convention before implementation starts.

### Medium

None.

### Minor

None.

## Prior Findings Disposition

| Prior finding                                          | Status   | Notes                                                                                                                                                           |
| ------------------------------------------------------ | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Missing production invocation path for split helpers   | Partial  | `p01-t06` adds a CLI-facing plan, but the `run` subcommand is scheduled before its helpers exist and command registration is missing.                           |
| Speculative / wrong file paths                         | Partial  | Several paths are corrected, but p01-t01/p01-t02 now target semantically wrong validation files and p03-t03 still uses a non-existent `src/projects/list` path. |
| Revalidation flag leaks into global discovery template | Resolved | p01-t02 now explicitly leaves `.oat/templates/discovery.md` unchanged and p02-t03 writes the flag only onto seeded child discoveries.                           |

## Spec/Design Alignment

### Requirements Coverage

| Requirement                                                               | Status  | Notes                                                                                                                           |
| ------------------------------------------------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Standalone `oat-project-split` skill invoked from discover and brainstorm | Partial | The CLI surface is planned, but phase ordering and command registration still prevent a usable invocation contract.             |
| Coordination parent with no executable-phase files                        | Covered | Parent file invariant remains explicitly tested in p02-t02/p02-t06.                                                             |
| Seeded child discovery with mandatory inherited-context revalidation      | Partial | Template leak is fixed, but the plan still needs a real enforcement surface for the revalidation gate.                          |
| Parent/listing/dashboard behavior                                         | Partial | Main list/dashboard paths are corrected, but the p03-t03 integration-test path still points outside the current command layout. |

### Extra Work

None beyond scope.

## Verification Commands

Commands run during re-review:

```bash
git status --short
pnpm run cli -- project validate-plan --project-path .oat/projects/shared/oat-project-split
```

Result: working tree was clean before this re-review artifact was written, and plan parallelism validation passed.

Suggested verification after fixes:

```bash
pnpm run cli -- project validate-plan --project-path .oat/projects/shared/oat-project-split
pnpm lint && pnpm type-check
```

## Recommended Next Step

Run `oat-project-review-receive` again to convert these remaining Important findings into plan fixes before starting `oat-project-implement`.
