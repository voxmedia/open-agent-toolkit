---
oat_generated: true
oat_generated_at: 2026-05-29
oat_review_scope: plan
oat_review_type: artifact
oat_review_invocation: manual
oat_project: .oat/projects/shared/remote-review
---

# Artifact Review: plan

**Reviewed:** 2026-05-29
**Scope:** quick-mode implementation plan for `remote-review`
**Files reviewed:** 3
**Commits:** N/A (artifact review)

## Summary

The plan captures the intended work at the right granularity: 6 phases / 18 tasks, release validation is included, lockstep package bumps are explicit, and the declared parallel group is mostly defensible. However, the plan is not execution-ready yet because its focused vitest commands use paths that are wrong under `pnpm --filter ... exec`, and the implementation tracker remains the scaffold template even though `plan.md` / `state.md` mark the project ready for implementation. I found two Important issues, one Medium issue, and two Minor artifact-alignment issues.

Dispatch Profile advisory: the plan has no phase-level override rows. That is normal and was not treated as a gap.

## Findings

### Critical

None

### Important

- **Filtered vitest commands use repo-root paths and will not run from the filtered package cwd** (`.oat/projects/shared/remote-review/plan.md:103`)
  - Issue: The task verification commands consistently use `pnpm --filter @open-agent-toolkit/cli exec vitest run packages/cli/src/...`. `pnpm --filter @open-agent-toolkit/cli exec` runs with cwd set to `packages/cli`, so those paths resolve as `packages/cli/packages/cli/src/...` and the focused tests will not match the intended files. This affects the red/green/verify commands across Phase 1 and later phase test tasks, not only the example at line 103.
  - Fix: Use package-relative paths with filtered exec, for example `pnpm --filter @open-agent-toolkit/cli exec vitest run src/review-remote/marker-parser.test.ts`, or drop the filter and run from the repo root with `pnpm exec vitest run packages/cli/src/review-remote/marker-parser.test.ts`. Apply this consistently to every focused vitest command in the plan.
  - Requirement: Plan success criteria require runnable, task-scoped verification commands.

- **Implementation tracker is still a scaffold despite the plan being marked ready for implementation** (`.oat/projects/shared/remote-review/implementation.md:25`)
  - Issue: `plan.md` is complete and `state.md` points to `p01-t01`, but `implementation.md` still contains placeholder phase/task rows (`N`, `{Phase Name}`, `{Task Name}`, `0/{N}`). That violates the resumability contract quoted in the same file: phase/task statuses must stay consistent so restarts resume correctly.
  - Fix: Initialize `implementation.md` from the actual plan: 6 phases, 18 tasks, `oat_current_task_id: p01-t01`, p01 in progress, p02-p06 pending, and task rows matching the concrete task IDs/titles from `plan.md`.
  - Requirement: Quick-start handoff success criteria require `implementation.md` to be initialized for resumable execution.

### Medium

- **Parallel write-set analysis understates p02's actual package writes** (`.oat/projects/shared/remote-review/plan.md:58`)
  - Issue: The parallelism proof says p02 only writes the new ad-hoc skill file and phase-specific integration tests, but p02-t01 and p02-t02 create shared package helpers under `packages/cli/src/review-remote/` (`capability-probe.ts`, `worktree.ts`, and tests). This does not necessarily invalidate the declared p02/p03/p05 parallel group because p03 and p05 are still file-disjoint, but the written proof is inaccurate and could mislead future merge-conflict or ownership checks.
  - Fix: Update the p02 write-set description to include `packages/cli/src/review-remote/capability-probe.*` and `packages/cli/src/review-remote/worktree.*`, then restate why those files remain disjoint from p03 and p05.

### Minor

- **Discovery artifact frontmatter still says `in_progress` after the plan is complete** (`.oat/projects/shared/remote-review/discovery.md:2`)
  - Issue: `state.md` and `plan.md` treat the project as plan-complete, but `discovery.md` frontmatter still reports `oat_status: in_progress`. `oat project status` therefore reports discovery as in progress even though the state body says discovery is complete.
  - Suggestion: Update discovery frontmatter to `oat_status: complete` (and, if supported locally, `oat_ready_for: oat-project-quick-start` or the equivalent completed-boundary value) when processing this review.

- **Plan text says "Ready for code review and merge" before implementation has started** (`.oat/projects/shared/remote-review/plan.md:845`)
  - Issue: The Implementation Complete section is a plan summary, not current project status, but the sentence can be read as saying the project is already ready for merge.
  - Suggestion: Reword to "After these tasks complete, the project will be ready for code review and merge."

## Spec/Design Alignment

### Requirements Coverage

| Requirement / Decision                               | Status  | Notes                                                                                                                 |
| ---------------------------------------------------- | ------- | --------------------------------------------------------------------------------------------------------------------- |
| Ship only the two provide-remote skills              | Covered | p02 and p04 scope the ad-hoc and project rails; respond/summarize remain out of scope.                                |
| Hybrid read strategy with diff fallback              | Covered | p02 includes worktree lifecycle and p04 uses the shared flow. Verification commands need path fixes before execution. |
| Project rail read-only and GitHub as source of truth | Covered | p04 explicitly preserves no `plan.md` updates / no commits / no pushes on machine B.                                  |
| Re-review narrowing with stale-SHA guard             | Covered | p01-t04 includes the stale-SHA guard from the design review.                                                          |
| Receive-skill minor-default flip                     | Covered | p05 splits all four receive skills and requires version bumps.                                                        |
| Release/version guardrails                           | Covered | p06 includes backlog update, lockstep public package bumps, and `pnpm release:validate`.                              |
| Resumable implementation handoff                     | Partial | `plan.md` is detailed, but `implementation.md` is not initialized to match it.                                        |

### Extra Work (not in requirements)

None beyond acceptable planning detail. The shared helper layer under `packages/cli/src/review-remote/` is justified by the two new skills and their overlapping GitHub review mechanics.

## Verification Commands

Artifact review only; no implementation tests were run.

Commands used for review context:

```bash
git status --short
oat project status --project-path .oat/projects/shared/remote-review --json
pnpm --filter @open-agent-toolkit/cli exec pwd
```

## Recommended Next Step

Run `oat-project-review-receive` to convert the plan findings into fix tasks. The minimum fix before implementation is to correct the focused test commands and initialize `implementation.md` from the concrete plan.
