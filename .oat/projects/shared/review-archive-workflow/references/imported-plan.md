# Track Active Reviews, Archive Consumed Reviews

## Summary

Adopt a two-tier review artifact policy across OAT:

- Active review artifacts live in tracked `reviews/`
- Consumed/stale review artifacts move to local-only `reviews/archived/`

This resolves the current mismatch where project workflows write `reviews/` artifacts but repo defaults still gitignore the entire directory. It also codifies lifecycle cleanup so receive/PR/complete flows leave no unarchived review files at the top level.

## Implementation Changes

### Review artifact contract

- Standardize project review paths as:
  - active: `{PROJECT_PATH}/reviews/*.md`
  - archived: `{PROJECT_PATH}/reviews/archived/*.md`
- Standardize repo-level review paths as:
  - active: `.oat/repo/reviews/*.md`
  - archived: `.oat/repo/reviews/archived/*.md`
- Preserve local-only orphan review behavior under `.oat/projects/local/**`; if `oat-review-receive` consumes an orphan review artifact, archive it to a sibling `archived/` directory under the same local-only root.
- Update workflow/docs language so `reviews/` means “pending or current review artifacts” and `reviews/archived/` means “already received/closed history”.
- Update project review bookkeeping to rewrite artifact references to the archived path after archive occurs.
  - Default chosen: `plan.md` and any implementation/state summaries should point at `reviews/archived/...`, not the original active location.

### Receive workflows

- `oat-project-review-receive`:
  - Keep reading from top-level `reviews/*.md`
  - After findings are dispositioned and project artifacts are updated, move the consumed review into `reviews/archived/`
  - Update any references written during the receive run to the archived path before the bookkeeping commit
  - Commit the archive move and document updates atomically
- `oat-review-receive`:
  - After generating the standalone task list, archive the source review artifact into the matching `archived/` location
  - Report the archived location in the completion summary
- Make the receive skills explicitly ignore already archived reviews when auto-selecting “latest review”.

### PR/finalization/completion workflows

- `oat-project-pr-progress`, `oat-project-pr-final`, and `oat-project-complete` should add a preflight “archive residual reviews” step:
  - If any top-level `reviews/*.md` remain, move them to `reviews/archived/`
  - Rewrite any plan/implementation/state references that still point to active review paths
  - Continue with PR generation or completion only after the project has no unarchived top-level review files
- Update PR artifact generation rules so local-path exclusion treats `reviews/archived/` as local-only, not the whole `reviews/` tree.
  - This allows active review directories to be tracked while still omitting archived-review links from PR descriptions.
- Keep `pr/` behavior unchanged unless separately revisited; this change is only about reviews.

### Init/defaults/gitignore policy

- Change the repo policy from “gitignore all reviews” to “gitignore only archived reviews”.
- Update `.gitignore` and managed local-path defaults accordingly:
  - remove `.oat/**/reviews`
  - add `.oat/**/reviews/archived`
- Update default `localPaths` config and any generated examples to match the new rule.
- Update guided init copy and choice framing in `packages/cli/src/commands/init/tools/index.ts`:
  - stop recommending local-only `reviews/`
  - recommend local-only `pr/` and archived reviews instead
  - if the prompt still groups PR + review artifact behavior together, split it so review tracking and review archiving are not conflated
- Update any tests and docs that currently assume `.oat/projects/**/reviews` is gitignored.

## Public Interface / Contract Changes

- New workflow contract: active project reviews are tracked in VCS; archived reviews are local-only.
- New local-path default: `.oat/**/reviews/archived`
- Removed local-path default: `.oat/**/reviews`
- Review tables and summaries will now store archived review paths after receive/finalization rather than top-level `reviews/...` paths.

## Test Plan

- Gitignore/local-path tests:
  - `applyOatCoreGitignore` and local-path apply/status behavior reflect `reviews/archived`, not `reviews`
  - guided init writes the updated localPaths/defaults
- Workflow/manual validation:
  - `oat-project-review-provide` writes a tracked file to `reviews/`
  - `oat-project-review-receive` converts findings, archives the file, updates `plan.md` artifact path to `reviews/archived/...`, and leaves no top-level review file
  - `oat-review-receive` archives consumed repo/orphan review artifacts to the correct `archived/` location
  - `oat-project-pr-progress` and `oat-project-pr-final` archive any leftover top-level reviews before writing PR artifacts and omit archived-review links from References
  - `oat-project-complete` produces a project snapshot with no unarchived review files at the top level
- Regression checks:
  - repo-level cleanup/archive utilities still handle `.oat/repo/reviews/**`
  - PR descriptions still generate correctly when `reviews/` is tracked but `reviews/archived/` is not

## Assumptions

- Archived reviews are intentionally local-only and should not be committed.
- Historical review references should stay truthful, so artifact paths are updated to `reviews/archived/...` after archiving.
- `pr/` directories remain local-only under the current policy; this plan does not change PR artifact tracking.
