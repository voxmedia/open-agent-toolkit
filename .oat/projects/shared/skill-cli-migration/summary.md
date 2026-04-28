---
oat_generated: true
oat_generated_at: '2026-04-28T00:04:08Z'
oat_summary_scope: final
oat_project: .oat/projects/shared/skill-cli-migration
oat_source_commit: 2e776a76
oat_workflow_mode: quick
---

# Summary: skill-cli-migration

## Overview

This project migrated OAT skills that hand-parsed project `state.md` frontmatter with `grep | awk` to CLI-owned project status reads. The implementation keeps `state.md` as the source of truth on disk, changes only read paths, preserves existing write paths, and now uses `oat project status --field`, `--shell`, and `--project-path` so skill snippets remain short and readable.

Quick-mode note: this project has discovery, plan, implementation, review, and verification artifacts, but no spec or design artifacts.

## What Shipped

- Documented the canonical project-state read pattern in `.agents/skills/create-oat-skill/SKILL.md`, centered on `oat project status --field` for single fields, `--shell` for multi-field reads, and `--project-path` for resolved project paths.
- Added a `MIGRATED_FIELDS` contract test in `packages/cli/src/commands/project/status.test.ts` so renamed or removed JSON keys fail tests, plus tests for scalar, nested, null/missing, object, shell-safe, invalid shell-assignment, and explicit project-path behavior.
- Migrated the read paths in `oat-project-progress`, `oat-project-pr-progress`, `oat-project-plan`, `oat-project-pr-final`, `oat-project-review-provide`, `oat-project-reconcile`, and `oat-project-complete` to concise `--field` / `--shell` snippets.
- Preserved target-worktree review routing by using `--project-path` in path-directed status reads instead of direct `state.md` parsing.
- Bumped the lockstep public package set from `0.0.50` to `0.0.53` after rebasing onto an `origin/main` already at `0.0.52`, and regenerated public package version metadata.
- Published the docs/reference update for `oat project status --field`, `--shell`, `--project-path`, and the `npx`-backed `oat` shim contract for CI/cloud environments.

## Verification

- `pnpm lint`
- `pnpm format`
- `pnpm type-check`
- `pnpm test` (1365 tests)
- `pnpm build`
- `pnpm release:validate`
- Live CLI smoke tests for relative and absolute `--project-path` with `--field` and `--shell`
- p01, p02, p03, p04, p-rev1, and final code reviews all passed

## Deferred Follow-Ups

- Minor plan-artifact polish remains deferred for the stale p04-t02 PATH-trim example; implementation evidence records the corrected fallback run.
- Repo hygiene around tracked files under ignored `packages/cli/assets/` remains deferred as a separate asset-tracking decision.
