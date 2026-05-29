---
oat_generated: true
oat_generated_at: 2026-05-29
oat_review_scope: plan
oat_review_type: artifact
oat_review_invocation: manual
oat_project: .oat/projects/shared/pjm-init
---

# Artifact Review: plan

**Reviewed:** 2026-05-29
**Scope:** Quick-mode implementation plan readiness
**Files reviewed:** 5
**Commits:** N/A - artifact review

## Review Scope

**Project:** `.oat/projects/shared/pjm-init`
**Type:** artifact
**Scope:** plan
**Workflow mode:** quick

**Artifact Paths:**

- Discovery: `.oat/projects/shared/pjm-init/discovery.md`
- Design: `.oat/projects/shared/pjm-init/design.md`
- Plan: `.oat/projects/shared/pjm-init/plan.md`
- Implementation: `.oat/projects/shared/pjm-init/implementation.md`
- State: `.oat/projects/shared/pjm-init/state.md`

**Files Changed:**

- `.oat/projects/shared/pjm-init/plan.md`
- `.oat/projects/shared/pjm-init/discovery.md`

**Dispatch Profile Advisory:** The plan has no explicit per-phase override rows. That is normal; no dispatch-profile finding is raised.

## Summary

The plan captures the right overall product shape for `oat pjm init`, including the new templates, command surface, docs, release guardrail, and sequential implementation shape. It is not ready for implementation yet because a few commands/contracts are not executable as written and the implementation handoff artifact still contains scaffold-state drift.

## Findings

### Critical

None.

### Important

1. `initializeRepoReference` has an unresolved contract mismatch with reused backlog initialization.

   The plan requires `initializeRepoReference()` to return structured `created[]` and `skipped[]` status for the repo-reference scaffold, and the tests require idempotent second-run reporting. It also instructs the implementer to reuse `initializeBacklog()` rather than duplicate backlog scaffolding. The existing `initializeBacklog(backlogRoot)` returns `Promise<void>` and only writes files if missing, with no created/skipped status surface. As written, the implementer either has to duplicate backlog logic, silently omit backlog paths from JSON status, or refactor an out-of-scope helper.

   Evidence:
   - [plan.md](/Users/thomas.stang/.superconductor/worktrees/open-agent-toolkit/sc-trapped-cryostat-c5a8/.oat/projects/shared/pjm-init/plan.md:166) requires backlog files in the fresh-create test and idempotent reporting.
   - [plan.md](/Users/thomas.stang/.superconductor/worktrees/open-agent-toolkit/sc-trapped-cryostat-c5a8/.oat/projects/shared/pjm-init/plan.md:181) requires `initializeRepoReference()` to reuse `initializeBacklog()` and return `{ referenceRoot, created[], skipped[] }`.
   - [init.ts](/Users/thomas.stang/.superconductor/worktrees/open-agent-toolkit/sc-trapped-cryostat-c5a8/packages/cli/src/commands/backlog/init.ts:70) shows `initializeBacklog()` returns `Promise<void>`.

   Fix guidance: Update the plan with a concrete strategy. Either refactor `initializeBacklog()` to return status and update its tests, or keep it untouched and have `initializeRepoReference()` pre-detect the known backlog files before invoking `initializeBacklog()` so it can report deterministic backlog created/skipped paths without reimplementing file contents.

2. The docs index regeneration command writes the wrong target by default.

   Phase 3 says to regenerate `apps/oat-docs/index.md`, but the command is only `oat docs generate-index`. The CLI help shows the defaults are `--docs-dir docs` and `--output index.md`, so running the command from the repo root targets the wrong source directory and writes a root `index.md`, not the docs app index. The docs app scripts use the explicit command with `--docs-dir apps/oat-docs/docs --output apps/oat-docs/index.md`.

   Evidence:
   - [plan.md](/Users/thomas.stang/.superconductor/worktrees/open-agent-toolkit/sc-trapped-cryostat-c5a8/.oat/projects/shared/pjm-init/plan.md:283) gives the bare command.
   - [package.json](/Users/thomas.stang/.superconductor/worktrees/open-agent-toolkit/sc-trapped-cryostat-c5a8/apps/oat-docs/package.json:6) shows the explicit docs index command used by the docs app.

   Fix guidance: Replace the command with the local, branch-aware invocation:

   ```bash
   pnpm -w run cli -- docs generate-index --docs-dir apps/oat-docs/docs --output apps/oat-docs/index.md
   ```

