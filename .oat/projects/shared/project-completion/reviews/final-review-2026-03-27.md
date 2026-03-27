---
oat_generated: true
oat_generated_at: 2026-03-27
oat_review_scope: final
oat_review_type: code
oat_review_invocation: manual
oat_project: .oat/projects/shared/project-completion
---

# Code Review: final

**Reviewed:** 2026-03-27
**Scope:** Final branch review for `00ceeb361fcc518e44d9ca447839a3fb6a4e2e16..HEAD`
**Files reviewed:** 27
**Commits:** `00ceeb361fcc518e44d9ca447839a3fb6a4e2e16..HEAD`

## Summary

The shipped CLI/runtime changes are in good shape: the targeted CLI tests passed and `packages/cli` type-checks cleanly. The remaining problems are in the new revision/re-review workflow contract and in the generated project bookkeeping artifacts, where the branch currently records contradictory state.

No deferred-findings ledger was present in `implementation.md` or prior review artifacts, so there was nothing to disposition for carry-forward debt.

## Findings

### Critical

None.

### Important

1. `I1` Inline revise flow never advances the implementation cursor to the first revision task.
   - Location: `.agents/skills/oat-project-revise/SKILL.md:200-223`
   - The inline path adds a "Revision Received" note and updates `state.md`, but it never updates `implementation.md` frontmatter `oat_current_task_id`.
   - `oat-project-implement` explicitly resumes from `implementation.md` (`.agents/skills/oat-project-implement/SKILL.md:198-206`), so after an inline `oat-project-revise` run it can still resume from `null` or an older task instead of `prevN-t01`.
   - Fix guidance: when creating inline revision tasks, update both `implementation.md` and `state.md` to point at the first new revision task.

2. `I2` Re-review task numbering does not support the new `p-revN` / `prevN-tNN` naming scheme.
   - Location: `.agents/skills/oat-project-review-receive/SKILL.md:262-275`
   - The new revise flow introduces revision phases named `p-revN` with task IDs `prevN-tNN`, but review-receive still finds existing tasks with `^### Task ${TARGET_PHASE}-t[0-9]+:`.
   - For a revision-phase review like `p-rev1`, that regex looks for `p-rev1-tNN` and will never match the actual `prev1-tNN` tasks, so fix-task numbering/appending for revision re-reviews will break.
   - Fix guidance: either normalize revision scopes to the `prevN` task prefix in review-receive, or change the revision task naming so phase and task prefixes stay mechanically aligned.

### Medium

1. `M1` `state.md` still advertises a pre-implementation project state even though implementation is complete.
   - Location: `.oat/projects/shared/project-completion/state.md:23-53`
   - The frontmatter now says `oat_phase: implement`, but the body still says `**Status:** Plan Complete`, `Planning - Ready for implementation`, `Implementation: Not yet created`, and `Start implementation with oat-project-implement`.
   - That contradicts the completed `implementation.md` and the branch commit history, and it leaves the human-facing project state unreliable.
   - Fix guidance: refresh the markdown body whenever implementation bookkeeping moves the project out of planning so the narrative state stays aligned with frontmatter.

2. `M2` `implementation.md` progress bookkeeping is internally inconsistent after the final tracking update.
   - Location: `.oat/projects/shared/project-completion/implementation.md:23-40`
   - The progress table shows phases 1-5 complete, then repeats phases 3-5 as pending, and Phase 1 is still marked `in_progress` despite all three phase-1 tasks being completed below.
   - This undermines the artifact that summary/PR flows are supposed to trust for "what actually happened."
   - Fix guidance: regenerate the progress overview and phase status blocks from the completed task state before treating the implementation artifact as final.

### Minor

None.

## Spec/Design Alignment

### Requirements Coverage

| Requirement | Status      | Notes                                                                                           |
| ----------- | ----------- | ----------------------------------------------------------------------------------------------- |
| FR1         | implemented | `summary.md` template + `oat-project-summary` skill are present.                                |
| FR2         | implemented | Summary tracking frontmatter and incremental-update instructions were added.                    |
| FR3         | implemented | `oat-project-pr-final` now consults `summary.md` before generating PR text.                     |
| FR4         | implemented | `oat-project-complete` includes the summary gate and uses summary as PR source.                 |
| FR5         | implemented | `pr_open` routing landed in skills, docs, and CLI state generation.                             |
| FR6         | partial     | Inline revise handoff and revision-phase re-review flows are currently broken by `I1` and `I2`. |
| FR7         | implemented | Complete skill now accepts `pr_open`, `complete`, and `in_progress`.                            |
| FR8         | implemented | Auto-review config and invocation contract were added; targeted CLI tests pass.                 |
| FR9         | implemented | Implement skill now routes to summary/docs/PR instead of straight to complete.                  |
| NFR1        | partial     | The shipped project artifacts still contain contradictory state (`M1`, `M2`).                   |

### Extra Work (not in requirements)

None.

## Verification Commands

- `pnpm --filter @tkstang/oat-cli test -- --run packages/cli/src/commands/state/generate.test.ts packages/cli/src/commands/config/index.test.ts packages/cli/src/commands/init/tools/workflows/install-workflows.test.ts`
- `pnpm --filter @tkstang/oat-cli type-check`
- `git diff --name-only 00ceeb361fcc518e44d9ca447839a3fb6a4e2e16..HEAD`
- `git log --oneline 00ceeb361fcc518e44d9ca447839a3fb6a4e2e16..HEAD`

## Recommended Next Step

Run the `oat-project-review-receive` skill to convert the actionable findings into plan tasks before merging.
