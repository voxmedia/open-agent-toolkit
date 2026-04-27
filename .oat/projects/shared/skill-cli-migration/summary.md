---
oat_generated: true
oat_generated_at: '2026-04-27T20:55:13Z'
oat_summary_scope: final
oat_project: .oat/projects/shared/skill-cli-migration
oat_source_commit: 92f4576576120e3ffa577e2fc12609be7bfc57c6
oat_workflow_mode: quick
---

# Summary: skill-cli-migration

## Overview

This project migrated OAT skills that hand-parsed project `state.md` frontmatter with `grep | awk` to read the typed `oat --json project status` surface instead. The implementation keeps `state.md` as the source of truth on disk, changes only read paths, preserves existing write paths, and adds an `npx @open-agent-toolkit/cli` fallback for environments where `oat` is not installed globally.

Quick-mode note: this project has discovery, plan, implementation, review, and verification artifacts, but no spec or design artifacts.

## What Shipped

- Documented the canonical project-state read preamble in `.agents/skills/create-oat-skill/SKILL.md`, including the `oat`/`npx` resolution branch and the no-`// ""` null-sentinel contract.
- Added a `MIGRATED_FIELDS` contract test in `packages/cli/src/commands/project/status.test.ts` so renamed or removed JSON keys fail tests.
- Migrated the read paths in `oat-project-progress`, `oat-project-pr-progress`, `oat-project-plan`, `oat-project-pr-final`, `oat-project-review-provide`, `oat-project-reconcile`, and `oat-project-complete`.
- Preserved path-directed workflow-mode lookup behavior in `oat-project-review-provide` after final review found that target-worktree review routing still needed to validate the requested worktree.
- Bumped the lockstep public package set from `0.0.50` to `0.0.53` after rebasing onto an `origin/main` already at `0.0.52`, and regenerated public package version metadata.
- Published the docs/reference update for the `oat --json project status` contract used by skills.

## Verification

- `pnpm lint`
- `pnpm format`
- `pnpm type-check`
- `pnpm test` (1357 tests)
- `pnpm build`
- `pnpm release:validate`
- Live parity smoke tests for every migrated preamble (`jq` vs prior `grep | awk`, including null-sentinel parity)
- End-to-end fallback branch test with `oat` removed from `$PATH` and `npx @open-agent-toolkit/cli --json project status` returning the live project state
- p01, p02, p03, p04, p-rev1, and final code reviews all passed

## Deferred Follow-Ups

- Minor plan-artifact polish remains deferred for the stale p04-t02 PATH-trim example; implementation evidence records the corrected fallback run.
- Repo hygiene around tracked files under ignored `packages/cli/assets/` remains deferred as a separate asset-tracking decision.
