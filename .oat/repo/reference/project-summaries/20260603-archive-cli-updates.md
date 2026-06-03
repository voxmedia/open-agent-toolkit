---
oat_status: complete
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-06-02
oat_generated: true
oat_summary_last_task: p06-t03
oat_summary_revision_count: 0
oat_summary_includes_revisions: []
---

# Summary: archive-cli-updates

## Overview

This project fixed the confusing archive command surface in OAT. Before the change, the only public archive command was `oat project archive sync`, which pulled archived snapshots down from S3 even though the command read like a project archive creation action. The real archive push behavior existed in a tested CLI helper but had no command caller, so `oat-project-complete` duplicated the same behavior in shell.

The delivered shape splits the surface by scope: project-level archive creation lives under `oat project archive`, while repo-level archive hydration lives under `oat repo archive sync`.

## What Was Implemented

Archive sync behavior was extracted into `packages/cli/src/commands/project/archive/sync-runner.ts` so the canonical repo command and deprecated project shim share one implementation. `oat repo archive sync [project-name]` now owns S3 archive hydration and preserves the prior dry-run, force, profile, region, JSON, and exit-code behavior.

`oat project archive [project-path]` now invokes `archiveProjectOnCompletion()` through a dedicated push runner. It supports explicit project paths, active-project fallback, text and JSON output, dry-run previews, summary export reporting, optional S3 upload when configured, and the existing worktree durability guard.

The old `oat project archive sync` path remains available as a deprecated shim. It warns on stderr while forwarding to the shared sync runner, so JSON stdout remains parseable for existing automation.

`oat-project-complete` Step 8 was reduced from inline archive shell logic to a call to `oat project archive "$PROJECT_PATH"`. This centralizes archive side effects in CLI code instead of maintaining a parallel implementation inside the skill.

Docs, help text, config descriptions, and repo-reference surfaces were updated to point to `oat repo archive sync` for pulls and `oat project archive` for pushes. `oat-wrap-up` was also updated to tell users to hydrate teammate archives with `oat repo archive sync`.

## Key Decisions

- Use `oat project archive` for archive creation because the command acts on a single project and reads as a verb.
- Move archive hydration to `oat repo archive sync` because no-argument sync fans out across the repo archive prefix and is naturally repo-scoped.
- Keep `oat project archive sync` as a deprecated shim so existing users and automation get a soft landing.
- Preserve mutate-by-default archive behavior with `--dry-run` as the safety preview, matching the existing CLI convention.
- Keep completion-time S3 upload gated by `archive.s3SyncOnComplete` and `archive.s3Uri`; the standalone project archive command does not introduce an unconditional S3 push.

## Design Deltas

| Task    | Planned            | Actual                                        | Reason                                                                                                                     |
| ------- | ------------------ | --------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| p06-t01 | Version bumps only | Also updated `review-skill-contracts.test.ts` | The p05 skill rewrite intentionally removed inline archive shell details, so the old contract assertions had become stale. |

## Notable Challenges

Phase 2 review found that dry-run target reporting and apply-time archive resolution could diverge, and that a worktree-local archive path could be selected when the primary checkout was unavailable. Both issues were fixed before the phase passed.

Final review found two additional issues: repo-local absolute `projects.root` values could duplicate the repository root in archive destinations, and the archive AWS config catalog described the wrong profile/region precedence. Both were fixed in p06 review-fix tasks and closed by final re-review.

## Tradeoffs Made

- The command split accepts that "archive" is a verb under `project` and a noun namespace under `repo`; the parent command provides the disambiguation.
- The deprecated shim keeps compatibility at the cost of temporarily carrying two paths for archive hydration.
- The archive push command does not require a "complete" state check. Completion ordering remains the lifecycle skill's responsibility.

## Integration Notes

- Canonical archive hydration command: `oat repo archive sync [project-name]`.
- Canonical archive creation command: `oat project archive [project-path]`.
- Deprecated compatibility command: `oat project archive sync`.
- Archive AWS profile and region precedence is `per-invocation flag > repo config > shell env`.
- Changes under shipped CLI, docs, and bundled skill assets required the public package lockstep bump to `0.1.17`; `pnpm release:validate` passed.
