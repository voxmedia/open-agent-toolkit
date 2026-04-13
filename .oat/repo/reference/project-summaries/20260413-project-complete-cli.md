---
oat_status: complete
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-04-13
oat_generated: true
oat_summary_last_task: p03-t01
oat_summary_revision_count: 0
oat_summary_includes_revisions: []
---

# Summary: project-complete-cli

## Overview

This project finished the remaining `BL-0ace` gap after the earlier archive-sync closeout work by moving the canonical project-completion `state.md` mutation out of `oat-project-complete` shell text and into the CLI. The goal was to make the completion-state contract explicit, testable, and reusable instead of relying on inline `sed` and `awk` edits in the skill.

## What Was Implemented

A pure `renderCompletedProjectState()` mutator now owns the canonical completion-state rendering for project `state.md`, including lifecycle frontmatter updates, completion timestamps, status text, current phase text, progress normalization, and next-milestone replacement. A new shell-callable `oat project complete-state <project-path>` command wraps that mutator so workflow skills can invoke the contract through a stable CLI path.

`oat-project-complete` Step 5 now delegates to the CLI command instead of editing `state.md` inline. The skill passes `--archived` only when the closeout flow will archive a shared project locally, which preserves the already-landed archive/S3/summary behavior without broadening this project into archive lifecycle work.

The work also tightened focused regression coverage. Tests now cover the baseline completed-state rendering, lifecycle-upsert behavior, archived vs non-archived output, command-level success and error paths, cleanup drift scanning compatibility, and the skill-contract guard that keeps `oat-project-complete` delegated to the CLI.

## Key Decisions

- Keep the scope narrow: only the canonical completion-state mutation moved into CLI ownership. Archive, S3 sync, summary export, and other closeout side effects stayed in the archive helper layer from the earlier project.
- Expose a narrow public `project complete-state` subcommand instead of an internal-only helper. The skill needs a stable shell-callable path, and a small project subcommand fit the existing CLI structure cleanly.
- Keep cleanup-path reuse conservative. The cleanup drift path only needs a minimal lifecycle frontmatter repair, so the new mutator did not force broader consolidation into `cleanup/project/project.utils.ts`.
- Use focused `vitest run` suites for task-local verification. The package-wide test/typecheck surfaces still have unrelated pre-existing control-plane resolution failures, so this project verified the touched surface directly and documented the external failure separately.

## Tradeoffs Made

The project chose not to expand into the unrelated `@open-agent-toolkit/control-plane` package-resolution problem that currently blocks CLI-wide help snapshot and type-check runs. That kept the implementation aligned to `BL-0ace` at the cost of leaving a known repo-level verification issue outside this PR.

The project also left a few final-review polish items deferred rather than adding more fix tasks. Those items were all minor or negligible and did not change the correctness of the new completion-state flow.

## Integration Notes

Future workflow code that needs to set the canonical completed lifecycle state should call `oat project complete-state` rather than reintroducing shell-local `state.md` mutation logic. `packages/cli/src/commands/project/complete-state/state-utils.ts` is now the source of truth for the completion-state contract.

The `--archived` flag is a caller contract: it should be passed only when the surrounding workflow will actually archive the project locally. `oat-project-complete` already enforces that rule for the shared-project completion path.

## Follow-up Items

- Repo-level follow-up: CLI-wide `type-check` and `help-snapshots.test.ts` remain blocked by the unrelated `@open-agent-toolkit/control-plane` resolution issue in `packages/cli/src/commands/project/list.ts` and `packages/cli/src/commands/project/status.ts`.
- Final review deferred six minor findings around defensive error classification, section-parser hardening, low-value invariant validation, test harness style, `--archived` command semantics documentation, and broader negative regression assertions.

## Associated Issues

- Backlog: `BL-0ace` — Move `oat-project-complete` state mutations into a CLI helper