3. `implementation.md` is still scaffolded and internally inconsistent, so the handoff is not clean.

   `state.md` says the project is plan-complete and implementation-ready, with first task `p01-t01`. The implementation tracker frontmatter agrees that `p01-t01` is next, but the body still contains template placeholders and contradictory progress: Phase 1 is marked `in_progress`, task `p01-t01` has the placeholder status list, and the implementation log says `p01-t01` is completed / `p01-t02` is in progress even though the progress table says 0/6 tasks are complete. This can mislead `oat-project-implement` handoff or human resumption even if the frontmatter is correct.

   Evidence:
   - [state.md](/Users/thomas.stang/.superconductor/worktrees/open-agent-toolkit/sc-trapped-cryostat-c5a8/.oat/projects/shared/pjm-init/state.md:34) declares plan-complete implementation readiness.
   - [implementation.md](/Users/thomas.stang/.superconductor/worktrees/open-agent-toolkit/sc-trapped-cryostat-c5a8/.oat/projects/shared/pjm-init/implementation.md:38) still has placeholder phase/task sections and `in_progress` text.
   - [implementation.md](/Users/thomas.stang/.superconductor/worktrees/open-agent-toolkit/sc-trapped-cryostat-c5a8/.oat/projects/shared/pjm-init/implementation.md:133) still has a template log claiming `p01-t01` completion.

   Fix guidance: Rewrite the tracker body to match the actual six-task plan before implementation starts: all phases pending, 0/6 complete, next task `p01-t01`, no completed task log entries, and phase/task headings matching the plan.

### Medium

1. A required verification command is not exact enough for a runnable plan.

   Phase 1 task 2 asks for `pnpm --filter @open-agent-toolkit/cli exec vitest run -t "bundle"` or "the `bundle-consistency.test.ts` path". The plan-writing contract asks for exact scoped runner invocations. The `-t "bundle"` filter is pattern-based and the "or" alternative leaves implementers to choose the actual command, which weakens the bundle-manifest guardrail this task is meant to enforce.

   Evidence:
   - [plan.md](/Users/thomas.stang/.superconductor/worktrees/open-agent-toolkit/sc-trapped-cryostat-c5a8/.oat/projects/shared/pjm-init/plan.md:134) contains the ambiguous command.

   Fix guidance: Replace it with the exact test path(s), for example:

   ```bash
   pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/init/tools/**/bundle-consistency.test.ts
   ```

   If shell glob behavior is undesirable, list the precise file path used in this repo.

### Minor

1. The Reviews section still contains template guidance and an outdated pass definition.

   The table works structurally, but the placeholder prose should be removed before handoff. The status definition says `passed` means no Critical/Important, while the current review workflow treats unresolved Medium findings as not passed for normal review completion.

   Evidence:
   - [plan.md](/Users/thomas.stang/.superconductor/worktrees/open-agent-toolkit/sc-trapped-cryostat-c5a8/.oat/projects/shared/pjm-init/plan.md:346) still contains template guidance.
   - [plan.md](/Users/thomas.stang/.superconductor/worktrees/open-agent-toolkit/sc-trapped-cryostat-c5a8/.oat/projects/shared/pjm-init/plan.md:365) has the stale `passed` definition.

   Fix guidance: Remove the template instruction lines and update `passed` to require no unresolved Critical, Important, or Medium findings.

## Spec/Design Alignment

### Requirements Coverage

| Requirement                                                                     | Status  | Notes                                                                        |
| ------------------------------------------------------------------------------- | ------- | ---------------------------------------------------------------------------- |
| Fresh repo creates current-state, roadmap, decision-record, and backlog surface | partial | Plan covers the files but needs an explicit backlog status strategy.         |
| Decision-record is first-class PM template                                      | covered | Source, manifest, bundle script, and tests are included.                     |
| Existing repos are safe / no silent overwrite                                   | covered | Plan consistently requires non-destructive writes and idempotence.           |
| Docs explain install-vs-init lifecycle                                          | partial | Docs scope is good, but the index regeneration command is wrong as written.  |
| Focused CLI tests and release validation                                        | partial | Broad gates are present; one bundle-consistency command needs exact scoping. |

### Extra Work

None beyond the accepted design direction. The plan's addition of `current-state.md` as a bundled template is aligned with discovery and design.

## Verification Commands

After applying review fixes, verify the artifacts with:

```bash
git diff -- .oat/projects/shared/pjm-init/plan.md .oat/projects/shared/pjm-init/implementation.md .oat/projects/shared/pjm-init/state.md
pnpm -w run cli -- docs generate-index --docs-dir apps/oat-docs/docs --output apps/oat-docs/index.md --help
```

## Recommended Next Step

Run `oat-project-review-receive` to convert these findings into plan/artifact fix tasks, then rerun `oat-project-review-provide artifact plan`.
