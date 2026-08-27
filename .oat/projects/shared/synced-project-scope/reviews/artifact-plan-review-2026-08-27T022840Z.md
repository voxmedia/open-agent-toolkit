---
oat_generated: true
oat_generated_at: 2026-08-27T02:28:40Z
oat_review_scope: plan
oat_review_type: artifact
oat_review_invocation: gate
oat_project: .oat/projects/shared/synced-project-scope
oat_gate_run_id: 205f8340-0b9a-4e09-a815-c4372f4c4739
oat_gate_target: cursor-gpt-5-6-sol-xhigh
oat_gate_runtime: cursor
oat_invocation_model: gpt-5.6-sol-xhigh
oat_invocation_reasoning_effort: provider-default
oat_invocation_source: exec-target-config
---

# Artifact Review: plan

**Reviewed:** 2026-08-27T02:28:40Z
**Scope:** Readiness and upstream alignment of the spec-driven implementation plan
**Files reviewed:** 3 scoped artifacts (`plan.md`, `spec.md`, `design.md`)
**Commits:** N/A (artifact review)

## Summary

The plan has complete phase/task structure, stable IDs, broad requirements coverage, and concrete verification for the core ref-sync behavior. It is not ready to implement yet: the completion-skill task does not cover the early scope classification that currently treats every non-`shared` project as local, and two workflow tasks can review or produce changes without a reliable durability path. These Critical and Important findings are blocking.

Findings: 1 critical, 2 important, 2 medium, 0 minor

## Findings

### Critical

- **Completion integration does not reclassify `synced` projects before shared-only gates** (`.oat/projects/shared/synced-project-scope/plan.md:1508`)
  - Issue: p04-t05 limits the `oat-project-complete` rewrite to steps 7–11.5. The current skill classifies only paths under `projects.root` as shared in Step 1 and then treats every `IS_SHARED_PROJECT="false"` project as local in earlier completion decisions. That classification controls whether archive is offered, whether durable recap/export behavior is eligible, whether `--archived` is passed, and whether the archive step runs. Updating only the later sequence does not guarantee FR8's P0 completion parity for `synced`, especially when `workflow.archiveOnComplete` is unset. The existing contract test also pins the shared-only archive condition and is absent from the task's file and verification surfaces.
  - Fix: Expand p04-t05 to resolve `PROJECT_SCOPE` once in Step 1 and distinguish `shared`, `synced`, and `local`. Audit and update every earlier/later `IS_SHARED_PROJECT` condition so `shared` and `synced` receive the intended durable/archive behavior while `local` remains unchanged. Add `packages/cli/src/commands/init/tools/shared/review-skill-contracts.test.ts` to the task and run that targeted test.
  - Requirement: FR8

### Important

- **Review-provide changes omit the committed-baseline check for nested worktrees** (`.oat/projects/shared/synced-project-scope/plan.md:1411`)
  - Issue: p04-t02 changes only Step 9.5 of `oat-project-review-provide`. That skill's Step 1.6 must reject uncommitted core artifacts before review, but a parent-worktree status check cannot see changes inside the ignored nested `synced` checkout. A gate could therefore review and then push a half-tracked plan together with its review artifact, defeating the baseline invariant that review-provide explicitly enforces.
  - Fix: Extend p04-t02 to make Step 1.6 scope-aware. For `synced`, inspect the nested repository with `git -C "$PROJECT_PATH" status` over the core artifacts and stop on pending changes; handle an absent checkout with an explicit pull/materialization route before artifact validation. Add a skill-contract test for dirty synced baseline rejection.

- **Terminal verification tasks can fix files but cannot commit those fixes** (`.oat/projects/shared/synced-project-scope/plan.md:1645`)
  - Issue: p04-t09 instructs the implementer to fix failing gates, but its declared and committed file surface contains only `implementation.md`. p04-t10 likewise requires snippet defects to be fixed in the same task, then stages only `implementation.md` at line 1705. Following either task literally can leave required code/skill fixes uncommitted while the evidence commit succeeds, breaking task atomicity and the clean handoff expected after the final phase.
  - Fix: Define a durable correction path in both tasks: either create separately scoped fix commits before the evidence commit, or stage exact corrected paths together with the evidence while preserving skill-version and formatting checks. Require a final clean-status assertion before each task is marked complete.

### Medium

- **Declared files are omitted from task formatting or commit commands** (`.oat/projects/shared/synced-project-scope/plan.md:795`)
  - Issue: Several concrete task commands do not satisfy the plan's own all-files hygiene contract: p02-t05 omits the created `resolve-target.test.ts` from formatting; p02-t07 says the existing `list.test.ts` may be modified but omits it from formatting and commit; p04-t06 omits the created JSON inventory from formatting; and p04-t08 has no file-scoped format step for the edited package manifests.
  - Fix: Add every declared created/modified file to the corresponding `oxfmt --write` invocation and exact commit pathspec. Add a package-manifest format step to p04-t08 after lockfile generation.

- **The public `ProjectSummary` change omits its package README contract** (`.oat/projects/shared/synced-project-scope/plan.md:852`)
  - Issue: p02-t07 adds `ProjectSummary.scope` to the public control-plane type but does not update `packages/control-plane/README.md`. The package instructions require public API changes to be reflected in that README, and the omission is not covered by the later docs task.
  - Fix: Add `packages/control-plane/README.md` to p02-t07, document the additive `scope` field, format it, and include it in the task commit.

### Minor

None

## Requirements/Design Alignment

**Evidence sources used:** `plan.md`, `spec.md`, `design.md`, `discovery.md`, `implementation.md`, and `state.md`. The scoped review target was `plan.md`; the remaining artifacts were used as upstream and lifecycle context.

### Requirements Coverage

| Requirement | Plan status | Notes                                                                                                         |
| ----------- | ----------- | ------------------------------------------------------------------------------------------------------------- |
| FR1–FR5     | Covered     | Scope, sync engine, and record behavior map to p01/p02 with unit and real-git integration tests.              |
| FR6         | Partial     | The skill sweep is broad, but review-provide's committed-baseline behavior is not made nested-worktree-aware. |
| FR7         | Covered     | Rendering, ref-based computation, refresh, and PR-skill sequencing are assigned and tested.                   |
| FR8         | Partial     | CLI archive work is covered, but the completion skill's early shared/local classification is not.             |
| FR9–FR15    | Covered     | Gitignore, worktrees, prune, migration, doctor, docs, and gitattributes all map to explicit tasks.            |
| NFR1–NFR5   | Covered     | Compatibility, host spike, credential isolation, mutation safety, and resumability have concrete checks.      |
| NFR6        | Partial     | Release gates exist, but formatting/commit omissions can leave final corrective work outside task commits.    |

### Extra Work (not in declared requirements)

None. Listing `local` projects is an explicit, accepted additive requirement in the current spec.

## Verification Commands

Run these after revising the plan:

```bash
pnpm exec oxfmt --check .oat/projects/shared/synced-project-scope/plan.md
rg -n "PROJECT_SCOPE|review-skill-contracts.test.ts|resolve-target.test.ts|list.test.ts|synced-bookkeeping-sites.json|git status --porcelain" .oat/projects/shared/synced-project-scope/plan.md
```

## Recommended Next Step

Run the `oat-project-review-receive` skill to convert the findings into plan tasks.
